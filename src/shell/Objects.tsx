/**
 * Panneau parent : les objets fabriqués par l'enfant.
 *
 * L'enfant photographie et nomme ; le parent complète ce que l'application ne
 * peut pas deviner — le mot, son découpage, son son d'attaque, sa rime, sa
 * pièce. La spécification est explicite : on ne déduit rien automatiquement,
 * le français écrit ment trop sur sa prononciation.
 *
 * Tant qu'un objet n'est pas complété, il reste sur le mur des trésors mais
 * n'entre pas dans Le Sac de Chase : un objet sans son d'attaque connu n'a
 * aucun sac où aller.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ONSET_CHOICES, isContinuant, suggestSplit } from '../content/characters';
import { allObjects, deleteObject, getBlob, saveObject } from '../engine/storage';
import type { Speaker } from '../engine/speech';
import type { ChildObject } from '../engine/types';

const CATEGORIES = ['cuisine', 'chambre', 'salle de bain', 'dehors', 'habits', 'jouets', 'animaux'];

interface Props {
  speaker: Speaker | null;
  onClose: () => void;
}

interface Row {
  object: ChildObject;
  imageUrl: string | null;
  audioUrl: string | null;
}

export function Objects({ speaker, onClose }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<ChildObject | null>(null);
  const urls = useRef<string[]>([]);

  const refresh = useCallback(async () => {
    urls.current.splice(0).forEach(URL.revokeObjectURL);
    const objects = await allObjects();

    const loaded = await Promise.all(
      objects.map(async (object) => {
        const image = await getBlob(object.image);
        const audio = object.audioLabel ? await getBlob(object.audioLabel) : null;
        const imageUrl = image ? URL.createObjectURL(image) : null;
        const audioUrl = audio ? URL.createObjectURL(audio) : null;
        if (imageUrl) urls.current.push(imageUrl);
        if (audioUrl) urls.current.push(audioUrl);
        return { object, imageUrl, audioUrl };
      }),
    );
    setRows(loaded);
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      urls.current.splice(0).forEach(URL.revokeObjectURL);
    };
  }, [refresh]);

  if (editing) {
    return (
      <ObjectEditor
        object={editing}
        speaker={speaker}
        onCancel={() => setEditing(null)}
        onSave={async (updated) => {
          await saveObject(updated);
          setEditing(null);
          await refresh();
        }}
      />
    );
  }

  const incomplete = rows.filter((r) => !r.object.complete).length;

  return (
    <div className="parent">
      <div className="parent-inner">
        <h1>Les objets de l'enfant</h1>
        <p>
          Ce que l'enfant a photographié à la Fabrique. Complétez-les : c'est ce qui les fait
          entrer dans les ateliers de sons.
        </p>

        {rows.length === 0 && (
          <p className="muted">
            Aucun objet pour l'instant. L'enfant en fabrique depuis l'étagère, à la Fabrique.
          </p>
        )}

        {incomplete > 0 && (
          <div className="callout">
            <strong>
              {incomplete} objet{incomplete > 1 ? 's' : ''} à compléter.
            </strong>{' '}
            Un objet dont on ne connaît pas le son d'attaque n'a aucun sac où aller : il reste
            sur le mur des trésors, mais Le Sac de Chase ne peut pas s'en servir.
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
            marginTop: 16,
          }}
        >
          {rows.map(({ object, imageUrl, audioUrl }) => (
            <figure
              key={object.id}
              style={{
                margin: 0,
                background: '#fff',
                border: object.complete ? '1px solid #dfe3e8' : '2px solid #d08b1f',
                borderRadius: 10,
                padding: 12,
                textAlign: 'center',
              }}
            >
              <div className="image-slot" style={{ width: '100%', height: 130 }}>
                {imageUrl ? <img src={imageUrl} alt="" /> : <span className="muted">image absente</span>}
              </div>

              <figcaption style={{ marginTop: 8 }}>
                <strong>{object.label || <span className="muted">sans nom</span>}</strong>
                <br />
                <span className="muted" style={{ fontSize: 13 }}>
                  {object.complete
                    ? `${object.syllables} morceau${object.syllables > 1 ? 'x' : ''} · son « ${object.onset} » · ${object.category}`
                    : 'à compléter'}
                </span>
              </figcaption>

              <div className="btn-row" style={{ justifyContent: 'center', marginTop: 10 }}>
                {audioUrl && (
                  <button
                    className="btn ghost"
                    onClick={() => void new Audio(audioUrl).play().catch(() => undefined)}
                  >
                    Sa voix
                  </button>
                )}
                <button className="btn" onClick={() => setEditing(object)}>
                  Compléter
                </button>
              </div>
              <div className="btn-row" style={{ justifyContent: 'center', marginTop: 6 }}>
                <button
                  className="btn danger"
                  onClick={async () => {
                    if (!confirm('Supprimer cet objet ?')) return;
                    await deleteObject(object.id);
                    await refresh();
                  }}
                >
                  Supprimer
                </button>
              </div>
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

/* ------------------------------------------------------------------ */

