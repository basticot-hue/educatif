import { describe, expect, it } from 'vitest';
import {
  configForLevel,
  poolForLevel,
  resample,
  shapeById,
  shapesForLevel,
  skillForLevel,
} from './levels';
import { wordById } from '../../content/packs/mascottes/words';

describe('shapesForLevel', () => {
  it('propose toujours quelque chose à tracer', () => {
    for (let level = 0; level <= 10; level++) {
      expect(shapesForLevel(level).length).toBeGreaterThan(0);
    }
  });

  it('reste dans le carré de tracé', () => {
    for (let level = 0; level <= 6; level++) {
      for (const shape of shapesForLevel(level)) {
        for (const stroke of shape.strokes) {
          for (const [x, y] of stroke) {
            // Une forme qui déborde serait rognée par les marges, et le doigt
            // ne pourrait jamais atteindre son bout.
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThanOrEqual(1);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(y).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('donne au moins deux points à chaque trait', () => {
    for (let level = 0; level <= 6; level++) {
      for (const shape of shapesForLevel(level)) {
        for (const stroke of shape.strokes) expect(stroke.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('rattache chaque lettre à un mot du pack, jamais à un nom de lettre', () => {
    for (const level of [4, 5, 6]) {
      for (const shape of shapesForLevel(level)) {
        expect(shape.wordId).toBeTruthy();
        expect(wordById(shape.wordId!)).toBeDefined();
      }
    }
  });

  it('choisit des mots qui commencent vraiment par le son de la lettre', () => {
    const expected: Record<string, string> = {
      L: 'l', T: 't', V: 'v', N: 'n',
      C: 'k', S: 's', P: 'p', J: 'j',
      M: 'm', F: 'f', R: 'r', Z: 'z',
    };
    for (const level of [4, 5, 6]) {
      for (const shape of shapesForLevel(level)) {
        expect(wordById(shape.wordId!)!.onset).toBe(expected[shape.id]);
      }
    }
  });
});

describe('configForLevel', () => {
  it('resserre le couloir sans jamais le supprimer', () => {
    let previous = Infinity;
    for (let level = 0; level <= 6; level++) {
      const corridor = configForLevel(level).corridor;
      expect(corridor).toBeGreaterThan(0.05);
      expect(corridor).toBeLessThanOrEqual(previous);
      previous = corridor;
    }
  });

  it('fait parler l’enfant dès le niveau 2', () => {
    expect(configForLevel(1).childSpeaks).toBe(false);
    expect(configForLevel(2).childSpeaks).toBe(true);
  });
});

describe('poolForLevel', () => {
  it('produit des identifiants uniques, retrouvables', () => {
    for (let level = 0; level <= 6; level++) {
      const items = poolForLevel(level);
      expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
      for (const item of items) {
        expect(shapeById(level, String(item.params.shapeId))).toBeDefined();
      }
    }
  });

  it('passe du prégraphisme au tracé de lettres au niveau 4', () => {
    expect(skillForLevel(3)).toBe('letter.pregraphism');
    expect(skillForLevel(4)).toBe('letter.trace');
  });
});

describe('resample', () => {
  it('espace les points régulièrement, y compris sur un segment droit', () => {
    const points = resample([[0, 0], [1, 0]], 0.1);
    expect(points.length).toBeGreaterThan(9);
    for (let i = 1; i < points.length - 1; i++) {
      const gap = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
      expect(gap).toBeCloseTo(0.1, 2);
    }
  });

  it('garde le point de départ et le point d’arrivée', () => {
    const stroke: [number, number][] = [[0.2, 0.8], [0.5, 0.1], [0.8, 0.8]];
    const points = resample(stroke, 0.05);
    expect(points[0]).toEqual(stroke[0]);
    const last = points[points.length - 1];
    expect(Math.hypot(last[0] - 0.8, last[1] - 0.8)).toBeLessThan(0.05);
  });

  it('donne assez de points pour que l’avancement se mesure', () => {
    for (let level = 0; level <= 6; level++) {
      for (const shape of shapesForLevel(level)) {
        for (const stroke of shape.strokes) {
          // Moins d'une dizaine de points, et le doigt franchirait le trait en
          // deux `pointermove` — l'avancement ne voudrait plus rien dire.
          expect(resample(stroke).length).toBeGreaterThanOrEqual(10);
        }
      }
    }
  });
});
