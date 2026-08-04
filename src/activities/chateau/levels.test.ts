import { describe, expect, it } from 'vitest';
import {
  buildRound,
  categories,
  configForLevel,
  contentsOf,
  intruderRound,
  MIN_PER_CATEGORY,
  poolForLevel,
  roomSetsForLevel,
  siblingsOf,
  signFor,
  skillForLevel,
} from './levels';
import { wordById } from '../../content/packs/mascottes/words';

const fixed = (value: number) => () => value;

describe('categories', () => {
  it('écarte les familles trop maigres pour être jouées', () => {
    for (const [, words] of categories()) {
      expect(words.length).toBeGreaterThanOrEqual(MIN_PER_CATEGORY);
    }
  });

  it('laisse au moins trois salles ouvrables', () => {
    expect(categories().size).toBeGreaterThanOrEqual(3);
  });
});

describe('signFor', () => {
  it('rend toujours la même enseigne', () => {
    for (const name of categories().keys()) {
      expect(signFor(name)?.id).toBe(signFor(name)?.id);
      expect(signFor(name)).not.toBeNull();
    }
  });

  it('exclut l’enseigne du contenu rangeable', () => {
    for (const name of categories().keys()) {
      const sign = signFor(name)!;
      expect(contentsOf(name).some((w) => w.id === sign.id)).toBe(false);
      expect(contentsOf(name).length).toBeGreaterThan(0);
    }
  });
});

describe('poolForLevel', () => {
  it('produit des identifiants uniques et stables', () => {
    for (let level = 0; level <= 6; level++) {
      const ids = poolForLevel(level).map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeGreaterThan(0);
    }
  });

  it('journalise sous la compétence travaillée', () => {
    expect(skillForLevel(0)).toBe('lang.category');
    expect(skillForLevel(4)).toBe('lang.category');
    expect(skillForLevel(6)).toBe('lang.vocabulary');
  });
});

describe('buildRound', () => {
  it('donne au moins un objet à chaque salle ouverte', () => {
    for (const level of [0, 1, 2, 3, 5]) {
      for (const rooms of roomSetsForLevel(level)) {
        const round = buildRound(level, rooms, fixed(0.4));
        expect(round).not.toBeNull();
        for (const room of round!.rooms) {
          expect(round!.cards.some((c) => c.category === room.category)).toBe(true);
        }
      }
    }
  });

  it('range chaque objet dans sa vraie catégorie', () => {
    for (const rooms of roomSetsForLevel(2)) {
      const round = buildRound(2, rooms, fixed(0.7))!;
      for (const card of round.cards) expect(card.word.category).toBe(card.category);
    }
  });

  it('ne propose jamais deux fois le même objet', () => {
    for (const rooms of roomSetsForLevel(3)) {
      const round = buildRound(3, rooms, fixed(0.2))!;
      const ids = round.cards.map((c) => c.word.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('rend null sur une salle inexistante', () => {
    expect(buildRound(0, ['nulle-part'], fixed(0))).toBeNull();
  });
});

describe('intruderRound', () => {
  it('oppose trois membres d’une famille à un étranger', () => {
    for (const name of categories().keys()) {
      const round = intruderRound(name, fixed(0.5));
      expect(round).not.toBeNull();
      expect(round!.family).toHaveLength(3);
      for (const word of round!.family) expect(word.category).toBe(name);
      expect(round!.intruder.category).not.toBe(name);
    }
  });
});

describe('siblingsOf', () => {
  it('tire les voisins dans la même famille — c’est ce qui retire l’indice', () => {
    const word = wordById('chat')!;
    for (const sibling of siblingsOf(word, 3, fixed(0.5))) {
      expect(sibling.category).toBe(word.category);
      expect(sibling.id).not.toBe(word.id);
    }
  });

  it('ne rend jamais moins que demandé quand le pack le permet', () => {
    for (const [, words] of categories()) {
      for (const word of words) {
        expect(siblingsOf(word, configForLevel(6).cards - 1, fixed(0.5)).length).toBe(
          configForLevel(6).cards - 1,
        );
      }
    }
  });
});
