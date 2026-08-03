import { describe, expect, it } from 'vitest';
import {
  casesCrossed,
  configForLevel,
  initialPosition,
  itemId,
  poolForLevel,
  remainingHops,
} from './levels';

/** Aucun item ne doit envoyer le pion en dehors du plateau. */
function landingsAreValid(level: number): boolean {
  const config = configForLevel(level);
  return poolForLevel(level).every((item) => {
    const start = item.params.start as number;
    const count = item.params.count as number;
    const landing = start + config.dir * count * config.step;
    return landing >= 1 && landing <= config.size && start >= 1 && start <= config.size;
  });
}

describe('table des niveaux', () => {
  it('suit la progression annoncée', () => {
    expect(configForLevel(0).size).toBe(3);
    expect(configForLevel(1).size).toBe(5);
    expect(configForLevel(2).size).toBe(10);
    expect(configForLevel(3).size).toBe(20);
    expect(configForLevel(4).start).toBe('random');
    expect(configForLevel(5).dir).toBe(-1);
    expect(configForLevel(6).step).toBe(2);
    expect(configForLevel(7).step).toBe(5);
  });

  it("fait énoncer l'enfant à partir du niveau 2, pas avant", () => {
    expect(configForLevel(0).childSpeaks).toBe(false);
    expect(configForLevel(1).childSpeaks).toBe(false);
    expect(configForLevel(2).childSpeaks).toBe(true);
    expect(configForLevel(6).childSpeaks).toBe(true);
  });

  it("n'a pas de plafond : le plateau continue de grandir", () => {
    expect(configForLevel(12).size).toBeGreaterThan(configForLevel(8).size);
    expect(configForLevel(30).size).toBeGreaterThan(configForLevel(12).size);
  });
});

describe('vivier d\'items', () => {
  for (const level of [0, 1, 2, 3, 4, 5, 6, 7, 10]) {
    it(`ne produit aucune sortie de plateau au niveau ${level}`, () => {
      expect(landingsAreValid(level)).toBe(true);
    });
  }

  it('reste assez fourni pour une série de 8 dès le niveau 2', () => {
    expect(poolForLevel(2).length).toBeGreaterThanOrEqual(8);
    expect(poolForLevel(3).length).toBeGreaterThanOrEqual(8);
  });

  it('est forcément court au niveau 0 — le planificateur complétera', () => {
    expect(poolForLevel(0)).toHaveLength(3);
  });

  it('produit des items uniques', () => {
    const ids = poolForLevel(3).map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('identifiants', () => {
  it('sont partagés entre niveaux de même sens et même pas', () => {
    // « partir de 7, avancer de 3 » est la même compétence sur un plateau de 10
    // et sur un plateau de 20 : l'historique du niveau 2 sert la révision au 3.
    expect(itemId(configForLevel(2), 7, 3)).toBe(itemId(configForLevel(3), 7, 3));
  });

  it('distinguent le sens et le pas, qui changent la tâche', () => {
    expect(itemId(configForLevel(3), 7, 2)).not.toBe(itemId(configForLevel(5), 7, 2));
    expect(itemId(configForLevel(3), 7, 2)).not.toBe(itemId(configForLevel(6), 7, 2));
  });
});

describe('cases traversées', () => {
  it('énonce les numéros de case, pas la suite 1-2-3', () => {
    // C'est le point critique de l'atelier : « sept, huit, neuf ».
    expect(casesCrossed(configForLevel(3), 6, 3)).toEqual([7, 8, 9]);
  });

  it('descend en marche arrière', () => {
    expect(casesCrossed(configForLevel(5), 12, 3)).toEqual([11, 10, 9]);
  });

  it('avance de 2 en 2 au niveau 6', () => {
    expect(casesCrossed(configForLevel(6), 4, 3)).toEqual([6, 8, 10]);
  });

  it('avance de 5 en 5 au niveau 7', () => {
    expect(casesCrossed(configForLevel(7), 5, 3)).toEqual([10, 15, 20]);
  });
});

describe('bonds restants', () => {
  it('vaut zéro au bout du plateau', () => {
    expect(remainingHops(configForLevel(3), 20)).toBe(0);
  });

  it('vaut zéro au départ quand on recule', () => {
    expect(remainingHops(configForLevel(5), 1)).toBe(0);
  });

  it('tient compte du pas', () => {
    expect(remainingHops(configForLevel(6), 15)).toBe(2); // (20-15)/2 arrondi bas
  });
});

describe('position de départ', () => {
  it('est la case 1 aux niveaux qui avancent depuis le début', () => {
    expect(initialPosition(configForLevel(0), () => 0.5)).toBe(1);
    expect(initialPosition(configForLevel(3), () => 0.5)).toBe(1);
  });

  it('est la dernière case quand on recule', () => {
    expect(initialPosition(configForLevel(5), () => 0.5)).toBe(20);
  });

  it('varie au niveau 4, en laissant de la marge devant', () => {
    const config = configForLevel(4);
    for (const r of [0, 0.25, 0.5, 0.75, 0.99]) {
      const start = initialPosition(config, () => r);
      expect(start).toBeGreaterThanOrEqual(1);
      expect(remainingHops(config, start)).toBeGreaterThan(0);
    }
  });
});
