/**
 * Écran terminal.
 *
 * La spécification demande que « l'app se ferme ». Ce n'est pas réalisable :
 * `window.close()` est refusé sur une fenêtre que le script n'a pas ouverte,
 * PWA installée comprise. L'équivalent atteignable est cet écran — fond uni,
 * aucune cible tactile, aucune invitation à recommencer.
 *
 * L'intention est préservée : jamais de « encore une partie ? », donc pas de
 * négociation quotidienne. C'est le parent qui referme, et le vrai verrou est
 * l'épinglage d'écran d'Android, documenté dans l'espace parent.
 */

import { useEffect } from 'react';
import { releaseWakeLock } from '../engine/platform';

export function EndScreen() {
  useEffect(() => {
    // La séance est finie : on rend l'écran à sa veille normale.
    void releaseWakeLock();
  }, []);

  return (
    <div className="screen end">
      <svg className="glyph" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="6" />
      </svg>
    </div>
  );
}
