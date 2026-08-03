/**
 * L'étagère.
 *
 * Une étagère, pas un parcours : aucun atelier verrouillé, aucun ordre imposé,
 * aucun cadenas, aucune progression affichée. L'enfant choisit. Revenir dix
 * fois de suite au même atelier est un bon signe, pas un blocage.
 *
 * En passe 1, il n'y a qu'un atelier — l'étagère existe quand même, parce que
 * c'est le geste de choisir qui compte, et parce que les six autres viendront
 * s'y ranger sans rien changer.
 */

import type { ActivityId } from '../engine/types';

/** Zéro texte : l'atelier se reconnaît à son motif. */
function CheminIcon() {
  return (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="12" y="58" width="40" height="40" rx="10" fill="#12212E" opacity="0.12" />
      <rect x="64" y="58" width="40" height="40" rx="10" fill="#12212E" opacity="0.12" />
      <rect x="116" y="58" width="40" height="40" rx="10" fill="#12212E" opacity="0.12" />
      <circle cx="136" cy="44" r="16" fill="#E4B429" />
      <rect x="124" y="56" width="24" height="26" rx="10" fill="#E4B429" />
      <path d="M170 98 L174 40 L192 40 L196 98 Z" fill="#12212E" opacity="0.5" />
      <rect x="174" y="22" width="14" height="14" rx="3" fill="#E4B429" />
    </svg>
  );
}

/** Un véhicule et ses alvéoles, dont l'une est encore vide. */
function MissionsIcon() {
  return (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="18" y="18" width="66" height="42" rx="8" fill="#12212E" opacity="0.1" />
      <circle cx="38" cy="32" r="6" fill="#12212E" opacity="0.55" />
      <circle cx="64" cy="46" r="6" fill="#12212E" opacity="0.55" />
      <rect x="20" y="70" width="150" height="34" rx="9" fill="#E4B429" />
      <rect x="30" y="78" width="18" height="18" rx="4" fill="#12212E" opacity="0.18" />
      <rect x="56" y="78" width="18" height="18" rx="4" fill="#12212E" opacity="0.18" />
      <rect x="82" y="78" width="18" height="18" rx="4" fill="#12212E" opacity="0.4" />
      <circle cx="46" cy="108" r="9" fill="#12212E" />
      <circle cx="144" cy="108" r="9" fill="#12212E" />
    </svg>
  );
}

const ICONS: Partial<Record<ActivityId, () => React.ReactElement>> = {
  chemin: CheminIcon,
  missions: MissionsIcon,
};

interface Props {
  available: ActivityId[];
  onPick: (id: ActivityId) => void;
}

export function Shelf({ available, onPick }: Props) {
  return (
    <div className="screen">
      <div className="row">
        {available.map((id) => {
          const Icon = ICONS[id];
          return (
            <button key={id} className="tile" aria-label={id} onClick={() => onPick(id)}>
              {Icon ? <Icon /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
