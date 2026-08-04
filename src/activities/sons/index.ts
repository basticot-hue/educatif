/**
 * Le Sac de Chase.
 *
 * Deux ou trois sacs, chacun désigné par **un mot entier qu'on entend**. Les
 * objets arrivent en bas ; l'enfant les écoute, puis glisse chacun dans le sac
 * dont le mot commence pareil.
 *
 * L'atelier ne montre jamais une lettre, ne prononce jamais un nom de lettre,
 * et n'affiche aucun texte. Ce qui distingue deux sacs est ce qu'on entend en
 * les touchant — rien d'autre. Les couleurs servent seulement à viser.
 *
 * Aux niveaux hauts, la même mécanique bascule sur la **fin** du mot (niveau 5)
 * puis sur la fusion : le mot est prononcé en morceaux détachés, et l'enfant
 * désigne le mot entier (niveau 6).
 */

import type { Activity, ActivityProps, Item } from '../../engine/types';
import { wordImage } from '../../content/wordImages';
import { SortRunner, type SortRound } from '../common/sort';
import { el, wait } from '../common/stage';
import '../common/activity.css';
import {
  buildRound,
  configForLevel,
  fusionRound,
  itemId,
  poolForLevel,
  skillForLevel,
  wordById,
  type LevelConfig,
} from './levels';

export const MAX_LEVEL = 6;

/**
 * Teintes des sacs.
 *
 * Elles ne portent aucune information : deux sacs se distinguent par ce qu'on
 * entend. Elles existent pour qu'un enfant qui traverse l'écran avec un objet
 * dans le doigt sache lequel il vise.
 */
const TINTS = ['#F3E2C7', '#D9E8F2', '#E5E2F2'];

class SonsActivity implements Activity {
  readonly id = 'sons' as const;
  readonly skills = ['phono.onset' as const, 'phono.coda' as const, 'phono.blend' as const];
  readonly maxLevel = MAX_LEVEL;

  private props!: ActivityProps;
  private config!: LevelConfig;
  private root!: HTMLElement;
  private sorter: SortRunner | null = null;

  private queue: Item[] = [];
  private consumed = 0;
  private generation = 0;
  private disposed = false;

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

