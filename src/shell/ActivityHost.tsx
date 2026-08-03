/**
 * Pont entre React et le contrat impératif des activités.
 *
 * Les activités pilotent un canvas à 60 images par seconde avec capture de
 * pointeur. Les faire passer par la réconciliation de React créerait des
 * conflits de cycle de vie sur le canvas — d'où `mount()` / `unmount()` et ce
 * composant d'une vingtaine de lignes qui ne possède qu'un conteneur.
 */

import { useEffect, useRef } from 'react';
import type { Activity, ActivityProps } from '../engine/types';

type HostProps = Omit<ActivityProps, 'container'> & {
  activity: Activity;
};

export function ActivityHost({ activity, ...props }: HostProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Les rappels changent d'identité à chaque rendu du parent ; on les lit à
  // travers une ref pour ne jamais remonter l'activité en cours de série.
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    activity.mount({
      container,
      level: latest.current.level,
      items: latest.current.items,
      pack: latest.current.pack,
      speak: (key) => latest.current.speak(key),
      recordVoice: (itemId) => latest.current.recordVoice(itemId),
      onItemResult: (r) => latest.current.onItemResult(r),
      onFinished: () => latest.current.onFinished(),
    });

    return () => activity.unmount();
    // Volontairement dépendant de la seule activité : un changement de niveau ou
    // d'items en cours de série n'a pas de sens et ne doit rien remonter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity]);

  return <div ref={ref} style={{ position: 'absolute', inset: 0 }} />;
}
