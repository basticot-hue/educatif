/**
 * Sonde tactile.
 *
 * Une dalle d'entrée de gamme échantillonne le doigt lentement et avec du
 * bruit. Le Sable (passe 2) impose de rester dans un couloir : si la fréquence
 * réelle est basse, la trace se coupe alors que le geste était correct, et
 * l'enfant vit un échec qu'il n'a pas commis — l'inverse exact de l'intention.
 *
 * Cette mesure doit donc être faite **sur la tablette réelle**, avant d'écrire
 * cet atelier. L'émulation tactile de DevTools ne reproduit ni la latence ni le
 * bruit : il faut passer par `chrome://inspect` en USB.
 *
 * Lecture des résultats :
 *   > 90 Hz   le couloir peut rester serré
 *   60–90 Hz  élargir de 50 %, lisser sur 3 points
 *   < 60 Hz   élargir fortement, lisser sur 5 points, envisager de repousser
 */

import { useCallback, useRef, useState } from 'react';

interface Sample {
  x: number;
  y: number;
  t: number;
}

interface Measure {
  hz: number;
  points: number;
  durationMs: number;
  /** Écart-type de la distance à la droite de régression, en pixels CSS. */
  jitterPx: number;
  /** Plus grand intervalle entre deux `pointermove`, en millisecondes. */
  worstGapMs: number;
}

/** Dispersion perpendiculaire à la droite des moindres carrés. */
function jitter(samples: Sample[]): number {
  const n = samples.length;
  if (n < 3) return 0;

  const mx = samples.reduce((s, p) => s + p.x, 0) / n;
  const my = samples.reduce((s, p) => s + p.y, 0) / n;

  let sxx = 0;
  let sxy = 0;
  for (const p of samples) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.y - my);
  }
  if (sxx === 0) return 0;

  const slope = sxy / sxx;
  const norm = Math.hypot(slope, -1);
  const variance =
    samples.reduce((s, p) => s + ((slope * (p.x - mx) - (p.y - my)) / norm) ** 2, 0) / n;
  return Math.sqrt(variance);
}

function verdict(hz: number): { label: string; advice: string } {
  if (hz >= 90) {
    return { label: 'Bon', advice: 'Le couloir du Sable peut rester serré.' };
  }
  if (hz >= 60) {
    return {
      label: 'Moyen',
      advice: 'Élargir le couloir de 50 % et lisser sur les 3 derniers points.',
    };
  }
  return {
    label: 'Faible',
    advice:
      'Élargir fortement, lisser sur 5 points, et envisager de repousser Le Sable.',
  };
}

export function TouchProbe({ onClose }: { onClose: () => void }) {
  const samples = useRef<Sample[]>([]);
  const [measure, setMeasure] = useState<Measure | null>(null);
  const [drawing, setDrawing] = useState(false);

  const start = useCallback((e: React.PointerEvent) => {
    samples.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    setMeasure(null);
    setDrawing(true);
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Refusé par certains WebView : la mesure reste valable.
    }
  }, []);

  const move = useCallback(
    (e: React.PointerEvent) => {
      if (!drawing) return;
      // On lit les évènements coalescés : Chrome en agrège plusieurs par frame,
      // et les ignorer sous-estimerait la fréquence réelle de la dalle — c'est
      // précisément la grandeur qu'on cherche à mesurer.
      //
      // La liste peut être vide (évènement synthétique, ou navigateur qui ne
      // coalesce pas) : on retombe alors sur l'évènement lui-même, sinon la
      // sonde ne mesurerait rien du tout.
      const coalesced = e.nativeEvent.getCoalescedEvents?.() ?? [];
      const events = coalesced.length > 0 ? coalesced : [e.nativeEvent];
      const now = performance.now();
      for (const ev of events) {
        samples.current.push({ x: ev.clientX, y: ev.clientY, t: now });
      }
    },
    [drawing],
  );

  const end = useCallback(() => {
    setDrawing(false);
    const list = samples.current;
    if (list.length < 8) return;

    const durationMs = list[list.length - 1].t - list[0].t;
    let worstGapMs = 0;
    for (let i = 1; i < list.length; i++) {
      worstGapMs = Math.max(worstGapMs, list[i].t - list[i - 1].t);
    }

    setMeasure({
      hz: durationMs > 0 ? Math.round((list.length / durationMs) * 1000) : 0,
      points: list.length,
      durationMs: Math.round(durationMs),
      jitterPx: Number(jitter(list).toFixed(2)),
      worstGapMs: Math.round(worstGapMs),
    });
  }, []);

  const v = measure ? verdict(measure.hz) : null;

  return (
    <div className="parent">
      <div className="parent-inner">
        <h1>Sonde tactile</h1>
        <p className="muted">
          Tracez un trait <strong>lent et droit</strong> d'un bord à l'autre de la zone
          grise, du doigt, sur la tablette elle-même. Recommencez deux ou trois fois.
        </p>

        <div
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          style={{
            height: 200,
            margin: '16px 0',
            borderRadius: 12,
            background: drawing ? '#e3e8ee' : '#eceff3',
            border: '1px dashed #b9c2cc',
            touchAction: 'none',
          }}
        />

        {measure && v && (
          <>
            <p>
              <strong>
                {measure.hz} Hz — {v.label}
              </strong>
            </p>
            <p className="muted">
              {measure.points} points en {measure.durationMs} ms · dispersion{' '}
              {measure.jitterPx} px · plus grand trou {measure.worstGapMs} ms
            </p>
            <div className="callout">{v.advice}</div>
          </>
        )}

        <p className="muted">
          Mesure faite dans DevTools ? Elle ne vaut rien : l'émulation ne reproduit ni la
          latence ni le bruit de la dalle. Utilisez <code>chrome://inspect</code> en USB.
        </p>

        <div className="btn-row">
          <button className="btn ghost" onClick={onClose}>
            Retour
          </button>
        </div>
      </div>
    </div>
  );
}
