/**
 * Le Sac de Chase — `phono.onset`, `phono.coda`, `phono.blend`.
 *
 * Deux ou trois sacs, chacun tenu par un mot de référence. L'enfant entend un
 * objet et le glisse dans le sac dont le mot **commence pareil**.
 *
 * **Un sac ne porte jamais une lettre.** Ni « M », ni « èm ». Un sac est
 * désigné par un mot entier qu'on entend — « le sac de papillon » — et l'enfant
 * range ce qui commence comme lui. C'est la façon dont on procède en
 * maternelle, et elle évite le piège central du domaine : un enfant qui apprend
 * « cé » là où il faut entendre « chhh » devra désapprendre.
 *
 * L'ordre des niveaux suit l'acoustique, pas une difficulté abstraite :
 * les **continues** (s, l, f, m, ch, v, r, j, z, n) se tiennent à volonté, donc
 * s'entendent isolément ; les **occlusives** (p, b, t, d, k, g) ne se
 * prolongent pas et n'arrivent qu'au niveau 4.
 */

import {
  onsetGroups,
  rhymeFamilies,
  wordById,
  WORDS,
  type WordCard,
} from '../../content/packs/mascottes/words';
import type { Item, SkillId } from '../../engine/types';

export type SonsMode =
  | 'attaque' // niveaux 0 à 4 : le premier son
  | 'finale' // niveau 5 : la fin du mot
  | 'fusion'; // niveau 6 : recoller un mot découpé

export interface LevelConfig {
  mode: SonsMode;
  /** Nombre de sacs. Jamais plus de trois : au-delà, on trie sans écouter. */
  bags: number;
  /** Objets à ranger dans le tour. */
  cards: number;
  /** Interdire les occlusives, impossibles à faire entendre isolément. */
  continuantOnly: boolean;
  childSpeaks: boolean;
}

export function configForLevel(level: number): LevelConfig {
  switch (level) {
    case 0:
      return { mode: 'attaque', bags: 2, cards: 2, continuantOnly: true, childSpeaks: false };
    case 1:
      return { mode: 'attaque', bags: 2, cards: 3, continuantOnly: true, childSpeaks: false };
    case 2:
      return { mode: 'attaque', bags: 3, cards: 3, continuantOnly: true, childSpeaks: true };
    case 3:
      return { mode: 'attaque', bags: 3, cards: 4, continuantOnly: true, childSpeaks: true };
    case 4:
      // Les occlusives entrent ici, et pas avant : « p » ne se tient pas.
      return { mode: 'attaque', bags: 3, cards: 4, continuantOnly: false, childSpeaks: true };
    case 5:
      return { mode: 'finale', bags: 2, cards: 3, continuantOnly: false, childSpeaks: true };
    default:
      // Pas de plafond : recoller un mot découpé reste la tâche la plus dure.
      return { mode: 'fusion', bags: 1, cards: 3, continuantOnly: false, childSpeaks: true };
  }
}

export function skillForLevel(level: number): SkillId {
  switch (configForLevel(level).mode) {
    case 'finale':
      return 'phono.coda';
    case 'fusion':
      return 'phono.blend';
    default:
      return 'phono.onset';
  }
}

/**
 * Familles disponibles à ce niveau : par attaque, ou par rime au niveau 5.
 *
 * Une famille n'est retenue que si elle compte au moins **deux** mots : le
 * premier sert de référence au sac, les suivants sont les objets à y ranger.
 * Avec un seul mot, le sac serait sa propre réponse.
 */
export function familiesForLevel(level: number): Map<string, WordCard[]> {
  const config = configForLevel(level);
  if (config.mode === 'finale') return rhymeFamilies();
  return onsetGroups({ continuantOnly: config.continuantOnly });
}

/**
 * Combinaisons de sacs proposées à ce niveau.
 *
 * On ne prend pas toutes les paires possibles : dix attaques en feraient
 * quarante-cinq, et la répétition espacée ne reverrait jamais deux fois la même.
 * On glisse une fenêtre le long d'une liste triée — l'ensemble reste petit,
 * couvre chaque son plusieurs fois, et surtout reste **déterministe**, ce dont
 * dépend le suivi d'un item dans le temps.
 */
