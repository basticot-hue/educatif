/**
 * Le Bal des syllabes — `phono.rhyme`, `phono.syllable`.
 *
 * L'ordre des niveaux suit l'ordre développemental réel : **rime → syllabe →
 * phonème**. La rime est accessible bien avant l'isolement d'un son, d'où le
 * niveau 0. Le phonème, lui, est le travail du Sac de Chase, pas d'ici.
 */

import { WORDS, rhymeFamilies, wordsWithSyllables, type WordCard } from '../../content/packs/mascottes/words';
import type { Item, SkillId } from '../../engine/types';

export type SyllabeMode =
  | 'rime' // niveau 0 : « ça rime avec quoi ? »
  | 'frapper' // niveaux 1 à 3 : frapper les syllabes
  | 'localiser' // niveau 4 : où entends-tu « pa » ?
  | 'supprimer' // niveau 5 : « papillon » sans « pa »
  | 'inverser'; // niveau 6 : inverser deux syllabes

export interface LevelConfig {
  mode: SyllabeMode;
  /**
   * Nombres de syllabes proposés à ce niveau.
   *
   * Un niveau de frappe en propose **toujours au moins deux**, et jamais un
   * seul. Avec des mots tous de trois syllabes, la bonne réponse serait
   * invariablement le podium le plus haut : l'enfant apprendrait « tape le plus
   * grand » et réussirait tout sans jamais écouter. C'est ce que le niveau
   * nouvellement introduit apporte qui compte, pas son exclusivité.
   */
  counts: number[];
  /** L'enfant dit chaque syllabe en même temps qu'il frappe. */
  childSpeaks: boolean;
}

export function configForLevel(level: number): LevelConfig {
  switch (level) {
    case 0:
      return { mode: 'rime', counts: [1, 2], childSpeaks: false };
    case 1:
      // Introduit les mots de 2 syllabes, opposés aux monosyllabes.
      return { mode: 'frapper', counts: [1, 2], childSpeaks: false };
    case 2:
      // Introduit les mots de 3 syllabes. L'enfant frappe **et dit**.
      return { mode: 'frapper', counts: [1, 2, 3], childSpeaks: true };
    case 3:
      // Contraste fort : un mot très court contre un mot long.
      return { mode: 'frapper', counts: [1, 3], childSpeaks: true };
    case 4:
      return { mode: 'localiser', counts: [2, 3], childSpeaks: true };
    case 5:
      return { mode: 'supprimer', counts: [2, 3], childSpeaks: true };
    default:
      // Pas de plafond : inverser deux syllabes reste la tâche la plus dure,
      // et elle se joue sur des mots de plus en plus longs.
      return { mode: 'inverser', counts: [2, 3], childSpeaks: true };
  }
}

export function skillForLevel(level: number): SkillId {
  return configForLevel(level).mode === 'rime' ? 'phono.rhyme' : 'phono.syllable';
}

/**
 * Mots disponibles à ce niveau, **équilibrés entre les longueurs**.
 *
 * Le pack compte huit monosyllabes pour quatre mots de trois syllabes. Sans
 * rééquilibrage, une série du niveau 3 — dont tout l'intérêt est justement le
 * contraste court/long — tirait sept mots courts sur huit : répondre
 * « podium 1 » suffisait à réussir presque tout.
 *
 * On ramène donc chaque longueur à l'effectif de la plus rare. Cela écarte
 * quelques mots, mais un vivier déséquilibré n'enseigne rien — et la sélection
 * reste déterministe, ce dont dépend la répétition espacée.
 */
export function wordsForLevel(level: number): WordCard[] {
  const config = configForLevel(level);
  if (config.mode === 'rime') return WORDS.filter((w) => rhymeFamilies().has(w.rime));

  const groups = config.counts.map((n) => wordsWithSyllables(n)).filter((g) => g.length > 0);
  if (groups.length === 0) return [];

  const perGroup = Math.min(...groups.map((g) => g.length));
  return groups.flatMap((g) => g.slice(0, perGroup));
}

export function itemId(level: number, wordId: string): string {
  return `syllabes.${configForLevel(level).mode}.${wordId}`;
}

export function poolForLevel(level: number): Item[] {
  const skill = skillForLevel(level);
  return wordsForLevel(level).map((word) => ({
    id: itemId(level, word.id),
    skill,
    level,
    params: { wordId: word.id },
  }));
}

/**
 * Deux mots qui riment, et un intrus.
 * Rend `null` si la famille du mot n'a pas de partenaire — le tour est alors
 * simplement sauté plutôt que de proposer un choix impossible.
 */
export function rhymePair(word: WordCard, random: () => number): { match: WordCard; odd: WordCard } | null {
  const family = rhymeFamilies().get(word.rime)?.filter((w) => w.id !== word.id) ?? [];
  if (family.length === 0) return null;

  const outsiders = WORDS.filter((w) => w.rime !== word.rime);
  if (outsiders.length === 0) return null;

  return {
    match: family[Math.floor(random() * family.length)],
    odd: outsiders[Math.floor(random() * outsiders.length)],
  };
}
