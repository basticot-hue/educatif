/**
 * Panneau parent : les personnages.
 *
 * Les mascottes embarquées sont volontairement neutres — elles existent pour
 * que l'application soit jouable au premier lancement, pas pour plaire. Un
 * enfant s'attache à *ses* héros, et c'est cet attachement qui le fait revenir.
 *
 * Le parent peut donc remplacer une image, créer ses propres personnages avec
 * leur nom et leur phonologie, et masquer ceux dont il ne veut pas. Ce qui est
 * saisi n'est pas décoratif : le découpage syllabique, le son d'attaque et la
 * rime sont ce qui rend un personnage utilisable par les ateliers de sons.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  customImageKey,
  deleteCustomCharacter,
  isContinuant,
  loadCustomCharacters,
  loadDisabled,
  saveCustomCharacter,
  setDisabled,
  type CustomCharacter,
} from '../content/characters';
import {
  characterImageKey,
  clearCharacterImage,
  MAX_IMAGE_SIDE,
  setCharacterImage,
} from '../content/overrides';
import { getBlob } from '../engine/storage';
import type { Speaker } from '../engine/speech';
import type { UniversePack } from '../engine/types';
import { CharacterEditor } from './CharacterEditor';

interface Props {
  /** Pack **d'origine**, sans les personnages du parent déjà fusionnés. */
  pack: UniversePack;
  speaker: Speaker | null;
  onClose: () => void;
  onChanged: () => void;
}

interface Row {
  id: string;
  name: string;
  detail: string;
  imageUrl: string | null;
  custom: CustomCharacter | null;
  disabled: boolean;
  replaced: boolean;
}

