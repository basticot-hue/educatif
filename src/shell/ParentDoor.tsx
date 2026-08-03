/**
 * Accès à l'espace parent : appui long dans un coin.
 *
 * Deux contraintes qui se contredisent, et qu'il faut tenir ensemble :
 *
 * - un enfant de 3 ans ne doit pas l'ouvrir par accident. D'où l'appui long de
 *   deux secondes, puis l'opération arithmétique derrière ;
 * - un parent doit la trouver **sans qu'on le lui dise**. La première version
 *   était à peine visible et personne ne la voyait. Elle porte maintenant une
 *   marque discrète mais réelle, et un anneau de progression pendant l'appui,
 *   pour qu'on comprenne qu'il se passe quelque chose plutôt que d'abandonner
 *   au bout d'une demi-seconde.
 *
 * Elle est aussi **décollée du bord** : sur Android, un appui contre l'arête
 * droite est capté par le geste de retour arrière, et n'atteint jamais la page.
 */

import { useEffect, useRef, useState } from 'react';

const HOLD_MS = 2000;

export function ParentDoor({ onOpen }: { onOpen: () => void }) {
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useRef(0);
  const startedAt = useRef(0);

  const cancel = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    setProgress(0);
  };

  // Un démontage en cours d'appui laisserait un timer et une boucle orphelins.
  useEffect(() => cancel, []);

  const begin = () => {
    startedAt.current = performance.now();

    const tick = () => {
      const p = Math.min(1, (performance.now() - startedAt.current) / HOLD_MS);
      setProgress(p);
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);

    // L'ouverture est pilotée par un timer et non par la boucle de rendu :
    // celle-ci est suspendue en arrière-plan.
    timer.current = setTimeout(() => {
      cancel();
      onOpen();
    }, HOLD_MS);
  };

  const R = 26;
  const circumference = 2 * Math.PI * R;

  return (
    <button
      className="parent-door"
      aria-label="Espace parent — maintenir deux secondes"
      onPointerDown={begin}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
    >
      <svg viewBox="0 0 64 64" aria-hidden="true">
        {/* Trois traits : le glyphe universel des réglages, sans texte. */}
        <g className="glyph">
          <circle cx="32" cy="32" r="30" />
          <line x1="20" y1="24" x2="44" y2="24" />
          <line x1="20" y1="32" x2="44" y2="32" />
          <line x1="20" y1="40" x2="44" y2="40" />
        </g>
        <circle
          className="ring"
          cx="32"
          cy="32"
          r={R}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
    </button>
  );
}
