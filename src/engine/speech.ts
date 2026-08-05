/**
 * Résolution de la voix — le seul endroit de l'app qui décide *qui* parle.
 *
 * Ordre d'essai :
 *   1. l'enregistrement du parent  (le plus efficace à cet âge)
 *   2. l'asset audio du pack
 *   3. la synthèse vocale fr-FR    (filet, pas cible)
 *
 * Aucune activité ne sait d'où vient le son. C'est ce qui permet au parent
 * d'enregistrer sa voix progressivement, item par item, sans rien casser.
 */

import { cachedSound, loadSound, playBuffer, stopPlayback } from './audio';
import { WORDS } from '../content/packs/mascottes/words';
import { promptText } from '../content/prompts';
import { getBlob } from './storage';
import type { PackCharacter, SpeechKey, UniversePack } from './types';

/** Préfixe des clés de blob contenant la voix du parent. */
export const PARENT_VOICE_PREFIX = 'voice.';

export function parentVoiceKey(key: SpeechKey): string {
  return PARENT_VOICE_PREFIX + key;
}

/* ------------------------------------------------------------------ *
 * Texte de repli
 * ------------------------------------------------------------------ */

const UNITS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf', 'vingt',
];

const TENS: Record<number, string> = {
  20: 'vingt',
  30: 'trente',
  40: 'quarante',
  50: 'cinquante',
  60: 'soixante',
  80: 'quatre-vingt',
};

/**
 * Le nombre en toutes lettres, jusqu'à cent.
 *
 * Cette fonction s'arrêtait à 29 et renvoyait le chiffre au-delà : « 35 »
 * partait tel quel à la synthèse, et ce que la tablette prononçait dépendait
 * alors entièrement du moteur installé. Dans un atelier dont tout le propos est
 * l'énoncé ordinal, c'est le pire endroit pour laisser un aléa. Le Chemin monte
 * à 30 cases au niveau 7, puis dix de plus par niveau, sans plafond — le
 * commentaire d'origine (« ne dépasse pas 20 ») avait simplement vieilli.
 */
export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 100) return String(n);
  if (n <= 20) return UNITS[n];
  if (n === 100) return 'cent';

  /*
   * 70 à 79 et 90 à 99 n'ont pas de dizaine à eux : ils se comptent à partir de
   * soixante et de quatre-vingt, avec un reste qui va jusqu'à dix-neuf.
   */
  const base = n < 70 ? Math.floor(n / 10) * 10 : n < 80 ? 60 : 80;
  const rest = n - base;
  const tens = TENS[base];

  // « quatre-vingts » prend son s tout seul ; « quatre-vingt-un » le perd, et
  // ne prend pas non plus le « et » de vingt et un ou trente et un.
  if (rest === 0) return base === 80 ? 'quatre-vingts' : tens;
  if (rest === 1 && base !== 80) return `${tens} et un`;
  if (rest === 11 && base === 60) return 'soixante et onze';
  return `${tens}-${UNITS[rest]}`;
}

/** Les clés d'énoncé les plus utiles à faire enregistrer par le parent. */
export const NUMBER_KEYS = Array.from({ length: 20 }, (_, i) => `num.${i + 1}`);

/* ------------------------------------------------------------------ *
 * Synthèse vocale
 * ------------------------------------------------------------------ */

let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

/**
 * Sur Android, la liste des voix arrive de façon asynchrone : `getVoices()`
 * renvoie souvent un tableau vide au premier appel. Il faut attendre
 * `voiceschanged`, avec un délai de garde car l'événement ne se déclenche
 * jamais quand aucun moteur TTS n'est installé.
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (voicesReady) return voicesReady;

  voicesReady = new Promise((resolve) => {
    if (typeof speechSynthesis === 'undefined') {
      resolve([]);
      return;
    }

    const immediate = speechSynthesis.getVoices();
    if (immediate.length > 0) {
      resolve(immediate);
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      speechSynthesis.removeEventListener('voiceschanged', finish);
      resolve(speechSynthesis.getVoices());
    };

    speechSynthesis.addEventListener('voiceschanged', finish);
    setTimeout(finish, 2000);
  });

  return voicesReady;
}

let frenchVoice: SpeechSynthesisVoice | null | undefined;

async function pickFrenchVoice(): Promise<SpeechSynthesisVoice | null> {
  if (frenchVoice !== undefined) return frenchVoice;
  const voices = await loadVoices();
  frenchVoice =
    voices.find((v) => v.lang === 'fr-FR') ??
    voices.find((v) => v.lang?.startsWith('fr')) ??
    null;
  return frenchVoice;
}

/** Exposé à l'espace parent pour signaler qu'aucun moteur TTS français n'est installé. */
export async function hasFrenchVoice(): Promise<boolean> {
  return (await pickFrenchVoice()) !== null;
}

