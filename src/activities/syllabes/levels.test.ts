import { describe, expect, it } from 'vitest';
import { WORDS, wordById } from '../../content/packs/mascottes/words';
import { configForLevel, poolForLevel, rhymePair, skillForLevel, wordsForLevel } from './levels';

const FRAPPER_LEVELS = [1, 2, 3];

describe('table des niveaux du Bal', () => {
  it('suit l’ordre développemental rime → syllabe', () => {
    expect(configForLevel(0).mode).toBe('rime');
    expect(skillForLevel(0)).toBe('phono.rhyme');
    for (const level of FRAPPER_LEVELS) {
      expect(configForLevel(level).mode).toBe('frapper');
      expect(skillForLevel(level)).toBe('phono.syllable');
    }
  });

  it('fait produire l’enfant à partir du niveau 2', () => {
    expect(configForLevel(1).childSpeaks).toBe(false);
    expect(configForLevel(2).childSpeaks).toBe(true);
  });

  it("n'a pas de plafond", () => {
    expect(configForLevel(20).mode).toBe('inverser');
  });
});

describe('discrimination réelle aux niveaux de frappe', () => {
  for (const level of FRAPPER_LEVELS) {
    it(`propose au moins deux longueurs différentes au niveau ${level}`, () => {
      /*
       * Le vrai piège de cet atelier : si tous les mots d'un niveau font trois
       * syllabes, la bonne réponse est toujours le podium le plus haut.
       * L'enfant réussit tout sans écouter, et n'apprend rien.
       */
      const counts = new Set(wordsForLevel(level).map((w) => w.syllables));
      expect(counts.size, `niveau ${level}`).toBeGreaterThanOrEqual(2);
    });

    it(`offre assez de mots pour une série de 8 au niveau ${level}`, () => {
      // En dessous, la série ressasse les deux mêmes mots.
      expect(wordsForLevel(level).length).toBeGreaterThanOrEqual(6);
    });

    it(`équilibre les longueurs au niveau ${level}`, () => {
      /*
       * Le pack a deux fois plus de monosyllabes que de mots longs. Un vivier
       * non équilibré laisserait l'enfant répondre « le plus petit podium » et
       * réussir la majorité des tours sans écouter — au niveau 3, dont le
       * contraste court/long est la raison d'être, ce serait absurde.
       */
      const byCount = new Map<number, number>();
      for (const word of wordsForLevel(level)) {
        byCount.set(word.syllables, (byCount.get(word.syllables) ?? 0) + 1);
      }
      const effectifs = [...byCount.values()];
      expect(Math.min(...effectifs), `niveau ${level}`).toBe(Math.max(...effectifs));
    });

    it(`ne propose que des longueurs tenant sur trois podiums au niveau ${level}`, () => {
      for (const word of wordsForLevel(level)) {
        expect(word.syllables, word.label).toBeGreaterThanOrEqual(1);
        expect(word.syllables, word.label).toBeLessThanOrEqual(3);
      }
    });
  }
});

describe('vivier d’items', () => {
  it('produit des identifiants uniques et résolubles', () => {
    for (const level of [0, 1, 2, 3, 4, 5, 6]) {
      const pool = poolForLevel(level);
      const ids = pool.map((i) => i.id);
      expect(new Set(ids).size, `niveau ${level}`).toBe(ids.length);
      for (const item of pool) {
        expect(wordById(String(item.params.wordId)), item.id).toBeDefined();
      }
    }
  });

  it('ne retient au niveau 0 que des mots ayant un partenaire de rime', () => {
    // Un mot sans rime jumelle rendrait le tour impossible à jouer.
    for (const word of wordsForLevel(0)) {
      expect(rhymePair(word, () => 0), word.label).not.toBeNull();
    }
  });

  it('propose un intrus qui ne rime jamais avec le mot', () => {
    for (const word of wordsForLevel(0)) {
      for (const r of [0, 0.3, 0.6, 0.9]) {
        const pair = rhymePair(word, () => r);
        if (!pair) continue;
        expect(pair.match.rime, word.label).toBe(word.rime);
        expect(pair.odd.rime, word.label).not.toBe(word.rime);
        expect(pair.match.id).not.toBe(word.id);
      }
    }
  });
});

describe('cohérence avec le pack', () => {
  it('ne référence que des mots existants', () => {
    const ids = new Set(WORDS.map((w) => w.id));
    for (const level of [0, 1, 2, 3]) {
      for (const word of wordsForLevel(level)) expect(ids.has(word.id)).toBe(true);
    }
  });
});