export function bagSetsForLevel(level: number): string[][] {
  const config = configForLevel(level);
  const keys = [...familiesForLevel(level).keys()].sort();
  if (keys.length < config.bags) return [];

  const sets: string[][] = [];
  for (let i = 0; i < keys.length; i++) {
    const set = Array.from({ length: config.bags }, (_, k) => keys[(i + k) % keys.length]);
    sets.push(set);
  }
  return sets;
}

export function itemId(level: number, key: string): string {
  return `sons.${configForLevel(level).mode}.${key}`;
}

export function poolForLevel(level: number): Item[] {
  const skill = skillForLevel(level);

  if (configForLevel(level).mode === 'fusion') {
    // Un item est **un mot à recoller** : c'est lui qui revient, pas un sac.
    return WORDS.map((word) => ({
      id: itemId(level, word.id),
      skill,
      level,
      params: { wordId: word.id },
    }));
  }

  return bagSetsForLevel(level).map((keys) => ({
    id: itemId(level, keys.join('-')),
    skill,
    level,
    params: { keys },
  }));
}

/* ------------------------------------------------------------------ */

export interface BagRound {
  /** Un sac par famille : mot de référence, et objets qui vont dedans. */
  bags: Array<{ key: string; reference: WordCard }>;
  /** Objets à ranger, avec le sac attendu. */
  cards: Array<{ word: WordCard; bagKey: string }>;
}

/**
 * Construit le tour : un mot de référence par sac, puis les objets à ranger.
 *
 * La référence est prise **en tête de famille**, toujours la même : le sac de
 * « papillon » doit rester le sac de papillon d'une séance à l'autre, sinon
 * l'enfant réapprend un décor à chaque fois au lieu d'écouter un son.
 */
export function buildRound(
  level: number,
  keys: string[],
  random: () => number,
): BagRound | null {
  const config = configForLevel(level);
  const families = familiesForLevel(level);

  const bags: BagRound['bags'] = [];
  const pools = new Map<string, WordCard[]>();

  for (const key of keys) {
    const family = families.get(key);
    if (!family || family.length < 2) return null;
    const sorted = [...family].sort((a, b) => a.id.localeCompare(b.id));
    bags.push({ key, reference: sorted[0] });
    pools.set(key, sorted.slice(1));
  }

  // Un objet par sac d'abord : sans cela, un tour pouvait ne remplir qu'un seul
  // sac, et « tout mettre au même endroit » suffisait à réussir.
  const cards: BagRound['cards'] = [];
  for (const bag of bags) {
    const pool = pools.get(bag.key)!;
    const picked = pool[Math.floor(random() * pool.length)];
    cards.push({ word: picked, bagKey: bag.key });
    pools.set(bag.key, pool.filter((w) => w.id !== picked.id));
  }

  while (cards.length < config.cards) {
    const withStock = bags.filter((b) => (pools.get(b.key)?.length ?? 0) > 0);
    if (withStock.length === 0) break;
    const bag = withStock[Math.floor(random() * withStock.length)];
    const pool = pools.get(bag.key)!;
    const picked = pool[Math.floor(random() * pool.length)];
    cards.push({ word: picked, bagKey: bag.key });
    pools.set(bag.key, pool.filter((w) => w.id !== picked.id));
  }

  return { bags, cards };
}

/**
 * Niveau 6 : le mot à recoller, et deux intrus.
 *
 * Les intrus partagent le nombre de syllabes du mot cible quand c'est possible.
 * Un mot d'une syllabe opposé à deux mots de trois se reconnaît à sa longueur,
 * sans jamais entendre les sons qui le composent.
 */
export function fusionRound(
  word: WordCard,
  random: () => number,
): { target: WordCard; others: WordCard[] } | null {
  const sameLength = WORDS.filter((w) => w.id !== word.id && w.syllables === word.syllables);
  const pool = sameLength.length >= 2 ? sameLength : WORDS.filter((w) => w.id !== word.id);
  if (pool.length < 2) return null;

  const shuffled = [...pool].sort(() => random() - 0.5);
  return { target: word, others: shuffled.slice(0, 2) };
}

export { wordById };
