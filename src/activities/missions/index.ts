/**
 * Les Missions.
 *
 * En haut, une carte mission avec N pastilles. En bas, un véhicule à N alvéoles
 * vides. Sur le côté, une réserve **plus fournie que nécessaire**. L'enfant
 * glisse un objet par alvéole, puis appuie sur « Partez ! ».
 *
 * **Compter en tapant est interdit** : le tap rapide casse le lien « un geste =
 * un objet », qui est exactement ce que l'atelier construit. D'où le
 * glisser-déposer, plus lent et plus coûteux — c'est voulu.
 *
 * Contrôle de l'erreur : le véhicule avance de quelques dizaines de pixels puis
 * s'arrête. Aucun son négatif. L'alvéole vide reste visible — c'est elle qui
 * dit ce qui manque, pas un message.
 */

import { tick } from '../../engine/audio';
import { pixelRatio, prefersReducedMotion } from '../../engine/platform';
import type { Activity, ActivityProps, Item, ItemResult } from '../../engine/types';
import { cachedImage, loadImage } from '../../content/pack';
import {
  configForLevel,
  dotPositions,
  itemId,
  poolForLevel,
  reserveSize,
  skillForLevel,
  type LevelConfig,
} from './levels';
import { draw, type MissionRenderState, type Slot, type Token } from './render';
import { computeLayout, type Layout } from './layout';

export const MAX_LEVEL = 6;

const STALL_MS = 1400;
const DEPART_MS = 1300;

interface TurnState {
  item: Item;
  reportedId: string;
  /** Nombre d'objets attendus dans le véhicule. */
  need: number;
  /** Déjà présents au départ (niveaux « il en manque combien »). */
  preloaded: number;
  startedAt: number;
  attempts: number;
  assisted: boolean;
  spoke: boolean;
}

class MissionsActivity implements Activity {
  readonly id = 'missions' as const;
  readonly skills = [
    'counting.compare' as const,
    'counting.subitize' as const,
    'counting.one_to_one' as const,
    'counting.cardinal' as const,
    'counting.arithmetic' as const,
  ];
  readonly maxLevel = MAX_LEVEL;

  private props!: ActivityProps;
  private config!: LevelConfig;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private layout!: Layout;

  private turn: TurnState | null = null;
  private queue: Item[] = [];
  private consumed = 0;
  private busy = false;

  private slots: Slot[] = [];
  private tokens: Token[] = [];
  private dots: Array<[number, number]> = [];
  private compareLeft = 0;
  private compareRight = 0;
  private compareCorrectIsLeft = true;

  private dragging: Token | null = null;
  private pointerId: number | null = null;
  private dragOffset = { x: 0, y: 0 };

  private vehicleOffset = 0;
  private stalling = false;
  private departing = false;

  private frame = 0;
  private lastFrameAt = 0;
  private generation = 0;
  private disposed = false;
  private reducedMotion = false;
  private timers = new Set<ReturnType<typeof setTimeout>>();

