/**
 * Déroulé d'une séance, et détection d'une séance « off ».
 *
 * Un enfant de 3 ans varie énormément d'un jour à l'autre. Le moteur doit
 * distinguer « ne sait pas » de « n'est pas disponible aujourd'hui » — sinon une
 * mauvaise nuit fait perdre des niveaux réellement acquis.
 *
 * Quand une séance est détectée « off », on **arrête d'évaluer** : les résultats
 * ne mettent plus à jour la maîtrise ni les boîtes de Leitner. Aucun message,
 * aucune explication à l'enfant. Le parent le voit dans le récapitulatif.
 */

import { updateMastery } from './mastery';
import { applyResult, schedulesToMap, selectSeries } from './scheduler';
import {
  loadMastery,
  loadSchedules,
  recentSessions,
  saveMastery,
  saveSchedule,
  saveSession,
} from './storage';
import type { ActivityId, Item, ItemResult, Mastery, SessionRecord, SkillId } from './types';

/** Une séance par jour. Relancer dans l'heure ne relance pas d'apprentissage. */
export const RELAUNCH_WINDOW_MS = 60 * 60 * 1000;

/** Nombre d'abandons qui suffit à considérer la séance perdue. */
export const ABANDON_LIMIT = 3;

/** Fenêtre de début de séance sur laquelle on mesure le taux d'échec. */
export const EARLY_WINDOW = 4;

/** Nombre de séances passées servant à établir la latence de référence. */
const BASELINE_SESSIONS = 5;

/** En dessous, l'échantillon est trop petit pour que la médiane veuille dire quelque chose. */
const MIN_BASELINE_SAMPLES = 6;

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export interface OffSignals {
  slow: boolean;
  abandons: boolean;
  earlyFailures: boolean;
}

/**
 * Les trois signaux de la spécification. Un seul suffit.
 *
 * @param baseline latence médiane de référence, ou `null` si l'historique est
 *   trop court — dans ce cas le signal de lenteur ne peut pas se déclencher.
 */
export function detectOff(
  results: ItemResult[],
  abandons: number,
  baseline: number | null,
): OffSignals {
  const latencies = results.map((r) => r.latencyMs);

  const slow =
    baseline !== null && latencies.length >= 3 && median(latencies) > 2 * baseline;

  const early = results.slice(0, EARLY_WINDOW);
  const earlyFailures =
    early.length >= EARLY_WINDOW &&
    early.filter((r) => !r.correct).length / early.length > 0.5;

  return { slow, abandons: abandons >= ABANDON_LIMIT, earlyFailures };
}

export function isOff(signals: OffSignals): boolean {
  return signals.slow || signals.abandons || signals.earlyFailures;
}

/* ------------------------------------------------------------------ */

export class Session {
  readonly startedAt: number;
  readonly record: SessionRecord;

  /** Faux dès qu'une séance « off » est détectée. */
  evaluating = true;

  private itemIndex = 0;
  private abandons = 0;
  private baselines = new Map<SkillId, number>();

  constructor(characterId: string | null) {
    this.startedAt = Date.now();
    this.record = {
      startedAt: this.startedAt,
      endedAt: null,
      activities: [],
      results: [],
      off: false,
      missionId: null,
      characterId,
    };
  }

  /** Charge les latences de référence des séances précédentes. */
  async loadBaselines(): Promise<void> {
    const past = await recentSessions(BASELINE_SESSIONS);
    const bySkill = new Map<SkillId, number[]>();

    for (const session of past) {
      if (session.off) continue; // une séance « off » ne fait pas référence
      for (const r of session.results) {
        const list = bySkill.get(r.skill) ?? [];
        list.push(r.latencyMs);
        bySkill.set(r.skill, list);
      }
    }

    for (const [skill, latencies] of bySkill) {
      if (latencies.length >= MIN_BASELINE_SAMPLES) {
        this.baselines.set(skill, median(latencies));
      }
    }
  }

  noteActivity(id: ActivityId): void {
    if (!this.record.activities.includes(id)) this.record.activities.push(id);
  }

  /**
   * Un abandon : atelier quitté avant la fin de la série, ou item resté sans le
   * moindre geste pendant longtemps.
   */
  noteAbandon(): void {
    this.abandons += 1;
    this.refreshOff();
  }

  /**
   * Enregistre un résultat et fait progresser la maîtrise et les boîtes — sauf
   * si la séance a basculé en « off ».
   */
  async recordResult(result: ItemResult): Promise<void> {
    this.record.results.push(result);

    if (this.evaluating) {
      const mastery = await loadMastery(result.skill);
      await saveMastery(updateMastery(mastery, result, this.itemIndex));

      const schedules = schedulesToMap(await loadSchedules(result.skill));
      await saveSchedule(
        applyResult(
          schedules.get(result.itemId),
          { id: result.itemId, skill: result.skill, level: 0, params: {} },
          result.correct,
          Date.now(),
        ),
      );
    }

    this.itemIndex += 1;
    this.refreshOff();
    await saveSession(this.record);
  }

  private refreshOff(): void {
    if (!this.evaluating) return;

    const bySkill = new Map<SkillId, ItemResult[]>();
    for (const r of this.record.results) {
      const list = bySkill.get(r.skill) ?? [];
      list.push(r);
      bySkill.set(r.skill, list);
    }

    for (const [skill, results] of bySkill) {
      const signals = detectOff(results, this.abandons, this.baselines.get(skill) ?? null);
      if (isOff(signals)) {
        this.evaluating = false;
        this.record.off = true;
        return;
      }
    }

    // Les abandons ne dépendent d'aucune compétence : ils comptent même quand
    // aucun résultat n'a encore été produit.
    if (this.abandons >= ABANDON_LIMIT) {
      this.evaluating = false;
      this.record.off = true;
    }
  }

  async finish(missionId: string | null): Promise<void> {
    this.record.endedAt = Date.now();
    this.record.missionId = missionId;
    await saveSession(this.record);
  }

  /** Compétence la plus travaillée : c'est elle qui détermine la mission du soir. */
  dominantSkill(): SkillId | null {
    const counts = new Map<SkillId, number>();
    for (const r of this.record.results) counts.set(r.skill, (counts.get(r.skill) ?? 0) + 1);
    let best: SkillId | null = null;
    let bestCount = 0;
    for (const [skill, count] of counts) {
      if (count > bestCount) {
        best = skill;
        bestCount = count;
      }
    }
    return best;
  }
}

/* ------------------------------------------------------------------ */

/**
 * Une séance terminée il y a moins d'une heure ne se rejoue pas : cela
 * éviterait mal l'apprentissage à la chaîne, et surtout la négociation
 * quotidienne qui vient avec.
 */
export async function recentlyFinished(now = Date.now()): Promise<boolean> {
  const [last] = await recentSessions(1);
  return last?.endedAt != null && now - last.endedAt < RELAUNCH_WINDOW_MS;
}

/** Compose la série d'items d'un atelier pour le niveau courant de la compétence. */
export async function buildSeries(
  skill: SkillId,
  poolAt: (level: number) => Item[],
  seriesLength?: number,
): Promise<{ items: Item[]; level: number; mastery: Mastery }> {
  const mastery = await loadMastery(skill);
  const schedules = schedulesToMap(await loadSchedules(skill));
  const items = selectSeries({
    now: Date.now(),
    level: mastery.level,
    poolAt,
    schedules,
    seriesLength,
  });
  return { items, level: mastery.level, mastery };
}
