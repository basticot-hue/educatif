/**
 * Création et modification d'un personnage.
 *
 * Le parent saisit ce que l'application ne peut pas deviner. La spécification
 * l'exige et l'expérience le confirme : le français écrit ment trop sur sa
 * prononciation. « Hannah » commence par une voyelle malgré son h, « Stella »
 * se découpe Stel-la, « Raiponce » fait deux syllabes et non trois. Une
 * déduction automatique se tromperait, et enseignerait un découpage que
 * l'enfant n'entend pas.
 *
 * On propose donc un découpage de départ — taper des syllabes au doigt sur une
 * tablette est pénible — mais **le parent doit l'écouter avant de valider**.
 * C'est l'oreille qui tranche, pas la règle.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ONSET_CHOICES,
  customImageKey,
  idFromName,
  isContinuant,
  suggestSplit,
  type CustomCharacter,
} from '../content/characters';
import { normalizeImage } from '../content/overrides';
import { getBlob, putBlob } from '../engine/storage';
import type { Speaker } from '../engine/speech';

interface Props {
  /** `null` pour une création. */
  initial: CustomCharacter | null;
  speaker: Speaker | null;
  onSave: (character: CustomCharacter) => void;
  onCancel: () => void;
}

export function CharacterEditor({ initial, speaker, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [splitText, setSplitText] = useState(initial?.split.join('-') ?? '');
  const [onset, setOnset] = useState(initial?.onset ?? 'ch');
  const [rime, setRime] = useState(initial?.rime ?? '');
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [touchedSplit, setTouchedSplit] = useState(initial !== null);
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);

  // Charge l'image déjà enregistrée, s'il y en a une.
  useEffect(() => {
    if (!initial?.imageKey) return;
    void getBlob(initial.imageKey).then((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      objectUrl.current = url;
      setPreview(url);
    });
    return () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, [initial]);

  // Tant que le parent n'a pas corrigé le découpage, il suit le nom.
  useEffect(() => {
    if (touchedSplit) return;
    setSplitText(suggestSplit(name).join('-'));
  }, [name, touchedSplit]);

  const split = useMemo(
    () =>
      splitText
        .split('-')
        .map((s) => s.trim())
        .filter(Boolean),
    [splitText],
  );

  const valid = name.trim().length > 0 && split.length > 0 && rime.trim().length > 0;

  const listen = async () => {
    if (!speaker) return;
    for (const part of split) {
      await speaker.say(part);
      await new Promise((r) => setTimeout(r, 180));
    }
  };

  const save = async () => {
    const id = initial?.id ?? idFromName(name);
    let imageKey = initial?.imageKey ?? null;

    if (imageBlob) {
      imageKey = customImageKey(id);
      await putBlob(imageKey, imageBlob);
    }

    onSave({ id, name: name.trim(), split, onset, rime: rime.trim().toLowerCase(), imageKey });
  };

  return (
    <div className="parent">
      <div className="parent-inner">
        <h1>{initial ? 'Modifier un personnage' : 'Nouveau personnage'}</h1>

        <h2>Son nom</h2>
        <input
          className="field"
          value={name}
          placeholder="Raiponce"
          onChange={(e) => setName(e.target.value)}
        />

        <h2>Comment il se découpe</h2>
        <p className="muted">
          Séparez les morceaux par un tiret, comme quand on frappe dans les mains.
          Raiponce fait <strong>Rai-ponce</strong>, Stella fait <strong>Stel-la</strong>.
          Attention au « e » final muet : Stella se frappe en deux fois, pas trois.
        </p>
        <input
          className="field"
          value={splitText}
          placeholder="Rai-ponce"
          onChange={(e) => {
            setTouchedSplit(true);
            setSplitText(e.target.value);
          }}
        />
        <div className="btn-row">
          <button className="btn ghost" disabled={split.length === 0} onClick={() => void listen()}>
            Écouter le découpage ({split.length} morceau{split.length > 1 ? 'x' : ''})
          </button>
        </div>
        <div className="callout">
          <strong>Écoutez avant de valider.</strong> C'est votre oreille qui décide, pas la
          proposition automatique : un découpage faux apprendrait à l'enfant un rythme qu'il
          n'entend jamais.
        </div>

        <h2>Par quel son il commence</h2>
        <p className="muted">
          On stocke un <strong>son</strong>, jamais un nom de lettre : « zzz », pas « zède ».
          Un enfant qui apprend le nom de la lettre devra désapprendre plus tard.
        </p>
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
        <p className="muted">
          Les sons du haut se <strong>tiennent</strong> (chhh, mmm, zzz) : ce sont les seuls
          utilisables par les ateliers de sons avant les niveaux hauts. Ceux du bas claquent et
          ne peuvent pas être prolongés — ce n'est pas une question de difficulté, c'est
          physique.
          {!isContinuant(onset) && (
            <>
              {' '}
              <strong>Vous avez choisi un son qui claque</strong> : ce personnage n'apparaîtra
              dans les ateliers de sons qu'aux niveaux hauts.
            </>
          )}
        </p>

        <h2>Comment il finit</h2>
        <p className="muted">
          La fin qu'on entend, pour les rimes. Raiponce finit par « once », Zuma par « a »,
          Hannah par « a ».
        </p>
        <input
          className="field"
          value={rime}
          placeholder="once"
          onChange={(e) => setRime(e.target.value)}
        />

        <h2>Son image</h2>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="image-slot">
            {preview ? <img src={preview} alt="" /> : <span className="muted">aucune image</span>}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const blob = await normalizeImage(file);
              setImageBlob(blob);
              if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
              const url = URL.createObjectURL(blob);
              objectUrl.current = url;
              setPreview(url);
            }}
          />
          <button className="btn" onClick={() => fileInput.current?.click()}>
            Choisir une image
          </button>
        </div>
        <p className="muted">
          Réduite à 512 px automatiquement. Un fond transparent rend bien mieux : le
          personnage se pose sur les cases au lieu d'apparaître dans un carré.
        </p>

        <h2>&nbsp;</h2>
        <div className="btn-row">
          <button className="btn" disabled={!valid} onClick={() => void save()}>
            Enregistrer
          </button>
          <button className="btn ghost" onClick={onCancel}>
            Annuler
          </button>
        </div>
        {!valid && (
          <p className="muted">Il faut au moins un nom, un découpage et une fin.</p>
        )}
      </div>
    </div>
  );
}