function ObjectEditor({
  object,
  speaker,
  onSave,
  onCancel,
}: {
  object: ChildObject;
  speaker: Speaker | null;
  onSave: (o: ChildObject) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(object.label);
  const [splitText, setSplitText] = useState(
    object.syllables > 0 ? '' : suggestSplit(object.label).join('-'),
  );
  const [onset, setOnset] = useState(object.onset || 'ch');
  const [rime, setRime] = useState(object.rime);
  const [category, setCategory] = useState(object.category || CATEGORIES[0]);
  const [touched, setTouched] = useState(object.syllables > 0);

  useEffect(() => {
    if (touched) return;
    setSplitText(suggestSplit(label).join('-'));
  }, [label, touched]);

  const split = splitText
    .split('-')
    .map((s) => s.trim())
    .filter(Boolean);

  const valid = label.trim().length > 0 && split.length > 0 && rime.trim().length > 0;

  return (
    <div className="parent">
      <div className="parent-inner">
        <h1>Compléter un objet</h1>
        <p className="muted">
          Écoutez d'abord l'enfant le nommer, puis écrivez le mot tel qu'il le dit — pas
          forcément le nom exact de l'objet.
        </p>

        <h2>Le mot</h2>
        <input
          className="field"
          value={label}
          placeholder="doudou"
          onChange={(e) => setLabel(e.target.value)}
        />

        <h2>Son découpage</h2>
        <p className="muted">
          Séparez par un tiret, comme quand on frappe dans les mains. Attention au « e » final
          muet : « lampe » se frappe en une fois.
        </p>
        <input
          className="field"
          value={splitText}
          placeholder="dou-dou"
          onChange={(e) => {
            setTouched(true);
            setSplitText(e.target.value);
          }}
        />
        <div className="btn-row">
          <button
            className="btn ghost"
            disabled={split.length === 0}
            onClick={async () => {
              for (const part of split) {
                await speaker?.say(part);
                await new Promise((r) => setTimeout(r, 180));
              }
            }}
          >
            Écouter ({split.length} morceau{split.length > 1 ? 'x' : ''})
          </button>
        </div>

        <h2>Par quel son il commence</h2>
        <div className="onset-grid">
          {ONSET_CHOICES.map((choice) => (
            <button
              key={choice.value}
              className="onset"
              data-selected={onset === choice.value}
              data-continuant={choice.continuant}
              onClick={() => setOnset(choice.value)}
            >
              <strong>{choice.value}</strong>
              <span className="muted">{choice.hint}</span>
            </button>
          ))}
        </div>
        {!isContinuant(onset) && (
          <p className="muted">
            Ce son claque et ne peut pas être prolongé : cet objet n'apparaîtra dans Le Sac de
            Chase qu'aux niveaux hauts.
          </p>
        )}

        <h2>Comment il finit</h2>
        <input
          className="field"
          value={rime}
          placeholder="ou"
          onChange={(e) => setRime(e.target.value)}
        />

        <h2>Où il se range</h2>
        <div className="onset-grid">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className="onset"
              data-selected={category === c}
              onClick={() => setCategory(c)}
            >
              <strong>{c}</strong>
            </button>
          ))}
        </div>

        <h2>&nbsp;</h2>
        <div className="btn-row">
          <button
            className="btn"
            disabled={!valid}
            onClick={() =>
              onSave({
                ...object,
                label: label.trim(),
                syllables: split.length,
                onset,
                coda: rime.trim().toLowerCase(),
                rime: rime.trim().toLowerCase(),
                category,
                complete: true,
              })
            }
          >
            Enregistrer
          </button>
          <button className="btn ghost" onClick={onCancel}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
