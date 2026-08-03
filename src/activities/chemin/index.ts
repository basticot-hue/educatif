/**
 * Le Chemin — `counting.sequence`.
 *
 * L'enfant lance un dé, puis glisse le pion **case par case** jusqu'au compte
 * obtenu. À chaque case franchie, on énonce **le numéro de la case** — « sept…
 * huit… neuf » — et jamais « un, deux, trois ». C'est cet énoncé ordinal, sur un
 * plateau **linéaire**, qui produit l'effet sur le sens du nombre ; un plateau
 * en spirale ou en cercle ne le produit pas.
 *
 * À partir du niveau 2, l'app se tait : c'est l'enfant qui énonce, et l'app
 * valide après coup. On enregistre sa voix sans jamais l'analyser — à cet âge,
 * le fait de produire est ce qui compte.
 */

import { tick } from '../../engine/audio';
import { pixelRatio, prefersReducedMotion } from '../../engine/platform';
import type { Activity, ActivityProps, Item, ItemResult } from '../../engine/types';
import { cachedImage, loadImage } from '../../content/pack';
import { saveChildVoice, startRecording, type Recording } from '../../engine/voice';
import {
  cameraFor,
  caseCenterX,
  clampToAllowance,
  computeGeometry,
  hitsDie,
  hitsPawn,
  hopsFrom,
  nextSnap,
  type Geometry,
} from './board';
import {
  casesCrossed,
  configForLevel,
  initialPosition,
  itemId,
  poolForLevel,
  remainingHops,
  type LevelConfig,
} from './levels';
import { draw, FLASH_MS, type RenderState } from './render';

/** Délai avant que les cases restantes se mettent à pulser, après un lâcher. */
const HINT_DELAY_MS = 2500;
const ROLL_DURATION_MS = 700;
const ROLL_FACE_MS = 90;
const GOAL_SCENE_MS = 2200;

export const MAX_LEVEL = 6;

interface TurnState {
  item: Item;
  reportedId: string;
  startPosition: number;
  count: number;
  /** Instant où le dé s'est immobilisé : origine de la latence. */
  startedAt: number;
  attempts: number;
  assisted: boolean;
  /** Cases franchies pendant le tout premier geste continu. */
  firstGestureHops: number;
  gestureCount: number;
  recording: Recording | null;
}

class CheminActivity implements Activity {
  readonly id = 'chemin' as const;
  readonly skills = ['counting.sequence' as const];
  readonly maxLevel = MAX_LEVEL;

  private props!: ActivityProps;
  private config!: LevelConfig;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private geo!: Geometry;

  private position = 1;
  private pawnX = 0;
  private pawnTarget = 0;
  private camera = 0;
  private cameraTarget = 0;

  private die: number | null = null;
  private dieRolling = false;
  private dieFace = 1;
  private rollStartedAt = 0;
  private rollTimer: ReturnType<typeof setTimeout> | null = null;

  private flashes = new Map<number, number>();
  private pulsing = new Set<number>();
  private pulseStart = 0;
  private goalLit = false;

  private dragging = false;
  private pointerId: number | null = null;
  private dragOffset = 0;

  private turn: TurnState | null = null;
  private queue: Item[] = [];
  private consumed = 0;
  private busy = false;

  private frame = 0;
  private lastFrameAt = 0;
  private hintTimer: ReturnType<typeof setTimeout> | null = null;
  /** Minuteries diverses, toutes annulées au démontage. */
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private disposed = false;
  private reducedMotion = false;

  /**
   * Incrémenté à chaque montage et démontage. React en mode strict monte,
   * démonte puis remonte : sans ce jeton, les continuations asynchrones du
   * premier montage viendraient piloter le second.
   */
  private generation = 0;

