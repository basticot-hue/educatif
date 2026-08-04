import { describe, expect, it } from 'vitest';
import {
  bagSetsForLevel,
  buildRound,
  configForLevel,
  familiesForLevel,
  fusionRound,
  poolForLevel,
  skillForLevel,
} from './levels';
import { wordById, WORDS } from '../../content/packs/mascottes/words';

/** Tirage déterministe : les tests ne doivent pas dépendre du hasard. */
const fixed = (value: number) => () => value;

describe('configForLevel', () => {
  it('ne dépasse jamais trois sacs', () => {
    for (let level = 0; level <= 10; level++) {
      expect(configForLevel(level).bags).toBeLessThanOrEqual(3);
    }
  });

  it("n'ouvre les occlusives qu'à partir du niveau 4", () => {
    for (let level = 0; level <= 3; level++) {
      expect(configForLevel(level).continuantOnly).toBe(true);
    }
    expect(configForLevel(4).continuantOnly).toBe(false);
  });

  it('fait parler l’enfant dès le niveau 2', () => {
    expect(configForLevel(1).childSpeaks).toBe(false);
    for (let level = 2; level <= 8; level++) {
      expect(configForLevel(level).childSpeaks).toBe(true);
    }
  });

  it('ne pose aucun plafond', () => {
    expect(configForLevel(12).mode).toBe('fusion');
  });
});

describe('skillForLevel', () => {
  it('journalise sous la compétence réellement travaillée', () => {
    expect(skillForLevel(0)).toBe('phono.onset');
    expect(skillForLevel(4)).toBe('phono.onset');
    expect(skillForLevel(5)).toBe('phono.coda');
    expect(skillForLevel(6)).toBe('phono.blend');
  });
});

describe('familiesForLevel', () => {
  it('ne retient que des familles où il y a de quoi jouer', () => {
    for (let level = 0; level <= 6; level++) {
      for (const [, words] of familiesForLevel(level)) {
        // Une famille d'un seul mot ferait du sac sa propre réponse.
        expect(words.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('écarte les occlusives tant que le niveau ne les autorise pas', () => {
    const occlusives = new Set(['p', 'b', 't', 'd', 'k', 'g']);
    for (const key of familiesForLevel(0).keys()) {
      expect(occlusives.has(key)).toBe(false);
    }
  });
});

describe('bagSetsForLevel', () => {
  it('produit des sacs tous différents', () => {
    for (let level = 0; level <= 5; level++) {
      for (const set of bagSetsForLevel(level)) {
        expect(new Set(set).size).toBe(set.length);
        expect(set.length).toBe(configForLevel(level).bags);
      }
    }
  });

  it('est déterministe — la répétition espacée en dépend', () => {
    expect(bagSetsForLevel(2)).toEqual(bagSetsForLevel(2));
  });

  it('donne à chaque son l’occasion de revenir', () => {
    const seen = new Set(bagSetsForLevel(0).flat());
    expect(seen.size).toBe(familiesForLevel(0).size);
  });
});

describe('poolForLevel', () => {
  it('produit des identifiants stables et uniques', () => {
    for (let level = 0; level <= 6; level++) {
      const ids = poolForLevel(level).map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(poolForLevel(level).map((i) => i.id)).toEqual(ids);
    }
  });

  it('ne rend jamais un vivier vide', () => {
    for (let level = 0; level <= 6; level++) {
      expect(poolForLevel(level).length).toBeGreaterThan(0);
    }
  });
});

describe('buildRound', () => {
  it('remplit au moins un objet par sac', () => {
    for (let level = 0; level <= 5; level++) {
      for (const set of bagSetsForLevel(level)) {
        const round = buildRound(level, set, fixed(0));
        expect(round).not.toBeNull();
        for (const bag of round!.bags) {
          expect(round!.cards.some((c) => c.bagKey === bag.key)).toBe(true);
        }
      }
    }
  });

  it('ne propose jamais un objet qui est déjà l’enseigne d’un sac', () => {
    for (const set of bagSetsForLevel(2)) {
      const round = buildRound(2, set, fixed(0.5))!;
      const references = new Set(round.bags.map((b) => b.reference.id));
      for (const card of round.cards) expect(references.has(card.word.id)).toBe(false);
    }
  });

  it('garde la même enseigne d’une séance à l’autre', () => {
    const first = buildRound(2, bagSetsForLevel(2)[0], fixed(0.1))!;
    const second = buildRound(2, bagSetsForLevel(2)[0], fixed(0.9))!;
    expect(second.bags.map((b) => b.reference.id)).toEqual(first.bags.map((b) => b.reference.id));
  });

  it('range chaque objet dans le sac de sa propre famille', () => {
    for (const set of bagSetsForLevel(3)) {
      const round = buildRound(3, set, fixed(0.3))!;
      for (const card of round.cards) {
        expect(card.word.onset).toBe(card.bagKey);
      }
    }
  });

  it('rend null plutôt que de proposer un tour impossible', () => {
    expect(buildRound(0, ['son-qui-n-existe-pas'], fixed(0))).toBeNull();
  });
});

describe('fusionRound', () => {
  it('oppose des mots de même longueur quand c’est possible', () => {
    const word = wordById('chapeau')!;
    const round = fusionRound(word, fixed(0.5))!;
    for (const other of round.others) expect(other.syllables).toBe(word.syllables);
  });

  it('ne propose jamais le mot cible comme intrus', () => {
    for (const word of WORDS) {
      const round = fusionRound(word, fixed(0.5));
      expect(round).not.toBeNull();
      expect(round!.others.some((o) => o.id === word.id)).toBe(false);
    }
  });
});