export function Characters({ pack, speaker, onClose, onChanged }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<CustomCharacter | null | 'new'>(null);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const urls = useRef<string[]>([]);

  const refresh = useCallback(async () => {
    urls.current.splice(0).forEach(URL.revokeObjectURL);

    const [custom, disabled] = await Promise.all([loadCustomCharacters(), loadDisabled()]);
    const hidden = new Set(disabled);
    const next: Row[] = [];

    for (const character of pack.characters) {
      const blob = await getBlob(characterImageKey(pack.id, character.id));
      let url: string | null = character.image;
      if (blob) {
        url = URL.createObjectURL(blob);
        urls.current.push(url);
      }
      next.push({
        id: character.id,
        name: character.name,
        detail: `${character.syllables} morceau${character.syllables > 1 ? 'x' : ''} · son « ${character.onset} » · fin « ${character.rime} »`,
        imageUrl: url,
        custom: null,
        disabled: hidden.has(character.id),
        replaced: blob !== null,
      });
    }

    for (const c of custom) {
      let url: string | null = null;
      if (c.imageKey) {
        const blob = await getBlob(c.imageKey);
        if (blob) {
          url = URL.createObjectURL(blob);
          urls.current.push(url);
        }
      }
      next.push({
        id: c.id,
        name: c.name,
        detail: `${c.split.join('-')} · son « ${c.onset} »${isContinuant(c.onset) ? '' : ' (claque)'} · fin « ${c.rime} »`,
        imageUrl: url,
        custom: c,
        disabled: hidden.has(c.id),
        replaced: false,
      });
    }

    setRows(next);
  }, [pack]);

  useEffect(() => {
    void refresh();
    return () => {
      urls.current.splice(0).forEach(URL.revokeObjectURL);
    };
  }, [refresh]);

  if (editing !== null) {
    return (
      <CharacterEditor
        initial={editing === 'new' ? null : editing}
        speaker={speaker}
        onCancel={() => setEditing(null)}
        onSave={async (character) => {
          await saveCustomCharacter(character);
          setEditing(null);
          await refresh();
          onChanged();
        }}
      />
    );
  }

  const active = rows.filter((r) => !r.disabled).length;

  return (
    <div className="parent">
      <div className="parent-inner">
        <h1>Les personnages</h1>
        <p>
          L'enfant choisit le sien au début de chaque séance. Ajoutez les vôtres — c'est
          l'attachement à ses héros qui le fait revenir.
        </p>
        <p className="muted">
          Tout reste sur la tablette. Les images sont réduites à {MAX_IMAGE_SIDE} px ; un fond
          transparent rend bien mieux qu'un carré blanc.
        </p>

        {error && <div className="callout">{error}</div>}

        {active === 0 && (
          <div className="callout">
            Tous les personnages sont masqués. L'accueil réafficherait les mascottes d'origine
            plutôt que de rester vide — il en faut au moins un.
          </div>
        )}

        <div className="btn-row">
          <button className="btn" onClick={() => setEditing('new')}>
            Ajouter un personnage
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: 16,
            marginTop: 16,
          }}
        >
          {rows.map((row) => (
            <figure
              key={row.id}
              style={{
                margin: 0,
                background: '#fff',
                border: '1px solid #dfe3e8',
                borderRadius: 10,
                padding: 12,
                textAlign: 'center',
                opacity: row.disabled ? 0.5 : 1,
              }}
            >
              <div className="image-slot" style={{ width: '100%', height: 130 }}>
                {row.imageUrl ? (
                  <img src={row.imageUrl} alt="" />
                ) : (
                  <span className="muted">aucune image</span>
                )}
              </div>

              <figcaption style={{ marginTop: 8 }}>
                <strong>{row.name}</strong>
                <br />
                <span className="muted" style={{ fontSize: 13 }}>
                  {row.detail}
                </span>
              </figcaption>

              <input
                ref={(node) => {
                  inputs.current[row.id] = node;
                }}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  setError(null);
                  try {
                    if (row.custom) {
                      const { normalizeImage } = await import('../content/overrides');
                      const { putBlob } = await import('../engine/storage');
                      const key = customImageKey(row.id);
                      await putBlob(key, await normalizeImage(file));
                      await saveCustomCharacter({ ...row.custom, imageKey: key });
                    } else {
                      await setCharacterImage(pack.id, row.id, file);
                    }
                    await refresh();
                    onChanged();
                  } catch {
                    setError(
                      "Ce fichier n'a pas pu être lu. Essayez un PNG ou un JPG classique.",
                    );
                  }
                }}
              />

              <div className="btn-row" style={{ justifyContent: 'center', marginTop: 10 }}>
                <button className="btn" onClick={() => inputs.current[row.id]?.click()}>
                  Image
                </button>
                {row.custom && (
                  <button className="btn ghost" onClick={() => setEditing(row.custom)}>
                    Modifier
                  </button>
                )}
                {!row.custom && row.replaced && (
                  <button
                    className="btn ghost"
                    onClick={async () => {
                      await clearCharacterImage(pack.id, row.id);
                      await refresh();
                      onChanged();
                    }}
                  >
                    Rétablir
                  </button>
                )}
              </div>

              <div className="btn-row" style={{ justifyContent: 'center', marginTop: 6 }}>
                <button
                  className="btn ghost"
                  onClick={async () => {
                    await setDisabled(row.id, !row.disabled);
                    await refresh();
                    onChanged();
                  }}
                >
                  {row.disabled ? 'Réafficher' : 'Masquer'}
                </button>
                {row.custom && (
                  <button
                    className="btn danger"
                    onClick={async () => {
                      if (!confirm(`Supprimer ${row.name} définitivement ?`)) return;
                      await deleteCustomCharacter(row.id);
                      await refresh();
                      onChanged();
                    }}
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </figure>
          ))}
        </div>

        <div className="callout" style={{ marginTop: 24 }}>
          Le <strong>découpage</strong> et le <strong>son d'attaque</strong> ne sont pas de la
          décoration : ce sont eux qui rendent un personnage utilisable par les ateliers de
          sons. Prenez le temps d'écouter le découpage avant de valider — c'est votre oreille
          qui décide, pas la proposition automatique.
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
