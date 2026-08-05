/**
 * Le Récit.
 *
 * L'histoire est racontée panneau par panneau — le panneau s'éclaire pendant
 * qu'on l'entend. Puis les panneaux sont mélangés, et l'enfant les glisse dans
 * l'ordre. Aux niveaux hauts, une question suit : ce n'est plus la chronologie
 * qui est en jeu mais ce qui s'est passé.
 *
 * Toucher un panneau **redit sa phrase**, autant de fois qu'on veut. C'est
 * indispensable : remettre en ordre quatre images qu'on a entendues une seule
 * fois n'est pas une tâche de récit, c'est une épreuve de mémoire immédiate.
 */

import { defaultPack } from '../../content/pack';
import { wordById } from '../../content/packs/mascottes/words';
import { wordImage } from '../../content/wordImages';
import type { Activity, ActivityProps, Item, PackStory } from '../../engine/types';
import { SortRunner, type SortRound } from '../common/sort';
import { el, shuffle, wait } from '../common/stage';
import '../common/activity.css';
import {
  configForLevel,
  itemId,
  poolForLevel,
  questionFor,
  skillForLevel,
  type LevelConfig,
} from './levels';

export const MAX_LEVEL = 6;

class RecitActivity implements Activity {
  readonly id = 'recit' as const;
  readonly skills = ['lang.narrative' as const];
  readonly maxLevel = MAX_LEVEL;

  private props!: ActivityProps;
  private config!: LevelConfig;
  private root!: HTMLElement;
  private host: HTMLElement | null = null;
  private sorter: SortRunner | null = null;

  private queue: Item[] = [];
  private consumed = 0;
  private generation = 0;
  private disposed = false;

  /**
   * Le vivier est bâti avant le montage, donc sans les `props` : on lit le pack
   * embarqué. Les substitutions d'images du parent n'y changent rien — elles ne
   * touchent pas la liste des histoires.
   */
  itemPool(level: number): Item[] {
    return poolForLevel(defaultPack(), level);
  }

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
      (window as unknown as Record<string, unknown>).__recit = this;
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
    const story = this.props.pack.stories.find((s) => s.id === item.params.storyId);
    if (!story) {
      this.consumed += 1;
      return this.next();
    }

