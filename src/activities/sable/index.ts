/**
 * Le Sable.
 *
 * Une forme creusée dans le sable, un point de départ, et un doigt. La trace ne
 * s'inscrit **que** tant que le doigt reste dans le couloir : hors du chemin,
 * rien ne se dépose. C'est tout le contrôle de l'erreur, et il est entièrement
 * dans le dispositif — pas de croix, pas de son grave, pas de message. Le doigt
 * ressort du couloir, la trace s'arrête ; il y revient, elle reprend.
 *
 * Deux choses ne sont pas négociables ici :
 *
 * - **le couloir dépend de la dalle.** `engine/calibration.ts` fournit le
 *   multiplicateur mesuré par la sonde de l'espace parent. Une dalle qui
 *   échantillonne à 60 Hz produit des trous entre deux points ; serrer le
 *   couloir malgré ça ferait vivre à l'enfant un échec qu'il n'a pas commis ;
 * - **on ne peut pas sauter en avant.** Le doigt ne fait avancer le tracé que
 *   de proche en proche. Sans cela, poser le doigt sur l'arrivée suffirait.
 */

import { tick } from '../../engine/audio';
import { loadTracingProfile, type TracingProfile } from '../../engine/calibration';
import { pixelRatio, prefersReducedMotion } from '../../engine/platform';
import { addTreasure } from '../../engine/storage';
import { putBlob } from '../../engine/storage';
import type { Activity, ActivityProps, Item } from '../../engine/types';
import {
  configForLevel,
  itemId,
  poolForLevel,
  resample,
  shapeById,
  shapesForLevel,
  skillForLevel,
  type LevelConfig,
  type Point,
  type Shape,
} from './levels';

export const MAX_LEVEL = 6;

/** Part du trait à parcourir pour qu'il compte comme fait. */
const COMPLETION = 0.94;

/** Nombre de points d'avance autorisés : c'est ce qui interdit de sauter. */
const LOOKAHEAD = 6;

/** Reprises sans achever le trait avant que le chemin se montre tout seul. */
const DEMO_AFTER = 2;

interface Turn {
  item: Item;
  shape: Shape;
  /** Traits rééchantillonnés, en coordonnées normalisées. */
  strokes: Point[][];
  stroke: number;
  reached: number;
  /** Points effectivement déposés, par trait. */
  drawn: Point[][];
  startedAt: number;
  lifts: number;
  assisted: boolean;
  spoke: boolean;
}

class SableActivity implements Activity {
  readonly id = 'sable' as const;
  readonly skills = ['letter.pregraphism' as const, 'letter.trace' as const];
  readonly maxLevel = MAX_LEVEL;

  private props!: ActivityProps;
  private config!: LevelConfig;
  private profile: TracingProfile = { corridorScale: 1.5, smoothing: 3, label: 'non mesurée' };

  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  /** Carré de tracé, en pixels CSS : origine et côté. */
  private box = { x: 0, y: 0, size: 320 };

  private turn: Turn | null = null;
  private queue: Item[] = [];
  private consumed = 0;
  private busy = false;

  private pointerId: number | null = null;
  private recent: Point[] = [];
  private demo: { at: number; index: number } | null = null;

  private frame = 0;
  private generation = 0;
  private disposed = false;
  private reducedMotion = false;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  /** Dernière trace achevée, déposée au mur à la fin de la série. */
  private lastTrace: Blob | null = null;

  itemPool(level: number): Item[] {
    return poolForLevel(level);
  }

  /* ---------------- cycle de vie ---------------- */

