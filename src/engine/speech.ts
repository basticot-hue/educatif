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

/** Suffisant pour Le Chemin, qui ne dépasse pas 20 avant le niveau 6. */
export function numberWord(n: number): string {
  if (n >= 0 && n <= 20) return UNITS[n];
  if (n < 30) return `vingt-${UNITS[n - 20]}`;
  return String(n);
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

function synthesize(text: string): Promise<void> {
  if (typeof speechSynthesis === 'undefined') return Promise.resolve();

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
 * @param character le personnage courant — c'est lui qui salue et félicite ;
 *   il n'apparaît qu'à l'entrée, entre deux exercices et à la sortie.
 */
export function createSpeaker(pack: UniversePack, character: PackCharacter): Speaker {
  /** Texte de repli associé à une clé, quand il faut synthétiser. */
  function textFor(key: SpeechKey): string | null {
    if (key.startsWith('num.')) {
      const n = Number(key.slice(4));
      return Number.isFinite(n) ? numberWord(n) : null;
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
