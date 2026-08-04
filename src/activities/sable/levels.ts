/**
 * Le Sable — `letter.pregraphism`, `letter.trace`.
 *
 * Une forme est creusée dans le sable ; l'enfant la parcourt du doigt. La trace
 * **ne s'écrit que dans le couloir** : hors du chemin, le doigt ne laisse rien.
 * C'est là tout le contrôle de l'erreur — aucune croix, aucun son grave, rien
 * qui dise « raté ». Le dispositif refuse, il n'accuse pas.
 *
 * Les formes sont décrites en coordonnées **normalisées** (0 à 1 dans un carré),
 * jamais en pixels : la même forme doit tomber juste sur une tablette de 7
 * pouces comme sur une de 11.
 *
 * L'ordre suit la main, pas l'alphabet : d'abord les traits qu'un bras de trois
 * ans sait produire (vertical, horizontal), puis les changements de direction,
 * puis les courbes, et seulement ensuite les lettres. Une lettre n'est rien
 * d'autre qu'un assemblage de ces gestes.
 */

import type { Item, SkillId } from '../../engine/types';

export type Point = [number, number];
/** Une forme est une suite de traits. On les parcourt dans l'ordre. */
export type Stroke = Point[];

export interface Shape {
  id: string;
  strokes: Stroke[];
  /**
   * Mot de référence, pour les lettres.
   *
   * On ne fait **jamais** dire le nom d'une lettre : « èl » n'apprend rien
   * d'utile et devra être désappris. L'enfant redit un mot qui commence par le
   * son de la lettre — « lune » pour le L. C'est le même parti pris que Le Sac
   * de Chase, et c'est celui de la maternelle.
   */
  wordId?: string;
}

/* ------------------------------------------------------------------ *
 * Fabriques de tracés
 * ------------------------------------------------------------------ */

/** Échantillonne un arc de cercle. Les angles sont en degrés, l'écran a y vers le bas. */
function arc(cx: number, cy: number, r: number, from: number, to: number, steps = 24): Stroke {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Point;
  });
}

function wave(amplitude: number, periods: number, steps = 32): Stroke {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return [0.12 + t * 0.76, 0.5 + Math.sin(t * periods * 2 * Math.PI) * amplitude] as Point;
  });
}

/* ------------------------------------------------------------------ *
 * Les formes
 * ------------------------------------------------------------------ */

const PREGRAPHISM: Record<number, Shape[]> = {
  0: [
    { id: 'vertical', strokes: [[[0.5, 0.12], [0.5, 0.88]]] },
    { id: 'horizontal', strokes: [[[0.12, 0.5], [0.88, 0.5]]] },
  ],
  1: [
    { id: 'diagonale', strokes: [[[0.16, 0.86], [0.84, 0.14]]] },
    { id: 'diagonale-inverse', strokes: [[[0.16, 0.14], [0.84, 0.86]]] },
    { id: 'coin', strokes: [[[0.2, 0.16], [0.2, 0.84], [0.82, 0.84]]] },
  ],
  2: [
    { id: 'rond', strokes: [arc(0.5, 0.5, 0.36, -90, 270, 32)] },
    { id: 'pont', strokes: [arc(0.5, 0.72, 0.36, 180, 360, 20)] },
    { id: 'creux', strokes: [arc(0.5, 0.3, 0.36, 180, 0, 20)] },
  ],
  3: [
    { id: 'vague', strokes: [wave(0.22, 2)] },
    { id: 'zigzag', strokes: [[[0.14, 0.74], [0.36, 0.26], [0.58, 0.74], [0.82, 0.26]]] },
    { id: 'boucles', strokes: [wave(0.3, 3)] },
  ],
};

/**
 * Les lettres.
 *
 * Capitales d'imprimerie uniquement : elles sont faites de traits droits et
 * d'arcs simples, ce qui est exactement le répertoire gestuel des niveaux
 * précédents. La cursive demande une continuité que la main n'a pas encore.
 */
