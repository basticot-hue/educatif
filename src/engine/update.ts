/**
 * Mise à jour de l'application installée.
 *
 * Le déploiement peut être parfait — service worker frais, bon bundle référencé
 * — et la tablette continuer d'afficher une version vieille de plusieurs jours.
 * Ce n'est pas un défaut du serveur, c'est le cycle de vie d'une PWA installée :
 *
 * 1. `registerSW.js` n'enregistre le service worker que sur l'événement `load`.
 *    Or une application installée qu'Android garde en tâche de fond n'est pas
 *    rechargée quand on revient dessus : elle est **reprise**. Aucun `load`,
 *    donc aucune vérification de mise à jour, indéfiniment.
 * 2. Même quand la vérification a lieu et que le nouveau service worker prend
 *    la main, la page déjà ouverte continue d'exécuter l'ancien JavaScript
 *    jusqu'à un rechargement.
 *
 * D'où les deux garde-fous d'ici : on **redemande** une vérification chaque
 * fois que l'application redevient visible, et on recharge dès qu'un nouveau
 * service worker prend le relais.
 */

/** Délai minimal entre deux vérifications, pour ne pas interroger à chaque bascule. */
const CHECK_INTERVAL_MS = 60_000;

let lastCheck = 0;
let reloading = false;
let started = false;

function supported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Demande au navigateur d'aller voir s'il existe une nouvelle version.
 *
 * L'échec est normal et sans conséquence : hors ligne, la vérification ne peut
 * pas aboutir, et l'application doit continuer de tourner exactement pareil.
 */
export async function checkForUpdate(force = false): Promise<void> {
  if (!supported()) return;

  const now = Date.now();
  if (!force && now - lastCheck < CHECK_INTERVAL_MS) return;
  lastCheck = now;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  } catch {
    // Hors ligne, ou service worker absent : rien à faire, rien à signaler.
  }
}

/**
 * Met en place la surveillance. À appeler une fois, au démarrage.
 */
export function watchForUpdates(): void {
  if (!supported() || started) return;
  started = true;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Une seule fois par page : sans ce garde-fou, un service worker qui
    // reprend la main en boucle rechargerait la page sans fin.
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  void checkForUpdate(true);

  // Le moment qui compte : l'enfant rouvre l'application après une nuit.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdate();
  });

  // Sur Android, une application reprise depuis la pile des tâches ne déclenche
  // pas toujours `visibilitychange` ; `focus` complète la couverture.
  window.addEventListener('focus', () => void checkForUpdate());
}

/**
 * Repart de zéro : on retire les service workers et on vide leurs caches.
 *
 * C'est le dernier recours quand une tablette reste bloquée sur une version
 * périmée. **Rien de ce que l'enfant a produit n'est touché** : la progression,
 * la voix, les photos et les trésors vivent dans IndexedDB, que cette fonction
 * n'ouvre même pas. Seuls les fichiers de l'application sont supprimés, et ils
 * sont retéléchargés dans la seconde.
 *
 * Demande donc une connexion : hors ligne, on viderait le cache sans pouvoir
 * le regarnir, et l'application ne démarrerait plus.
 */
export async function reinstall(): Promise<void> {
  if (supported()) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
  }

  if (typeof caches !== 'undefined') {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  // `reload()` seul peut resservir la page depuis le cache HTTP ; on repart de
  // l'URL, ce qui force une vraie navigation.
  window.location.replace(window.location.href.split('#')[0]);
}
