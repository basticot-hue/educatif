import { describe, expect, it } from 'vitest';
import { ABANDON_LIMIT, detectOff, isOff, median } from './session';
import type { ItemResult } from './types';

function result(over: Partial<ItemResult> = {}): ItemResult {
  return {
    itemId: 'x',
    skill: 'counting.sequence',
    correct: true,
    attempts: 1,
    latencyMs: 4000,
    assisted: false,
    spoke: false,
    ...over,
  };
}

const fill = (n: number, over: Partial<ItemResult> = {}) =>
  Array.from({ length: n }, () => result(over));

describe('médiane', () => {
  it('gère un nombre impair de valeurs', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('gère un nombre pair de valeurs', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('rend 0 sur une liste vide', () => {
    expect(median([])).toBe(0);
  });
});

describe('signal de lenteur', () => {
  it('se déclenche au-delà du double de la référence', () => {
    const signals = detectOff(fill(4, { latencyMs: 9000 }), 0, 4000);
    expect(signals.slow).toBe(true);
    expect(isOff(signals)).toBe(true);
  });

  it('ne se déclenche pas juste au double', () => {
    expect(detectOff(fill(4, { latencyMs: 8000 }), 0, 4000).slow).toBe(false);
  });

  it('reste muet sans historique de référence', () => {
    // Première séance : aucune référence, donc aucune raison de conclure.
    expect(detectOff(fill(4, { latencyMs: 60000 }), 0, null).slow).toBe(false);
  });

  it('attend au moins trois items avant de conclure', () => {
    expect(detectOff(fill(2, { latencyMs: 99000 }), 0, 4000).slow).toBe(false);
  });
});

describe('signal d\'abandon', () => {
  it('se déclenche à trois abandons', () => {
    expect(detectOff([], ABANDON_LIMIT, null).abandons).toBe(true);
  });

  it('ne se déclenche pas à deux', () => {
    expect(detectOff([], 2, null).abandons).toBe(false);
  });
});

describe('signal d\'échecs précoces', () => {
  it('se déclenche au-delà de la moitié des 4 premiers items', () => {
    const results = [
      result({ correct: false }),
      result({ correct: false }),
      result({ correct: false }),
      result({ correct: true }),
    ];
    expect(detectOff(results, 0, null).earlyFailures).toBe(true);
  });

  it('ne se déclenche pas à exactement la moitié', () => {
    const results = [
      result({ correct: false }),
      result({ correct: false }),
      result({ correct: true }),
      result({ correct: true }),
    ];
    expect(detectOff(results, 0, null).earlyFailures).toBe(false);
  });

  it('attend d\'avoir quatre items', () => {
    const results = [result({ correct: false }), result({ correct: false })];
    expect(detectOff(results, 0, null).earlyFailures).toBe(false);
  });

  it('ignore les échecs qui arrivent plus tard dans la séance', () => {
    const results = [...fill(4), ...fill(6, { correct: false })];
    expect(detectOff(results, 0, null).earlyFailures).toBe(false);
  });
});

describe('séance normale', () => {
  it('ne déclenche aucun signal', () => {
    const signals = detectOff(fill(8), 0, 4000);
    expect(isOff(signals)).toBe(false);
  });
});
