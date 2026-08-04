/**
 * Registre des ateliers.
 *
 * Le shell ne connaît que ce fichier : ajouter un atelier, c'est ajouter une
 * ligne ici. Le moteur ne sait rien de leur contenu — il ne voit qu'un `id`,
 * des compétences et un vivier d'items.
 */

import type { Activity, ActivityId, SkillId } from '../engine/types';
import { createChateau } from './chateau';
import { skillForLevel as chateauSkill } from './chateau/levels';
import { createChemin } from './chemin';
import { createMissions } from './missions';
import { skillForLevel as missionsSkill } from './missions/levels';
import { createRecit } from './recit';
import { createSable } from './sable';
import { skillForLevel as sableSkill } from './sable/levels';
import { createSons } from './sons';
import { skillForLevel as sonsSkill } from './sons/levels';
import { createSyllabes } from './syllabes';
import { skillForLevel as syllabesSkill } from './syllabes/levels';

export interface ActivityEntry {
  id: ActivityId;
  /** Fabrique une instance neuve. Chaque entrée d'atelier a la sienne. */
  create(): Activity;
  /**
   * Compétence pilotant le niveau de l'atelier.
   *
   * Certains ateliers changent de compétence selon le niveau (Les Missions
   * passent de la comparaison au cardinal puis à l'addition). C'est pourtant
   * **une seule progression** du point de vue de l'enfant : on choisit donc une
   * compétence de référence pour le niveau, et les résultats sont journalisés
   * sous la compétence réellement travaillée.
   */
  drivingSkill: SkillId;
  /** Compétence sous laquelle journaliser, selon le niveau atteint. */
  skillAt?(level: number): SkillId;
}

export const ACTIVITIES: ActivityEntry[] = [
  {
    id: 'chemin',
    create: createChemin,
    drivingSkill: 'counting.sequence',
  },
  {
    id: 'missions',
    create: createMissions,
    drivingSkill: 'counting.one_to_one',
    skillAt: missionsSkill,
  },
  {
    id: 'syllabes',
    create: createSyllabes,
    // La rime pilote le niveau 0 ; la compétence de référence reste la syllabe,
    // qui couvre six des sept niveaux.
    drivingSkill: 'phono.syllable',
    skillAt: syllabesSkill,
  },
  {
    id: 'sons',
    create: createSons,
    // L'attaque pilote le niveau : elle couvre cinq des sept niveaux. La fin de
    // mot et la fusion sont journalisées sous leur propre compétence.
    drivingSkill: 'phono.onset',
    skillAt: sonsSkill,
  },
  {
    id: 'sable',
    create: createSable,
    // Le prégraphisme pilote : on ne trace pas une lettre avant de savoir
    // produire les gestes qui la composent.
    drivingSkill: 'letter.pregraphism',
    skillAt: sableSkill,
  },
  {
    id: 'chateau',
    create: createChateau,
    drivingSkill: 'lang.category',
    skillAt: chateauSkill,
  },
  {
    id: 'recit',
    create: createRecit,
    drivingSkill: 'lang.narrative',
  },
];

export function activityEntry(id: ActivityId): ActivityEntry {
  const found = ACTIVITIES.find((a) => a.id === id);
  if (!found) throw new Error(`atelier inconnu : ${id}`);
  return found;
}

export const AVAILABLE_IDS: ActivityId[] = ACTIVITIES.map((a) => a.id);
