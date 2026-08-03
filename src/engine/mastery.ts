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
  // Une aide déclenchée n'est pas une réussite : l'enfant n'a pas produit la
  // réponse seul. On la traite comme un échec pour la progression, sans que
  // rien ne le signale à l'écran.
  const success = result.correct && result.attempts === 1 && !result.assisted;

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
