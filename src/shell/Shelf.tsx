/**
 * L'étagère.
 *
 * Une étagère, pas un parcours : aucun atelier verrouillé, aucun ordre imposé,
 * aucun cadenas, aucune progression affichée. L'enfant choisit. Revenir dix
 * fois de suite au même atelier est un bon signe, pas un blocage.
 *
 * Les sept ateliers y sont, plus la Fabrique. Tout tient dans un écran, sans
 * défilement : une étagère qu'il faut faire défiler pour voir le dernier atelier
 * n'est plus une étagère, c'est un menu — et l'enfant choisirait toujours parmi
 * les mêmes quatre premiers.
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

/** Trois podiums de hauteurs croissantes, et deux mains qui frappent. */
function SyllabesIcon() {
  return (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="22" y="82" width="44" height="26" rx="6" fill="#12212E" opacity="0.14" />
      <rect x="76" y="60" width="44" height="48" rx="6" fill="#12212E" opacity="0.2" />
      <rect x="130" y="38" width="44" height="70" rx="6" fill="#E4B429" />
      <circle cx="44" cy="95" r="5" fill="#12212E" opacity="0.5" />
      <circle cx="90" cy="74" r="5" fill="#12212E" opacity="0.5" />
      <circle cx="106" cy="74" r="5" fill="#12212E" opacity="0.5" />
      <circle cx="144" cy="52" r="5" fill="#12212E" />
      <circle cx="160" cy="52" r="5" fill="#12212E" />
      <circle cx="152" cy="68" r="5" fill="#12212E" />
      <path d="M32 30 L52 18 M52 30 L32 18" stroke="#E4B429" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

/** Deux sacs ouverts, et un objet au-dessus de l'un d'eux. */
function SonsIcon() {
  return (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M24 60 Q56 48 88 60 L96 108 Q56 118 16 108 Z" fill="#12212E" opacity="0.14" />
      <path d="M112 60 Q144 48 176 60 L184 108 Q144 118 104 108 Z" fill="#E4B429" />
      <path d="M24 60 Q56 70 88 60" fill="none" stroke="#12212E" strokeWidth="4" opacity="0.4" />
      <path d="M112 60 Q144 70 176 60" fill="none" stroke="#12212E" strokeWidth="4" opacity="0.35" />
      <circle cx="144" cy="24" r="16" fill="#12212E" opacity="0.4" />
    </svg>
  );
}

/** Un sillon dans le sable, et le doigt qui le parcourt. */
function SableIcon() {
  return (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="14" y="16" width="172" height="88" rx="14" fill="#12212E" opacity="0.12" />
      <path
        d="M46 84 Q46 32 100 32 Q154 32 154 84"
        fill="none"
        stroke="#12212E"
        strokeWidth="18"
        strokeLinecap="round"
        opacity="0.18"
      />
      <path
        d="M46 84 Q46 32 100 32"
        fill="none"
        stroke="#E4B429"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <circle cx="100" cy="32" r="12" fill="#E4B429" />
    </svg>
  );
}

/** Deux salles d'un château, et un objet qui va dans l'une d'elles. */
function ChateauIcon() {
  return (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M20 108 L20 46 L38 46 L38 34 L56 34 L56 46 L74 46 L74 108 Z" fill="#12212E" opacity="0.14" />
      <path d="M126 108 L126 46 L144 46 L144 34 L162 34 L162 46 L180 46 L180 108 Z" fill="#E4B429" />
      <path d="M38 108 L38 76 Q47 66 56 76 L56 108 Z" fill="#12212E" opacity="0.3" />
      <path d="M144 108 L144 76 Q153 66 162 76 L162 108 Z" fill="#12212E" opacity="0.35" />
      <circle cx="100" cy="52" r="16" fill="#12212E" opacity="0.4" />
    </svg>
  );
}

/** Trois vignettes, dont une encore de travers. */
function RecitIcon() {
  return (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="16" y="34" width="48" height="52" rx="8" fill="#12212E" opacity="0.14" />
      <rect x="76" y="34" width="48" height="52" rx="8" fill="#12212E" opacity="0.14" />
      <rect x="136" y="30" width="48" height="52" rx="8" fill="#E4B429" transform="rotate(9 160 56)" />
      <circle cx="40" cy="54" r="9" fill="#12212E" opacity="0.4" />
      <circle cx="100" cy="54" r="9" fill="#12212E" opacity="0.4" />
      <path d="M24 76 L56 76 M84 76 L116 76" stroke="#12212E" strokeWidth="5" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

/** Un appareil photo et un objet : ce qu'on y fait, sans un mot. */
function FabriqueIcon() {
  return (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="20" y="34" width="86" height="60" rx="10" fill="#12212E" opacity="0.14" />
      <rect x="46" y="24" width="34" height="14" rx="4" fill="#12212E" opacity="0.14" />
      <circle cx="63" cy="64" r="20" fill="#12212E" opacity="0.3" />
      <circle cx="63" cy="64" r="11" fill="#E4B429" />
      <path d="M126 88 L152 42 L178 88 Z" fill="#E4B429" />
      <circle cx="152" cy="30" r="9" fill="#12212E" opacity="0.4" />
    </svg>
  );
}

/**
 * L'étagère ne présente pas que des ateliers : la Fabrique et le Studio sont
 * des espaces libres, sans niveau ni évaluation, et se choisissent exactement
 * de la même façon. C'est l'enfant qui décide.
 */
export type ShelfId = ActivityId | 'fabrique' | 'studio';

const ICONS: Partial<Record<ShelfId, () => React.ReactElement>> = {
  chemin: CheminIcon,
  missions: MissionsIcon,
  syllabes: SyllabesIcon,
  sons: SonsIcon,
  sable: SableIcon,
  chateau: ChateauIcon,
  recit: RecitIcon,
  fabrique: FabriqueIcon,
};

interface Props {
  available: ShelfId[];
  onPick: (id: ShelfId) => void;
}

export function Shelf({ available, onPick }: Props) {
  return (
    <div className="screen">
      <div className="shelf">
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
