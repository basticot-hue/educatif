/**
 * Le Récit — `lang.narrative`.
 *
 * L'histoire est racontée, puis ses panneaux sont mélangés : l'enfant les
 * remet dans l'ordre. Aux niveaux hauts, on lui demande en plus ce qui s'est
 * passé — la compréhension, et non plus seulement la chronologie.
 *
 * Le contenu vit **dans le pack**. Ajouter une histoire ne demande pas de
 * toucher à cet atelier, et un pack importé apporte les siennes.
 */

import type { Item, PackStory, SkillId, UniversePack } from '../../engine/types';

export type RecitMode =
  | 'ordre' // remettre les panneaux dans l'ordre
  | 'question' // répondre à une question sur l'histoire
  | 'les-deux'; // ordonner, puis répondre

export interface LevelConfig {
  mode: RecitMode;
  /** Panneaux montrés. Toujours pris **au début** de l'histoire. */
  panels: number;
  /** Réponses proposées à la question. */
  options: number;
  /** L'enfant raconte l'histoire à son tour. */
  childSpeaks: boolean;
}

export function configForLevel(level: number): LevelConfig {
  switch (level) {
    case 0:
      return { mode: 'ordre', panels: 2, options: 2, childSpeaks: false };
    case 1:
      return { mode: 'ordre', panels: 3, options: 2, childSpeaks: false };
    case 2:
      return { mode: 'ordre', panels: 3, options: 2, childSpeaks: true };
    case 3:
      return { mode: 'ordre', panels: 4, options: 2, childSpeaks: true };
    case 4:
      return { mode: 'question', panels: 3, options: 2, childSpeaks: true };
    case 5:
      return { mode: 'question', panels: 4, options: 3, childSpeaks: true };
    default:
      // Pas de plafond : ordonner quatre panneaux **puis** répondre reste la
      // tâche la plus longue, et c'est celle qui demande de tenir le récit
      // entier en tête.
      return { mode: 'les-deux', panels: 4, options: 3, childSpeaks: true };
  }
}

export function skillForLevel(_level: number): SkillId {
  return 'lang.narrative';
}

/**
 * Histoires utilisables à ce niveau : celles qui ont assez de panneaux, et une
 * question quand le niveau en demande une.
 */
export function storiesForLevel(pack: UniversePack, level: number): PackStory[] {
  const config = configForLevel(level);
  return pack.stories.filter(
    (story) =>
      story.panels.length >= config.panels &&
      (config.mode === 'ordre' || story.questions.length > 0),
  );
}

export function itemId(level: number, key: string): string {
  return `recit.${configForLevel(level).mode}.${key}`;
}

/**
 * Un item est **une histoire à un niveau donné**, pas un panneau.
 *
 * C'est le récit entier qui est réussi ou raté, et c'est lui qui doit revenir à
 * intervalles croissants. Suivre chaque panneau séparément n'aurait aucun sens :
 * un panneau seul ne se remet pas dans l'ordre.
 */
export function poolForLevel(pack: UniversePack, level: number): Item[] {
  const skill = skillForLevel(level);
  return storiesForLevel(pack, level).map((story) => ({
    id: itemId(level, story.id),
    skill,
    level,
    params: { storyId: story.id },
  }));
}

/** La question posée pour cette histoire. Choisie de façon stable. */
export function questionFor(story: PackStory, random: () => number) {
  if (story.questions.length === 0) return null;
  return story.questions[Math.floor(random() * story.questions.length)];
}