    this.root = el('div', 'stage');
    props.container.appendChild(this.root);

    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__sons = this;
    }

    void (async () => {
      // Même césure que les autres ateliers : en mode strict, React monte,
      // démonte et remonte, et sans elle la consigne se dirait deux fois.
      await Promise.resolve();
      if (this.generation !== generation) return;
      void this.next();
    })();
  }

  unmount(): void {
    this.generation += 1;
    this.disposed = true;
    this.sorter?.dispose();
    this.sorter = null;
    this.root.remove();
  }

  /* ---------------- enchaînement ---------------- */

  private async next(): Promise<void> {
    if (this.disposed) return;

    if (this.consumed >= this.queue.length) {
      this.props.onFinished();
      return;
    }

    const item = this.queue[this.consumed];
    const round =
      this.config.mode === 'fusion' ? this.buildFusion(item) : this.buildSorting(item);

    if (!round) {
      // Une famille peut avoir perdu ses mots si le pack a changé : on saute
      // l'item plutôt que de présenter un tour impossible.
      this.consumed += 1;
      return this.next();
    }

    this.root.textContent = '';
    const host = el('div', undefined, this.root);
    host.style.cssText = 'width:100%;height:100%';

    this.sorter = new SortRunner(host, {
      speak: (key) => this.props.speak(key),
      recordVoice: (id) => this.props.recordVoice(id),
      onItemResult: (result) => {
        this.consumed += 1;
        this.props.onItemResult(result);
        if (!this.disposed) void this.next();
      },
    });

    await this.sorter.run([round]);
  }

  /* ---------------- niveaux 0 à 5 : ranger dans les sacs ---------------- */

  private buildSorting(item: Item): SortRound | null {
    const keys = (item.params.keys as string[]) ?? [];
    const round = buildRound(this.props.level, keys, Math.random);
    if (!round) return null;

    const promptKey =
      this.config.mode === 'finale' ? 'sons.finale' : 'sons.attaque';

    return {
      itemId: item.id,
      skill: skillForLevel(this.props.level),
      speaks: this.config.childSpeaks,
      announceBins: true,
      bins: round.bags.map((bag, i) => ({
        id: bag.key,
        image: wordImage(bag.reference),
        label: bag.reference.label,
        sound: `mot.${bag.reference.id}`,
        tint: TINTS[i % TINTS.length],
        accepts: round.cards.filter((c) => c.bagKey === bag.key).map((c) => c.word.id),
      })),
      cards: round.cards.map((c) => ({
        id: c.word.id,
        image: wordImage(c.word),
        label: c.word.label,
        sound: `mot.${c.word.id}`,
      })),
      prompt: async () => {
        await this.props.speak(promptKey);
      },
      contrast: async (cardId) => {
        /*
         * Contrôle de l'erreur : on fait entendre l'objet mal rangé, puis le
         * mot du sac où il va. Deux mots côte à côte, sans commentaire — c'est
         * la comparaison elle-même qui enseigne, pas un « non ».
         */
        const card = round.cards.find((c) => c.word.id === cardId);
        if (!card) return;
        const bag = round.bags.find((b) => b.key === card.bagKey);
        await this.props.speak(`mot.${card.word.id}`);
        await wait(220);
        if (bag) await this.props.speak(`mot.${bag.reference.id}`);
      },
    };
  }

  /* ---------------- niveau 6 : recoller un mot ---------------- */

  private buildFusion(item: Item): SortRound | null {
    const word = wordById(String(item.params.wordId));
    if (!word) return null;
    const round = fusionRound(word, Math.random);
    if (!round) return null;

    const options = [round.target, ...round.others].sort(() => Math.random() - 0.5);

    return {
      itemId: item.id,
      skill: skillForLevel(this.props.level),
      speaks: true,
      /*
       * On ne nomme **pas** les cartes au départ.
       *
       * Aux autres niveaux, l'annonce garantit que l'enfant a entendu les mots
       * au moins une fois. Ici elle donnerait la réponse : la tâche est
       * justement de reconnaître un mot à ses morceaux. Toucher une carte la
       * dit quand même — comparer un mot entendu à un mot découpé reste du
       * travail, se souvenir de trois images n'en est pas.
       */
      announce: false,
      bins: [
        {
          id: 'sac',
          glyph: sackGlyph(),
          label: 'le sac',
          accepts: [round.target.id],
        },
      ],
      cards: options.map((w) => ({
        id: w.id,
        image: wordImage(w),
        label: w.label,
        sound: `mot.${w.id}`,
      })),
      extras: round.others.map((w) => w.id),
      prompt: async () => {
        await this.props.speak('sons.fusion');
        await this.speakSplit(round.target);
      },
      contrast: async () => {
        await this.speakSplit(round.target);
        await wait(240);
        await this.props.speak(`mot.${round.target.id}`);
      },
    };
  }

  /** Le mot en morceaux détachés, avec une vraie respiration entre eux. */
  private async speakSplit(word: { split: string[] }): Promise<void> {
    for (const part of word.split) {
      if (this.disposed) return;
      await this.props.speak(`syl.${part}`);
      await wait(260);
    }
  }
}

/** Un sac ouvert. Zéro texte : c'est l'endroit où l'on pose, rien de plus. */
function sackGlyph(): string {
  return (
    `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="M28 44 Q60 32 92 44 L102 100 Q60 112 18 100 Z" fill="#C9A96B" stroke="#2A2A2A" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M28 44 Q60 56 92 44" fill="none" stroke="#2A2A2A" stroke-width="3"/>` +
    `<path d="M40 38 Q60 26 80 38" fill="none" stroke="#8A6E45" stroke-width="6" stroke-linecap="round"/>` +
    `</svg>`
  );
}

export function createSons(): Activity {
  return new SonsActivity();
}

export { poolForLevel, configForLevel, skillForLevel, itemId };
