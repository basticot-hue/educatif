/**
 * L'étagère.
 *
 * Une étagère, pas un parcours : aucun atelier verrouillé, aucun ordre imposé,
 * aucun cadenas, aucune progression affichée. L'enfant choisit. Revenir dix
 * fois de suite au même atelier est un bon signe, pas un blocage.
 *
 * Les sept ateliers y sont, plus la Fabrique et le Studio. Tout tient dans un
 * écran, sans défilement : une étagère qu'il faut faire défiler pour voir le
 * dernier atelier n'est plus une étagère, c'est un menu — et l'enfant
 * choisirait toujours parmi les mêmes quatre premiers.
 *
 * Chaque tuile montre **ce qu'on y fait**, avec les objets de l'atelier
 * lui-même. Le parent peut y substituer sa propre image : voir
 * `content/activityIcons.ts`.
 */

import { activityIcon } from '../content/activityIcons';
import type { ActivityId } from '../engine/types';
import { SHELF_ICONS } from './shelfIcons';

/**
 * L'étagère ne présente pas que des ateliers : la Fabrique et le Studio sont
 * des espaces libres, sans niveau ni évaluation, et se choisissent exactement
 * de la même façon. C'est l'enfant qui décide.
 */
export type ShelfId = ActivityId | 'fabrique' | 'studio';

interface Props {
  available: ShelfId[];
  onPick: (id: ShelfId) => void;
}

export function Shelf({ available, onPick }: Props) {
  return (
    <div className="screen">
      <div className="shelf">
        {available.map((id) => {
          // L'image du parent l'emporte sur le dessin : c'est elle qui a le
          // plus de chances de vouloir dire quelque chose pour *cet* enfant.
          const own = activityIcon(id);
          const Icon = SHELF_ICONS[id];
          return (
            <button key={id} className="tile" aria-label={id} onClick={() => onPick(id)}>
              {own ? <img src={own} alt="" /> : Icon ? <Icon /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
