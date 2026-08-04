/**
 * Le Bal des syllabes.
 *
 * Le personnage au centre, trois podiums numérotés 1, 2, 3. Le mot est
 * prononcé lentement, syllabe par syllabe. L'enfant **frappe dans ses mains** :
 * le micro compte les impacts et le personnage monte d'une marche par frappe.
 * Il pose ensuite la carte sur le bon podium.
 *
 * **Le repli tactile n'est pas optionnel.** Micro refusé, indisponible, ou
 * pièce trop bruyante : il faut que l'atelier reste jouable, sans que l'enfant
 * comprenne qu'il se passe quelque chose d'anormal. On frappe alors sur l'écran.
 */

import { listenForClaps, type ClapListener } from '../../engine/clap';
import { tick } from '../../engine/audio';
import type { Activity, ActivityProps, Item, ItemResult } from '../../engine/types';
import { openMicStream } from '../../engine/voice';
import { wordById, type WordCard } from '../../content/packs/mascottes/words';
import { wordImage } from '../../content/wordImages';
import { ChoiceRunner, type ChoiceRound } from '../common/choice';
import { SortRunner, type SortRound } from '../common/sort';
import { el, shuffle, wait } from '../common/stage';
import '../common/activity.css';
import './syllabes.css';
import {
  configForLevel,
  itemId,
  poolForLevel,
  rhymePair,
  skillForLevel,
  type LevelConfig,
} from './levels';

export const MAX_LEVEL = 6;

/** Durée d'écoute après la consigne, calibration comprise. */
const LISTEN_MS = 3500;

class SyllabesActivity implements Activity {
  readonly id = 'syllabes' as const;
  readonly skills = ['phono.rhyme' as const, 'phono.syllable' as const];
  readonly maxLevel = MAX_LEVEL;

  private props!: ActivityProps;
  private config!: LevelConfig;
  private root!: HTMLElement;
  private runner: ChoiceRunner | null = null;
  private sorter: SortRunner | null = null;

  private queue: Item[] = [];
  private consumed = 0;
  private generation = 0;
  private disposed = false;