async function synthesize(text: string): Promise<void> {
  if (typeof speechSynthesis === 'undefined') return;

  /*
   * Choisir la voix française **avant** de parler.
   *
   * `frenchVoice` n'était renseignée que par `hasFrenchVoice()`, appelée depuis
   * le seul espace parent. Une séance ordinaire n'y passe jamais : la variable
   * restait `undefined`, `utterance.voice` n'était pas posée, et Android
   * confiait l'énoncé au moteur par défaut — souvent anglais. « vélo » sortait
   * alors en anglais, c'est-à-dire en rien de reconnaissable, et l'atelier de
   * sons devenait injouable puisque tout y repose sur ce qu'on entend.
   */
  await pickFrenchVoice();

  return new Promise((resolve) => {
    // Sans `cancel()`, les énoncés s'empilent dans la file de Chrome : pendant
    // un glissement rapide, l'enfant entendrait « sept » trois cases plus loin.
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9; // légèrement ralenti : ce sont des mots à apprendre
    utterance.pitch = 1;
    if (frenchVoice) utterance.voice = frenchVoice;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(guard);
      resolve();
    };

    // Chrome ne déclenche pas toujours `onend`, notamment après un `cancel()`
    // concurrent ou quand aucun moteur vocal n'est installé. Sans ce garde-fou,
    // une promesse resterait pendante et l'enchaînement de la séance se figerait.
    // Le plancher reste bas : la plupart des énoncés sont un seul mot court.
    const guard = setTimeout(finish, Math.max(1200, text.length * 120));

    utterance.onend = finish;
    utterance.onerror = finish;
    speechSynthesis.speak(utterance);
  });
}

/* ------------------------------------------------------------------ *
 * Résolveur
 * ------------------------------------------------------------------ */

function pick<T>(list: T[] | undefined): T | undefined {
  if (!list || list.length === 0) return undefined;
  return list[Math.floor(Math.random() * list.length)];
}

export interface Speaker {
  speak(key: SpeechKey): Promise<void>;
  /** Énonce un texte libre, sans passer par une clé (mission, consigne d'un pack). */
  say(text: string): Promise<void>;
  stop(): void;
}

/**
 * Texte de repli associé à une clé, quand il faut synthétiser.
 *
 * Hors du `createSpeaker` qui l'abritait, pour une raison précise : c'est la
 * fonction qui décide si l'enfant entend quelque chose ou rien du tout, et
 * enfermée dans une clôture elle n'était testable qu'à travers un moteur vocal
 * absent sous Node. Une clé silencieuse ne se voit pas — c'est exactement le
 * mode de panne contre lequel `content/prompts.test.ts` a été écrit.
 */
