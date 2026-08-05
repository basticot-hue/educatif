/**
 * Contexte audio et lecture de sons courts.
 *
 * Chrome refuse de démarrer un `AudioContext` hors d'un geste utilisateur. Le
 * geste choisi est le tout premier `pointerdown` de la séance — le tap sur le
 * personnage à l'accueil. Si on rate ce déblocage, l'app reste muette pour le
 * reste de la séance sans qu'aucune erreur ne le signale.
 */

let ctx: AudioContext | null = null;
let unlocked = false;

export function audioContext(): AudioContext | null {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/**
 * À appeler depuis un gestionnaire de geste, jamais depuis un `useEffect`.
 * Idempotent : les appels suivants ne coûtent rien.
 */
export async function unlockAudio(): Promise<void> {
  const c = audioContext();
  if (!c) return;
  if (c.state === 'suspended') {
    try {
      await c.resume();
    } catch {
      // Le geste n'était pas éligible ; on retentera au geste suivant.
      return;
    }
  }
  if (!unlocked && c.state === 'running') {
    // Un buffer d'un échantillon suffit à sortir l'iOS/Android du silence initial.
    const source = c.createBufferSource();
    source.buffer = c.createBuffer(1, 1, c.sampleRate);
    source.connect(c.destination);
    source.start(0);
    unlocked = true;
  }
}

export function isAudioUnlocked(): boolean {
  return unlocked && ctx?.state === 'running';
}

/* ---------------- décodage et cache ---------------- */

const buffers = new Map<string, AudioBuffer>();

/**
 * Décode et met en cache. Le décodage est coûteux sur un SoC de 2018 : il doit
 * arriver au montage de l'atelier, jamais pendant une tâche.
 */
export async function loadSound(key: string, source: Blob | ArrayBuffer): Promise<AudioBuffer | null> {
  const cached = buffers.get(key);
  if (cached) return cached;

  const c = audioContext();
  if (!c) return null;

  const bytes = source instanceof Blob ? await source.arrayBuffer() : source;
  try {
    const buffer = await c.decodeAudioData(bytes.slice(0));
    buffers.set(key, buffer);
    return buffer;
  } catch {
    return null;
  }
}

export function cachedSound(key: string): AudioBuffer | null {
  return buffers.get(key) ?? null;
}

let current: AudioBufferSourceNode | null = null;
/** Résout la promesse du son en cours — qu'il aille au bout ou qu'on le coupe. */
let endCurrent: (() => void) | null = null;

/**
 * Joue un buffer et résout à la fin. Coupe systématiquement ce qui jouait :
 * pendant un glissement rapide, les numéros de case ne doivent pas s'empiler.
 */
export function playBuffer(buffer: AudioBuffer): Promise<void> {
  const c = audioContext();
  if (!c) return Promise.resolve();

  stopPlayback();

  return new Promise((resolve) => {
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.connect(c.destination);

    const finish = () => {
      if (endCurrent === finish) {
        current = null;
        endCurrent = null;
      }
      resolve();
    };

    source.onended = finish;
    current = source;
    endCurrent = finish;
    source.start(0);
  });
}

/**
 * Coupe le son en cours — **et résout sa promesse**.
 *
 * Ne pas la résoudre était un blocage silencieux et durable. Une séquence qui
 * énonce plusieurs mots à la suite (`await speak(...)` dans une boucle) restait
 * suspendue pour toujours dès qu'un son partait par-dessus : c'est exactement ce
 * qui se passe quand l'enfant touche une carte pendant que l'atelier nomme les
 * images. La suite des noms n'arrivait jamais, et Le Sac de Chase devenait
 * injouable puisque tout y repose sur ce qu'on a entendu.
 *
 * La promesse dit « ce son ne joue plus », pas « ce son est allé au bout ».
 */
export function stopPlayback(): void {
  const source = current;
  const finish = endCurrent;
  current = null;
  endCurrent = null;

  if (source) {
    try {
      source.onended = null;
      source.stop();
    } catch {
      // Déjà terminé.
    }
  }
  finish?.();
}

/** Retour haptique léger à l'aimantation. Silencieux si non disponible. */
export function tick(): void {
  try {
    navigator.vibrate?.(10);
  } catch {
    // Ignoré : sur certaines tablettes `vibrate` existe mais lève.
  }
}
