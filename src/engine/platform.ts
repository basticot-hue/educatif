/**
 * Adhérences Android : installation, stockage durable, orientation, veille.
 *
 * Toutes ces API échouent différemment selon la tablette et l'état
 * d'installation. Aucune ne doit jamais faire remonter une exception dans
 * l'interface — au pire, la fonctionnalité est absente et l'espace parent le dit.
 */

export interface StorageInfo {
  persisted: boolean;
  usageBytes: number;
  quotaBytes: number;
}

/**
 * Demande que les données soient exclues du nettoyage automatique. Sans cela,
 * Chrome peut vider IndexedDB sous pression de stockage — et l'enfant
 * repartirait de zéro, y compris ses enregistrements.
 *
 * Accordé sans invite quand la PWA est installée.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function storageInfo(): Promise<StorageInfo> {
  try {
    const estimate = (await navigator.storage?.estimate?.()) ?? {};
    return {
      persisted: (await navigator.storage?.persisted?.()) ?? false,
      usageBytes: estimate.usage ?? 0,
      quotaBytes: estimate.quota ?? 0,
    };
  } catch {
    return { persisted: false, usageBytes: 0, quotaBytes: 0 };
  }
}

/** Vrai quand l'app tourne en PWA installée plutôt que dans un onglet. */
export function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

/* ---------------- invite d'installation ---------------- */

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: InstallPromptEvent | null = null;
const installListeners = new Set<(available: boolean) => void>();

// Capturé au chargement du module : Chrome n'émet cet événement qu'une fois, et
// souvent avant que le premier composant React soit monté.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e as InstallPromptEvent;
  installListeners.forEach((fn) => fn(true));
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  installListeners.forEach((fn) => fn(false));
});

export function canInstall(): boolean {
  return deferredPrompt !== null;
}

export function onInstallAvailability(fn: (available: boolean) => void): () => void {
  installListeners.add(fn);
  return () => installListeners.delete(fn);
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const prompt = deferredPrompt;
  deferredPrompt = null;
  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    return outcome === 'accepted';
  } catch {
    return false;
  }
}

/* ---------------- orientation ---------------- */

/**
 * Le verrouillage n'est autorisé qu'en plein écran, donc seulement une fois la
 * PWA installée. L'échec est normal dans un onglet : on l'ignore.
 */
export async function lockLandscape(): Promise<void> {
  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (o: string) => Promise<void>;
    };
    await orientation.lock?.('landscape');
  } catch {
    // Ignoré.
  }
}

/* ---------------- veille ---------------- */

let wakeLock: WakeLockSentinel | null = null;
let wakeLockWanted = false;

/**
 * Empêche l'écran de s'éteindre pendant une séance. Le verrou est perdu à
 * chaque passage en arrière-plan, d'où la réacquisition sur `visibilitychange`.
 */
export async function keepAwake(): Promise<void> {
  wakeLockWanted = true;
  await acquire();
}

async function acquire(): Promise<void> {
  if (!wakeLockWanted || wakeLock) return;
  try {
    wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
    wakeLock?.addEventListener('release', () => {
      wakeLock = null;
    });
  } catch {
    wakeLock = null;
  }
}

export async function releaseWakeLock(): Promise<void> {
  wakeLockWanted = false;
  try {
    await wakeLock?.release();
  } catch {
    // Ignoré.
  }
  wakeLock = null;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void acquire();
});

/* ---------------- pixel ratio ---------------- */

/**
 * Plafonné à 2 : au-delà, le nombre de pixels à peindre double sans gain visible
 * et fait tomber le canvas sous les 60 images par seconde sur du matériel de 2018.
 */
export function pixelRatio(): number {
  return Math.min(2, window.devicePixelRatio || 1);
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
