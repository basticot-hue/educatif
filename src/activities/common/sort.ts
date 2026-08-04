/**
 * Mécanique « écouter, puis glisser sur la bonne cible ».
 *
 * Trois ateliers reposent dessus — les rimes du Bal, Le Sac de Chase et Le
 * Château des mots. Elle se distingue du « choisir parmi N » de `choice.ts` sur
 * un point qui n'est pas cosmétique :
 *
 * - **taper ne répond pas, taper écoute.** Un enfant de trois ans et demi ne
 *   connaît pas tous les mots du pack. Devant deux images muettes, il ne
 *   compare pas des sons : il tape au hasard, et l'atelier ne mesure plus rien.
 *   Ici, chaque carte se nomme quand on la touche, autant de fois qu'on veut.
 * - **on répond en glissant** la carte sur la cible. Le geste est plus lent et
 *   plus coûteux qu'un tap — c'est exactement ce qu'on veut : il oblige à
 *   désigner, donc à décider. C'est le même parti pris qu'aux Missions.
 *
 * Le reste des règles est celui de `choice.ts`, et pour les mêmes raisons :
 * l'erreur n'est pas un événement, le contraste s'entend après deux essais,
 * aucune récompense extrinsèque, cibles d'au moins 88 px.
 */

import type { ItemResult, SkillId, SpeechKey } from '../../engine/types';
import { tick } from '../../engine/audio';
import { el, wait } from './stage';
import './sort.css';

/** Nombre d'erreurs sur un même item avant de faire entendre le contraste. */
export const CONTRAST_AFTER = 2;

/** Distance au-delà de laquelle un contact devient un glissement, pas un tap. */
const DRAG_THRESHOLD = 12;

export interface SortCard {
  id: string;
  image?: string;
  /** SVG en ligne, quand la carte n'est pas une photo. */
  glyph?: string;
  /** Lu par les lecteurs d'écran uniquement — jamais affiché. */
  label?: string;
  /** Ce qu'on entend en touchant la carte. Sans cela, la carte reste muette. */
  sound?: SpeechKey;
}

export interface SortBin extends SortCard {
  /** Cartes que cette cible accepte. Les autres reviennent à leur place. */
  accepts: string[];
  /**
   * Teinte de fond de la cible.
   *
   * Elle ne dit rien de la réponse — deux sacs se distinguent par ce qu'on
   * entend, pas par leur couleur. Elle sert seulement à ce que l'enfant sache
   * *lequel* il vise en glissant, et se souvienne d'y revenir.
   */
  tint?: string;
}

export interface SortRound {
  itemId: string;
  skill: SkillId;
  bins: SortBin[];
  cards: SortCard[];
  /** Énoncé au début du tour, avant la présentation des cartes. */
  prompt?: () => Promise<void>;
  /**
   * Faut-il nommer chaque carte au début du tour ?
   *
   * Vrai par défaut : c'est la seule garantie que l'enfant ait entendu tous les
   * mots au moins une fois avant qu'on lui demande de comparer.
   */
  announce?: boolean;
  /**
   * Faut-il aussi nommer les cibles ?
   *
   * Vrai quand la cible est elle-même un mot à entendre — le sac « comme
   * papillon » ne se devine pas à son dessin. Faux quand la consigne l'a déjà
   * prononcée, pour ne pas la répéter deux fois de suite.
   */
  announceBins?: boolean;
  /** Rejoué après deux erreurs : les deux sons côte à côte. */
  contrast?: (cardId: string) => Promise<void>;
  /** L'enfant doit-il produire quelque chose à l'oral sur cet item ? */
  speaks?: boolean;
  /**
   * Cartes qui n'appartiennent à aucune cible. Elles restent posées : rien ne
   * les refuse bruyamment, elles ne se rangent simplement nulle part.
   */
  extras?: string[];
}

export interface SortHost {
  speak(key: SpeechKey): Promise<void>;
  recordVoice(itemId: string): Promise<Blob | null>;
  onItemResult(r: ItemResult): void;
}

export class SortRunner {
  private root: HTMLElement;
  private host: SortHost;
  private rounds: SortRound[] = [];
  private index = 0;
  private disposed = false;
  private busy = false;