  private objectImage: HTMLImageElement | null = null;
  private vehicleImage: HTMLImageElement | null = null;

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
      // Débogage sur la tablette via `chrome://inspect`, comme pour Le Chemin.
      (window as unknown as Record<string, unknown>).__missions = this;
    }

    void this.preload().then(() => {
      if (this.generation !== generation) return;
      this.beginTurn();
    });
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
      if (this.generation === generation) fn();
    }, ms);
    this.timers.add(id);
  }

  private async preload(): Promise<void> {
    const assets = this.props.pack.activityAssets.missions ?? {};
    const object = typeof assets.object === 'string' ? assets.object : null;
    const vehicle = typeof assets.vehicle === 'string' ? assets.vehicle : null;

    if (object) this.objectImage = cachedImage(object) ?? (await loadImage(object).catch(() => null));
    if (vehicle) this.vehicleImage = cachedImage(vehicle) ?? (await loadImage(vehicle).catch(() => null));
  }

  /* ---------------- géométrie ---------------- */

  private onResize = (): void => {
    this.resize();
  };

  private resize(): void {
    const rect = this.props.container.getBoundingClientRect();
    const width = Math.max(320, rect.width);
    const height = Math.max(240, rect.height);
    const dpr = pixelRatio();

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const need = this.turn?.need ?? 3;
    this.layout = computeLayout(width, height, need, reserveSize(need));
    this.placeSlotsAndTokens();
    this.invalidate();
  }

  /* ---------------- tours ---------------- */

  private beginTurn(): void {
    if (this.disposed) return;

    if (this.consumed >= this.queue.length) {
      this.props.onFinished();
      return;
    }

    const item = this.queue[this.consumed];
    const params = item.params as Record<string, number>;
    const target = params.target ?? 1;

    let need = target;
    let preloaded = 0;

    if (this.config.mode === 'missing') {
      preloaded = params.already ?? 0;
      need = target;
    } else if (this.config.mode === 'addition') {
      preloaded = target;
      need = target + (params.addend ?? this.config.addend);
    }

    this.turn = {
      item,
      reportedId: item.id,
      need,
      preloaded,
      startedAt: performance.now(),
      attempts: 0,
      assisted: false,
      spoke: false,
    };

    this.vehicleOffset = 0;
    this.stalling = false;
    this.departing = false;

    if (this.config.mode === 'compare') {
      this.setupCompare(params);
    } else {
      this.dots = dotPositions(
        this.config.mode === 'addition' ? need : target,
        this.config.arrangement,
        Math.random,
      );
      this.layout = computeLayout(
        this.layout.width,
        this.layout.height,
        need,
        reserveSize(need),
      );
      this.placeSlotsAndTokens();
      void this.props.speak('mission.charge');
    }

    this.invalidate();
  }

  private setupCompare(params: Record<string, number>): void {
    this.compareLeft = params.target ?? 1;
    this.compareRight = params.other ?? 2;
    this.compareCorrectIsLeft = this.compareLeft > this.compareRight;
    this.slots = [];
    this.tokens = [];
    void this.props.speak('mission.compare');
  }

  private placeSlotsAndTokens(): void {
    const turn = this.turn;
    if (!turn || this.config.mode === 'compare') return;

    const layout = this.layout;

    this.slots = Array.from({ length: turn.need }, (_, i) => ({
      x: layout.slotOrigin.x + (i % layout.slotColumns) * layout.slotPitch,
      y: layout.slotOrigin.y + Math.floor(i / layout.slotColumns) * layout.slotPitch,
      filled: i < turn.preloaded,
    }));

    // La réserve contient toujours plus que nécessaire : c'est ce surplus qui
    // oblige à décider quand s'arrêter.
    const spare = reserveSize(turn.need) - turn.preloaded;
    this.tokens = Array.from({ length: Math.max(1, spare) }, (_, i) => ({
      id: i,
      x: layout.reserveOrigin.x + (i % layout.reserveColumns) * layout.reservePitch,
      y: layout.reserveOrigin.y + Math.floor(i / layout.reserveColumns) * layout.reservePitch,
      homeX: 0,
      homeY: 0,
      slot: null,
    })).map((t) => ({ ...t, homeX: t.x, homeY: t.y }));
  }

  private filledCount(): number {
    return this.slots.filter((s) => s.filled).length;
  }

  /** Le véhicule part, ou cale — sans jamais l'annoncer autrement. */
  private async attemptDeparture(): Promise<void> {
    const turn = this.turn;
    if (!turn || this.busy) return;

    this.busy = true;
    turn.attempts += 1;

    const loaded = this.filledCount();
    const correct = loaded === turn.need;

    if (!correct) {
      // Le véhicule avance à peine puis s'arrête. L'alvéole vide reste visible.
      this.stalling = true;
      this.invalidate();
      this.later(() => {
        this.stalling = false;
        this.vehicleOffset = 0;
        this.busy = false;
        if (turn.attempts >= 2) turn.assisted = true;
        this.invalidate();
      }, STALL_MS);
      return;
    }

    // Production orale : l'enfant annonce ce qu'il a chargé avant de valider.
    if (this.config.childSpeaks) {
      void this.props.speak('mission.combien');
      const blob = await this.props.recordVoice(turn.reportedId).catch(() => null);
      void blob;
      turn.spoke = true;
      if (this.disposed) return;
    }

    this.departing = true;
    this.invalidate();
    void this.props.speak('praise');

    this.later(() => this.finishTurn(true), DEPART_MS);
  }

  private chooseCompare(pickedLeft: boolean): void {
    const turn = this.turn;
    if (!turn || this.busy) return;

    turn.attempts += 1;
    const correct = pickedLeft === this.compareCorrectIsLeft;

    if (!correct) {
      if (turn.attempts >= 2) turn.assisted = true;
      // Rien ne se passe : pas de croix, pas de son. On rejoue la consigne.
      void this.props.speak('mission.compare');
      this.invalidate();
      return;
    }

    this.busy = true;
    tick();
    void this.props.speak('praise');
    this.later(() => this.finishTurn(true), 900);
  }

  private finishTurn(_departed: boolean): void {
    const turn = this.turn;
    if (!turn) return;

    const result: ItemResult = {
      itemId: turn.reportedId,
      skill: skillForLevel(this.props.level),
      correct: turn.attempts === 1 && !turn.assisted,
      attempts: Math.max(1, turn.attempts),
      latencyMs: Math.round(performance.now() - turn.startedAt),
      assisted: turn.assisted,
      spoke: turn.spoke,
    };

    this.turn = null;
    this.consumed += 1;
    this.busy = false;
    this.props.onItemResult(result);

    if (this.disposed) return;
    this.beginTurn();
  }

  /* ---------------- gestes ---------------- */

  private local(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (this.busy || !this.turn) return;
    const { x, y } = this.local(e);

    if (this.config.mode === 'compare') {
      const mid = this.layout.width / 2;
      this.chooseCompare(x < mid);
      return;
    }

    // Bouton « Partez ! »
    if (this.layout.hitGo(x, y)) {
      void this.attemptDeparture();
      return;
    }

    const size = this.layout.tokenSize;
    // Du dernier posé au premier : celui du dessus se saisit en premier.
    for (let i = this.tokens.length - 1; i >= 0; i--) {
      const token = this.tokens[i];
      if (token.slot !== null) continue;
      if (Math.abs(x - token.x) > size * 0.7 || Math.abs(y - token.y) > size * 0.7) continue;

      this.dragging = token;
      this.pointerId = e.pointerId;
      this.dragOffset = { x: x - token.x, y: y - token.y };
      // Le jeton saisi passe au-dessus des autres.
      this.tokens.splice(i, 1);
      this.tokens.push(token);
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch {
        // Refusé par certains WebView : le glissement reste utilisable.
      }
      this.invalidate();
      return;
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    const { x, y } = this.local(e);
    this.dragging.x = x - this.dragOffset.x;
    this.dragging.y = y - this.dragOffset.y;
    this.invalidate();
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    const token = this.dragging;
    this.dragging = null;
    this.pointerId = null;

    const radius = this.layout.slotSize * 0.85;
    let best = -1;
    let bestDistance = Infinity;

    this.slots.forEach((slot, i) => {
      if (slot.filled) return;
      const d = Math.hypot(token.x - slot.x, token.y - slot.y);
      if (d < radius && d < bestDistance) {
        best = i;
        bestDistance = d;
      }
    });

    if (best >= 0) {
      // Aimantation : l'objet se cale au centre de l'alvéole.
      this.slots[best].filled = true;
      token.slot = best;
      token.x = this.slots[best].x;
      token.y = this.slots[best].y;
      tick();
    } else {
      // Rien de négatif : l'objet revient simplement à sa place dans la réserve.
      token.x = token.homeX;
      token.y = token.homeY;
    }

    this.invalidate();
  };

  /* ---------------- rendu ---------------- */

  private invalidate(): void {
    if (this.frame || this.disposed) return;
    this.lastFrameAt = performance.now();
    this.frame = requestAnimationFrame(this.tickFrame);
  }

  private tickFrame = (now: number): void => {
    this.frame = 0;
    if (this.disposed) return;

    const dt = Math.min(64, now - this.lastFrameAt);
    this.lastFrameAt = now;
    let animating = false;

    if (this.departing) {
      this.vehicleOffset += dt * 0.9;
      animating = this.vehicleOffset < this.layout.width;
    } else if (this.stalling) {
      // Quelques dizaines de pixels, pas plus : il faut que ce soit lisible
      // comme « ça n'est pas parti », pas comme une punition.
      const limit = this.reducedMotion ? 0 : 42;
      if (this.vehicleOffset < limit) {
        this.vehicleOffset = Math.min(limit, this.vehicleOffset + dt * 0.16);
        animating = true;
      }
    } else if (this.vehicleOffset > 0) {
      this.vehicleOffset = Math.max(0, this.vehicleOffset - dt * 0.3);
      animating = this.vehicleOffset > 0;
    }

    draw(this.ctx, this.renderState());

    if (animating) this.frame = requestAnimationFrame(this.tickFrame);
  };

  private renderState(): MissionRenderState {
    return {
      layout: this.layout,
      palette: this.props.pack.palette,
      config: this.config,
      mode: this.config.mode,
      dots: this.dots,
      slots: this.slots,
      tokens: this.tokens,
      vehicleOffset: this.vehicleOffset,
      canDepart: this.turn !== null && this.filledCount() > 0,
      compareLeft: this.compareLeft,
      compareRight: this.compareRight,
      objectImage: this.objectImage,
      vehicleImage: this.vehicleImage,
    };
  }
}

export function createMissions(): Activity {
  return new MissionsActivity();
}

export { poolForLevel, configForLevel, skillForLevel, itemId };