  private pawnImage: HTMLImageElement | null = null;
  private goalImage: HTMLImageElement | null = null;

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
    // Doit être remis à zéro : une frame annulée au démontage laisserait
    // `invalidate()` croire qu'une image est déjà en vol, et la boucle de rendu
    // ne redémarrerait jamais.
    this.frame = 0;
    this.reducedMotion = prefersReducedMotion();

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'width:100%;height:100%;display:block';
    props.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;

    this.position = initialPosition(this.config, Math.random);

    this.resize();
    window.addEventListener('resize', this.onResize);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);

    if (import.meta.env.DEV) {
      // Le débogage se fait sur la tablette via `chrome://inspect` : l'émulation
      // de DevTools ne reproduit ni la latence tactile ni les performances
      // réelles. Cette poignée donne accès à l'état sans instrumenter le rendu.
      (window as unknown as Record<string, unknown>).__chemin = this;
    }

    // Les images sont chargées ici, jamais pendant une tâche : un décodage au
    // milieu d'un glissement produit une saccade très visible.
    void this.preload().then(() => {
      if (this.generation !== generation) return;
      this.invalidate();
      this.beginTurn();
    });
  }

  unmount(): void {
    this.generation += 1;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.clearHintTimer();
    this.clearRollTimer();
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.turn?.recording?.cancel();
    window.removeEventListener('resize', this.onResize);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.remove();
  }

  private async preload(): Promise<void> {
    const character =
      this.props.pack.characters.find((c) => c.roles.includes('pion')) ?? this.props.pack.characters[0];
    const goal = this.props.pack.activityAssets.chemin?.goal;

    this.pawnImage = cachedImage(character.image) ?? (await loadImage(character.image).catch(() => null));
    if (typeof goal === 'string') {
      this.goalImage = cachedImage(goal) ?? (await loadImage(goal).catch(() => null));
    }
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

    this.geo = computeGeometry(width, height, this.config);
    this.pawnTarget = caseCenterX(this.geo, this.position);
    this.pawnX = this.pawnTarget;
    this.cameraTarget = cameraFor(this.geo, this.pawnX);
    this.camera = this.cameraTarget;
    this.invalidate();
  }

  /* ---------------- tours ---------------- */

  private beginTurn(): void {
    if (this.disposed) return;

    if (this.consumed >= this.queue.length) {
      this.props.onFinished();
      return;
    }

    // Plus de place devant : on atteint le phare avant de repartir sur un
    // nouveau plateau. La série continue, c'est le plateau qui recommence.
    if (remainingHops(this.config, this.position) === 0) {
      void this.playGoalScene();
      return;
    }

    const item = this.queue[this.consumed];
    const requested = Number(item.params.count ?? 1);
    const count = Math.max(1, Math.min(requested, remainingHops(this.config, this.position)));

    this.turn = {
      item,
      // On journalise la case réellement pratiquée, pas celle qu'avait prévue le
      // planificateur : c'est la position du pion qui fait foi.
      reportedId: itemId(this.config, this.position, count),
      startPosition: this.position,
      count,
      startedAt: 0,
      attempts: 0,
      assisted: false,
      firstGestureHops: 0,
      gestureCount: 0,
      recording: null,
    };

    this.die = null;
    this.dieRolling = false;
    this.pulsing.clear();
    this.invalidate();

    /*
     * La consigne n'est donnée qu'au **premier tour de la série**.
     *
     * Sans elle, un enfant qui découvre l'atelier n'a aucun moyen de savoir
     * qu'il faut taper le dé — il n'y a pas de texte, et il ne lit pas. La
     * répéter à chaque tour serait en revanche du harcèlement : une fois la
     * règle comprise, le silence est ce qu'il faut.
     */
    if (this.consumed === 0) {
      void this.props.speak('chemin.roll');
    }
  }

  private rollDie(): void {
    const turn = this.turn;
    if (!turn || this.die !== null || this.dieRolling || this.busy) return;

    if (this.reducedMotion) {
      this.settleDie();
      return;
    }

    this.dieRolling = true;
    this.rollStartedAt = performance.now();

    /*
     * L'arrêt du dé est piloté par un `setTimeout`, pas par la boucle de rendu.
     * `requestAnimationFrame` est suspendu dès que l'app passe en arrière-plan :
     * y accrocher une transition d'état laisserait le dé tourner indéfiniment au
     * retour. La boucle ne fait qu'animer la face qui défile.
     */
    const generation = this.generation;
    this.clearRollTimer();
    this.rollTimer = setTimeout(() => {
      this.rollTimer = null;
      if (this.generation === generation && this.dieRolling) this.settleDie();
    }, ROLL_DURATION_MS);

    this.invalidate();
  }

  private clearRollTimer(): void {
    if (this.rollTimer !== null) {
      clearTimeout(this.rollTimer);
      this.rollTimer = null;
    }
  }

  private settleDie(): void {
    const turn = this.turn;
    if (!turn) return;

    this.clearRollTimer();
    this.dieRolling = false;
    this.die = turn.count;
    turn.startedAt = performance.now();

    /*
     * Le dé est énoncé aux niveaux 0 et 1 seulement.
     *
     * À ce stade l'enfant apprend encore à relier « deux points » au mot
     * « deux » : l'entendre l'aide et lui donne son but. À partir du niveau 2,
     * l'annoncer supprimerait le travail de subitisation — reconnaître une
     * petite quantité d'un coup d'œil — qui est précisément ce que les points
     * sont là pour provoquer. Les points restent l'information ; c'est à
     * l'enfant de les lire.
     *
     * C'est un nombre-quantité, pas un numéro de case : les deux moments sont
     * distincts, il n'y a pas de confusion avec l'énoncé ordinal du déplacement.
     */
    if (!this.config.childSpeaks) void this.props.speak(`num.${turn.count}`);

    // Deuxième moitié de la consigne, elle aussi au premier tour seulement :
    // savoir qu'il faut *glisser* le pion, et non taper la case d'arrivée.
    if (this.consumed === 0) {
      this.later(
        () => this.props.speak(this.config.childSpeaks ? 'chemin.say' : 'chemin.move'),
        1400,
      );
    }

    // Le micro n'est sollicité qu'aux niveaux où l'enfant énonce : la permission
    // est donc demandée là, à la première utilisation réelle, jamais au démarrage.
    if (this.config.childSpeaks) {
      void startRecording().then((rec) => {
        if (this.turn === turn && !this.disposed) turn.recording = rec;
        else rec?.cancel();
      });
    }

    this.invalidate();
  }

  private async playGoalScene(): Promise<void> {
    const generation = this.generation;

    this.busy = true;
    this.goalLit = true;
    this.invalidate();

    void this.props.speak('praise');
    await wait(GOAL_SCENE_MS);
    if (this.generation !== generation) return;

    this.goalLit = false;
    this.position = initialPosition(this.config, Math.random);
    this.pawnTarget = caseCenterX(this.geo, this.position);
    this.pawnX = this.pawnTarget;
    this.cameraTarget = cameraFor(this.geo, this.pawnX);
    this.camera = this.cameraTarget;
    this.busy = false;

    this.beginTurn();
  }

  private async completeTurn(): Promise<void> {
    const turn = this.turn;
    if (!turn) return;
    const generation = this.generation;

    this.busy = true;
    this.clearHintTimer();
    this.pulsing.clear();

    // Niveaux 2 et plus : l'enfant a énoncé, l'app valide après coup en
    // redonnant le modèle. On ne compare rien — produire suffit.
    //
    // Cette relecture est volontairement **non bloquante** : si l'enfant
    // rattrape le dé avant la fin, il ne doit pas attendre. Chaque énoncé annule
    // le précédent, donc la relecture s'interrompt d'elle-même.
    if (this.config.childSpeaks) {
      void turn.recording
        ?.stop()
        .then((blob) => {
          if (blob) void saveChildVoice(this.sessionStamp(), turn.reportedId, blob);
        })
        .catch(() => undefined);

      void (async () => {
        for (const n of casesCrossed(this.config, turn.startPosition, turn.count)) {
          if (this.generation !== generation) return;
          await this.props.speak(`num.${n}`);
        }
      })();
    }

    const result: ItemResult = {
      itemId: turn.reportedId,
      skill: 'counting.sequence',
      correct: turn.firstGestureHops === turn.count,
      attempts: Math.max(1, turn.attempts),
      latencyMs: Math.round(performance.now() - turn.startedAt),
      assisted: turn.assisted,
      spoke: this.config.childSpeaks,
    };

    this.turn = null;
    this.consumed += 1;
    this.props.onItemResult(result);

    if (this.generation !== generation) return;
    this.busy = false;
    this.beginTurn();
  }

  private sessionStamp(): number {
    return Math.floor(Date.now() / 1000) * 1000;
  }

  /* ---------------- gestes ---------------- */

  private toBoardX(e: PointerEvent): number {
    const rect = this.canvas.getBoundingClientRect();
    return e.clientX - rect.left + this.camera;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (this.busy || !this.turn) return;

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (this.die === null && !this.dieRolling) {
      if (hitsDie(this.geo, screenX, screenY)) this.rollDie();
      return;
    }

    const boardX = screenX + this.camera;
    if (!hitsPawn(this.geo, this.pawnX, boardX, screenY)) return;

    // L'aide s'efface dès que l'enfant reprend la main : elle ne doit pas
    // rester à l'écran comme un reproche.
    this.clearHintTimer();
    this.pulsing.clear();

    this.dragging = true;
    this.pointerId = e.pointerId;
    this.dragOffset = boardX - this.pawnX;
    this.turn.attempts += 1;
    this.turn.gestureCount += 1;
    try {
      // La capture garantit qu'un doigt qui sort du canvas continue de piloter
      // le pion. Certains WebView Android la refusent : ce n'est pas bloquant.
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignoré.
    }
    this.invalidate();
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging || e.pointerId !== this.pointerId || !this.turn) return;

    const turn = this.turn;
    const boardX = this.toBoardX(e) - this.dragOffset;
    const done = hopsFrom(this.config, turn.startPosition, this.position);

    // Butée souple : le pion suit le doigt mais ne dépasse pas le compte du dé.
    // Aucun message, aucun son — le refus est dans le dispositif.
    const limitX = caseCenterX(
      this.geo,
      clampToAllowance(
        this.position + this.config.dir * this.config.step,
        this.config,
        turn.startPosition,
        turn.count,
      ),
    );
    this.pawnX =
      this.config.dir > 0 ? Math.min(boardX, limitX) : Math.max(boardX, limitX);

    if (done < turn.count) {
      const snapped = nextSnap(this.geo, this.config, this.position, this.pawnX);
      if (snapped !== null) this.commitCase(snapped);
    }

    this.cameraTarget = cameraFor(this.geo, this.pawnX);
    this.invalidate();
  };

  /** Une case franchie : illumination, énoncé, retour haptique. */
  private commitCase(index: number): void {
    const turn = this.turn;
    if (!turn) return;

    this.position = index;
    this.flashes.set(index, performance.now());
    tick();

    // Jusqu'au niveau 1, l'app énonce. À partir du niveau 2 elle se tait :
    // c'est l'enfant qui compte à voix haute.
    if (!this.config.childSpeaks) void this.props.speak(`num.${index}`);

    const hops = hopsFrom(this.config, turn.startPosition, this.position);
    if (this.dragging && turn.gestureCount === 1) turn.firstGestureHops = hops;

    this.pawnTarget = caseCenterX(this.geo, this.position);

    if (hops >= turn.count) {
      this.dragging = false;
      this.pointerId = null;
      this.pawnX = this.pawnTarget;
      void this.completeTurn();
    }
  }

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;

    this.dragging = false;
    this.pointerId = null;
    this.pawnTarget = caseCenterX(this.geo, this.position);
    this.invalidate();

    const turn = this.turn;
    if (!turn) return;

    const remaining = turn.count - hopsFrom(this.config, turn.startPosition, this.position);
    if (remaining <= 0) return;

    // Arrêt trop tôt. On ne dit rien tout de suite : un enfant qui relâche pour
    // mieux reprendre n'a pas échoué. Ce n'est qu'après un vrai temps mort que
    // les cases restantes se mettent à pulser.
    this.hintTimer = setTimeout(() => {
      if (this.disposed || this.turn !== turn) return;
      turn.assisted = true;
      this.pulseStart = performance.now();
      this.pulsing.clear();
      for (let i = 1; i <= remaining; i++) {
        this.pulsing.add(this.position + this.config.dir * i * this.config.step);
      }
      this.invalidate();
    }, HINT_DELAY_MS);
  };

  private clearHintTimer(): void {
    if (this.hintTimer !== null) {
      clearTimeout(this.hintTimer);
      this.hintTimer = null;
    }
  }

  /** Diffère une action, sans qu'elle survive au démontage. */
  private later(fn: () => void, ms: number): void {
    const generation = this.generation;
    const id = setTimeout(() => {
      this.timers.delete(id);
      if (this.generation === generation) fn();
    }, ms);
    this.timers.add(id);
  }

  /* ---------------- boucle de rendu ---------------- */

  /**
   * La boucle ne tourne que tant que quelque chose bouge, et s'arrête sinon.
   * Pendant une tâche, presque rien ne bouge : c'est exactement l'intention
   * pédagogique, et cela vaut aussi comme budget de performance.
   */
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

    if (this.dieRolling) {
      this.dieFace =
        1 + (Math.floor((now - this.rollStartedAt) / ROLL_FACE_MS) % this.config.maxRoll);
      animating = true;
    }

    // Lissage exponentiel, normalisé sur le temps écoulé pour rester identique
    // quelle que soit la fréquence d'images réelle de la tablette.
    const ease = 1 - Math.pow(0.001, dt / 1000);

    if (!this.dragging && Math.abs(this.pawnX - this.pawnTarget) > 0.5) {
      this.pawnX += (this.pawnTarget - this.pawnX) * ease;
      animating = true;
    } else if (!this.dragging) {
      this.pawnX = this.pawnTarget;
    }

    if (Math.abs(this.camera - this.cameraTarget) > 0.5) {
      this.camera += (this.cameraTarget - this.camera) * ease;
      animating = true;
    } else {
      this.camera = this.cameraTarget;
    }

    for (const [index, at] of this.flashes) {
      if (now - at >= FLASH_MS) this.flashes.delete(index);
      else animating = true;
    }

    if (this.pulsing.size > 0 && !this.reducedMotion) animating = true;

    draw(this.ctx, this.renderState(now));

    if (animating) this.frame = requestAnimationFrame(this.tickFrame);
  };

  private renderState(now: number): RenderState {
    return {
      geo: this.geo,
      config: this.config,
      palette: this.props.pack.palette,
      position: this.position,
      pawnX: this.pawnX,
      camera: this.camera,
      die: this.die,
      dieRemaining: this.turn
        ? this.turn.count - hopsFrom(this.config, this.turn.startPosition, this.position)
        : 0,
      dieRolling: this.dieRolling,
      dieFace: this.dieFace,
      flashes: this.flashes,
      pulsing: this.pulsing,
      pulseStart: this.pulseStart,
      goalLit: this.goalLit,
      pawnImage: this.pawnImage,
      goalImage: this.goalImage,
      reducedMotion: this.reducedMotion,
      now,
    };
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function createChemin(): Activity {
  return new CheminActivity();
}

export { poolForLevel, configForLevel };
