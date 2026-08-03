/**
 * Sélection des items et répétition espacée (Leitner).
 *
 * Une série est composée de 70 % d'items au niveau courant et de 30 % d'items
 * anciens à réviser. La révision espacée est ce qui fait que ce qui a été
 * acquis en juin est encore là en septembre.
 */

import type { Item, ItemSchedule, SkillId } from './types';

const DAY = 24 * 60 * 60 * 1000;

/** Boîte → intervalle avant réapparition. La boîte 1 revient dans la séance même. */
export const BOX_INTERVALS_MS = [0, 0, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY];
export const MAX_BOX = 5;

export const DEFAULT_SERIES_LENGTH = 8;
export const REVIEW_RATIO = 0.3;

/**
 * Dette d'un item : positive quand il aurait déjà dû être revu.
 * Un item jamais rencontré a une dette infinie — il passe donc en premier.
 */
export function debt(schedule: ItemSchedule | undefined, now: number): number {
  if (!schedule) return Number.POSITIVE_INFINITY;
  return now - schedule.lastSeen - BOX_INTERVALS_MS[schedule.box];
}

/**
 * Fait progresser un item dans les boîtes.
 * Toute erreur le renvoie en boîte 1, quelle que soit la boîte atteinte.
 */
export function applyResult(
  previous: ItemSchedule | undefined,
  item: Item,
  correct: boolean,
  now: number,
): ItemSchedule {
  const box = previous?.box ?? 1;
  return {
    itemId: item.id,
    skill: item.skill,
    box: correct ? Math.min(MAX_BOX, box + 1) : 1,
    lastSeen: now,
  };
}

export interface SelectionInput {
  now: number;
  /** Niveau courant de la compétence. */
  level: number;
  /** Vivier d'items d'un niveau donné, fourni par l'activité. */
  poolAt: (level: number) => Item[];
  schedules: Map<string, ItemSchedule>;
  seriesLength?: number;
  reviewRatio?: number;
  /** Injectable pour rendre les tests déterministes. */
  random?: () => number;
}

/**
 * Trie par dette *décroissante* : l'item le plus en retard passe en premier.
 *
 * La spécification écrit « par ordre de dette croissante » ; pris au pied de la
 * lettre, cela sélectionnerait en priorité l'item vu il y a cinq minutes et
 * jamais celui vu il y a seize jours, ce qui annule l'effet de la répétition
 * espacée. On retient donc l'ordre décroissant, qui est celui de Leitner.
 */
function byDebtDesc(a: number, b: number): number {
  return b - a;
}

/**
 * Compose une série. Ne touche à rien : la fonction est pure, ce qui la rend
 * testable et permet de rejouer une sélection.
 */
export function selectSeries(input: SelectionInput): Item[] {
  const {
    now,
    level,
    poolAt,
    schedules,
    seriesLength = DEFAULT_SERIES_LENGTH,
    reviewRatio = REVIEW_RATIO,
    random = Math.random,
  } = input;

  const reviewTarget = Math.round(seriesLength * reviewRatio);
  const chosen: Item[] = [];
  const used = new Set<string>();

  const rank = (items: Item[]) =>
    items
      .map((item) => ({ item, d: debt(schedules.get(item.id), now) }))
      .sort((a, b) => byDebtDesc(a.d, b.d));

  /* --- révision : items des niveaux inférieurs, les plus en retard d'abord --- */

  const older: Item[] = [];
  for (let l = level - 1; l >= 0; l--) older.push(...poolAt(l));

  for (const { item, d } of rank(older)) {
    if (chosen.length >= reviewTarget) break;
    // Un item d'un niveau inférieur jamais rencontré n'est pas une révision :
    // c'est du contenu neuf plus facile. On ne le fait remonter que s'il a
    // réellement été vu et qu'il est dû.
    if (d === Number.POSITIVE_INFINITY || d < 0) continue;
    chosen.push(item);
    used.add(item.id);
  }

  /* --- niveau courant : le reste --- */

  const current = rank(poolAt(level).filter((i) => !used.has(i.id)));

  for (const { item } of current) {
    if (chosen.length >= seriesLength) break;
    chosen.push(item);
    used.add(item.id);
  }

  /*
   * Vivier trop petit pour remplir la série (typiquement le niveau 0, qui ne
   * compte que quelques items) : on complète en reprenant depuis le début. La
   * répétition d'un même item dans une série est acceptable — c'est même le
   * comportement de la boîte 1, qui revient dans la séance même.
   */
  if (chosen.length < seriesLength) {
    const fallback = poolAt(level);
    if (fallback.length > 0) {
      let i = 0;
      while (chosen.length < seriesLength) {
        chosen.push(fallback[i % fallback.length]);
        i++;
      }
    }
  }

  return shuffle(chosen, random);
}

/**
 * Mélange de Fisher-Yates. Les items de révision ne doivent pas former un bloc
 * en tête de série : ils seraient perçus comme un retour en arrière.
 */
function shuffle<T>(list: T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function schedulesToMap(list: ItemSchedule[]): Map<string, ItemSchedule> {
  return new Map(list.map((s) => [s.itemId, s]));
}

export function isDue(schedule: ItemSchedule | undefined, now: number): boolean {
  return debt(schedule, now) >= 0;
}

export type { SkillId };
