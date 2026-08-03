import { describe, expect, it } from 'vitest';
import {
  BOX_INTERVALS_MS,
  MAX_BOX,
  applyResult,
  debt,
  isDue,
  schedulesToMap,
  selectSeries,
} from './scheduler';
import type { Item, ItemSchedule } from './types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

function item(id: string, level: number): Item {
  return { id, skill: 'counting.sequence', level, params: {} };
}

function pool(level: number, count: number): Item[] {
  return Array.from({ length: count }, (_, i) => item(`L${level}_${i}`, level));
}

/** Générateur déterministe, pour que le mélange ne rende pas les tests instables. */
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe('boîtes de Leitner', () => {
  it('monte d\'une boîte à chaque réussite', () => {
    let s = applyResult(undefined, item('a', 1), true, NOW);
    expect(s.box).toBe(2);
    s = applyResult(s, item('a', 1), true, NOW);
    expect(s.box).toBe(3);
  });

  it('plafonne à la boîte 5', () => {
    let s: ItemSchedule = { itemId: 'a', skill: 'counting.sequence', box: MAX_BOX, lastSeen: NOW };
    s = applyResult(s, item('a', 1), true, NOW);
    expect(s.box).toBe(MAX_BOX);
  });

  it('tout échec renvoie en boîte 1, depuis n\'importe quelle boîte', () => {
    const s: ItemSchedule = { itemId: 'a', skill: 'counting.sequence', box: 5, lastSeen: NOW };
    expect(applyResult(s, item('a', 1), false, NOW).box).toBe(1);
  });

  it('respecte les intervalles annoncés', () => {
    expect(BOX_INTERVALS_MS[1]).toBe(0);
    expect(BOX_INTERVALS_MS[2]).toBe(DAY);
    expect(BOX_INTERVALS_MS[3]).toBe(3 * DAY);
    expect(BOX_INTERVALS_MS[4]).toBe(7 * DAY);
    expect(BOX_INTERVALS_MS[5]).toBe(16 * DAY);
  });
});

describe('dette', () => {
  it('est infinie pour un item jamais rencontré', () => {
    expect(debt(undefined, NOW)).toBe(Number.POSITIVE_INFINITY);
  });

  it('est négative tant que l\'intervalle n\'est pas écoulé', () => {
    const s: ItemSchedule = { itemId: 'a', skill: 'counting.sequence', box: 3, lastSeen: NOW - DAY };
    expect(debt(s, NOW)).toBe(-2 * DAY);
    expect(isDue(s, NOW)).toBe(false);
  });

  it('devient positive une fois l\'intervalle dépassé', () => {
    const s: ItemSchedule = { itemId: 'a', skill: 'counting.sequence', box: 3, lastSeen: NOW - 5 * DAY };
    expect(debt(s, NOW)).toBe(2 * DAY);
    expect(isDue(s, NOW)).toBe(true);
  });

  it('un item en boîte 1 est dû dans la séance même', () => {
    const s: ItemSchedule = { itemId: 'a', skill: 'counting.sequence', box: 1, lastSeen: NOW - 1000 };
    expect(isDue(s, NOW)).toBe(true);
  });
});

describe('composition de la série', () => {
  const poolAt = (level: number) => (level <= 3 ? pool(level, 12) : []);

  it('produit exactement la longueur demandée', () => {
    const series = selectSeries({
      now: NOW,
      level: 3,
      poolAt,
      schedules: new Map(),
      random: seeded(),
    });
    expect(series).toHaveLength(8);
  });

  it('sans historique, ne tire que du niveau courant', () => {
    const series = selectSeries({
      now: NOW,
      level: 3,
      poolAt,
      schedules: new Map(),
      random: seeded(),
    });
    expect(series.every((i) => i.level === 3)).toBe(true);
  });

  it('réserve environ 30 % aux anciens items dus', () => {
    const old: ItemSchedule[] = pool(1, 12).map((i) => ({
      itemId: i.id,
      skill: i.skill,
      box: 2,
      lastSeen: NOW - 10 * DAY, // largement dû
    }));

    const series = selectSeries({
      now: NOW,
      level: 3,
      poolAt,
      schedules: schedulesToMap(old),
      random: seeded(),
    });

    expect(series.filter((i) => i.level < 3)).toHaveLength(2);
    expect(series).toHaveLength(8);
  });

  it('choisit les anciens les plus en retard en premier', () => {
    const schedules = schedulesToMap([
      { itemId: 'L1_0', skill: 'counting.sequence', box: 2, lastSeen: NOW - 2 * DAY },
      { itemId: 'L1_1', skill: 'counting.sequence', box: 2, lastSeen: NOW - 30 * DAY },
      { itemId: 'L1_2', skill: 'counting.sequence', box: 2, lastSeen: NOW - 20 * DAY },
    ]);

    const series = selectSeries({
      now: NOW,
      level: 2,
      poolAt: (l) => (l === 1 ? pool(1, 3) : l === 2 ? pool(2, 12) : []),
      schedules,
      random: seeded(),
    });

    const reviewed = series.filter((i) => i.level === 1).map((i) => i.id);
    expect(reviewed.sort()).toEqual(['L1_1', 'L1_2']); // pas L1_0, le moins en retard
  });

  it("ne fait pas remonter un ancien item qui n'est pas encore dû", () => {
    const schedules = schedulesToMap(
      pool(1, 12).map((i) => ({
        itemId: i.id,
        skill: i.skill,
        box: 5,
        lastSeen: NOW, // vu à l'instant
      })),
    );

    const series = selectSeries({
      now: NOW,
      level: 3,
      poolAt,
      schedules,
      random: seeded(),
    });
    expect(series.every((i) => i.level === 3)).toBe(true);
  });

  it("ne traite pas un item de niveau inférieur jamais vu comme une révision", () => {
    // Un enfant monté directement au niveau 3 n'a pas d'historique en dessous :
    // ces items sont du contenu neuf plus facile, pas de la révision.
    const series = selectSeries({
      now: NOW,
      level: 3,
      poolAt,
      schedules: new Map(),
      random: seeded(),
    });
    expect(series.every((i) => i.level === 3)).toBe(true);
  });

  it('complète quand le vivier du niveau est plus petit que la série', () => {
    const series = selectSeries({
      now: NOW,
      level: 0,
      poolAt: (l) => (l === 0 ? pool(0, 3) : []),
      schedules: new Map(),
      random: seeded(),
    });
    expect(series).toHaveLength(8);
    expect(new Set(series.map((i) => i.id)).size).toBe(3);
  });

  it('rend une série vide si le vivier est vide', () => {
    const series = selectSeries({
      now: NOW,
      level: 0,
      poolAt: () => [],
      schedules: new Map(),
      random: seeded(),
    });
    expect(series).toHaveLength(0);
  });

  it('ne place pas les révisions en bloc au début', () => {
    const old: ItemSchedule[] = pool(1, 12).map((i) => ({
      itemId: i.id,
      skill: i.skill,
      box: 2,
      lastSeen: NOW - 10 * DAY,
    }));

    // Sur plusieurs tirages, les révisions doivent parfois tomber ailleurs
    // qu'aux deux premières positions.
    const positions = new Set<number>();
    for (let seed = 1; seed <= 20; seed++) {
      const series = selectSeries({
        now: NOW,
        level: 3,
        poolAt,
        schedules: schedulesToMap(old),
        random: seeded(seed),
      });
      series.forEach((it, idx) => {
        if (it.level < 3) positions.add(idx);
      });
    }
    expect(positions.size).toBeGreaterThan(2);
  });
});