  private startedAt = 0;
  private attempts = 0;
  private assisted = false;
  private spoke = false;
  private placed = new Set<string>();

  private binNodes = new Map<string, HTMLElement>();
  private timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(root: HTMLElement, host: SortHost) {
    this.root = root;
    this.host = host;
  }

  async run(rounds: SortRound[]): Promise<void> {
    this.rounds = rounds;
    this.index = 0;
    await this.showCurrent();
  }

  dispose(): void {
    this.disposed = true;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }

  private get round(): SortRound | null {
    return this.rounds[this.index] ?? null;
  }

  private async showCurrent(): Promise<void> {
    const round = this.round;
    if (!round || this.disposed) return;

    this.attempts = 0;
    this.assisted = false;
    this.spoke = false;
    this.placed = new Set();

    this.render(round);

    await round.prompt?.();
    if (this.disposed) return;

    if (round.announce !== false) await this.announce(round);
    if (this.disposed) return;

    this.startedAt = performance.now();
  }

  /**
   * Nomme chaque carte, l'une après l'autre, en la soulevant pendant qu'on
   * l'entend. C'est ce qui remplace la consigne écrite que l'enfant ne peut pas
   * lire : sans ce passage, comparer « chat » et « rat » revient à comparer deux
   * dessins.
   */
  private async announce(round: SortRound): Promise<void> {
    if (round.announceBins) {
      for (const bin of round.bins) {
        if (this.disposed || !bin.sound) continue;
        const node = this.binNodes.get(bin.id);
        node?.classList.add('naming');
        await this.host.speak(bin.sound);
        node?.classList.remove('naming');
        await wait(220);
      }
    }

    for (const card of round.cards) {
      if (this.disposed || !card.sound) continue;
      const node = this.root.querySelector<HTMLElement>(`[data-card="${CSS.escape(card.id)}"]`);
      node?.classList.add('naming');
      await this.host.speak(card.sound);
      node?.classList.remove('naming');
      await wait(220);
    }
  }

  /* ---------------- rendu ---------------- */

  private render(round: SortRound): void {
    this.root.textContent = '';
    this.binNodes.clear();

    const scene = el('div', 'sort', this.root);

    const bins = el('div', 'sort-bins', scene);
    for (const bin of round.bins) {
      const node = el('div', 'bin', bins);
      node.dataset.bin = bin.id;
      const face = el('button', 'bin-face', node);
      face.setAttribute('aria-label', bin.label ?? bin.id);
      if (bin.tint) face.style.background = bin.tint;
      this.paint(face, bin);
      // Une cible aussi s'écoute : le mot modèle des rimes est le premier que
      // l'enfant oublie, puisqu'il est prononcé avant les deux propositions.
      face.addEventListener('click', () => {
        if (bin.sound) void this.host.speak(bin.sound);
      });
      // Reçoit la carte acceptée, qui vient s'y ranger.
      el('div', 'bin-slot', node);
      this.binNodes.set(bin.id, node);
    }

    const cards = el('div', 'sort-cards', scene);
    for (const card of round.cards) {
      const node = el('button', 'card', cards);
      node.dataset.card = card.id;
      node.setAttribute('aria-label', card.label ?? card.id);
      this.paint(node, card);
      this.makeDraggable(node, round, card);
    }
  }

  private paint(node: HTMLElement, card: SortCard): void {
    if (card.image) {
      const img = el('img', undefined, node);
      img.src = card.image;
      img.alt = '';
      img.draggable = false;
    } else if (card.glyph) {
      node.innerHTML = card.glyph;
    }
  }

  /* ---------------- geste ---------------- */

  private makeDraggable(node: HTMLElement, round: SortRound, card: SortCard): void {
    let pointerId: number | null = null;
    let originX = 0;
    let originY = 0;
    let dragging = false;

    const reset = () => {
      node.style.transform = '';
      node.classList.remove('dragging');
      this.binNodes.forEach((bin) => bin.classList.remove('hovered'));
    };

    const onDown = (event: PointerEvent) => {
      if (this.busy || this.disposed || node.classList.contains('placed')) return;
      pointerId = event.pointerId;
      originX = event.clientX;
      originY = event.clientY;
      dragging = false;
      node.setPointerCapture(event.pointerId);
    };

    const onMove = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      const dx = event.clientX - originX;
      const dy = event.clientY - originY;

      if (!dragging) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        dragging = true;
        node.classList.add('dragging');
      }

