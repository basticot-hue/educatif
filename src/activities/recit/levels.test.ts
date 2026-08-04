import { describe, expect, it } from 'vitest';
import { configForLevel, poolForLevel, questionFor, storiesForLevel } from './levels';
import { defaultPack } from '../../content/pack';
import { wordById } from '../../content/packs/mascottes/words';

const pack = defaultPack();
const fixed = (value: number) => () => value;

describe('les histoires du pack', () => {
  it('montrent un objet différent par panneau', () => {
    for (const story of pack.stories) {
      const words = story.panels.map((p) => p.wordId);
      // Deux panneaux identiques à l'écran seraient impossibles à ordonner
      // autrement qu'en ayant retenu les phrases mot à mot.
      expect(new Set(words).size).toBe(words.length);
    }
  });

  it('ne montrent que des objets qui existent dans le pack', () => {
    for (const story of pack.stories) {
      for (const panel of story.panels) expect(wordById(panel.wordId)).toBeDefined();
      for (const question of story.questions) {
        for (const option of question.options) expect(wordById(option)).toBeDefined();
      }
    }
  });

  it('proposent une bonne réponse qui figure bien parmi les choix', () => {
    for (const story of pack.stories) {
      for (const question of story.questions) {
        expect(question.options).toContain(question.answer);
        expect(question.options.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('sont rattachées à un personnage existant', () => {
    for (const story of pack.stories) {
      expect(pack.characters.some((c) => c.id === story.characterId)).toBe(true);
    }
  });

  it('ont assez de panneaux pour le niveau le plus haut', () => {
    for (const story of pack.stories) {
      expect(story.panels.length).toBeGreaterThanOrEqual(configForLevel(6).panels);
    }
  });

  it('portent des identifiants de panneau uniques', () => {
    for (const story of pack.stories) {
      const ids = story.panels.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('storiesForLevel', () => {
  it('écarte les histoires trop courtes pour le niveau', () => {
    for (let level = 0; level <= 6; level++) {
      for (const story of storiesForLevel(pack, level)) {
        expect(story.panels.length).toBeGreaterThanOrEqual(configForLevel(level).panels);
      }
    }
  });

  it('exige une question quand le niveau en pose une', () => {
    for (const level of [4, 5, 6]) {
      for (const story of storiesForLevel(pack, level)) {
        expect(story.questions.length).toBeGreaterThan(0);
      }
    }
  });

  it('laisse toujours de quoi jouer', () => {
    for (let level = 0; level <= 6; level++) {
      expect(storiesForLevel(pack, level).length).toBeGreaterThan(0);
    }
  });
});

describe('poolForLevel', () => {
  it('fait de l’histoire entière un item, pas de chaque panneau', () => {
    const items = poolForLevel(pack, 1);
    expect(items.length).toBe(storiesForLevel(pack, 1).length);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  it('sépare les items d’un niveau à l’autre quand la tâche change', () => {
    expect(poolForLevel(pack, 1)[0].id).not.toBe(poolForLevel(pack, 4)[0].id);
  });
});

describe('questionFor', () => {
  it('rend une question de l’histoire, jamais d’une autre', () => {
    for (const story of pack.stories) {
      const question = questionFor(story, fixed(0.5));
      expect(story.questions).toContain(question);
    }
  });
});
