/**
 * Planche de contrôle des pictogrammes, accessible depuis l'espace parent.
 *
 * Un pictogramme que l'enfant ne reconnaît pas transforme un exercice de
 * phonologie en devinette visuelle. Le parent doit pouvoir vérifier lui-même,
 * et — c'est le point de cet écran — **corriger** : chaque mot accepte une
 * photo prise sur la tablette, qui remplace le dessin partout dans l'app.
 *
 * Aucune photo n'est livrée avec l'application. Une banque d'images pèserait
 * plusieurs dizaines de mégaoctets à embarquer hors ligne, et se
 * redistribuerait sous conditions. La photo du parent, elle, montre l'objet que
 * l'enfant connaît vraiment.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { WORDS } from '../content/packs/mascottes/words';
import {
  clearWordImage,
  hasWordImage,
  setWordImage,
  wordImage,
} from '../content/wordImages';

export function WordSheet({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const targetWord = useRef<string | null>(null);
  /** Force le rendu après une substitution : les URL vivent hors de React. */
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const pick = useCallback((wordId: string) => {
    targetWord.current = wordId;
    fileInput.current?.click();
  }, []);

  const onFile = useCallback(
    async (file: File | undefined) => {
      const wordId = targetWord.current;
      targetWord.current = null;
      if (!file || !wordId) return;

      setBusy(wordId);
      setFailed(null);
      try {
        await setWordImage(wordId, file);
        setVersion((v) => v + 1);
        onChanged();
      } catch {
        // Fichier illisible, quota plein : le dessin reste, et on le dit.
        setFailed(wordId);
      } finally {
        setBusy(null);
      }
    },
    [onChanged],
  );

  const restore = useCallback(
    async (wordId: string) => {
      await clearWordImage(wordId);
      setVersion((v) => v + 1);
      onChanged();
    },
    [onChanged],
  );

  /* Le nombre de substitutions n'est pas dans l'état React : on le relit. */
  const [replaced, setReplaced] = useState(0);
  useEffect(() => {
    setReplaced(WORDS.filter((w) => hasWordImage(w.id)).length);
  }, [version]);

  return (
    <div className="parent">
      <div className="parent-inner">
        <h1>Les mots du pack</h1>
        <p className="muted">
          Montrez ces images à l'enfant sans rien dire. S'il ne reconnaît pas un objet, ce
          mot ne travaille plus la phonologie mais la devinette.
        </p>
        <p>
          <strong>Remplacez le dessin par une photo</strong> — l'objet réel, chez vous. Elle
          est réduite, stockée sur la tablette, et sert partout où le mot apparaît. Le nom
          prononcé, le découpage en syllabes et la rime ne changent pas : c'est le mot qui
          compte, pas l'image.
        </p>
        {replaced > 0 && (
          <p className="muted">
            {replaced} mot{replaced > 1 ? 's' : ''} sur {WORDS.length} illustré
            {replaced > 1 ? 's' : ''} par vos photos.
          </p>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            void onFile(file);
          }}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 16,
            marginTop: 16,
          }}
        >
          {WORDS.map((word) => {
            const own = hasWordImage(word.id);
            return (
              <figure
                key={word.id}
                style={{
                  margin: 0,
                  background: '#fff',
                  border: `1px solid ${own ? '#2e8b57' : '#dfe3e8'}`,
                  borderRadius: 10,
                  padding: 10,
                  textAlign: 'center',
                }}
              >
                <img
                  key={version}
                  src={wordImage(word)}
                  alt=""
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'contain' }}
                />
                <figcaption style={{ fontSize: 13, marginTop: 6 }}>
                  <strong>{word.label}</strong>
                  <br />
                  <span className="muted">
                    {word.syllables} syll. · {word.onset}
                    {word.continuant ? '' : ' (occlusive)'} · rime « {word.rime} »
                  </span>
                </figcaption>

                <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' }}>
                  <button
                    className="btn ghost"
                    style={{ minHeight: 38, padding: '6px 10px', fontSize: 13 }}
                    disabled={busy === word.id}
                    onClick={() => pick(word.id)}
                  >
                    {busy === word.id ? '…' : own ? 'Changer' : 'Photo'}
                  </button>
                  {own && (
                    <button
                      className="btn ghost"
                      style={{ minHeight: 38, padding: '6px 10px', fontSize: 13 }}
                      onClick={() => void restore(word.id)}
                    >
                      Dessin
                    </button>
                  )}
                </div>
                {failed === word.id && (
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
