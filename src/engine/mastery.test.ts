import { describe, expect, it } from 'vitest';
import { updateMastery, PROMOTE_AFTER, WARMUP_ITEMS } from './mastery';
import type { ItemResult, Mastery } from './types';

const base: Mastery = { skill: 'counting.sequence', level: 2, streak: 0, failures: 0 };

function result(over: Partial<ItemResult> = {}): ItemResult {
  return {
    itemId: 'x',
    skill: 'counting.sequence',
    correct: true,
    attempts: 1,
    latencyMs: 1000,
    assisted: false,
    spoke: false,
    ...over,
  };
}

const ok = () => result();
const ko = () => result({ correct: false, attempts: 2 });

/** Applique une suite de résultats en partant de l'item `startIndex`. */
function run(m: Mastery, results: ItemResult[], startIndex = WARMUP_ITEMS): Mastery {
  return results.reduce((acc, r, i) => updateMastery(acc, r, startIndex + i), m);
}

describe('montée de niveau', () => {
  it('monte après 4 réussites consécutives au premier essai', () => {
    const after = run(base, [ok(), ok(), ok(), ok()]);
    expect(after.level).toBe(3);
    expect(after.streak).toBe(0);
  });

  it('ne monte pas à 3 réussites', () => {
    const after = run(base, [ok(), ok(), ok()]);
    expect(after.level).toBe(2);
    expect(after.streak).toBe(3);
  });

  it('un échec remet la série à zéro', () => {
    const after = run(base, [ok(), ok(), ok(), ko(), ok(), ok(), ok()]);
    expect(after.level).toBe(2);
    expect(after.streak).toBe(3);
  });

  it("n'a pas de plafond", () => {
    let m = { ...base, level: 6 };
    for (let i = 0; i < 5; i++) m = run(m, Array.from({ length: PROMOTE_AFTER }, ok));
    expect(m.level).toBe(11);
  });
});

describe('descente de niveau', () => {
  it('descend après 2 échecs consécutifs', () => {
    const after = run(base, [ko(), ko()]);
    expect(after.level).toBe(1);
    expect(after.failures).toBe(0);
  });

  it('ne descend pas en dessous de 0', () => {
    const after = run({ ...base, level: 0 }, [ko(), ko(), ko(), ko()]);
    expect(after.level).toBe(0);
  });

  it('une réussite intercalée annule la descente', () => {
    const after = run(base, [ko(), ok(), ko()]);
    expect(after.level).toBe(2);
    expect(after.failures).toBe(1);
  });
});

describe('une aide déclenchée compte comme un échec', () => {
  it('ne fait pas progresser la série même si la réponse est juste', () => {
    const assisted = result({ assisted: true });
    // Quatre réussites au premier essai feraient monter d'un niveau ; assistées,
    // elles font descendre de deux (une descente tous les deux items).
    const after = run(base, [assisted, assisted, assisted, assisted]);
    expect(after.level).toBe(0);
    expect(after.streak).toBe(0);
  });

  it('une réussite au deuxième essai ne compte pas non plus', () => {
    const after = run(base, [result({ attempts: 2 }), result({ attempts: 2 })]);
    expect(after.level).toBe(1);
  });
});

describe("fenêtre d'échauffement", () => {
  it('ne descend jamais sur les deux premiers items de la séance', () => {
    let m = base;
    m = updateMastery(m, ko(), 0);
    m = updateMastery(m, ko(), 1);
    expect(m.level).toBe(2);
  });

  it("conserve les échecs de l'échauffement, donc une vraie mauvaise séance redescend", () => {
    let m = base;
    m = updateMastery(m, ko(), 0);
    m = updateMastery(m, ko(), 1);
    expect(m.level).toBe(2);
    m = updateMastery(m, ko(), 2); // premier item hors échauffement
    expect(m.level).toBe(1);
  });

  it('laisse monter pendant la fenêtre', () => {
    let m = { ...base, streak: 3 };
    m = updateMastery(m, ok(), 0);
    expect(m.level).toBe(3);
  });
});
