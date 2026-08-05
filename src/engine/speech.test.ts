import { describe, expect, it } from 'vitest';
import { numberWord, speechText } from './speech';
import { defaultPack } from '../content/pack';
import { PROMPTS } from '../content/prompts';
import { WORDS } from '../content/packs/mascottes/words';

/**
 * Ce fichier garde une invariante qu'aucun type ne peut tenir : une clé
 * d'énoncé **muette**.
 *
 * `prompts.test.ts` vérifie déjà qu'aucune consigne n'est vide et que
 * `promptText` la retrouve. Cela ne suffisait pas : c'est `speechText` qui
 * décide de ce que l'enfant entend, et une de ses branches pouvait avaler une
 * clé avant qu'elle n'atteigne les consignes. Les deux consignes du Récit ont
 * ainsi été silencieuses sans que rien ne le signale — ni erreur, ni test, ni
 * type. L'atelier se lançait, racontait son histoire, et ne disait jamais à
 * l'enfant ce qu'on attendait de lui.
 */

const pack = defaultPack();
const character = pack.characters[0];
const textFor = (key: string) => speechText(pack, character, key);

describe('résolution des énoncés', () => {
  it('prononce toutes les consignes déclarées, sans exception', () => {
    for (const [key, text] of Object.entries(PROMPTS)) {
      expect(textFor(key), `consigne muette : ${key}`).toBe(text);
    }
  });

  /*
   * Le Récit est le seul atelier dont les clés partagent leur préfixe avec du
   * contenu du pack. C'est là que la collision s'est produite, et c'est donc là
   * qu'on la surveille des deux côtés.
   */
  it('distingue les consignes du Récit du contenu de ses histoires', () => {
    expect(textFor('recit.ecoute')).toBe(PROMPTS['recit.ecoute']);
    expect(textFor('recit.ordonner')).toBe(PROMPTS['recit.ordonner']);

    const story = pack.stories[0];
    expect(textFor(`recit.${story.id}.${story.panels[0].id}`)).toBe(story.panels[0].text);
    const question = story.questions[0];
    expect(textFor(`recit.${story.id}.q.${question.id}`)).toBe(question.prompt);
  });

  it('dit les mots et les syllabes portés par la clé elle-même', () => {
    const word = WORDS[0];
    expect(textFor(`mot.${word.id}`)).toBe(word.label);
    expect(textFor('syl.cha')).toBe('cha');
  });

  it('dit les nombres en toutes lettres', () => {
    expect(textFor('num.1')).toBe('un');
    expect(textFor('num.17')).toBe('dix-sept');
  });

  /*
   * Le Chemin monte à 30 cases au niveau 7, puis dix de plus par niveau, sans
   * plafond. Les numéros au-delà de 29 partaient en chiffres à la synthèse.
   */
  it('compte en français jusqu’à cent, sans laisser passer un chiffre', () => {
    const cases: Array<[number, string]> = [
      [0, 'zéro'],
      [16, 'seize'],
      [21, 'vingt et un'],
      [22, 'vingt-deux'],
      [30, 'trente'],
      [35, 'trente-cinq'],
      [41, 'quarante et un'],
      [60, 'soixante'],
      [69, 'soixante-neuf'],
      [70, 'soixante-dix'],
      [71, 'soixante et onze'],
      [79, 'soixante-dix-neuf'],
      [80, 'quatre-vingts'],
      [81, 'quatre-vingt-un'],
      [91, 'quatre-vingt-onze'],
      [99, 'quatre-vingt-dix-neuf'],
      [100, 'cent'],
    ];
    for (const [n, expected] of cases) expect(numberWord(n), `${n}`).toBe(expected);

    // Aucun numéro atteignable ne doit sortir en chiffres.
    for (let n = 0; n <= 100; n++) {
      expect(numberWord(n), `${n} n’est pas dit en toutes lettres`).not.toMatch(/\d/);
    }
  });

  it('fait parler le personnage pour saluer et féliciter', () => {
    expect(textFor('greet')).toBeTruthy();
    expect(textFor('praise')).toBeTruthy();
    expect(textFor('retry')).toBeTruthy();
  });

  it('rend null sur une clé qui n’existe nulle part', () => {
    // Le silence reste possible — mais seulement pour une clé qu'aucun atelier
    // n'utilise. C'est ce que le premier test ci-dessus vérifie.
    expect(textFor('mot.nexistepas')).toBeNull();
  });
});
