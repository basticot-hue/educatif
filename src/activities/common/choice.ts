/**
 * Mécanique « choisir parmi N ».
 *
 * Quatre ateliers reposent dessus — Le Bal des syllabes, Le Sac de Chase, Le
 * Château des mots et Le Récit. Les règles non négociables sont donc écrites
 * **ici, une seule fois**, plutôt que réinventées quatre fois avec quatre
 * dérives possibles :
 *
 * - **L'erreur n'est pas un événement.** Pas de croix, pas de son grave, pas de
 *   vies. Un mauvais choix recule doucement et rend la main.
 * - **Après deux hésitations sur le même item**, on rejoue le contraste — les
 *   deux sons côte à côte — au lieu de laisser l'enfant deviner.
 * - **L'enfant produit du langage** : quand l'item le demande, il redit quelque
 *   chose à voix haute avant validation. On enregistre sans jamais analyser.
 * - **Aucune récompense extrinsèque**, aucun score, aucun niveau affiché.
 * - Cibles d'au moins 88 px, espacées d'au moins 24 px.
 */

import type { ItemResult, SkillId, SpeechKey } from '../../engine/types';
import { tick } from '../../engine/audio';
import { el, wait } from './stage';

/** Nombre d'erreurs sur un même item avant de faire entendre le contraste. */
export const CONTRAST_AFTER = 2;

export interface ChoiceOption {
  id: string;
  /** URL d'image, ou SVG en ligne via `glyph`. */
  image?: string;
  glyph?: string;
  /** Lu par les lecteurs d'écran uniquement — jamais affiché. */
  label?: string;
  /** Rejoué sur appui long, pour réentendre la consigne d'une option. */
  sound?: SpeechKey;
}

export interface ChoiceRound {
  itemId: string;
  skill: SkillId;
  options: ChoiceOption[];
  correctId: string;
  /** Énoncé au début du tour. */
  prompt?: () => Promise<void>;
  /** Rejoué après deux erreurs : les deux sons côte à côte. */
  contrast?: (chosenId: string) => Promise<void>;
  /** L'enfant doit-il produire quelque chose à l'oral sur cet item ? */
  speaks?: boolean;
  /** Taille de la grille : 2, 3 ou 4 options par ligne. */
  columns?: number;
}

export interface ChoiceHost {
  speak(key: SpeechKey): Promise<void>;
  recordVoice(itemId: string): Promise<Blob | null>;
  onItemResult(r: ItemResult): void;
}

/**
 * Présente une suite de tours et rend la main quand ils sont tous consommés.
 * Ne connaît rien du contenu : c'est l'atelier qui fabrique les tours.
 */
export class ChoiceRunner {
  private root: HTMLElement;
  private host: ChoiceHost;
  private rounds: ChoiceRound[] = [];
  private index = 0;
  private disposed = false;
  private busy = false;

  private startedAt = 0;
  private attempts = 0;
  private assisted = false;
  private spoke = false;

  constructor(root: HTMLElement, host: ChoiceHost) {
    this.root = root;
    this.host = host;
  }

  async run(rounds: ChoiceRound[]): Promise<void> {
    this.rounds = rounds;
    this.index = 0;
    await this.showCurrent();
  }

  dispose(): void {
    this.disposed = true;
  }

  private get round(): ChoiceRound | null {
    return this.rounds[this.index] ?? null;
  }

  private async showCurrent(): Promise<void> {
    const round = this.round;
    if (!round || this.disposed) return;

    this.attempts = 0;
    this.assisted = false;
    this.spoke = false;

    this.render(round);

    await round.prompt?.();
    if (this.disposed) return;
    this.startedAt = performance.now();
  }

  private render(round: ChoiceRound): void {
    this.root.textContent = '';

    const grid = el('div', 'choice-grid', this.root);
    grid.dataset.columns = String(round.columns ?? round.options.length);

    for (const option of round.options) {
      const button = el('button', 'choice', grid);
      button.setAttribute('aria-label', option.label ?? option.id);

      if (option.image) {
        const img = el('img', undefined, button);
        img.src = option.image;
        img.alt = '';
      } else if (option.glyph) {
        button.innerHTML = option.glyph;
      }

      // Appui long : réentendre l'option. Sans cela, un enfant qui a oublié la
      // consigne n'a aucun moyen de la redemander, et devine.
      let longPress: ReturnType<typeof setTimeout> | null = null;
      const cancelLongPress = () => {
        if (longPress !== null) clearTimeout(longPress);
        longPress = null;
      };

      button.addEventListener('pointerdown', () => {
        if (!option.sound) return;
        longPress = setTimeout(() => {
          longPress = null;
          void this.host.speak(option.sound!);
        }, 600);
      });
      button.addEventListener('pointerup', cancelLongPress);
      button.addEventListener('pointerleave', cancelLongPress);
      button.addEventListener('pointercancel', cancelLongPress);

      button.addEventListener('click', () => {
        if (longPress !== null) return; // c'était le début d'un appui long
        void this.choose(round, option, button);
      });
    }
  }

  private async choose(
    round: ChoiceRound,
    option: ChoiceOption,
    button: HTMLElement,
  ): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    this.attempts += 1;

    if (option.id !== round.correctId) {
      await this.rejectGently(round, option, button);
      this.busy = false;
      return;
    }

    tick();
    button.classList.add('chosen');

    // Production orale : l'enfant redit avant que le tour se referme. On garde
    // le son, on ne l'analyse pas — à cet âge, produire est ce qui compte.
    if (round.speaks) {
      button.classList.add('listening');
      const blob = await this.host.recordVoice(round.itemId);
      this.spoke = true; // vrai même sans micro : l'occasion a été donnée
      void blob;
      if (this.disposed) return;
      button.classList.remove('listening');
    }

    await wait(450);
    if (this.disposed) return;

    this.host.onItemResult({
      itemId: round.itemId,
      skill: round.skill,
      correct: this.attempts === 1 && !this.assisted,
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
   * Un mauvais choix : l'option recule doucement et se remet en place. Aucun
   * son négatif, aucune marque qui reste. L'enfant peut réessayer aussitôt.
   */
  private async rejectGently(
    round: ChoiceRound,
    option: ChoiceOption,
    button: HTMLElement,
  ): Promise<void> {
    button.classList.add('refused');
    await wait(420);
    button.classList.remove('refused');
    if (this.disposed) return;

    if (this.attempts >= CONTRAST_AFTER) {
      this.assisted = true;
      if (round.contrast) await round.contrast(option.id);
      else await round.prompt?.();
    }
  }
}
