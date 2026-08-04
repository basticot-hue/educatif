/**
 * Le Château des mots.
 *
 * En haut, des salles ; en bas, des objets. L'enfant écoute, puis glisse chaque
 * objet dans la salle où il vit. C'est la même mécanique que Le Sac de Chase —
 * écouter, puis glisser — mais ce qui décide n'est plus un son, c'est le
 * **sens** : la banane va avec la fraise parce qu'on les mange, pas parce
 * qu'elles commencent pareil.
 *
 * La salle se nomme quand on la touche, et les objets aussi. Sans cela,
 * l'atelier ne testerait que la connaissance du dessin.
 */

import type { Activity, ActivityProps, Item } from '../../engine/types';
import { wordById, type WordCard } from '../../content/packs/mascottes/words';
import { wordImage } from '../../content/wordImages';
import { SortRunner, type SortRound } from '../common/sort';
import { el, wait } from '../common/stage';
import '../common/activity.css';
import './chateau.css';
import {
  buildRound,
  configForLevel,
  intruderRound,
  itemId,
  poolForLevel,
  siblingsOf,
  signFor,
  skillForLevel,
  type LevelConfig,
} from './levels';

export const MAX_LEVEL = 6;

/** Teintes des salles. Elles servent à viser, jamais à répondre. */
const TINTS = ['#EFE3CE', '#DCE9E2', '#E7DFEE'];

/** Clé d'énoncé du nom d'une salle. Le texte vit dans `content/prompts.ts`. */
function categorySound(category: string): string {
  return `chateau.salle.${category}`;
}

class ChateauActivity implements Activity {
  readonly id = 'chateau' as const;
  readonly skills = ['lang.category' as const, 'lang.vocabulary' as const];
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

  mount(props: ActivityProps): void {
    const generation = ++this.generation;

    this.props = props;
    this.config = configForLevel(props.level);
    this.queue = [...props.items];
    this.consumed = 0;
    this.disposed = false;

    this.root = el('div', 'stage chateau');
    props.container.appendChild(this.root);

    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__chateau = this;
    }

    void (async () => {
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
      this.config.mode === 'intrus'
        ? this.buildIntruder(item)
        : this.config.mode === 'apporter'
          ? this.buildFetch(item)
          : this.buildSorting(item);

    if (!round) {
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

  private card(word: WordCard) {
    return { id: word.id, image: wordImage(word), label: word.label, sound: `mot.${word.id}` };
  }

  /* ---------------- niveaux 0 à 3 et 5 : ranger ---------------- */

  private buildSorting(item: Item): SortRound | null {
    const names = (item.params.rooms as string[]) ?? [];
    const round = buildRound(this.props.level, names, Math.random);
    if (!round) return null;

    return {
      itemId: item.id,
      skill: skillForLevel(this.props.level),
      speaks: this.config.childSpeaks,
      announceBins: true,
      bins: round.rooms.map((room, i) => ({
        id: room.category,
        image: wordImage(room.sign),
        label: room.category,
        sound: categorySound(room.category),
        tint: TINTS[i % TINTS.length],
        accepts: round.cards.filter((c) => c.category === room.category).map((c) => c.word.id),
      })),
      cards: round.cards.map((c) => this.card(c.word)),
      prompt: async () => {
        await this.props.speak('chateau.ranger');
      },
      contrast: async (cardId) => {
        // L'objet, puis le nom de sa salle. Aucun « non » : juste les deux
        // choses à rapprocher, dites l'une après l'autre.
        const card = round.cards.find((c) => c.word.id === cardId);
        if (!card) return;
        await this.props.speak(`mot.${card.word.id}`);
        await wait(220);
        await this.props.speak(categorySound(card.category));
      },
    };
  }

  /* ---------------- niveau 4 : l'intrus ---------------- */

  private buildIntruder(item: Item): SortRound | null {
    const category = String(item.params.category);
    const round = intruderRound(category, Math.random);
    if (!round) return null;

    const sign = signFor(category);
    const options = [...round.family, round.intruder].sort(() => Math.random() - 0.5);

    return {
      itemId: item.id,
      skill: skillForLevel(this.props.level),
      speaks: this.config.childSpeaks,
      announceBins: true,
      bins: [
        {
          id: 'dehors',
          glyph: doorGlyph(),
          label: 'dehors',
          sound: 'chateau.dehors',
          tint: TINTS[0],
          accepts: [round.intruder.id],
        },
      ],
      cards: options.map((w) => this.card(w)),
      // Les trois de la famille restent devant la salle : rien ne les refuse,
      // ils n'ont simplement rien à faire dehors.
      extras: round.family.map((w) => w.id),
      prompt: async () => {
        await this.props.speak('chateau.intrus');
        if (sign) await this.props.speak(categorySound(category));
      },
      contrast: async () => {
        await this.props.speak(categorySound(category));
        await wait(220);
        for (const word of round.family) {
          await this.props.speak(`mot.${word.id}`);
          await wait(160);
        }
      },
    };
  }

  /* ---------------- niveau 6 : apporter le mot demandé ---------------- */

  private buildFetch(item: Item): SortRound | null {
    const word = wordById(String(item.params.wordId));
    if (!word) return null;

    const others = siblingsOf(word, this.config.cards - 1, Math.random);
    if (others.length < this.config.cards - 1) return null;
    const options = [word, ...others].sort(() => Math.random() - 0.5);

    return {
      itemId: item.id,
      skill: skillForLevel(this.props.level),
      speaks: true,
      /*
       * Aucune annonce : le mot demandé est prononcé par la consigne, et
       * nommer les cartes le désignerait aussitôt. Les toucher les dit quand
       * même — reconnaître un mot parmi ses voisins de famille reste la tâche.
       */
      announce: false,
      bins: [
        {
          id: 'guide',
          image: this.props.pack.characters[0]?.portrait,
          label: this.props.pack.characters[0]?.name ?? 'le guide',
          accepts: [word.id],
        },
      ],
      cards: options.map((w) => this.card(w)),
      extras: others.map((w) => w.id),
      prompt: async () => {
        await this.props.speak('chateau.apporter');
        await wait(160);
        await this.props.speak(`mot.${word.id}`);
      },
      contrast: async () => {
        await this.props.speak(`mot.${word.id}`);
      },
    };
  }
}

/** Une porte ouverte sur l'extérieur : là où va ce qui n'est pas de la famille. */
function doorGlyph(): string {
  return (
    `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="M24 104 L24 44 Q60 12 96 44 L96 104 Z" fill="#8FB6D8" stroke="#2A2A2A" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M60 30 Q78 40 78 60 L78 104 L42 104 L42 60 Q42 40 60 30 Z" fill="#F5EEE0" stroke="#2A2A2A" stroke-width="3"/>` +
    `<circle cx="60" cy="16" r="9" fill="#F5C542" stroke="#2A2A2A" stroke-width="3"/>` +
    `<path d="M12 104 L108 104" stroke="#2A2A2A" stroke-width="4" stroke-linecap="round"/>` +
    `</svg>`
  );
}

export function createChateau(): Activity {
  return new ChateauActivity();
}

export { poolForLevel, configForLevel, skillForLevel, itemId };
