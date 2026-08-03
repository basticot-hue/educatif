import { describe, expect, it } from 'vitest';
import {
  CONSONANT_ONSETS,
  MIN_PER_ONSET,
  WORDS,
  continuants,
  onsetGroups,
  rhymeFamilies,
  withConsonantOnset,
  wordsWithSyllables,
} from './words';

/** Les sons qui se tiennent, d'après les données du pack. */
const CONTINUANT_SET = new Set(WORDS.filter((w) => w.continuant).map((w) => w.onset));

describe('données phonologiques des mots', () => {
  it('accorde le découpage et le nombre de syllabes', () => {
    // C'est exactement l'erreur commise en écrivant ce fichier : « banane »
    // annoncé à 3 syllabes alors qu'il s'en frappe 2. Un mot mal découpé
    // apprend à l'enfant un rythme qu'il n'entend pas.
    for (const word of WORDS) {
      expect(word.split.length, word.label).toBe(word.syllables);
    }
  });

  it('ne laisse aucun morceau vide dans un découpage', () => {
    for (const word of WORDS) {
      for (const part of word.split) expect(part.trim().length, word.label).toBeGreaterThan(0);
    }
  });

  it('a des identifiants uniques', () => {
    const ids = WORDS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('couvre 1, 2 et 3 syllabes, avec de quoi contraster', () => {
    // Le niveau 3 du Bal oppose 1 et 3 syllabes : il faut au moins deux mots
    // de chaque, sinon la série tourne toujours sur les mêmes.
    expect(wordsWithSyllables(1).length).toBeGreaterThanOrEqual(2);
    expect(wordsWithSyllables(2).length).toBeGreaterThanOrEqual(2);
    expect(wordsWithSyllables(3).length).toBeGreaterThanOrEqual(2);
  });
});

describe('familles de rimes', () => {
  it("n'en garde que des complètes", () => {
    for (const [rime, list] of rhymeFamilies()) {
      expect(list.length, rime).toBeGreaterThanOrEqual(2);
    }
  });

  it('en offre assez pour que le niveau 0 varie', () => {
    expect(rhymeFamilies().size).toBeGreaterThanOrEqual(3);
  });

  it('permet toujours de proposer un intrus hors de la famille', () => {
    for (const [rime, list] of rhymeFamilies()) {
      const outsiders = WORDS.filter((w) => w.rime !== rime);
      expect(outsiders.length, rime).toBeGreaterThanOrEqual(list.length);
    }
  });
});

describe('attaques', () => {
  it('écarte les attaques vocaliques du Sac de Chase', () => {
    // « éléphant » ne se range dans aucun sac : l'atelier oppose des consonnes.
    for (const word of withConsonantOnset()) {
      expect(CONSONANT_ONSETS.has(word.onset), word.label).toBe(true);
    }
    expect(withConsonantOnset().length).toBeLessThan(WORDS.length);
  });

  it('offre assez de continues contrastées pour les niveaux bas', () => {
    // Les niveaux 1 et 2 du Sac opposent des continues très différentes.
    const onsets = new Set(continuants().map((w) => w.onset));
    expect(onsets.size).toBeGreaterThanOrEqual(4);
  });

  it('offre assez de sons continus tenables pour un vrai atelier', () => {
    /*
     * Le Sac oppose des sons entre eux. Avec deux sons seulement, l'enfant
     * finit par répondre au hasard une fois sur deux et réussit la moitié du
     * temps sans rien entendre. Il en faut assez pour varier les paires.
     */
    const groups = onsetGroups({ continuantOnly: true });
    expect(groups.size).toBeGreaterThanOrEqual(6);
  });

  it("n'expose aucun son n'ayant qu'un seul mot", () => {
    // Un sac à un seul objet possible se devine du premier coup.
    for (const [onset, list] of onsetGroups({ continuantOnly: false })) {
      expect(list.length, onset).toBeGreaterThanOrEqual(MIN_PER_ONSET);
    }
  });

  it('couvre les occlusives pour les niveaux hauts', () => {
    const all = onsetGroups({ continuantOnly: false });
    const occlusives = [...all.keys()].filter((o) => !CONTINUANT_SET.has(o));
    expect(occlusives.length).toBeGreaterThanOrEqual(4);
  });

  it("stocke un son d'attaque, jamais un nom de lettre", () => {
    // On stocke « ch » et on joue « chhh ». Un enfant qui apprend « cé » au
    // lieu de « chhh » devra désapprendre plus tard.
    for (const word of WORDS) {
      expect(word.onset, word.label).not.toMatch(/^(bé|cé|dé|effe|gé|ache|ji|ka|elle|emme|enne|pé|ku|erre|esse|té|vé)$/);
      expect(word.onset.length, word.label).toBeLessThanOrEqual(2);
    }
  });
});