    if (this.config.mode === 'question') await this.runQuestion(item, story);
    else await this.runOrder(item, story);
  }

  /** Prépare la scène et rend le lanceur de tours, prêt à recevoir un tour. */
  private runner(onDone: (result: Parameters<ActivityProps['onItemResult']>[0]) => void) {
    this.root.textContent = '';
    this.host = el('div', undefined, this.root);
    this.host.style.cssText = 'width:100%;height:100%';

    this.sorter = new SortRunner(this.host, {
      speak: (key) => this.props.speak(key),
      recordVoice: (id) => this.props.recordVoice(id),
      onItemResult: onDone,
    });
    return this.sorter;
  }

  /* ---------------- ordonner ---------------- */

  private async runOrder(item: Item, story: PackStory): Promise<void> {
    const panels = story.panels.slice(0, this.config.panels);
    const cards = shuffle(
      panels.map((panel) => ({
        id: panel.id,
        glyph: panelGlyph(story, panel.wordId, this.props.pack),
        label: panel.text,
        sound: `recit.${story.id}.${panel.id}`,
      })),
    );

    const round: SortRound = {
      itemId: item.id,
      skill: skillForLevel(this.props.level),
      speaks: this.config.childSpeaks && this.config.mode === 'ordre',
      // Les panneaux sont mélangés à l'écran : les nommer dans leur ordre
      // d'affichage raconterait l'histoire à l'envers. C'est `tell()` qui la
      // raconte, dans le bon ordre.
      announce: false,
      bins: panels.map((panel, i) => ({
        id: `place${i}`,
        glyph: slotGlyph(i + 1, panels.length),
        label: `place ${i + 1}`,
        accepts: [panel.id],
      })),
      cards,
      prompt: async () => {
        await this.props.speak('recit.ecoute');
        await this.tell(story, panels);
        if (!this.disposed) await this.props.speak('recit.ordonner');
      },
      contrast: async () => {
        // On raconte à nouveau, du début. Rien n'indique quel panneau était mal
        // placé : c'est l'histoire qui le dit, pas une marque rouge.
        await this.tell(story, panels);
      },
    };

    const runner = this.runner((result) => {
      this.consumed += 1;
      this.props.onItemResult(result);
      if (this.disposed) return;
      if (this.config.mode === 'les-deux') void this.runQuestionAfterOrder(story);
      else void this.next();
    });

    await runner.run([round]);
  }

  /**
   * Raconte l'histoire dans l'ordre, en éclairant chaque panneau au moment où
   * on l'entend. C'est ce qui relie une phrase à une image pour un enfant qui
   * ne lit pas.
   */
  private async tell(story: PackStory, panels: PackStory['panels']): Promise<void> {
    for (const panel of panels) {
      if (this.disposed) return;
      const node = this.host?.querySelector<HTMLElement>(`[data-card="${CSS.escape(panel.id)}"]`);
      node?.classList.add('naming');
      await this.props.speak(`recit.${story.id}.${panel.id}`);
      node?.classList.remove('naming');
      await wait(240);
    }
  }

  /* ---------------- répondre ---------------- */

  /** Niveau 6 : la question suit l'ordonnancement, sur la même histoire. */
  private async runQuestionAfterOrder(story: PackStory): Promise<void> {
    const item = this.queue[this.consumed - 1];
    if (!item) return this.next();
    await this.runQuestion(item, story, true);
  }

  private async runQuestion(item: Item, story: PackStory, alreadyScored = false): Promise<void> {
    const question = questionFor(story, Math.random);
    if (!question) {
      if (!alreadyScored) this.consumed += 1;
      return this.next();
    }

    // La bonne réponse fait toujours partie du lot : on la pose d'abord, on
    // complète avec les autres, puis on mélange. Découper la liste telle quelle
    // pouvait la laisser dehors, et le tour devenait insoluble.
    const others = question.options.filter((o) => o !== question.answer);
    const options = shuffle([question.answer, ...others].slice(0, this.config.options));

    const panels = story.panels.slice(0, this.config.panels);

    const round: SortRound = {
      itemId: `${item.id}.${question.id}`,
      skill: skillForLevel(this.props.level),
      speaks: this.config.childSpeaks,
      /*
       * On nomme les réponses, contrairement au tour d'ordre.
       *
       * `announce: false` y est justifié : les panneaux sont mélangés, et les
       * nommer dans l'ordre où ils sont posés raconterait l'histoire à
       * l'envers. Cette raison ne vaut pas pour des cartes-réponses, et le
       * recopier laissait l'enfant devant deux dessins qu'il n'avait jamais
       * entendu nommer. La consigne de `sort.ts` est explicite : c'est la seule
       * garantie qu'il ait entendu tous les mots avant qu'on lui demande de
       * comparer.
       *
       * La cible, elle, ne se renomme pas : la question vient d'être posée.
       */
      announceBins: false,
      bins: [
        {
          id: 'guide',
          image: this.characterImage(story),
          label: story.title,
          sound: `recit.${story.id}.q.${question.id}`,
          accepts: [question.answer],
        },
      ],
      cards: options.map((wordId) => {
        const word = wordById(wordId);
        return {
          id: wordId,
          image: word ? wordImage(word) : undefined,
          label: word?.label ?? wordId,
          sound: `mot.${wordId}`,
        };
      }),
      extras: options.filter((o) => o !== question.answer),
      prompt: async () => {
        if (!alreadyScored) await this.tell(story, panels);
        if (this.disposed) return;
        await this.props.speak(`recit.${story.id}.q.${question.id}`);
      },
      contrast: async () => {
        await this.tell(story, panels);
        if (this.disposed) return;
        await this.props.speak(`recit.${story.id}.q.${question.id}`);
      },
    };

    const runner = this.runner((result) => {
      // Au niveau 6, l'ordonnancement a déjà été journalisé : la question est
      // un second résultat sur la même histoire, pas un item consommé de plus.
      if (!alreadyScored) this.consumed += 1;
      this.props.onItemResult(result);
      if (!this.disposed) void this.next();
    });

    await runner.run([round]);
  }

  private characterImage(story: PackStory): string | undefined {
    const character =
      this.props.pack.characters.find((c) => c.id === story.characterId) ??
      this.props.pack.characters[0];
    return character?.portrait;
  }
}

/* ------------------------------------------------------------------ */

/**
 * Un panneau : le personnage de l'histoire, et l'objet de la scène.
 *
 * Composer plutôt qu'illustrer permet d'écrire une histoire en quelques lignes
 * de pack, et fait retomber l'enfant sur des objets qu'il connaît déjà des
 * autres ateliers.
 */
function panelGlyph(
  story: PackStory,
  wordId: string,
  pack: ActivityProps['pack'],
): string {
  const character =
    pack.characters.find((c) => c.id === story.characterId) ?? pack.characters[0];
  const word = wordById(wordId);
  const object = word ? wordImage(word) : null;

  return (
    `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="2" y="2" width="116" height="116" rx="12" fill="#F4EFE6" stroke="#2A2A2A" stroke-width="2.5"/>` +
    (character ? `<image href="${character.image}" x="4" y="34" width="62" height="62"/>` : '') +
    (object ? `<image href="${object}" x="56" y="20" width="58" height="58"/>` : '') +
    `</svg>`
  );
}

/**
 * Une place dans la file : des points, dont un seul est plein.
 *
 * Même convention qu'au Bal des syllabes — zéro texte, zéro chiffre. L'enfant
 * ne lit pas « 2 », il repère un rang.
 */
function slotGlyph(position: number, total: number): string {
  const dots = Array.from({ length: total }, (_, i) => {
    const filled = i === position - 1;
    return `<circle cx="${24 + i * 30}" cy="30" r="${filled ? 13 : 8}" fill="${
      filled ? 'var(--accent)' : 'rgba(18,33,46,0.22)'
    }"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${24 + total * 30} 60" xmlns="http://www.w3.org/2000/svg">${dots}</svg>`;
}

export function createRecit(): Activity {
  return new RecitActivity();
}

export { configForLevel, skillForLevel, itemId };
