/**
 * Le mur des trésors.
 *
 * **Seule progression visible de l'application**, et elle ne contient que la
 * production de l'enfant : ses tracés, ses objets photographiés, ses scènes,
 * ses histoires racontées. Aucun score, aucune étoile, aucune série de jours,
 * aucun compteur — rien qui puisse se collectionner pour lui-même.
 *
 * L'ordre est antéchronologique : ce qu'il vient de faire est ce qu'il a envie
 * de revoir.
 */

import { useEffect, useState } from 'react';
import { allTreasures, getBlob } from '../engine/storage';
import type { Treasure } from '../engine/types';
import './wall.css';

interface Piece {
  treasure: Treasure;
  imageUrl: string | null;
  audioUrl: string | null;
}

export function Wall({ onDone }: { onDone: () => void }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    let urls: string[] = [];
    let cancelled = false;

    void (async () => {
      const treasures = await allTreasures();
      const loaded = await Promise.all(
        treasures.map(async (treasure) => {
          const image = treasure.image ? await getBlob(treasure.image) : null;
          const audio = treasure.audio ? await getBlob(treasure.audio) : null;
          const imageUrl = image ? URL.createObjectURL(image) : null;
          const audioUrl = audio ? URL.createObjectURL(audio) : null;
          if (imageUrl) urls.push(imageUrl);
          if (audioUrl) urls.push(audioUrl);
          return { treasure, imageUrl, audioUrl };
        }),
      );
      if (!cancelled) setPieces(loaded);
    })();

    return () => {
      cancelled = true;
      urls.forEach(URL.revokeObjectURL);
      urls = [];
    };
  }, []);

  return (
    <div className="screen wall-screen" onClick={onDone}>
      <div className="wall">
        {pieces.map(({ treasure, imageUrl, audioUrl }) => (
          <button
            key={treasure.id}
            className="treasure"
            data-kind={treasure.kind}
            aria-label={treasure.kind}
            onClick={(e) => {
              // Un trésor sonore se réécoute ; le tap ne doit pas fermer le mur.
              if (!audioUrl) return;
              e.stopPropagation();
              void new Audio(audioUrl).play().catch(() => undefined);
            }}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="" />
            ) : (
              <svg viewBox="0 0 64 64" aria-hidden="true">
                <path
                  d="M22 20 L22 44 M32 14 L32 50 M42 24 L42 40"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
