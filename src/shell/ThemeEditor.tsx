/**
 * Le monde d'un personnage.
 *
 * Deux choses seulement, et c'est délibéré : **sa couleur**, et **ses objets**.
 * Tout le reste — les niveaux, les items, la façon dont la maîtrise monte — est
 * strictement identique d'un héros à l'autre. Un enfant qui change de
 * personnage change de décor, jamais de programme.
 *
 * On ne propose pas de sélecteur de couleur libre. La moitié des couleurs qu'on
 * y choisit donnent un fond sur lequel les cartes blanches ne se détachent
 * plus, ou noient l'accent — or l'accent est le seul retour positif de
 * l'application. Huit palettes vérifiées valent mieux qu'un arc-en-ciel dont
 * les trois quarts sont inutilisables.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PALETTES,
  SLOTS,
  SLOT_LABELS,
  clearThemeImage,
  loadThemes,
  saveTheme,
  setThemeImage,
  type CharacterTheme,
  type ThemeSlot,
} from '../content/theme';
import { getBlob } from '../engine/storage';
import { MAX_IMAGE_SIDE } from '../content/overrides';

interface Props {
  characterId: string;
  characterName: string;
  onClose: () => void;
  onChanged: () => void;
}

export function ThemeEditor({ characterId, characterName, onClose, onChanged }: Props) {
  const [theme, setTheme] = useState<CharacterTheme>({});
  const [previews, setPreviews] = useState<Partial<Record<ThemeSlot, string>>>({});
  const [busy, setBusy] = useState<ThemeSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Partial<Record<ThemeSlot, HTMLInputElement | null>>>({});
  const urls = useRef<string[]>([]);

  const refresh = useCallback(async () => {
    urls.current.splice(0).forEach(URL.revokeObjectURL);

    const current = (await loadThemes())[characterId] ?? {};
    setTheme(current);

    const next: Partial<Record<ThemeSlot, string>> = {};
    for (const slot of SLOTS) {
      const key = current.images?.[slot];
      if (!key) continue;
      const blob = await getBlob(key);
      if (!blob) continue;
      const url = URL.createObjectURL(blob);
      urls.current.push(url);
      next[slot] = url;
    }
    setPreviews(next);
  }, [characterId]);

  useEffect(() => {
    void refresh();
    return () => {
      urls.current.splice(0).forEach(URL.revokeObjectURL);
    };
  }, [refresh]);

  const pickPalette = async (id: string) => {
    // Retoucher la palette déjà choisie la retire : c'est la façon de revenir
    // aux couleurs du pack sans avoir à ajouter un bouton « aucune ».
    const next = { ...theme, palette: theme.palette === id ? undefined : id };
    setTheme(next);
    await saveTheme(characterId, next);
    onChanged();
  };

  const upload = async (slot: ThemeSlot, file: File | undefined) => {
    if (!file) return;
    setBusy(slot);
    setError(null);
    try {
      await setThemeImage(characterId, slot, file);
      await refresh();
      onChanged();
    } catch {
      setError("Ce fichier n'a pas pu être lu. Essayez un PNG ou un JPG classique.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="parent">
      <div className="parent-inner">
        <h1>Le monde de {characterName}</h1>
        <p>
          Ce que l'enfant voit quand il choisit ce héros : la couleur du décor, et les objets
          qu'il vise ou qu'il transporte. <strong>Rien de ce qui est enseigné ne change</strong>{' '}
          — mêmes niveaux, mêmes mots, même progression qu'avec n'importe quel autre
          personnage.
        </p>

        {error && <div className="callout">{error}</div>}

        <h2>La couleur</h2>
        <p className="muted">
          Elle repeint le fond de tous les ateliers, et l'accent qui signale une cible réussie.
          Retouchez la couleur choisie pour revenir à celle du pack.
        </p>
        <div className="palette-row">
          {PALETTES.map((palette) => (
            <button
              key={palette.id}
              className="palette"
              data-selected={theme.palette === palette.id}
              aria-label={palette.name}
              title={palette.name}
              onClick={() => void pickPalette(palette.id)}
            >
              <span className="palette-bg" style={{ background: palette.bg }}>
                <span className="palette-surface" style={{ background: palette.surface }} />
                <span className="palette-accent" style={{ background: palette.accent }} />
              </span>
              <span className="palette-name">{palette.name}</span>
            </button>
          ))}
        </div>

        <h2>Ses objets</h2>
        <p className="muted">
          Une image par emplacement, réduite à {MAX_IMAGE_SIDE} px et gardée sur la tablette. Un
          fond transparent (PNG détouré) rend bien mieux qu'un carré blanc. Sans image, l'objet
          dessiné d'origine reste en place.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16,
            marginTop: 12,
          }}
        >
          {SLOTS.map((slot) => (
            <figure
              key={slot}
              style={{
                margin: 0,
                background: '#fff',
                border: `1px solid ${previews[slot] ? '#2e8b57' : '#dfe3e8'}`,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div className="image-slot" style={{ width: '100%', height: 120 }}>
                {previews[slot] ? (
                  <img src={previews[slot]} alt="" />
                ) : (
                  <span className="muted">objet d'origine</span>
                )}
              </div>

              <figcaption style={{ marginTop: 8 }}>
                <strong>{SLOT_LABELS[slot].name}</strong>
                <br />
                <span className="muted" style={{ fontSize: 13 }}>
                  {SLOT_LABELS[slot].where}
                </span>
              </figcaption>

              <input
                ref={(node) => {
                  inputs.current[slot] = node;
                }}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  void upload(slot, file);
                }}
              />

              <div className="btn-row" style={{ marginTop: 10 }}>
                <button
                  className="btn"
                  disabled={busy === slot}
                  onClick={() => inputs.current[slot]?.click()}
                >
                  {busy === slot ? '…' : previews[slot] ? 'Changer' : 'Image'}
                </button>
                {previews[slot] && (
                  <button
                    className="btn ghost"
                    onClick={async () => {
                      await clearThemeImage(characterId, slot);
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
          Le changement est visible <strong>à partir du moment où l'enfant choisit ce
          personnage</strong>, pas avant : l'accueil n'appartient à personne et garde les
          couleurs du pack.
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
