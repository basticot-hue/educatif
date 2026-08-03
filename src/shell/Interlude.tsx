/**
 * Interlude et mission : les deux moments où le personnage a le droit d'être là.
 *
 * Le personnage encadre, il ne décore pas. Il apparaît à l'entrée, entre deux
 * exercices et à la sortie — jamais pendant une tâche, où il capterait
 * l'attention limitée de l'enfant au détriment de ce qu'il y a à apprendre.
 */

import { useEffect, useRef } from 'react';
import type { PackCharacter } from '../engine/types';

interface Props {
  character: PackCharacter;
  /** Énoncé joué à l'affichage. Résout quand il est terminé. */
  speak: () => Promise<void>;
  onDone: () => void;
  /** Durée plancher, pour que l'écran ne clignote pas si la voix échoue. */
  minMs?: number;
}

export function Interlude({ character, speak, onDone, minMs = 1800 }: Props) {
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    let cancelled = false;
    const started = performance.now();

    void speak()
      .catch(() => undefined)
      .then(async () => {
        const remaining = minMs - (performance.now() - started);
        if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
        if (!cancelled) done.current();
      });

    return () => {
      cancelled = true;
    };
    // Ne rejoue jamais : un interlude qui se relance en boucle bloquerait la séance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="screen">
      <img className="hero" src={character.image} alt="" />
    </div>
  );
}
