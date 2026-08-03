/**
 * Détection de frappes dans les mains.
 *
 * Volontairement **pas** de reconnaissance vocale : on ne cherche pas à savoir
 * ce que l'enfant dit, seulement combien de fois il frappe. C'est robuste, ça
 * marche hors ligne, ça ne dépend d'aucun service, et ça ne pose aucune
 * question de vie privée — rien ne sort de la tablette.
 *
 * Méthode : `AnalyserNode` en domaine temporel, seuil **adaptatif** calibré sur
 * le bruit de fond des 500 premières millisecondes, et période réfractaire de
 * 200 ms pour ne pas compter deux fois le même impact.
 *
 * Le repli « frapper sur l'écran » n'est pas optionnel : micro refusé,
 * indisponible, ou pièce bruyante — il faut que l'atelier reste jouable.
 */

import { audioContext } from './audio';

/** Durée de calibration du bruit de fond, au début de chaque écoute. */
export const CALIBRATION_MS = 500;

/** Deux impacts plus rapprochés que cela sont le même geste. */
export const REFRACTORY_MS = 200;

/**
 * Marge au-dessus du bruit de fond.
 *
 * Une frappe dans les mains dépasse le bruit ambiant d'un facteur très large.
 * Un multiplicateur trop bas compte les paroles et les frottements ; trop
 * haut, il rate les frappes d'un enfant de 3 ans, qui ne sont pas fortes.
 */
export const THRESHOLD_FACTOR = 3.2;

/** Plancher absolu : dans une pièce silencieuse, le bruit de fond tend vers 0. */
const MIN_THRESHOLD = 0.06;

export interface ClapListener {
  /** Arrête l'écoute et rend le nombre de frappes comptées. */
  stop(): number;
  /** Nombre de frappes détectées jusqu'ici. */
  count(): number;
}

export interface ClapOptions {
  /** Appelé à chaque frappe détectée, avec le total courant. */
  onClap?: (total: number) => void;
  /** Fin automatique après ce délai. */
  windowMs?: number;
  onEnd?: (total: number) => void;
}

/** Amplitude efficace (RMS) d'une trame temporelle. */
function rms(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}

/**
 * Ouvre le micro et compte les frappes.
 * Rend `null` si le micro est refusé ou indisponible — l'appelant doit alors
 * basculer sur le repli tactile **sans rien dire à l'enfant**.
 */
export async function listenForClaps(
  stream: MediaStream,
  options: ClapOptions = {},
): Promise<ClapListener | null> {
  const ctx = audioContext();
  if (!ctx) return null;

  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0; // on veut les transitoires, pas une moyenne
  source.connect(analyser);

  const buffer = new Float32Array(analyser.fftSize);
  const startedAt = performance.now();

  let noiseSum = 0;
  let noiseFrames = 0;
  let threshold = Infinity;
  let claps = 0;
  let lastClapAt = -Infinity;
  let running = true;
  let frame = 0;

  const finish = (): number => {
    if (!running) return claps;
    running = false;
    cancelAnimationFrame(frame);
    try {
      source.disconnect();
      analyser.disconnect();
    } catch {
      // Déjà déconnecté.
    }
    options.onEnd?.(claps);
    return claps;
  };

  const tick = () => {
    if (!running) return;
    const now = performance.now();
    const elapsed = now - startedAt;

    analyser.getFloatTimeDomainData(buffer);
    const level = rms(buffer);

    if (elapsed < CALIBRATION_MS) {
      // Phase de calibration : on écoute la pièce sans rien compter.
      noiseSum += level;
      noiseFrames += 1;
    } else {
      if (threshold === Infinity) {
        const noise = noiseFrames > 0 ? noiseSum / noiseFrames : 0;
        threshold = Math.max(MIN_THRESHOLD, noise * THRESHOLD_FACTOR);
      }
      if (level > threshold && now - lastClapAt > REFRACTORY_MS) {
        lastClapAt = now;
        claps += 1;
        options.onClap?.(claps);
      }
    }

    if (options.windowMs !== undefined && elapsed >= options.windowMs + CALIBRATION_MS) {
      finish();
      return;
    }

    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);

  return {
    stop: finish,
    count: () => claps,
  };
}
