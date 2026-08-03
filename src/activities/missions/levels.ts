/**
 * Les Missions — `counting.compare`, `subitize`, `one_to_one`, `cardinal`,
 * `arithmetic`.
 *
 * Le niveau 0 comble une lacune réelle : **la comparaison de quantités fonde le
 * sens du nombre autant que le comptage**, et arrive développementalement avant
 * lui. Le niveau 2 introduit le principe cardinal — « combien y en a-t-il ? »
 * se répond par le dernier mot dit — étape où beaucoup d'enfants butent alors
 * qu'ils savent parfaitement réciter la suite.
 */

import type { Item, SkillId } from '../../engine/types';

export type MissionMode =
  | 'compare' // deux camions, lequel en a le plus
  | 'load' // charger N objets, un par alvéole
  | 'missing' // il en manque combien
  | 'addition'; // il en faut 2 de plus

export interface LevelConfig {
  mode: MissionMode;
  /** Bornes de la quantité demandée. */
  min: number;
  max: number;
  /** Pastilles en configuration de dé, ou dispersées au hasard. */
  arrangement: 'die' | 'scattered';
  /** L'enfant annonce le nombre chargé avant de valider. */
  childSpeaks: boolean;
  /** Combien il en faut « de plus » au niveau 6. */
  addend: number;
}

/**
 * Nombre maximal d'objets simultanément à l'écran.
 *
 * Au-delà, les caisses deviennent trop petites pour un doigt de 3 ans et les
 * pastilles ne sont plus dénombrables d'un coup d'œil : la difficulté cesse
 * d'être numérique et devient visuelle. Aux niveaux hauts, la progression
 * passe donc par l'**opération** — combien il en manque, combien il en faut de
 * plus — et non par un tas plus gros.
 */
export const MAX_ON_SCREEN = 12;

export function configForLevel(level: number): LevelConfig {
  switch (level) {
    case 0:
      return { mode: 'compare', min: 1, max: 5, arrangement: 'die', childSpeaks: false, addend: 0 };
    case 1:
      return { mode: 'load', min: 1, max: 3, arrangement: 'die', childSpeaks: false, addend: 0 };
    case 2:
      // « Et combien y en a-t-il ? » après le chargement : le principe cardinal.
      return { mode: 'load', min: 1, max: 5, arrangement: 'die', childSpeaks: true, addend: 0 };
    case 3:
      return { mode: 'load', min: 1, max: 10, arrangement: 'die', childSpeaks: true, addend: 0 };
    case 4:
      // Dispositions désordonnées : on ne peut plus reconnaître une forme apprise.
      return { mode: 'load', min: 3, max: 10, arrangement: 'scattered', childSpeaks: true, addend: 0 };
    case 5:
      return { mode: 'missing', min: 3, max: 10, arrangement: 'scattered', childSpeaks: true, addend: 0 };
    case 6:
      return { mode: 'addition', min: 2, max: 8, arrangement: 'scattered', childSpeaks: true, addend: 2 };
    default: {
      /*
       * Pas de plafond, mais la difficulté monte par l'**ajout** et non par le
       * nombre d'objets à l'écran. Vingt-cinq caisses sur une tablette de 10
       * pouces ne sont plus dénombrables : ce serait une difficulté de vision,
       * pas de nombre. La quantité de départ s'arrête donc à douze.
       */
      const extra = level - 6;
      const addend = Math.min(5, 2 + Math.floor(extra / 2));
      return {
        mode: 'addition',
        min: 3,
        // Le total chargé — départ + ajout — ne dépasse jamais MAX_ON_SCREEN.
        max: Math.min(MAX_ON_SCREEN - addend, 8 + extra),
        arrangement: 'scattered',
        childSpeaks: true,
        addend,
      };
    }
  }
}

export function skillForLevel(level: number): SkillId {
  const config = configForLevel(level);
  if (config.mode === 'compare') return 'counting.compare';
  if (config.mode === 'addition') return 'counting.arithmetic';
  if (config.mode === 'missing') return 'counting.arithmetic';
  if (config.childSpeaks) return 'counting.cardinal';
  // Aux niveaux bas, la tâche est la correspondance terme à terme : un geste,
  // un objet. C'est elle qui construit le comptage, pas la récitation.
  return 'counting.one_to_one';
}

export function itemId(level: number, target: number, extra: number): string {
  const config = configForLevel(level);
  return `missions.${config.mode}.${config.arrangement}.${target}${extra ? `+${extra}` : ''}`;
}

export function poolForLevel(level: number): Item[] {
  const config = configForLevel(level);
  const skill = skillForLevel(level);
  const items: Item[] = [];

  for (let target = config.min; target <= config.max; target++) {
    if (config.mode === 'compare') {
      // Un item de comparaison est un couple de quantités distinctes.
      for (let other = config.min; other <= config.max; other++) {
        if (other === target) continue;
        items.push({
          id: itemId(level, target, other),
          skill,
          level,
          params: { target, other, mode: config.mode },
        });
      }
    } else if (config.mode === 'missing') {
      for (let already = 1; already < target; already++) {
        items.push({
          id: itemId(level, target, already),
          skill,
          level,
          params: { target, already, mode: config.mode },
        });
      }
    } else if (config.mode === 'addition') {
      items.push({
        id: itemId(level, target, config.addend),
        skill,
        level,
        params: { target, addend: config.addend, mode: config.mode },
      });
    } else {
      items.push({ id: itemId(level, target, 0), skill, level, params: { target, mode: config.mode } });
    }
  }

  return items;
}

/**
 * La réserve contient **plus d'objets que nécessaire**.
 *
 * Sans surplus, il n'y a aucune décision à prendre : l'enfant vide la réserve
 * et a « réussi » sans avoir compté. C'est le surplus qui fait la tâche.
 */
export function reserveSize(target: number): number {
  // Le plafond ne doit jamais manger le surplus : à 20 objets demandés, une
  // réserve plafonnée à 20 rendrait la tâche triviale — il suffirait de tout
  // charger. On garantit donc au moins deux objets en trop, toujours.
  return Math.max(target + 2, Math.min(26, target + Math.max(3, Math.ceil(target / 2))));
}

/** Positions relatives des pastilles, en configuration de dé jusqu'à 6. */
const DIE_LAYOUTS: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.28, 0.2], [0.72, 0.2], [0.28, 0.5], [0.72, 0.5], [0.28, 0.8], [0.72, 0.8]],
};

/**
 * Emplacements des pastilles de la carte mission.
 * Au-delà de 6, ou en mode désordonné, on répartit en grille irrégulière.
 */
export function dotPositions(
  count: number,
  arrangement: 'die' | 'scattered',
  random: () => number,
): Array<[number, number]> {
  if (arrangement === 'die' && DIE_LAYOUTS[count]) return DIE_LAYOUTS[count];

  // Grille jitterée : les pastilles ne doivent pas se chevaucher, sinon elles
  // deviennent impossibles à dénombrer — ce serait une difficulté parasite.
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const out: Array<[number, number]> = [];
  for (let i = 0; i < count; i++) {
    const cx = (i % columns) + 0.5;
    const cy = Math.floor(i / columns) + 0.5;
    const jitter = arrangement === 'scattered' ? 0.26 : 0;
    out.push([
      (cx + (random() - 0.5) * jitter) / columns,
      (cy + (random() - 0.5) * jitter) / rows,
    ]);
  }
  return out;
}
