/**
 * Accueil : l'enfant choisit son personnage.
 *
 * Ce tap est aussi le geste qui débloque l'`AudioContext` — Chrome refuse de le
 * démarrer hors d'un geste utilisateur. Si on le rate ici, l'app reste muette
 * toute la séance sans qu'aucune erreur ne le signale.
 */

import { unlockAudio } from '../engine/audio';
import { pawnCharacters } from '../content/pack';
import type { PackCharacter, UniversePack } from '../engine/types';

interface Props {
  pack: UniversePack;
  onPick: (character: PackCharacter) => void;
}

export function Welcome({ pack, onPick }: Props) {
  return (
    <div className="screen">
      <div className="row">
        {pawnCharacters(pack).map((character) => (
          <button
            key={character.id}
            className="pick"
            aria-label={character.name}
            onPointerDown={() => void unlockAudio()}
            onClick={() => onPick(character)}
          >
            <img src={character.portrait} alt="" />
          </button>
        ))}
      </div>
    </div>
  );
}
