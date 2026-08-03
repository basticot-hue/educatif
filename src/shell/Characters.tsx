/**
 * Panneau parent : remplacer les images des mascottes.
 *
 * Les personnages embarqués sont volontairement neutres — ils sont là pour que
 * l'application soit jouable dès le premier lancement, pas pour plaire. Ce sont
 * les images qui comptent le moins dans le dispositif, et les plus faciles à
 * remplacer par ce que l'enfant aime.
 *
 * On ne touche **jamais** aux métadonnées phonologiques (syllabes, son
 * d'attaque, rime) : elles décrivent le *nom* du personnage, pas son image.
 * Remplacer la photo de Choum ne change pas le fait que « Choum » commence par
 * « chhh » — et c'est cette propriété qui le rend utilisable par Le Sac.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  characterImageKey,
  clearCharacterImage,
  MAX_IMAGE_SIDE,
  setCharacterImage,
} from '../content/overrides';
import { getBlob } from '../engine/storage';
import type { UniversePack } from '../engine/types';

interface Props {
  pack: UniversePack;
  onClose: () => void;
  /** Rechargement du pack, pour que la substitution soit visible aussitôt. */
  onChanged: () => void;
}

export function Characters({ pack, onClose, onChanged }: Props) {
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [replaced, setReplaced] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const urls = useRef<string[]>([]);

  const refresh = useCallback(async () => {
    urls.current.splice(0).forEach(URL.revokeObjectURL);

    const next: Record<string, string> = {};
    const done = new Set<string>();

    for (const character of pack.characters) {
      const blob = await getBlob(characterImageKey(pack.id, character.id));
      if (blob) {
        const url = URL.createObjectURL(blob);
        urls.current.push(url);
        next[character.id] = url;
        done.add(character.id);
      } else {
        next[character.id] = character.image;
      }
    }

    setPreviews(next);
    setReplaced(done);
  }, [pack]);

  useEffect(() => {
    void refresh();
    return () => {
      urls.current.splice(0).forEach(URL.revokeObjectURL);
    };
  }, [refresh]);

  const replace = async (characterId: string, file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(characterId);
    try {
      await setCharacterImage(pack.id, characterId, file);
      await refresh();
      onChanged();
    } catch {
      setError(
        "Ce fichier n'a pas pu être lu. Essayez un PNG ou un JPG classique, " +
          'pris avec l’appareil photo ou enregistré depuis la galerie.',
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="parent">
      <div className="parent-inner">
        <h1>Les mascottes</h1>
        <p>
          Remplacez l'image d'un personnage par une photo ou un dessin. Le fichier reste sur
          la tablette, dans l'application — rien n'est envoyé nulle part.
        </p>
        <p className="muted">
          Formats acceptés : PNG, JPG, WebP. L'image est automatiquement réduite à{' '}
          {MAX_IMAGE_SIDE} px et réencodée en PNG — une photo de tablette fait plusieurs
          mégaoctets et ferait saccader les ateliers. Un <strong>fond transparent</strong> rend
          bien mieux : le personnage se pose sur les cases au lieu d'apparaître dans un carré.
        </p>

        {error && <div className="callout">{error}</div>}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 16,
            marginTop: 16,
          }}
        >
          {pack.characters.map((character) => (
            <figure
              key={character.id}
              style={{
                margin: 0,
                background: '#fff',
                border: '1px solid #dfe3e8',
                borderRadius: 10,
                padding: 12,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  height: 130,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // Damier discret : rend la transparence visible d'un coup d'œil.
                  backgroundImage:
                    'linear-gradient(45deg,#eceff3 25%,transparent 25%,transparent 75%,#eceff3 75%),' +
                    'linear-gradient(45deg,#eceff3 25%,transparent 25%,transparent 75%,#eceff3 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 8px 8px',
                  borderRadius: 8,
                }}
              >
                {previews[character.id] && (
                  <img
                    src={previews[character.id]}
                    alt=""
                    style={{ maxHeight: '100%', maxWidth: '100%' }}
                  />
                )}
              </div>

              <figcaption style={{ marginTop: 8 }}>
                <strong>{character.name}</strong>
                <br />
                <span className="muted" style={{ fontSize: 13 }}>
                  {character.syllables} syll. · son « {character.onset} » · rime « {character.rime} »
                </span>
              </figcaption>

              <input
                ref={(node) => {
                  inputs.current[character.id] = node;
                }}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  void replace(character.id, e.target.files?.[0]);
                  e.target.value = '';
                }}
              />

              <div className="btn-row" style={{ justifyContent: 'center', marginTop: 10 }}>
                <button
                  className="btn"
                  disabled={busy === character.id}
                  onClick={() => inputs.current[character.id]?.click()}
                >
                  {busy === character.id ? 'Un instant…' : 'Remplacer'}
                </button>
                {replaced.has(character.id) && (
                  <button
                    className="btn ghost"
                    onClick={async () => {
                      await clearCharacterImage(pack.id, character.id);
                      await refresh();
                      onChanged();
                    }}
                  >
                    Rétablir
                  </button>
                )}
              </div>
            </figure>
          ))}
        </div>

        <div className="callout" style={{ marginTop: 24 }}>
          Le <strong>nom</strong> du personnage ne change pas, et c'est voulu. « Choum »
          commence par le son « chhh », « Mila » par « mmm » — ces propriétés sont ce qui rend
          les personnages utilisables par les ateliers de sons. Mettre la photo d'un autre
          héros sur Choum ne pose aucun problème tant que l'enfant continue de l'appeler
          Choum ; si vous voulez de vrais nouveaux personnages, il faudra un pack complet,
          avec leurs syllabes et leurs sons.
        </div>

        <div className="btn-row">
          <button className="btn ghost" onClick={onClose}>
            Retour
          </button>
        </div>
      </div>
    </div>
  );
}