  private stream: MediaStream | null = null;
  private listener: ClapListener | null = null;
  private timers = new Set<ReturnType<typeof setTimeout>>();

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
      (window as unknown as Record<string, unknown>).__syllabes = this;
    }

    void (async () => {
      /*
       * On cède la main avant de démarrer, **même quand il n'y a rien à
       * attendre**.
       *
       * React en mode strict monte, démonte puis remonte dans le même cycle.
       * Sans cette césure, le premier montage lançait le tour et prononçait la
       * consigne avant que le démontage ne survienne : l'enfant l'entendait
       * deux fois. Les autres ateliers y échappaient par accident, leur
       * préchargement d'images étant déjà asynchrone.
       */
      await Promise.resolve();
      if (this.config.mode === 'frapper') await this.prepareMic();
      if (this.generation !== generation) return;
      void this.next();
    })();
  }

  unmount(): void {
    this.generation += 1;
    this.disposed = true;
    this.listener?.stop();
    this.listener = null;
    this.runner?.dispose();
    this.sorter?.dispose();
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    // Le flux est relâché ici : le garder ouvert laisserait le voyant micro
    // allumé pendant tout le reste de la séance.
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.root.remove();
  }

  private later(fn: () => void, ms: number): void {
    const generation = this.generation;
    const id = setTimeout(() => {
      this.timers.delete(id);
      if (this.generation === generation) fn();
    }, ms);
    this.timers.add(id);
  }

  /**
   * Ouvre le micro. L'échec n'est pas une erreur : c'est le cas nominal du
   * repli tactile, et rien ne doit le signaler à l'enfant.
   */
  private async prepareMic(): Promise<void> {
    this.stream = await openMicStream();
  }

  /* ---------------- enchaînement ---------------- */

  private async next(): Promise<void> {
    if (this.disposed) return;

    if (this.consumed >= this.queue.length) {
      this.props.onFinished();
      return;
    }

    const item = this.queue[this.consumed];
    const word = wordById(String(item.params.wordId));
    if (!word) {
      this.consumed += 1;
      return this.next();
    }

    if (this.config.mode === 'frapper') await this.runClapRound(item, word);
    else if (this.config.mode === 'rime') await this.runRhymeRound(item, word);
    else await this.runChoiceRound(item, word);
  }

  private finishItem(item: Item, result: Omit<ItemResult, 'itemId' | 'skill'>): void {
    this.consumed += 1;
    this.props.onItemResult({
      itemId: item.id,
      skill: skillForLevel(this.props.level),
      ...result,
    });
    if (!this.disposed) void this.next();
  }

  /* ---------------- niveaux 1 à 3 : frapper ---------------- */

  private async runClapRound(item: Item, word: WordCard): Promise<void> {
    const generation = this.generation;
    const startedAt = performance.now();
    let attempts = 0;
    let assisted = false;

    this.root.textContent = '';

    const scene = el('div', 'bal', this.root);
    const stage = el('div', 'bal-podiums', scene);

    // Trois podiums à marches. Le personnage monte d'une marche par frappe.
    const podiums: HTMLElement[] = [];
    for (let n = 1; n <= 3; n++) {
      const podium = el('button', 'podium', stage);
      podium.dataset.count = String(n);
      podium.setAttribute('aria-label', `${n} syllabes`);
      el('div', 'podium-steps', podium).style.setProperty('--steps', String(n));
      const dots = el('div', 'podium-dots', podium);
      for (let d = 0; d < n; d++) el('span', undefined, dots);
      podiums.push(podium);
    }

    const card = el('div', 'bal-card', scene);
    const image = el('img', undefined, card);
    image.src = wordImage(word);
    image.alt = '';

    const holder = el('div', 'bal-mascot-holder', scene);
    const mascot = el('img', 'bal-mascot', holder);
    const character = this.props.pack.characters[0];
    mascot.src = character.image;
    mascot.alt = '';

    /**
     * Hauteur d'une marche, lue sur le podium lui-même plutôt que recalculée :
     * c'est la seule façon de garantir que le personnage se pose exactement
     * dessus, quelle que soit la taille de l'écran.
     */
    const stepHeight = () => podiums[0]?.querySelector('.podium-steps')?.clientHeight || 44;

    const setStep = (n: number) => {
      const y = Math.min(3, n) * stepHeight();
      holder.style.transform = `translateX(-50%) translateY(${-y}px)`;
    };
    setStep(0);

    /** Repli : frapper sur l'écran. Visible seulement si le micro n'est pas là. */
    let tapZone: HTMLElement | null = null;
    let claps = 0;

    const registerClap = (total: number) => {
      claps = total;
      setStep(total);
      tick();
    };

    // 1. Le mot, prononcé lentement syllabe par syllabe.
    await this.speakSplit(word);
    if (this.generation !== generation) return;

    // 2. Écoute — ou zone de frappe si le micro n'est pas disponible.
    if (this.stream) {
      this.listener = await listenForClaps(this.stream, {
        windowMs: LISTEN_MS,
        onClap: registerClap,
      });
    }

    if (!this.listener) {
      tapZone = el('button', 'bal-tap', scene);
      tapZone.setAttribute('aria-label', 'frapper');
      tapZone.addEventListener('click', () => registerClap(claps + 1));
    }

    // 3. L'enfant pose la carte sur un podium.
    const choose = async (n: number, podium: HTMLElement) => {
      if (this.disposed) return;
      attempts += 1;

      if (n !== word.syllables) {
        podium.classList.add('refused');
        await wait(420);
        podium.classList.remove('refused');
        if (attempts >= 2) {
          assisted = true;
          // Contrôle de l'erreur : on rejoue le mot découpé, le personnage
          // sautant à chaque syllabe. On ne dit pas « c'est faux ».
          await this.replayWithHops(word, mascot, setStep);
        }
        return;
      }

      podium.classList.add('chosen');
      this.listener?.stop();
      this.listener = null;

      if (this.config.childSpeaks) {
        await this.props.recordVoice(item.id).catch(() => null);
      }

      await wait(500);
      if (this.disposed) return;

      this.finishItem(item, {
        // Le micro n'arbitre rien : c'est le podium choisi qui fait foi. Le
        // comptage de frappes ne sert qu'à faire monter le personnage.
        correct: attempts === 1 && !assisted,
        attempts,
        latencyMs: Math.round(performance.now() - startedAt),
        assisted,
        spoke: this.config.childSpeaks,
      });
    };

    podiums.forEach((podium, i) => {
      podium.addEventListener('click', () => void choose(i + 1, podium));
    });

    // Passé la fenêtre d'écoute, on arrête le micro : inutile de le laisser
    // ouvert pendant que l'enfant réfléchit au podium.
    this.later(() => {
      this.listener?.stop();
      this.listener = null;
      if (!tapZone && !this.disposed) {
        tapZone = el('button', 'bal-tap', scene);
        tapZone.setAttribute('aria-label', 'frapper');
        tapZone.addEventListener('click', () => registerClap(claps + 1));
      }
    }, LISTEN_MS + 200);
  }

  /** Prononce le mot syllabe par syllabe, avec une vraie respiration entre. */
  private async speakSplit(word: WordCard): Promise<void> {
    for (const part of word.split) {
      if (this.disposed) return;
      await this.props.speak(`syl.${part}`);
      await wait(160);
    }
  }

  private async replayWithHops(
    word: WordCard,
    mascot: HTMLElement,
    setStep: (n: number) => void,
  ): Promise<void> {
    setStep(0);
    for (let i = 0; i < word.split.length; i++) {
      if (this.disposed) return;
      mascot.classList.add('hop');
      setStep(i + 1);
      await this.props.speak(`syl.${word.split[i]}`);
      mascot.classList.remove('hop');
      await wait(120);
    }
  }

  /* ---------------- niveau 0 : les rimes ---------------- */

  /**
   * Le mot modèle est la **cible**, au-dessus ; les deux propositions sont des
   * cartes qu'on glisse dessus.
   *
   * Une version antérieure présentait trois images muettes et demandait de
   * taper. Deux choses la rendaient impraticable : le pack contient des mots
   * qu'un enfant de trois ans et demi ne connaît pas (« nid », « jupe »), et
   * rien ne les faisait entendre. Comparer deux fins de mots qu'on n'a jamais
   * entendus n'est pas un exercice de phonologie, c'est un tirage au sort — que
   * le moteur enregistrait ensuite comme une réussite ou un échec de rime.
   *
   * Désormais : le modèle est prononcé, puis chaque proposition se nomme en se
   * soulevant, et n'importe quelle carte se redit d'un simple contact. On ne
   * répond qu'en glissant.
   */
  private async runRhymeRound(item: Item, word: WordCard): Promise<void> {
    const pair = rhymePair(word, Math.random);
    if (!pair) {
      this.consumed += 1;
      return this.next();
    }

    this.root.textContent = '';
    const host = el('div', undefined, this.root);
    host.style.cssText = 'width:100%;height:100%';

    const round: SortRound = {
      itemId: item.id,
      skill: skillForLevel(this.props.level),
      bins: [
        {
          id: word.id,
          image: wordImage(word),
          label: word.label,
          sound: `mot.${word.id}`,
          accepts: [pair.match.id],
        },
      ],
      cards: shuffle([
        { id: pair.match.id, image: wordImage(pair.match), label: pair.match.label, sound: `mot.${pair.match.id}` },
        { id: pair.odd.id, image: wordImage(pair.odd), label: pair.odd.label, sound: `mot.${pair.odd.id}` },
      ]),
      // L'intrus ne se range nulle part : il reste posé, sans que rien ne le
      // sanctionne, et le tour se referme dès que la bonne carte est placée.
      extras: [pair.odd.id],
      prompt: async () => {
        await this.props.speak('syllabes.rime');
        await this.props.speak(`mot.${word.id}`);
      },
      contrast: async () => {
        // On fait entendre les deux fins côte à côte plutôt que de dire non.
        await this.props.speak(`mot.${word.id}`);
        await wait(200);
        await this.props.speak(`mot.${pair.match.id}`);
      },
    };

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

  /* ---------------- niveaux 4, 5, 6 : choisir ---------------- */

  private async runChoiceRound(item: Item, word: WordCard): Promise<void> {
    const round = this.buildChoiceRound(item, word);
    if (!round) {
      this.consumed += 1;
      return this.next();
    }

    this.root.textContent = '';
    const header = el('div', 'prompt-row', this.root);
    /*
     * La carte du mot est un bouton : la toucher rejoue le mot découpé.
     *
     * Ces niveaux demandent de repérer un morceau *dans* un mot. Sans moyen de
     * réentendre le mot, un enfant qui a laissé passer la consigne n'a plus
     * qu'à deviner — et les niveaux hauts sont justement ceux où deviner ne
     * marche plus.
     */
    const card = el('button', 'prompt-card', header);
    card.setAttribute('aria-label', word.label);
    card.addEventListener('click', () => void this.speakSplit(word));
    const image = el('img', undefined, card);
    image.src = wordImage(word);
    image.alt = '';

    const options = el('div', undefined, this.root);

    this.runner = new ChoiceRunner(options, {
      speak: (key) => this.props.speak(key),
      recordVoice: (id) => this.props.recordVoice(id),
      onItemResult: (result) => {
        this.consumed += 1;
        this.props.onItemResult(result);
        if (!this.disposed) void this.next();
      },
    });

    await this.runner.run([round]);
  }

  private buildChoiceRound(item: Item, word: WordCard): ChoiceRound | null {
    const skill = skillForLevel(this.props.level);

    // Niveaux 4 à 6 : la réponse est une **position de syllabe**, pas un mot.
    const positions = word.split.map((part, i) => ({
      id: `pos${i}`,
      glyph: syllableGlyph(i + 1, word.split.length),
      label: part,
    }));

    const target =
      this.config.mode === 'localiser'
        ? 0
        : this.config.mode === 'supprimer'
          ? word.split.length - 1
          : 1;

    const promptKey =
      this.config.mode === 'localiser'
        ? 'syllabes.localiser'
        : this.config.mode === 'supprimer'
          ? 'syllabes.supprimer'
          : 'syllabes.inverser';

    return {
      itemId: item.id,
      skill,
      columns: positions.length,
      speaks: true,
      correctId: `pos${Math.min(target, positions.length - 1)}`,
      options: positions,
      prompt: async () => {
        await this.props.speak(promptKey);
        await this.speakSplit(word);
      },
      contrast: async () => {
        await this.speakSplit(word);
      },
    };
  }
}

/**
 * Représente une syllabe par sa position : des points, dont un seul est plein.
 * Zéro texte — l'enfant ne lit pas, il repère un rang.
 */
function syllableGlyph(position: number, total: number): string {
  const dots = Array.from({ length: total }, (_, i) => {
    const filled = i === position - 1;
    return `<circle cx="${28 + i * 34}" cy="30" r="${filled ? 14 : 9}" fill="${
      filled ? 'var(--accent)' : 'rgba(18,33,46,0.22)'
    }"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${28 + total * 34} 60" xmlns="http://www.w3.org/2000/svg">${dots}</svg>`;
}

export function createSyllabes(): Activity {
  return new SyllabesActivity();
}

export { poolForLevel, configForLevel, skillForLevel, itemId };
