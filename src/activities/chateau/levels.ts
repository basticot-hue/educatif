/**
 * Le Château des mots — `lang.category`, `lang.vocabulary`.
 *
 * Des salles, et des objets à ranger dans la bonne. Trier par catégorie est ce
 * qui fait passer un mot du statut d'étiquette à celui de **sens** : un enfant
 * qui range la banane avec la fraise et non avec le lapin sait quelque chose de
 * « banane » que la seule répétition du mot ne lui donne pas.
 *
 * La salle porte l'image d'un objet de référence, et se nomme quand on la
 * touche. Deux garde-fous non négociables :
 *
 * - **une catégorie ne tient que si elle a de quoi tenir.** Trois mots minimum,
 *   dont un sert d'enseigne : avec deux, la salle est sa propre réponse ;
 * - **l'enseigne ne change jamais.** La salle des animaux reste la salle du
 *   chat d'une séance à l'autre, sinon l'enfant réapprend un décor au lieu de
 *   classer.
 */

import { WORDS, type WordCard } from '../../content/packs/mascottes/words';
import type { Item, SkillId } from '../../engine/types';

export type ChateauMode =
  | 'ranger' // niveaux 0 à 3, et 5 : chaque objet dans sa salle
  | 'intrus' // niveau 4 : celui qui n'est pas de la famille
  | 'apporter'; // niveau 6 : apporter l'objet nommé, parmi ses semblables

export interface LevelConfig {
  mode: ChateauMode;
  /** Nombre de salles ouvertes. */
  rooms: number;
  /** Objets posés devant l'enfant. */
  cards: number;
  childSpeaks: boolean;
}

export function configForLevel(level: number): LevelConfig {
  switch (level) {
    case 0:
      return { mode: 'ranger', rooms: 2, cards: 2, childSpeaks: false };
    case 1:
      return { mode: 'ranger', rooms: 2, cards: 3, childSpeaks: false };
    case 2:
      return { mode: 'ranger', rooms: 3, cards: 3, childSpeaks: true };
    case 3:
      return { mode: 'ranger', rooms: 3, cards: 4, childSpeaks: true };
    case 4:
      return { mode: 'intrus', rooms: 1, cards: 4, childSpeaks: true };
    case 5:
      return { mode: 'ranger', rooms: 3, cards: 5, childSpeaks: true };
    default:
      // Pas de plafond : au niveau 6, toutes les cartes sont de la même
      // famille. Seul le mot les distingue, plus aucun indice de catégorie.
      return { mode: 'apporter', rooms: 1, cards: 4, childSpeaks: true };
  }
}

export function skillForLevel(level: number): SkillId {
  return configForLevel(level).mode === 'apporter' ? 'lang.vocabulary' : 'lang.category';
}

/** Trois mots minimum : l'enseigne, et de quoi ranger sans que ce soit trivial. */
export const MIN_PER_CATEGORY = 3;

export function categories(): Map<string, WordCard[]> {
  const out = new Map<string, WordCard[]>();
  for (const word of WORDS) {
    const list = out.get(word.category) ?? [];
    list.push(word);
    out.set(word.category, list);
  }
  for (const [name, list] of out) if (list.length < MIN_PER_CATEGORY) out.delete(name);
  return out;
}

/** L'enseigne d'une salle : toujours le même mot, choisi de façon stable. */
export function signFor(category: string): WordCard | null {
  const list = categories().get(category);
  if (!list) return null;
  return [...list].sort((a, b) => a.id.localeCompare(b.id))[0];
}

/** Les objets rangeables d'une salle : tous sauf l'enseigne. */
export function contentsOf(category: string): WordCard[] {
  const sign = signFor(category);
  return (categories().get(category) ?? []).filter((w) => w.id !== sign?.id);
}

/**
 * Combinaisons de salles ouvertes à ce niveau.
 *
 * Comme au Sac, on fait glisser une fenêtre sur une liste triée plutôt que de
 * prendre toutes les combinaisons : l'ensemble reste petit, déterministe, et
 * chaque catégorie revient assez souvent pour que la répétition espacée ait un
 * sens.
 */
