/**
 * Les tuiles de l'étagère, vues du parent.
 *
 * L'étagère est le seul écran où l'enfant décide. S'il ne reconnaît pas une
 * tuile, il ne choisit pas cet atelier — il retourne sur ceux dont il se
 * rappelle la position. Le parent doit donc pouvoir vérifier, et corriger.
 *
 * Corriger veut dire : mettre **sa** photo. Une photo de l'enfant en train de
 * jouer à cet atelier, du camion de la maison, du chat du voisin. Un dessin
 * reste une convention qu'il faut avoir apprise ; une photo de ce qu'il connaît
 * n'en demande aucune.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  activityIcon,
  clearActivityIcon,
  setActivityIcon,
} from '../content/activityIcons';
import { MAX_IMAGE_SIDE } from '../content/overrides';
import { SHELF_ICONS, SHELF_LABELS } from './shelfIcons';
import type { ShelfId } from './Shelf';

const ORDER: ShelfId[] = [
  'chemin',
  'missions',
  'syllabes',
  'sons',
  'sable',
  'chateau',
  'recit',
  'fabrique',
  'studio',
];

export function ShelfSheet({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const inputs = useRef<Partial<Record<string, HTMLInputElement | null>>>({});
  const target = useRef<ShelfId | null>(null);
  /** Les URL vivent hors de React : ce compteur force le rendu après coup. */
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const onFile = useCallback(
    async (file: File | undefined) => {
      const id = target.current;
      target.current = null;
      if (!file || !id) return;

      setBusy(id);
      setFailed(null);
      try {
        await setActivityIcon(id, file);
        setVersion((v) => v + 1);
        onChanged();
      } catch {
        // Fichier illisible, quota plein : le dessin reste, et on le dit.
        setFailed(id);
      } finally {
        setBusy(null);
      }
    },
    [onChanged],
  );

  const [replaced, setReplaced] = useState(0);
  useEffect(() => {
    setReplaced(ORDER.filter((id) => activityIcon(id) !== null).length);
  }, [version]);

  return (
    <div className="parent">
      <div className="parent-inner">
        <h1>Les tuiles de l'étagère</h1>
        <p>
          C'est le seul écran où l'enfant décide. Montrez-lui ces tuiles sans rien dire : s'il
          ne sait pas dire ce qu'on fait derrière l'une d'elles, elle ne lui sert à rien — il
          ira sur celles dont il se rappelle la place, toujours les mêmes.
        </p>
        <p>
          <strong>Remplacez-la par votre photo.</strong> Une photo de lui en train de jouer à
          cet atelier marche mieux que n'importe quel dessin : elle ne demande aucune
          convention. L'image est réduite à {MAX_IMAGE_SIDE} px et reste sur la tablette.
        </p>
        {replaced > 0 && (
          <p className="muted">
            {replaced} tuile{replaced > 1 ? 's' : ''} sur {ORDER.length} illustrée
            {replaced > 1 ? 's' : ''} par vos photos.
          </p>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
            marginTop: 16,
          }}
        >
          {ORDER.map((id) => {
            const own = activityIcon(id);
            const Icon = SHELF_ICONS[id];
            return (
              <figure
                key={id}
                style={{
                  margin: 0,
                  background: '#fff',
                  border: `1px solid ${own ? '#2e8b57' : '#dfe3e8'}`,
                  borderRadius: 10,
                  padding: 12,
                  textAlign: 'center',
                }}
              >
                {/*
                  Fond sombre derrière l'aperçu : les tuiles sont dessinées avec
                  les couleurs du thème, et sur le blanc de l'espace parent le
                  trait d'encre disparaîtrait presque.
                */}
                <div className="tile-preview" key={version}>
                  {own ? <img src={own} alt="" /> : Icon ? <Icon /> : null}
                </div>

                <figcaption style={{ fontSize: 13, marginTop: 8 }}>
                  <strong>{SHELF_LABELS[id] ?? id}</strong>
                </figcaption>

                <input
                  ref={(node) => {
                    inputs.current[id] = node;
                  }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    void onFile(file);
                  }}
                />

                <div className="btn-row" style={{ justifyContent: 'center' }}>
                  <button
                    className="btn ghost"
                    style={{ minHeight: 38, padding: '6px 10px', fontSize: 13 }}
                    disabled={busy === id}
                    onClick={() => {
                      target.current = id;
                      inputs.current[id]?.click();
                    }}
                  >
                    {busy === id ? '…' : own ? 'Changer' : 'Photo'}
                  </button>
                  {own && (
                    <button
                      className="btn ghost"
                      style={{ minHeight: 38, padding: '6px 10px', fontSize: 13 }}
                      onClick={async () => {
                        await clearActivityIcon(id);
                        setVersion((v) => v + 1);
                        onChanged();
                      }}
                    >
                      Dessin
                    </button>
                  )}
                </div>
                {failed === id && (
                  <p className="muted" style={{ fontSize: 12 }}>
                    Image refusée. Le dessin reste en place.
                  </p>
                )}
              </figure>
            );
          })}
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