export function speechText(
  pack: UniversePack,
  character: PackCharacter,
  key: SpeechKey,
): string | null {
  if (key.startsWith('num.')) {
    const n = Number(key.slice(4));
    return Number.isFinite(n) ? numberWord(n) : null;
  }

  /*
   * Clés dynamiques : le texte est dans la clé elle-même.
   *
   * `syl.cha` fait dire « cha », `mot.chapeau` fait dire « chapeau ». Cela
   * évite d'énumérer à la main autant de clés que de mots et de syllabes du
   * pack — et un pack importé fonctionnera sans qu'on touche à ce fichier.
   */
  if (key.startsWith('syl.')) return key.slice(4);
  if (key.startsWith('mot.')) {
    const word = WORDS.find((w) => w.id === key.slice(4));
    return word?.label ?? null;
  }

  /*
   * Le Récit : `recit.<histoire>.<panneau>` dit la phrase du panneau,
   * `recit.<histoire>.q.<question>` pose la question.
   *
   * Le texte vit dans le pack, pas ici : une histoire ajoutée à un pack
   * importé se raconte sans qu'on touche au moteur.
   */
  if (key.startsWith('recit.')) {
    const parts = key.split('.');
    /*
     * Encore faut-il que ce soit une histoire.
     *
     * Cette branche renvoyait `null` dès qu'aucune histoire ne portait le nom
     * lu — ce qui est le cas des deux **consignes** de l'atelier, qui vivent
     * dans `prompts.ts` et non dans le pack. `recit.ecoute` cherchait donc une
     * histoire nommée « ecoute », n'en trouvait pas, et sortait avant d'avoir
     * pu retomber sur `promptText`. Résultat : « Écoute bien l'histoire. » et
     * « Maintenant, remets les images dans l'ordre. » n'étaient jamais
     * prononcées, et rien ne disait à l'enfant ce qu'on attendait de lui.
     */
    const story = parts.length >= 3 ? pack.stories.find((s) => s.id === parts[1]) : undefined;
    if (story) {
      if (parts[2] === 'q') {
        return story.questions.find((q) => q.id === parts[3])?.prompt ?? null;
      }
      return story.panels.find((p) => p.id === parts[2])?.text ?? null;
    }
    // Sinon c'est une consigne : elle se résout plus bas, comme les autres.
  }

  switch (key) {
    case 'greet':
      return character.lines?.greet ?? `Bonjour, c'est ${character.name} !`;
    case 'praise':
      return pick(character.lines?.praise) ?? 'Bravo !';
    case 'retry':
      return character.lines?.retry ?? 'On recommence.';
    default:
      // Consignes des ateliers. Sans ce renvoi, toute clé inconnue tombait
      // silencieusement à `null` : l'atelier restait muet, et rien ne
      // signalait qu'aucune consigne n'était jamais donnée à l'enfant.
      return promptText(key);
  }
}

/**
 * @param character le personnage courant — c'est lui qui salue et félicite ;
 *   il n'apparaît qu'à l'entrée, entre deux exercices et à la sortie.
 */
export function createSpeaker(pack: UniversePack, character: PackCharacter): Speaker {
  const textFor = (key: SpeechKey) => speechText(pack, character, key);

  /** Chemin de l'asset audio du pack pour cette clé, s'il existe. */
  function packAssetFor(key: SpeechKey): string | null {
    switch (key) {
      case 'greet':
        return character.voice.greet ?? null;
      case 'praise':
        return pick(character.voice.praise) ?? null;
      case 'retry':
        return character.voice.retry ?? null;
      default:
        return null;
    }
  }

  async function speak(key: SpeechKey): Promise<void> {
    // 1. la voix du parent
    const blob = await getBlob(parentVoiceKey(key));
    if (blob) {
      const buffer = cachedSound(key) ?? (await loadSound(key, blob));
      if (buffer) return playBuffer(buffer);
    }

    // 2. l'asset du pack
    const asset = packAssetFor(key);
    if (asset) {
      const url = assetUrl(pack, asset);
      const buffer = cachedSound(url) ?? (await loadFromUrl(url));
      if (buffer) return playBuffer(buffer);
    }

    // 3. la synthèse
    const text = textFor(key);
    if (text) return synthesize(text);
  }

  return {
    speak,
    say: (text: string) => synthesize(text),
    stop() {
      stopPlayback();
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    },
  };
}

/* ------------------------------------------------------------------ *
 * Assets du pack
 * ------------------------------------------------------------------ */

/**
 * Les packs en dur référencent des URL déjà résolues par Vite ; les packs
 * importés (passe 2) référenceront des clés de blob. Le préfixe distingue les
 * deux sans que l'appelant ait à savoir.
 */
export function assetUrl(_pack: UniversePack, path: string): string {
  return path;
}

async function loadFromUrl(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await loadSound(url, await response.arrayBuffer());
  } catch {
    return null;
  }
}
