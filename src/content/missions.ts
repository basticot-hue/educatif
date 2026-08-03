/**
 * Les missions hors écran.
 *
 * Ce qui s'apprend sur tablette ne se transfère pas spontanément au réel chez le
 * jeune enfant : le pont doit être explicite et **adressé à l'enfant**. C'est la
 * partie de la séance qui compte le plus une fois l'écran éteint.
 *
 * Elles sont formulées à la deuxième personne, tiennent en une phrase, et ne
 * demandent aucun matériel.
 */

import type { SkillId } from '../engine/types';

export interface Mission {
  id: string;
  skill: SkillId;
  /** Dit par le personnage, et répété au parent dans le récapitulatif du soir. */
  text: string;
}

export const MISSIONS: Mission[] = [
  {
    id: 'seq.escalier',
    skill: 'counting.sequence',
    text: "Ce soir, compte les marches de l'escalier, et dis à papa combien il y en a.",
  },
  {
    id: 'seq.couverts',
    skill: 'counting.sequence',
    text: 'Avant de manger, compte les cuillères sur la table, tout haut.',
  },
  {
    id: 'seq.doigts',
    skill: 'counting.sequence',
    text: 'Compte tes doigts jusqu’au bout, et recommence en partant de l’autre main.',
  },
  {
    id: 'seq.pas',
    skill: 'counting.sequence',
    text: 'Compte tes pas du canapé jusqu’à la porte de ta chambre.',
  },
  {
    id: 'seq.livres',
    skill: 'counting.sequence',
    text: 'Compte les livres qui sont dans ta chambre, et montre-les à quelqu’un.',
  },
];

/**
 * Choisit une mission pour la compétence la plus travaillée du jour, en évitant
 * celle de la veille — répéter la même deux soirs de suite la vide de son sens.
 */
export function pickMission(skill: SkillId | null, previousId: string | null): Mission | null {
  const candidates = MISSIONS.filter((m) => m.skill === skill);
  const pool = candidates.length > 0 ? candidates : MISSIONS;
  const fresh = pool.filter((m) => m.id !== previousId);
  const list = fresh.length > 0 ? fresh : pool;
  return list[Math.floor(Math.random() * list.length)] ?? null;
}

export function missionById(id: string | null): Mission | null {
  return MISSIONS.find((m) => m.id === id) ?? null;
}