  mount(props: ActivityProps): void {
    const generation = ++this.generation;

    this.props = props;
    this.config = configForLevel(props.level);
    this.queue = [...props.items];
    this.consumed = 0;
    this.disposed = false;
    this.busy = false;
    this.frame = 0;
    this.lastTrace = null;
    this.reducedMotion = prefersReducedMotion();

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'width:100%;height:100%;display:block';
    props.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;

    this.resize();
    window.addEventListener('resize', this.onResize);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);

    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__sable = this;
    }

    void (async () => {
      // La mesure de la sonde tactile décide de la largeur du couloir. Elle est
      // lue **avant** le premier tracé, jamais pendant.
      this.profile = await loadTracingProfile().catch(() => this.profile);
      if (this.generation !== generation) return;
      this.beginTurn();
    })();
  }

  unmount(): void {
    this.generation += 1;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    window.removeEventListener('resize', this.onResize);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.remove();
  }

  private later(fn: () => void, ms: number): void {
    const generation = this.generation;
    const id = setTimeout(() => {
      this.timers.delete(id);
      if (this.generation === generation && !this.disposed) fn();
    }, ms);
    this.timers.add(id);
  }

  /* ---------------- géométrie ---------------- */

  private onResize = (): void => this.resize();

  private resize(): void {
    const rect = this.props.container.getBoundingClientRect();
    const width = Math.max(320, rect.width);
    const height = Math.max(240, rect.height);
    const dpr = pixelRatio();

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Un carré centré, marges comprises : la forme doit garder ses proportions,
    // sinon un rond devient un ovale et le geste appris n'est plus le bon.
    const size = Math.min(width, height) * 0.82;
    this.box = { x: (width - size) / 2, y: (height - size) / 2, size };
    this.invalidate();
  }

  private toScreen([nx, ny]: Point): Point {
    return [this.box.x + nx * this.box.size, this.box.y + ny * this.box.size];
  }

  /** Rayon du couloir en pixels, mesure de la dalle comprise. */
  private corridorPx(): number {
    return this.config.corridor * this.box.size * this.profile.corridorScale;
  }

  /* ---------------- tours ---------------- */

  private beginTurn(): void {
    if (this.disposed) return;

    if (this.consumed >= this.queue.length) {
      void this.finishSeries();
      return;
    }

    const item = this.queue[this.consumed];
    const shape =
      shapeById(this.props.level, String(item.params.shapeId)) ??
      shapesForLevel(this.props.level)[0];

    if (!shape) {
      this.consumed += 1;
      return this.beginTurn();
    }

    this.turn = {
      item,
      shape,
      strokes: shape.strokes.map((s) => resample(s)),
      stroke: 0,
      reached: 0,
      drawn: shape.strokes.map(() => []),
      startedAt: performance.now(),
      lifts: 0,
      assisted: false,
      spoke: false,
    };
    this.demo = null;
    this.busy = false;
    this.invalidate();

    void this.props.speak(this.props.level <= 3 ? 'sable.tracer' : 'sable.lettre');
  }

  private async finishTurn(): Promise<void> {
    const turn = this.turn;
    if (!turn || this.disposed) return;
    this.busy = true;

    tick();
    this.lastTrace = await this.snapshot();

    // Production orale : l'enfant redit le mot de référence de la lettre, ou
    // nomme ce qu'il vient de tracer. On garde le son, on ne l'analyse pas.
    if (this.config.childSpeaks) {
      if (turn.shape.wordId) await this.props.speak(`mot.${turn.shape.wordId}`);
      await this.props.recordVoice(turn.item.id).catch(() => null);
      turn.spoke = true;
      if (this.disposed) return;
    }

    await new Promise<void>((resolve) => this.later(resolve, 420));
    if (this.disposed) return;

    this.consumed += 1;
    this.props.onItemResult({
      itemId: turn.item.id,
      skill: skillForLevel(this.props.level),
      // Réussi du premier coup : le tracé a été mené sans jamais relever le
      // doigt en cours de trait, et sans que le chemin ait dû se montrer.
      correct: turn.lifts === 0 && !turn.assisted,
      attempts: turn.lifts + 1,
      latencyMs: Math.round(performance.now() - turn.startedAt),
      assisted: turn.assisted,
      spoke: turn.spoke,
    });

    this.turn = null;
    this.beginTurn();
  }

  /**
   * Dépose la dernière trace au mur des trésors — une seule par série.
   *
   * Une par forme en aurait déposé huit par séance, et le mur ne montrerait
   * plus une production mais un journal. Le mur est ce que l'enfant a fait, pas
   * ce que l'application a compté.
   */
  private async finishSeries(): Promise<void> {
    const blob = this.lastTrace;
    if (blob) {
      const key = `trace.${Date.now()}`;
      try {
        await putBlob(key, blob);
        await addTreasure({ id: key, kind: 'trace', image: key, audio: null, createdAt: Date.now() });
      } catch {
        // Quota plein : la séance se termine normalement, sans trésor.
      }
    }
    if (!this.disposed) this.props.onFinished();
  }

  /** PNG de la seule zone de tracé, fond compris. */
  private snapshot(): Promise<Blob | null> {
    const size = 320;
    const out = document.createElement('canvas');
    out.width = size;
    out.height = size;
    const ctx = out.getContext('2d');
    if (!ctx) return Promise.resolve(null);

    ctx.fillStyle = '#E8D9B8';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#7A5A3A';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of this.turn?.drawn ?? []) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      stroke.forEach(([nx, ny], i) => {
        const x = nx * size;
        const y = ny * size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    return new Promise((resolve) => out.toBlob(resolve, 'image/png'));
  }

  /* ---------------- geste ---------------- */

  private onPointerDown = (event: PointerEvent): void => {
    if (this.busy || this.disposed || !this.turn) return;
    this.pointerId = event.pointerId;
    try {
      // La capture garantit qu'un doigt sorti du canvas continue d'être suivi.
      // Elle échoue si le pointeur a déjà disparu : ce n'est pas une raison
      // d'abandonner le tracé en cours.
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      // Sans capture, le tracé fonctionne encore tant que le doigt reste dedans.
    }
    this.recent = [];
    this.demo = null;
    this.consume(event);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (this.pointerId !== event.pointerId) return;
    this.consume(event);
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (this.pointerId !== event.pointerId) return;
    this.pointerId = null;
    this.recent = [];

    const turn = this.turn;
    if (!turn || this.busy) return;

    const points = turn.strokes[turn.stroke];
    if (!points) return;

    // Doigt relevé avant la fin du trait : on repart du début de ce trait.
    // Rien ne le signale — le trait s'efface, c'est tout.
    if (turn.reached < points.length * COMPLETION) {
      turn.lifts += 1;
      turn.reached = 0;
      turn.drawn[turn.stroke] = [];

      if (turn.lifts >= DEMO_AFTER && !turn.assisted) {
        turn.assisted = true;
        this.startDemo();
      }
      this.invalidate();
    }
  };

  /**
   * Un point de doigt : on n'avance que si le point est dans le couloir **et**
   * proche de là où on en était.
   */
  private consume(event: PointerEvent): void {
    const turn = this.turn;
    if (!turn || this.busy) return;

    const rect = this.canvas.getBoundingClientRect();
    const raw: Point = [event.clientX - rect.left, event.clientY - rect.top];

    /*
     * Moyenne glissante avant tout test de distance.
     *
     * Une dalle bruyante fait osciller le point de plusieurs pixels autour du
     * doigt réel. Sans lissage, ces oscillations sortent du couloir et coupent
     * une trace parfaitement correcte — d'autant plus souvent que le couloir
     * est serré, donc précisément aux niveaux hauts.
     */
    this.recent.push(raw);
    while (this.recent.length > this.profile.smoothing) this.recent.shift();
    const point: Point = [
      this.recent.reduce((s, p) => s + p[0], 0) / this.recent.length,
      this.recent.reduce((s, p) => s + p[1], 0) / this.recent.length,
    ];

    const points = turn.strokes[turn.stroke];
    if (!points) return;

    const radius = this.corridorPx();
    let best = -1;
    let bestDistance = Infinity;

    // On ne cherche la position du doigt que **devant** là où on en est, et pas
    // plus loin que quelques points : c'est ce qui interdit de poser le doigt
    // directement sur l'arrivée.
    const from = Math.max(0, turn.reached - 2);
    const to = Math.min(points.length - 1, turn.reached + LOOKAHEAD);
    for (let i = from; i <= to; i++) {
      const [sx, sy] = this.toScreen(points[i]);
      const distance = Math.hypot(point[0] - sx, point[1] - sy);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }

    if (best < 0 || bestDistance > radius) return; // hors du couloir : rien ne s'écrit

    if (best > turn.reached) turn.reached = best;
    turn.drawn[turn.stroke].push([
      (point[0] - this.box.x) / this.box.size,
      (point[1] - this.box.y) / this.box.size,
    ]);
    this.invalidate();

    if (turn.reached >= (points.length - 1) * COMPLETION) this.completeStroke();
  }

  private completeStroke(): void {
    const turn = this.turn;
    if (!turn) return;

    tick();
    if (turn.stroke + 1 < turn.strokes.length) {
      turn.stroke += 1;
      turn.reached = 0;
      this.pointerId = null;
      this.recent = [];
      this.invalidate();
      return;
    }

    void this.finishTurn();
  }

  /**
   * Le chemin se parcourt tout seul, une fois.
   *
   * Ce n'est pas une punition ni une correction : c'est la démonstration qu'un
   * adulte ferait avec son doigt. Elle arrive après deux reprises, sans qu'un
   * son ou un message ne l'annonce.
   */
  private startDemo(): void {
    if (this.reducedMotion) return;
    this.demo = { at: performance.now(), index: 0 };
    this.invalidate();
  }

  /* ---------------- rendu ---------------- */

  private invalidate(): void {
    if (this.frame || this.disposed) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.render();
    });
  }

  private render(): void {
    const ctx = this.ctx;
    const width = this.canvas.width / pixelRatio();
    const height = this.canvas.height / pixelRatio();

    // Le bac à sable.
    ctx.fillStyle = '#0F2E4C';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#E8D9B8';
    roundRect(ctx, this.box.x - 12, this.box.y - 12, this.box.size + 24, this.box.size + 24, 22);
    ctx.fill();

    const turn = this.turn;
    if (!turn) return;

    // Le couloir : un sillon clair, large de ce que la dalle permet.
    const radius = this.corridorPx();
    turn.strokes.forEach((points, index) => {
      if (index < turn.stroke) return; // trait déjà fait : seule la trace reste
      ctx.strokeStyle = index === turn.stroke ? 'rgba(122,90,58,0.22)' : 'rgba(122,90,58,0.10)';
      ctx.lineWidth = radius * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      this.path(points);
      ctx.stroke();
    });

    // Le point de départ du trait courant, et le sens.
    const current = turn.strokes[turn.stroke];
    if (current && turn.reached === 0) {
      const [sx, sy] = this.toScreen(current[0]);
      ctx.fillStyle = '#3E8E5A';
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(14, radius * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }

    // La trace déposée.
    ctx.strokeStyle = '#7A5A3A';
    ctx.lineWidth = Math.max(10, radius * 0.9);
    for (const stroke of turn.drawn) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      stroke.forEach((p, i) => {
        const [x, y] = this.toScreen(p);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // La démonstration, s'il y en a une en cours.
    if (this.demo && current) {
      const elapsed = performance.now() - this.demo.at;
      const index = Math.floor((elapsed / 1600) * current.length);
      if (index >= current.length) {
        this.demo = null;
      } else {
        const [dx, dy] = this.toScreen(current[index]);
        ctx.fillStyle = '#E4B429';
        ctx.beginPath();
        ctx.arc(dx, dy, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        this.invalidate();
      }
    }
  }

  private path(points: Point[]): void {
    this.ctx.beginPath();
    points.forEach((p, i) => {
      const [x, y] = this.toScreen(p);
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    });
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createSable(): Activity {
  return new SableActivity();
}

export { poolForLevel, configForLevel, skillForLevel, itemId };
