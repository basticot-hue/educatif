/**
 * Planche de contrôle des pictogrammes, accessible depuis l'espace parent.
 *
 * Un pictogramme que l'enfant ne reconnaît pas transforme un exercice de
 * phonologie en devinette visuelle. Le parent doit pouvoir vérifier lui-même,
 * et savoir quels mots retirer.
 */

import { WORDS } from '../content/packs/mascottes/words';

export function WordSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="parent">
      <div className="parent-inner">
        <h1>Les mots du pack</h1>
        <p className="muted">
          Montrez ces images à l'enfant sans rien dire. S'il ne reconnaît pas un objet,
          ce mot ne travaille plus la phonologie mais la devinette : signalez-le-moi et je
          le retire.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 16,
            marginTop: 16,
          }}
        >
          {WORDS.map((word) => (
            <figure
              key={word.id}
              style={{
                margin: 0,
                background: '#fff',
                border: '1px solid #dfe3e8',
                borderRadius: 10,
                padding: 10,
                textAlign: 'center',
              }}
            >
              <img src={word.image} alt="" style={{ width: '100%', height: 'auto' }} />
              <figcaption style={{ fontSize: 13, marginTop: 6 }}>
                <strong>{word.label}</strong>
                <br />
                <span className="muted">
                  {word.syllables} syll. · {word.onset}
                  {word.continuant ? '' : ' (occlusive)'} · rime « {word.rime} »
                </span>
              </figcaption>
            </figure>
          ))}
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
