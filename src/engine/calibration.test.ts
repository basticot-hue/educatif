import { describe, expect, it } from 'vitest';
import { profileFor, type TouchCalibration } from './calibration';

function at(hz: number): TouchCalibration {
  return { hz, jitterPx: 0.8, worstGapMs: 20, measuredAt: 0 };
}

describe('profil de tracé', () => {
  it('reste prudent sans mesure', () => {
    // Mieux vaut un couloir un peu large qu'une trace qui se coupe : sans
    // donnée, on suppose le pire cas raisonnable.
    const profile = profileFor(null);
    expect(profile.corridorScale).toBeGreaterThan(1);
    expect(profile.smoothing).toBeGreaterThanOrEqual(3);
  });

  it('suit les seuils de la spécification', () => {
    expect(profileFor(at(120)).corridorScale).toBe(1);
    // 60–90 Hz : élargir de 50 %, lisser sur 3 points.
    expect(profileFor(at(75)).corridorScale).toBeCloseTo(1.5);
    expect(profileFor(at(75)).smoothing).toBe(3);
    // Sous 60 Hz : élargir fortement, lisser sur 5.
    expect(profileFor(at(45)).smoothing).toBe(5);
    expect(profileFor(at(45)).corridorScale).toBeGreaterThan(2);
  });

  it('garde une marge dans la bande 90–100 Hz', () => {
    /*
     * La spécification autorise le couloir serré au-dessus de 90 Hz. Une dalle
     * mesurée à 92 n'a que deux pour cent de marge, et la fréquence varie d'un
     * tracé à l'autre. Le prix d'un pari perdu est payé par l'enfant, sous
     * forme d'un échec qu'il n'a pas commis.
     */
    const marginal = profileFor(at(92));
    expect(marginal.corridorScale).toBeGreaterThan(1);
    expect(marginal.corridorScale).toBeLessThan(profileFor(at(75)).corridorScale);
    expect(marginal.smoothing).toBe(3);
  });

  it("n'est jamais plus serré quand la dalle est plus lente", () => {
    // Monotonie : à mesure que la fréquence baisse, le couloir ne se resserre
    // jamais et le lissage ne diminue jamais.
    let previousScale = 0;
    let previousSmoothing = 0;
    for (const hz of [140, 100, 95, 90, 85, 60, 55, 20]) {
      const profile = profileFor(at(hz));
      expect(profile.corridorScale, `${hz} Hz`).toBeGreaterThanOrEqual(previousScale);
      expect(profile.smoothing, `${hz} Hz`).toBeGreaterThanOrEqual(previousSmoothing);
      previousScale = profile.corridorScale;
      previousSmoothing = profile.smoothing;
    }
  });
});
