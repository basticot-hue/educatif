/**
 * Niveau par compétence.
 *
 * Ces règles visent un taux de réussite d'environ 80 %. En dessous l'enfant se
 * décourage ; au-dessus il n'apprend plus rien. C'est aussi ce qui protège de
 * l'accélération artificielle : un enfant poussé au-dessus de son niveau réel
 * n'apprend pas plus vite.
 *
 * Aucun changement de niveau n'est annoncé, sonorisé ni affiché.
 */

import type { ItemResult, Mastery } from './types';

export const PROMOTE_AFTER = 4; // réussites consécutives au 1er essai
export const DEMOTE_AFTER = 2; // échecs consécutifs

/**
 * Nombre d'items en début de séance pendant lesquels on ne descend jamais.
 *
 * Le temps de chauffe d'un enfant de cet âge est réel : deux erreurs
 * d'échauffement ne doivent pas coûter un niveau acquis. On continue en
 * revanche de compter les échecs, pour qu'une séance vraiment difficile
 * finisse par redescendre.
 */
export const WARMUP_ITEMS = 2;

/**
 * @param itemIndexInSession index de l'item dans la séance, à partir de 0.
 *   Le garde-fou d'échauffement vit ici, dans le moteur, et pas dans les
 *   activités — sinon chaque nouvel atelier devrait le réimplémenter, et l'un
 *   d'eux finirait par l'oublier.
 */
export function updateMastery(
  current: Mastery,
  result: ItemResult,
  itemIndexInSession: number,
): Mastery {
  /*
   * Une réussite, c'est `correct` — et rien d'autre à recalculer ici.
   *
   * Cette ligne exigeait aussi `attempts === 1`, et cela paraissait inoffensif
   * puisque « choisir parmi N » pose déjà `correct = (attempts === 1)`. Mais
   * `attempts` ne veut pas dire la même chose partout : dans « écouter puis
   * glisser », il compte **un dépôt par carte**. Un tour sans faute à trois
   * objets y vaut `attempts = 3`, et se voyait donc compté comme un échec.
   *
   * Conséquence, muette et totale : Le Sac de Chase, Le Château des mots et Le
   * Récit ne pouvaient **jamais** monter d'un niveau. Chaque série parfaite
   * remettait la série de réussites à zéro et incrémentait le compteur
   * d'échecs. L'enfant rejouait le niveau 0 indéfiniment, et le moteur de
   * progression — le cœur de l'application — ne tournait pas du tout sur la
   * moitié des ateliers.
   *
   * Chaque atelier sait seul ce que « du premier coup » veut dire chez lui, et
   * l'écrit dans `correct`. Le moteur ne le devine pas à sa place. On garde
   * `!assisted` : Le Chemin ne le replie pas dans `correct`.
   */
  const success = result.correct && !result.assisted;

  const next: Mastery = { ...current };

  if (success) {
    next.streak = current.streak + 1;
    next.failures = 0;
    if (next.streak >= PROMOTE_AFTER) {
      next.level = current.level + 1; // pas de plafond
      next.streak = 0;
    }
    return next;
  }

  next.streak = 0;
  next.failures = current.failures + 1;

  if (next.failures >= DEMOTE_AFTER) {
    if (itemIndexInSession >= WARMUP_ITEMS) {
      next.level = Math.max(0, current.level - 1);
      next.failures = 0;
    }
    // Pendant l'échauffement : le compteur d'échecs est conservé tel quel, donc
    // un troisième échec passé la fenêtre fera bien redescendre.
  }

  return next;
}
