/**
 * Accès à l'espace parent : appui long dans un coin.
 *
 * Un enfant de 3 ans ne maintient pas un appui de deux secondes sur une zone
 * discrète sans intention. Le vrai verrou de séance reste l'épinglage d'écran
 * d'Android, documenté dans l'espace parent — celui-ci n'est qu'une porte.
 */

import { useRef, useState } from 'react';

const HOLD_MS = 2000;

export function ParentDoor({ onOpen }: { onOpen: () => void }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };

  return (
    <button
      className="parent-door"
      data-holding={holding}
      aria-label="Espace parent"
      onPointerDown={() => {
        setHolding(true);
        timer.current = setTimeout(() => {
          cancel();
          onOpen();
        }, HOLD_MS);
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
    />
  );
}
