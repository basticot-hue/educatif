/**
 * Calibration du tracé, d'après la mesure de la sonde tactile.
 *
 * Le Sable impose de rester dans un couloir. Sur une dalle qui échantillonne
 * lentement ou avec du bruit, un couloir serré coupe la trace alors que le
 * geste était correct : **l'enfant vit un échec qu'il n'a pas commis**, ce qui
 * est l'inverse exact de l'intention de l'atelier. Le rayon de tolérance et la
 * fenêtre de lissage sont donc des paramètres, jamais des constantes.
 */

import { getSetting, setSetting } from './storage';

export const CALIBRATION_KEY = 'touch.calibration';

export interface TouchCalibration {
  /** Fréquence des `pointermove`, en hertz. */
  hz: number;
  /** Dispersion perpendiculaire au tracé, en pixels CSS. */
  jitterPx: number;
  /** Plus grand intervalle entre deux points, en millisecondes. */
  worstGapMs: number;
  measuredAt: number;
}

export interface TracingProfile {
  /** Multiplicateur du rayon de tolérance du couloir. */
  corridorScale: number;
  /** Nombre de points de la moyenne glissante avant tout test de distance. */
  smoothing: number;
  /** Étiquette lisible, pour l'espace parent. */
  label: string;
}

/**
 * Profil de tracé déduit de la mesure.
 *
 * Les seuils sont ceux de la spécification (90 et 60 Hz), avec une **bande de
 * sécurité entre 90 et 100 Hz** qu'elle ne prévoit pas. La raison est
 * empirique : une dalle mesurée à 92 Hz n'a que deux pour cent de marge, et la
 * fréquence varie d'un tracé à l'autre selon la vitesse du doigt et la charge
 * du processeur. Serrer le couloir au maximum sur une marge pareille revient à
 * parier que la mesure ne descendra jamais — et le prix de ce pari est payé par
 * l'enfant, sous forme d'un échec qu'il n'a pas commis.
 *
 * Sans mesure, on suppose le pire cas raisonnable : mieux vaut un couloir un
 * peu large qu'une trace qui se coupe.
 */
export function profileFor(calibration: TouchCalibration | null): TracingProfile {
  if (!calibration) {
    return { corridorScale: 1.5, smoothing: 3, label: 'non mesurée — réglage prudent' };
  }

  const { hz } = calibration;

  if (hz >= 100) return { corridorScale: 1, smoothing: 2, label: 'bonne' };
  if (hz >= 90) return { corridorScale: 1.15, smoothing: 3, label: 'bonne, avec marge' };
  if (hz >= 60) return { corridorScale: 1.5, smoothing: 3, label: 'moyenne' };
  return { corridorScale: 2.2, smoothing: 5, label: 'faible' };
}

export async function saveCalibration(
  measure: Omit<TouchCalibration, 'measuredAt'>,
): Promise<void> {
  await setSetting(CALIBRATION_KEY, { ...measure, measuredAt: Date.now() });
}

export async function loadCalibration(): Promise<TouchCalibration | null> {
  return getSetting<TouchCalibration | null>(CALIBRATION_KEY, null);
}

export async function loadTracingProfile(): Promise<TracingProfile> {
  return profileFor(await loadCalibration());
}
