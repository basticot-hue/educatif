/**
 * Le Studio.
 *
 * Le lieu **sans consigne** : rien n'y est demandé, rien n'y est évalué, aucun
 * niveau n'y monte. L'enfant y fait deux choses — regarder ce qu'il a déjà
 * produit, et produire encore.
 *
 * Il rend enfin le **mur des trésors** atteignable. Le mur existait, complet,
 * et aucun écran ne l'ouvrait : l'enfant photographiait ses objets à la
 * Fabrique et traçait dans le sable sans jamais pouvoir les revoir. Or c'est la
 * seule progression visible de l'application — la remplacer par rien revenait à
 * n'en avoir aucune.
 *
 * C'est aussi là qu'aboutit une relance dans l'heure. La séance ne se rejoue
 * pas — pas d'apprentissage à la chaîne, pas de négociation quotidienne — mais
 * l'enfant qui revient trouve un endroit où faire, plutôt qu'un écran mort.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { pixelRatio } from '../engine/platform';
import { addTreasure, putBlob } from '../engine/storage';
import { Wall } from './Wall';
import './fabrique.css';
import './studio.css';

type View = 'accueil' | 'mur' | 'dessin';

/**
 * Trois couleurs, pas douze.
 *
 * Choisir sa couleur est un vrai geste de création, et l'enfant y tient. Mais
 * une palette longue transforme le dessin en manipulation de palette : à trois
 * ans et demi, le temps passé à choisir est du temps qui n'est plus passé à
 * tracer.
 */
const COLORS = ['#12212E', '#D2405C', '#3D6E8C'];

export function Studio({ onDone }: { onDone: () => void }) {
  const [view, setView] = useState<View>('accueil');

  if (view === 'mur') return <Wall onDone={() => setView('accueil')} />;
  if (view === 'dessin') return <Board onDone={() => setView('accueil')} />;

  return (
    <div className="screen studio">
      <div className="studio-row">
        <button className="studio-tile" aria-label="mes trésors" onClick={() => setView('mur')}>
          <WallGlyph />
        </button>
        <button className="studio-tile" aria-label="dessiner" onClick={() => setView('dessin')}>
          <BrushGlyph />
        </button>
      </div>
      <button className="big-round small" aria-label="terminer" onClick={onDone}>
        <HomeGlyph />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * La feuille.
 *
 * Aucun couloir, aucune forme à suivre, aucune validation : c'est exactement ce
 * qui la distingue du Sable. Là-bas la trace ne s'écrit que dans le chemin ;
 * ici tout s'écrit, partout.
 *
 * Pas de gomme ni d'annulation non plus. Elles demanderaient de viser un trait
 * déjà posé — un geste de précision que la main n'a pas encore — et
 * introduiraient l'idée qu'un trait puisse être raté.
 */
function Board({ onDone }: { onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  /** Vrai dès le premier trait : on n'enregistre pas une feuille blanche. */
  const touched = useRef(false);

  /* Le canvas est dimensionné une fois : le redimensionner effacerait tout. */
  useEffect(() => {
    const node = canvas.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const dpr = pixelRatio();
    node.width = Math.round(rect.width * dpr);
    node.height = Math.round(rect.height * dpr);

    const context = node.getContext('2d');
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = '#F4EFE6';
    context.fillRect(0, 0, rect.width, rect.height);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    ctx.current = context;
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const context = ctx.current;
    if (!context || saving) return;
    drawing.current = true;
    touched.current = true;
    try {
      // La capture garde le doigt suivi s'il sort de la feuille. Elle **jette**
      // quand le pointeur n'est plus actif — et `?.` ne protège que d'une
      // méthode absente, pas d'une exception. Sans ce filet, l'erreur
      // interrompait la fonction juste avant le choix de la couleur et de
      // l'épaisseur : l'enfant traçait un cheveu noir au lieu d'un trait.
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Sans capture, le trait s'arrête au bord de la feuille. C'est tout.
    }

    const [x, y] = point(event);
    context.strokeStyle = color;
    context.lineWidth = 12;
    context.beginPath();
    context.moveTo(x, y);
    // Un simple tap doit laisser un point : sans ce trait de longueur nulle,
    // toucher sans glisser ne déposait rien, et l'enfant croyait l'écran mort.
    context.lineTo(x + 0.01, y);
    context.stroke();
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const context = ctx.current;
    if (!drawing.current || !context) return;
    const [x, y] = point(event);
    context.lineTo(x, y);
    context.stroke();
  };

  const stop = () => {
    drawing.current = false;
  };

  const finish = useCallback(async () => {
    const node = canvas.current;
    if (!node || saving) return;

    if (!touched.current) {
      onDone();
      return;
    }

    setSaving(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => node.toBlob(resolve, 'image/png'));
      if (blob) {
        const key = `dessin.${Date.now()}`;
        await putBlob(key, blob);
        await addTreasure({ id: key, kind: 'trace', image: key, audio: null, createdAt: Date.now() });
      }
    } catch {
      // Quota plein : le dessin est perdu, mais rien ne se bloque et rien ne
      // le reproche à l'enfant.
    }
    onDone();
  }, [onDone, saving]);

  return (
    <div className="screen studio-board">
      <canvas
        ref={canvas}
        className="board"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
      />
      <div className="board-tools">
        {COLORS.map((value) => (
          <button
            key={value}
            className="ink"
            aria-label={`couleur ${value}`}
            data-active={value === color}
            style={{ background: value }}
            onClick={() => setColor(value)}
          />
        ))}
        <button className="big-round small" aria-label="terminer" onClick={() => void finish()}>
          <HomeGlyph />
        </button>
      </div>
    </div>
  );
}

/* ---------------- glyphes : zéro texte ---------------- */

/** Un mur de cadres accrochés. */
function WallGlyph() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="7" y="10" width="22" height="22" rx="3" fill="currentColor" />
      <rect x="35" y="14" width="22" height="18" rx="3" fill="currentColor" opacity="0.55" />
      <rect x="7" y="38" width="22" height="18" rx="3" fill="currentColor" opacity="0.55" />
      <rect x="35" y="38" width="22" height="18" rx="3" fill="currentColor" />
    </svg>
  );
}

/** Un pinceau qui vient de poser un trait. */
function BrushGlyph() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M38 8 L54 24 L32 46 L16 30 Z" fill="currentColor" />
      <path d="M16 30 L32 46 L20 54 Q10 56 8 46 Z" fill="currentColor" opacity="0.55" />
      <path d="M6 58 Q22 50 40 58" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function HomeGlyph() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M8 30 L32 10 L56 30" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 28 L14 54 L50 54 L50 28" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
    </svg>
  );
}