const LETTERS: Record<number, Shape[]> = {
  4: [
    { id: 'L', wordId: 'lune', strokes: [[[0.32, 0.12], [0.32, 0.86]], [[0.32, 0.86], [0.78, 0.86]]] },
    { id: 'T', wordId: 'table', strokes: [[[0.18, 0.14], [0.82, 0.14]], [[0.5, 0.14], [0.5, 0.88]]] },
    { id: 'V', wordId: 'vache', strokes: [[[0.2, 0.14], [0.5, 0.86], [0.8, 0.14]]] },
    {
      id: 'N',
      wordId: 'nid',
      strokes: [
        [[0.26, 0.86], [0.26, 0.14]],
        [[0.26, 0.14], [0.74, 0.86]],
        [[0.74, 0.86], [0.74, 0.14]],
      ],
    },
  ],
  5: [
    { id: 'C', wordId: 'cabane', strokes: [arc(0.52, 0.5, 0.34, -55, -305, 24)] },
    {
      id: 'S',
      wordId: 'soleil',
      strokes: [[...arc(0.5, 0.3, 0.2, -20, -200, 14), ...arc(0.5, 0.7, 0.2, 0, 160, 14)]],
    },
    {
      id: 'P',
      wordId: 'prune',
      strokes: [[[0.3, 0.88], [0.3, 0.12]], [[0.3, 0.12], ...arc(0.3, 0.3, 0.18, -90, 90, 14)]],
    },
    {
      id: 'J',
      wordId: 'jupe',
      strokes: [[[0.62, 0.12], [0.62, 0.62], ...arc(0.44, 0.62, 0.18, 0, 160, 14)]],
    },
  ],
  6: [
    {
      id: 'M',
      wordId: 'maison',
      strokes: [
        [[0.2, 0.86], [0.2, 0.14]],
        [[0.2, 0.14], [0.5, 0.56]],
        [[0.5, 0.56], [0.8, 0.14]],
        [[0.8, 0.14], [0.8, 0.86]],
      ],
    },
    {
      id: 'F',
      wordId: 'fleur',
      strokes: [[[0.32, 0.88], [0.32, 0.12]], [[0.32, 0.12], [0.76, 0.12]], [[0.32, 0.5], [0.7, 0.5]]],
    },
    {
      id: 'R',
      wordId: 'rose',
      strokes: [
        [[0.3, 0.88], [0.3, 0.12]],
        [[0.3, 0.12], ...arc(0.3, 0.3, 0.18, -90, 90, 14)],
        [[0.3, 0.48], [0.76, 0.88]],
      ],
    },
    { id: 'Z', wordId: 'zoo', strokes: [[[0.22, 0.16], [0.78, 0.16], [0.22, 0.84], [0.78, 0.84]]] },
  ],
};

export interface LevelConfig {
  /** L'enfant redit le mot de référence après avoir tracé. */
  childSpeaks: boolean;
  /**
   * Largeur du couloir, en fraction du plus petit côté de la zone de tracé.
   *
   * Elle se resserre avec les niveaux, mais **jamais** au point de dépendre de
   * la dalle : `engine/calibration.ts` la remultiplie selon la fréquence
   * d'échantillonnage mesurée. Une trace qui se coupe alors que le geste était
   * bon fait vivre à l'enfant un échec qu'il n'a pas commis.
   */
  corridor: number;
}

export function configForLevel(level: number): LevelConfig {
  if (level <= 1) return { childSpeaks: false, corridor: 0.13 };
  if (level <= 3) return { childSpeaks: true, corridor: 0.11 };
  return { childSpeaks: true, corridor: 0.095 };
}

export function skillForLevel(level: number): SkillId {
  return level <= 3 ? 'letter.pregraphism' : 'letter.trace';
}

export function shapesForLevel(level: number): Shape[] {
  if (level <= 3) return PREGRAPHISM[level] ?? PREGRAPHISM[3];
  // Pas de plafond : au-delà du niveau 6, on continue de tracer les lettres les
  // plus coûteuses en nombre de traits.
  return LETTERS[Math.min(level, 6)] ?? LETTERS[6];
}

export function itemId(level: number, shapeId: string): string {
  return `sable.${skillForLevel(level)}.${shapeId}`;
}

export function poolForLevel(level: number): Item[] {
  const skill = skillForLevel(level);
  return shapesForLevel(level).map((shape) => ({
    id: itemId(level, shape.id),
    skill,
    level,
    params: { shapeId: shape.id },
  }));
}

export function shapeById(level: number, id: string): Shape | undefined {
  return shapesForLevel(level).find((s) => s.id === id);
}

/* ------------------------------------------------------------------ *
 * Géométrie du parcours
 * ------------------------------------------------------------------ */

/**
 * Rééchantillonne un trait à pas constant.
 *
 * Les formes sont écrites avec des points inégalement espacés — un segment
 * droit n'en a que deux. Sans ce rééchantillonnage, l'avancement du doigt se
 * mesurerait en « points atteints » et un trait droit serait terminé d'un seul
 * geste, quel que soit le chemin parcouru.
 */
export function resample(stroke: Stroke, step = 0.02): Stroke {
  const out: Stroke = [stroke[0]];
  let carry = 0;

  for (let i = 1; i < stroke.length; i++) {
    const [ax, ay] = stroke[i - 1];
    const [bx, by] = stroke[i];
    const length = Math.hypot(bx - ax, by - ay);
    if (length === 0) continue;

    let travelled = step - carry;
    while (travelled <= length) {
      const t = travelled / length;
      out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
      travelled += step;
    }
    carry = (length - (travelled - step)) % step;
  }

  const last = stroke[stroke.length - 1];
  const [lx, ly] = out[out.length - 1];
  if (Math.hypot(last[0] - lx, last[1] - ly) > step / 2) out.push(last);
  return out;
}