export function roomSetsForLevel(level: number): string[][] {
  const config = configForLevel(level);
  const names = [...categories().keys()].sort();
  if (names.length < config.rooms) return [];
  return names.map((_, i) =>
    Array.from({ length: config.rooms }, (_, k) => names[(i + k) % names.length]),
  );
}

export function itemId(level: number, key: string): string {
  return `chateau.${configForLevel(level).mode}.${key}`;
}

export function poolForLevel(level: number): Item[] {
  const config = configForLevel(level);
  const skill = skillForLevel(level);

  if (config.mode === 'apporter') {
    // Un item est **un mot à reconnaître** : c'est lui qui revient.
    return [...categories().values()]
      .flat()
      .map((word) => ({ id: itemId(level, word.id), skill, level, params: { wordId: word.id } }));
  }

  if (config.mode === 'intrus') {
    // Un item est **une famille**, dont on retire l'intrus.
    return [...categories().keys()].sort().map((name) => ({
      id: itemId(level, name),
      skill,
      level,
      params: { category: name },
    }));
  }

  return roomSetsForLevel(level).map((names) => ({
    id: itemId(level, names.join('-')),
    skill,
    level,
    params: { rooms: names },
  }));
}

/* ------------------------------------------------------------------ */

export interface RoomRound {
  rooms: Array<{ category: string; sign: WordCard }>;
  cards: Array<{ word: WordCard; category: string }>;
}

export function buildRound(
  level: number,
  names: string[],
  random: () => number,
): RoomRound | null {
  const config = configForLevel(level);

  const rooms: RoomRound['rooms'] = [];
  const pools = new Map<string, WordCard[]>();

  for (const name of names) {
    const sign = signFor(name);
    const contents = contentsOf(name);
    if (!sign || contents.length === 0) return null;
    rooms.push({ category: name, sign });
    pools.set(name, [...contents]);
  }

  // Un objet par salle d'abord : sans cela, tout empiler au même endroit
  // pouvait suffire à réussir un tour.
  const cards: RoomRound['cards'] = [];
  const take = (name: string) => {
    const pool = pools.get(name)!;
    const picked = pool[Math.floor(random() * pool.length)];
    pools.set(name, pool.filter((w) => w.id !== picked.id));
    cards.push({ word: picked, category: name });
  };

  for (const room of rooms) take(room.category);
  while (cards.length < config.cards) {
    const withStock = rooms.filter((r) => (pools.get(r.category)?.length ?? 0) > 0);
    if (withStock.length === 0) break;
    take(withStock[Math.floor(random() * withStock.length)].category);
  }

  return { rooms, cards };
}

/**
 * Niveau 4 : trois objets d'une même famille, et un qui n'en est pas.
 *
 * L'intrus est tiré d'une **autre** catégorie retenue, jamais d'un mot isolé :
 * un intrus qui n'appartient nulle part ne s'oppose à rien.
 */
export function intruderRound(
  category: string,
  random: () => number,
): { family: WordCard[]; intruder: WordCard } | null {
  const all = categories();
  const family = all.get(category);
  if (!family || family.length < 3) return null;

  const others = [...all.entries()].filter(([name]) => name !== category).flatMap(([, list]) => list);
  if (others.length === 0) return null;

  const shuffled = [...family].sort(() => random() - 0.5).slice(0, 3);
  return { family: shuffled, intruder: others[Math.floor(random() * others.length)] };
}

/**
 * Niveau 6 : le mot demandé, et ses voisins de famille.
 *
 * Les autres cartes viennent de la **même** catégorie. C'est ce qui retire tout
 * indice sémantique : il ne reste que le mot lui-même à reconnaître.
 */
export function siblingsOf(word: WordCard, count: number, random: () => number): WordCard[] {
  const family = (categories().get(word.category) ?? []).filter((w) => w.id !== word.id);
  const pool = family.length >= count ? family : WORDS.filter((w) => w.id !== word.id);
  return [...pool].sort(() => random() - 0.5).slice(0, count);
}