      node.style.transform = `translate(${dx}px, ${dy}px)`;

      const over = this.binUnder(event.clientX, event.clientY);
      this.binNodes.forEach((bin, id) => bin.classList.toggle('hovered', id === over));
    };

    const onUp = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      pointerId = null;

      if (!dragging) {
        reset();
        // Contact sans déplacement : l'enfant demande à réentendre, pas à répondre.
        if (card.sound) void this.host.speak(card.sound);
        return;
      }

      const over = this.binUnder(event.clientX, event.clientY);
      reset();
      if (over) void this.drop(round, card, node, over);
    };

    node.addEventListener('pointerdown', onDown);
    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerup', onUp);
    node.addEventListener('pointercancel', () => {
      pointerId = null;
      reset();
    });
    // Sans cela, un `click` synthétique suivait chaque glissement et rejouait le
    // nom de la carte par-dessus la suite du tour.
    node.addEventListener('click', (e) => e.preventDefault());
  }

  /** Cible sous le doigt, s'il y en a une. Le test se fait sur la cible entière. */
  private binUnder(x: number, y: number): string | null {
    for (const [id, node] of this.binNodes) {
      const rect = node.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return id;
    }
    return null;
  }

  /* ---------------- résolution ---------------- */

  private async drop(
    round: SortRound,
    card: SortCard,
    node: HTMLElement,
    binId: string,
  ): Promise<void> {
    if (this.busy || this.disposed) return;
    const bin = round.bins.find((b) => b.id === binId);
    if (!bin) return;

    this.busy = true;
    this.attempts += 1;

    if (!bin.accepts.includes(card.id)) {
      await this.rejectGently(round, card, node);
      this.busy = false;
      return;
    }

    tick();
    node.classList.add('placed');

    /*
     * La carte laisse sa place derrière elle.
     *
     * Sans ce vide, retirer une carte de la rangée recentrait toutes les
     * autres : l'enfant visait un objet, le lâchait, et les objets restants
     * avaient bougé sous son doigt. À trois ans et demi, c'est le genre de
     * chose qui fait abandonner un tour qu'on avait compris.
     */
    const gap = el('div', 'card-gap');
    gap.style.width = `${node.offsetWidth}px`;
    gap.style.height = `${node.offsetHeight}px`;
    node.parentElement?.insertBefore(gap, node);

    const slot = this.binNodes.get(binId)?.querySelector('.bin-slot');
    slot?.appendChild(node);
    this.binNodes.get(binId)?.classList.add('filled');
    this.placed.add(card.id);

    const expected = round.cards.filter((c) => !(round.extras ?? []).includes(c.id));
    if (this.placed.size < expected.length) {
      this.busy = false;
      return;
    }

    if (round.speaks) {
      node.classList.add('listening');
      await this.host.recordVoice(round.itemId);
      this.spoke = true; // vrai même sans micro : l'occasion a été donnée
      if (this.disposed) return;
      node.classList.remove('listening');
    }

    await wait(450);
    if (this.disposed) return;

    this.host.onItemResult({
      itemId: round.itemId,
      skill: round.skill,
      correct: this.attempts === expected.length && !this.assisted,
      attempts: this.attempts,
      latencyMs: Math.round(performance.now() - this.startedAt),
      assisted: this.assisted,
      spoke: this.spoke,
    });

    this.index += 1;
    this.busy = false;
    await this.showCurrent();
  }

  /**
   * La carte refusée revient à sa place, sans un bruit. Puis, après deux essais,
   * on refait entendre le contraste plutôt que de laisser deviner.
   */
  private async rejectGently(
    round: SortRound,
    card: SortCard,
    node: HTMLElement,
  ): Promise<void> {
    node.classList.add('refused');
    await wait(420);
    node.classList.remove('refused');
    if (this.disposed) return;

    if (this.attempts >= CONTRAST_AFTER) {
      this.assisted = true;
      if (round.contrast) await round.contrast(card.id);
      else if (round.prompt) await round.prompt();
    }
  }
}
