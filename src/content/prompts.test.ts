import { describe, expect, it } from 'vitest';
import { ACTIVITY_DOCS, PROMPTS, docFor, promptText } from './prompts';
import { ACTIVITY_IDS, SKILLS } from '../engine/types';

/**
 * Ce fichier garde une invariante qu'aucun type ne peut tenir : un atelier
 * **muet**. Une première version n'avait aucun texte pour ses consignes — les
 * clés existaient dans le code, rien ne les résolvait, et l'atelier se lançait
 * sans qu'aucune erreur ne le signale. L'enfant restait devant un écran qui ne
 * disait rien.
 */
describe('documentation des ateliers', () => {
  /*
   * On vérifie la couverture contre `ACTIVITY_IDS` et non contre le registre :
   * importer le registre tirerait tous les ateliers, donc `window`, dans un
   * test qui tourne sous Node. Les deux listes sont tenues d'accord par le
   * type `ActivityId`, qui est celui du registre.
   */
  it('couvre tous les identifiants d’atelier déclarés', () => {
    for (const id of ACTIVITY_IDS) {
      expect(docFor(id), `atelier sans documentation : ${id}`).toBeDefined();
    }
  });

  it('décrit les sept niveaux de chaque atelier', () => {
    for (const doc of ACTIVITY_DOCS) {
      expect(doc.levels.length, doc.name).toBe(7);
      for (const level of doc.levels) expect(level.trim().length).toBeGreaterThan(0);
    }
  });

  it('donne à chaque atelier au moins une consigne parlée', () => {
    for (const doc of ACTIVITY_DOCS) {
      expect(Object.keys(doc.prompts).length, doc.name).toBeGreaterThan(0);
    }
  });

  it('n’a aucune consigne vide', () => {
    for (const [key, text] of Object.entries(PROMPTS)) {
      expect(text.trim().length, key).toBeGreaterThan(0);
      expect(promptText(key)).toBe(text);
    }
  });

  it('préfixe chaque consigne du nom de son atelier', () => {
    for (const doc of ACTIVITY_DOCS) {
      for (const key of Object.keys(doc.prompts)) {
        // Sans ce préfixe, deux ateliers finiraient par se voler une clé, et
        // l'un des deux prononcerait la consigne de l'autre.
        expect(key.startsWith(`${doc.id}.`) || key.startsWith('mission.'), key).toBe(true);
      }
    }
  });

  it('ne déclare que des compétences connues du moteur', () => {
    for (const doc of ACTIVITY_DOCS) {
      for (const skill of doc.skills) expect(SKILLS).toContain(skill);
    }
  });
});
