/**
 * Espace parent.
 *
 * Le récapitulatif est délibérément pauvre en chiffres. Le risque principal de
 * ce projet n'est pas l'écran : c'est qu'il devienne un lieu d'attente
 * parentale. Pas de tableau de performances, pas de courbe, pas de comparaison.
 */

import { useCallback, useEffect, useState } from 'react';
import { buildLabel } from '../build-info';
import { missionById } from '../content/missions';
import { PROMPTS, PROMPT_KEYS } from '../content/prompts';
import { isInstalled, canInstall, promptInstall, storageInfo } from '../engine/platform';
import { NUMBER_KEYS, hasFrenchVoice, numberWord, parentVoiceKey } from '../engine/speech';
import {
  blobKeys,
  clearAll,
  deleteBlob,
  getSetting,
  lastSession,
  putBlob,
  setSetting,
  storageUnavailable,
} from '../engine/storage';
import type { Speaker } from '../engine/speech';
import type { SessionRecord, UniversePack } from '../engine/types';
import { micStatus, startRecording, type Recording } from '../engine/voice';
import { ActivityDocs } from './ActivityDocs';
import { Characters } from './Characters';
import { TouchProbe } from './TouchProbe';
import { WordSheet } from './WordSheet';
import './parent.css';

/** Une opération simple : rien à retenir, et hors de portée d'un enfant de 3 ans. */
const GATE_A = 7;
const GATE_B = 8;

interface Props {
  /** Pack effectif, personnages du parent compris. */
  pack: UniversePack;
  /** Pack embarqué, avant fusion — l'éditeur a besoin de distinguer les deux. */
  basePack: UniversePack;
  /** Pour faire écouter un découpage syllabique dans l'éditeur. */
  speaker: Speaker | null;
  onClose: () => void;
  onRestart: () => void;
  /** Le pack doit être rechargé : un personnage a changé. */
  onPackChanged: () => void;
}

export function Parent(props: Props) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<'main' | 'probe' | 'words' | 'docs' | 'characters'>('main');

  if (!open) return <Gate onPass={() => setOpen(true)} onCancel={props.onClose} />;
  if (panel === 'probe') return <TouchProbe onClose={() => setPanel('main')} />;
  if (panel === 'words') return <WordSheet onClose={() => setPanel('main')} />;
  if (panel === 'docs') return <ActivityDocs onClose={() => setPanel('main')} />;
  if (panel === 'characters') {
    return (
      <Characters
        // Le pack **d'origine** : la liste distingue les mascottes embarquées
        // des personnages créés, ce que le pack fusionné ne permet plus.
        pack={props.basePack}
        speaker={props.speaker}
        onChanged={props.onPackChanged}
        onClose={() => setPanel('main')}
      />
    );
  }
  return (
    <ParentPanels
      {...props}
      onProbe={() => setPanel('probe')}
      onWords={() => setPanel('words')}
      onDocs={() => setPanel('docs')}
      onCharacters={() => setPanel('characters')}
    />
  );
}

/* ------------------------------------------------------------------ */

function Gate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const [value, setValue] = useState('');

  return (
    <div className="gate">
      <p>
        Combien font {GATE_A} × {GATE_B} ?
      </p>
      <input
        type="number"
        inputMode="numeric"
        autoFocus
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (Number(e.target.value) === GATE_A * GATE_B) onPass();
        }}
      />
      <button className="btn ghost" onClick={onCancel}>
        Retour
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ParentPanels({
  pack,
  onClose,
  onRestart,
  onProbe,
  onWords,
  onDocs,
  onCharacters,
}: Props & {
  onProbe: () => void;
  onWords: () => void;
  onDocs: () => void;
  onCharacters: () => void;
}) {
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [recorded, setRecorded] = useState<Set<string>>(new Set());
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [storage, setStorage] = useState({ persisted: false, usageBytes: 0, quotaBytes: 0 });
  const [frenchVoice, setFrenchVoice] = useState<boolean | null>(null);
  const [installable, setInstallable] = useState(canInstall());
  const [enabled, setEnabled] = useState<string[]>(['chemin']);

  const refresh = useCallback(async () => {
    setSession(await lastSession());
    setRecorded(new Set(await blobKeys('voice.')));
    setStorage(await storageInfo());
    setFrenchVoice(await hasFrenchVoice());
    setEnabled(await getSetting<string[]>('activities.enabled', ['chemin']));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const numbersDone = NUMBER_KEYS.filter((k) => recorded.has(parentVoiceKey(k))).length;

  return (
    <div className="parent">
      <div className="parent-inner">
        <h1>Espace parent</h1>
        <p className="muted">{pack.name}</p>

        <div className="btn-row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={onDocs}>
            Les ateliers — à quoi ils servent, quoi faire
          </button>
          <button className="btn ghost" onClick={onCharacters}>
            Les personnages — ajouter, modifier, masquer
          </button>
        </div>

        <Recap session={session} />

        <VoicePanel
          recorded={recorded}
          recordingKey={recordingKey}
          setRecordingKey={setRecordingKey}
          onChanged={refresh}
          numbersDone={numbersDone}
          frenchVoice={frenchVoice}
        />

        <h2>Ateliers</h2>
        <p className="muted">
          Les six autres ateliers arrivent en passe 2. Aucun n'est jamais verrouillé
          pour l'enfant : cette liste sert uniquement à en retirer un si besoin.
        </p>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
          <input
            type="checkbox"
            checked={enabled.includes('chemin')}
            onChange={async (e) => {
              const next = e.target.checked ? ['chemin'] : [];
              setEnabled(next);
              await setSetting('activities.enabled', next);
            }}
          />
          Le Chemin
        </label>

        <TechPanel
          storage={storage}
          frenchVoice={frenchVoice}
          installable={installable}
          onInstall={async () => {
            await promptInstall();
            setInstallable(canInstall());
            void refresh();
          }}
        />

        <h2>Verrouiller la tablette pendant une séance</h2>
        <p>
          Le vrai verrou est l'<strong>épinglage d'écran</strong> d'Android : il empêche
          de sortir de l'app tant qu'on n'a pas fait le geste de déverrouillage.
        </p>
        <ul>
          <li>Paramètres → Sécurité → Épinglage d'écran → activer</li>
          <li>Ouvrir l'app, puis le bouton « aperçu » (carré), puis l'icône d'épingle</li>
          <li>Pour sortir : maintenir « retour » et « aperçu » ensemble</li>
        </ul>

        <UsageRules />

        <h2>Outils</h2>
        <div className="btn-row">
          <button className="btn ghost" onClick={onProbe}>
            Sonde tactile
          </button>
          <button className="btn ghost" onClick={onWords}>
            Vérifier les images
          </button>
          <button
            className="btn danger"
            onClick={async () => {
              if (!confirm('Effacer toute la progression et tous les enregistrements ?')) return;
              await clearAll();
              await refresh();
            }}
          >
            Tout effacer
          </button>
        </div>

        <h2>&nbsp;</h2>
        <div className="btn-row">
          <button className="btn" onClick={onClose}>
            Retour
          </button>
          <button className="btn ghost" onClick={onRestart}>
            Recommencer une séance
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Recap({ session }: { session: SessionRecord | null }) {
  if (!session) {
    return (
      <>
        <h2>Récapitulatif du soir</h2>
        <p className="muted">Aucune séance pour l'instant.</p>
      </>
    );
  }

  const mission = missionById(session.missionId);
  const date = new Date(session.startedAt);
  const spoke = session.results.some((r) => r.spoke);

  return (
    <>
      <h2>Récapitulatif du soir</h2>
      <p className="muted">
        {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à{' '}
        {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </p>

      <p>
        Travaillé aujourd'hui : <strong>compter en avançant sur une piste</strong>
        {spoke ? ", en énonçant les numéros à voix haute" : ''}.
      </p>

      {session.off && (
        <div className="callout">
          Séance manifestement difficile — fatigue, distraction, mauvaise journée. Rien
          n'a été enregistré comme un recul : les niveaux acquis sont intacts. Ce n'est
          pas un signal, sauf si cela se répète plusieurs jours de suite.
        </div>
      )}

      {mission && (
        <>
          <p>
            <strong>Mission donnée à l'enfant :</strong>
          </p>
          <p>« {mission.text} »</p>
          <p className="muted">
            C'est la partie qui transfère. Ce qui s'apprend sur tablette ne passe pas tout
            seul au réel à cet âge — faites-la, même vite.
          </p>
        </>
      )}

      <p className="muted">
        À reprendre ensemble : comptez à voix haute des objets réels en les touchant un par
        un. Un geste, un objet, un mot.
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */

function VoicePanel({
  recorded,
  recordingKey,
  setRecordingKey,
  onChanged,
  numbersDone,
  frenchVoice,
}: {
  recorded: Set<string>;
  recordingKey: string | null;
  setRecordingKey: (k: string | null) => void;
  onChanged: () => Promise<void>;
  numbersDone: number;
  frenchVoice: boolean | null;
}) {
  const [recorder, setRecorder] = useState<Recording | null>(null);

  const begin = useCallback(
    async (key: string) => {
      setRecordingKey(key);
      const rec = await startRecording();
      if (!rec) {
        setRecordingKey(null);
        return;
      }
      setRecorder(rec);
    },
    [setRecordingKey],
  );

  const end = useCallback(
    async (key: string) => {
      const blob = await recorder?.stop();
      setRecorder(null);
      setRecordingKey(null);
      if (blob) await putBlob(parentVoiceKey(key), blob);
      await onChanged();
    },
    [recorder, setRecordingKey, onChanged],
  );

  return (
    <>
      <h2>Votre voix</h2>
      <p>
        À cet âge, une voix familière est nettement plus efficace qu'une voix de synthèse.
      </p>

      <div className="callout">
        <strong>Commencez par les nombres 1 à 20.</strong> Ce sont eux que l'enfant entend
        à chaque case du Chemin. La synthèse vocale d'Android met 200 à 400 ms à démarrer,
        ce qui casse le lien entre le doigt qui arrive sur la case et le mot entendu. Vos
        enregistrements, eux, sont instantanés.
        <br />
        <br />
        {numbersDone} sur 20 enregistrés.
      </div>

      <p className="muted">
        Maintenez la case appuyée pendant que vous dites le mot, relâchez à la fin.
        Appuyez longuement sur une case déjà verte pour la refaire.
      </p>

      <div className="num-grid">
        {NUMBER_KEYS.map((key, i) => {
          const done = recorded.has(parentVoiceKey(key));
          return (
            <button
              key={key}
              className="num-cell"
              data-recorded={done}
              data-active={recordingKey === key}
              onPointerDown={() => void begin(key)}
              onPointerUp={() => void end(key)}
              onPointerLeave={() => recordingKey === key && void end(key)}
            >
              {i + 1}
              <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>
                {numberWord(i + 1)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="btn-row">
        <button
          className="btn ghost"
          onClick={async () => {
            if (!confirm('Effacer tous vos enregistrements de nombres ?')) return;
            for (const key of NUMBER_KEYS) await deleteBlob(parentVoiceKey(key));
            await onChanged();
          }}
        >
          Effacer mes nombres
        </button>
      </div>

      <p style={{ marginTop: 24 }}>
        <strong>Les consignes</strong>
      </p>
      <p className="muted">
        C'est la seule explication que l'enfant reçoit — il n'y a aucun texte à l'écran des
        ateliers. Tant que vous ne les avez pas enregistrées, elles sont dites par la voix de
        synthèse.
      </p>

      <div className="num-grid" style={{ gridTemplateColumns: '1fr' }}>
        {PROMPT_KEYS.map((key) => {
          const done = recorded.has(parentVoiceKey(key));
          return (
            <button
              key={key}
              className="num-cell"
              data-recorded={done}
              data-active={recordingKey === key}
              style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0 14px', height: 'auto', minHeight: 56 }}
              onPointerDown={() => void begin(key)}
              onPointerUp={() => void end(key)}
              onPointerLeave={() => recordingKey === key && void end(key)}
            >
              <span style={{ fontWeight: 400 }}>« {PROMPTS[key]} »</span>
            </button>
          );
        })}
      </div>

      {frenchVoice === false && (
        <div className="callout">
          Aucune voix française n'est installée sur cette tablette. Tant que vous n'avez
          pas enregistré les nombres, l'app restera muette sur Le Chemin. Installez
          « Synthèse vocale Google » depuis le Play Store, ou enregistrez les 20 nombres
          ci-dessus — c'est de toute façon la meilleure option.
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function TechPanel({
  storage,
  frenchVoice,
  installable,
  onInstall,
}: {
  storage: { persisted: boolean; usageBytes: number; quotaBytes: number };
  frenchVoice: boolean | null;
  installable: boolean;
  onInstall: () => void;
}) {
  const installed = isInstalled();
  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} Mo`;

  return (
    <>
      <h2>État technique</h2>

      <p>
        <strong>Version installée :</strong> {buildLabel()}
      </p>
      <p className="muted">
        Comparez-la à celle annoncée après un déploiement. Si elle est plus ancienne, fermez
        complètement l'application et rouvrez-la : le service worker récupère la nouvelle
        version au lancement suivant, pas pendant l'utilisation.
      </p>

      {storageUnavailable() && (
        <div className="callout">
          <strong>La progression ne s'enregistre pas.</strong> La base de données n'a pas pu
          s'ouvrir. La cause la plus fréquente : l'application est <strong>aussi ouverte dans
          un onglet de Chrome</strong>, ce qui empêche la mise à jour de la base. Fermez cet
          onglet, puis relancez l'application depuis son icône. L'enfant peut jouer en
          attendant — simplement, rien ne sera conservé.
        </div>
      )}

      <div className="status">
        <span className={`dot ${installed ? 'ok' : 'warn'}`} />
        <span>
          {installed
            ? 'Installée sur l’écran d’accueil, en plein écran.'
            : "Ouverte dans le navigateur. Installez-la : c'est ce qui donne le plein écran, l'icône, et le stockage durable."}
        </span>

        <span className={`dot ${storage.persisted ? 'ok' : 'warn'}`} />
        <span>
          {storage.persisted
            ? 'Stockage durable accordé — les données ne seront pas effacées automatiquement.'
            : 'Stockage non durable : Android pourrait effacer la progression. Installer l’app le règle.'}
        </span>

        <span className="dot" />
        <span className="muted">
          {mb(storage.usageBytes)} utilisés sur {mb(storage.quotaBytes)} disponibles.
        </span>

        <span className={`dot ${frenchVoice ? 'ok' : 'warn'}`} />
        <span>
          {frenchVoice === null
            ? 'Voix de synthèse : vérification…'
            : frenchVoice
              ? 'Voix française disponible (utilisée seulement à défaut de la vôtre).'
              : 'Aucune voix française installée.'}
        </span>

        <span className={`dot ${micStatus() === 'granted' ? 'ok' : ''}`} />
        <span className="muted">
          Micro :{' '}
          {
            {
              granted: 'autorisé',
              denied: 'refusé — l’app fonctionne quand même, elle ne garde simplement pas la voix',
              unsupported: 'indisponible sur cet appareil',
              unknown: 'pas encore demandé (il le sera au niveau 2 du Chemin)',
            }[micStatus()]
          }
        </span>
      </div>

      {installable && !installed && (
        <div className="btn-row">
          <button className="btn" onClick={onInstall}>
            Installer sur l'écran d'accueil
          </button>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function UsageRules() {
  return (
    <>
      <h2>Règles d'usage</h2>
      <ul>
        <li>
          <strong>Jamais pour calmer une colère ou une frustration.</strong> C'est le
          facteur de risque principal : l'enfant apprendrait à réguler ses émotions par
          l'écran.
        </li>
        <li>Jamais dans l'heure qui précède le coucher.</li>
        <li>
          C'est le parent qui propose, l'enfant ne demande pas — sinon la tablette devient
          un objet de réclamation.
        </li>
        <li>Compter cette durée dans le temps d'écran total, dessins animés inclus.</li>
        <li>Accompagner au moins une séance sur deux.</li>
        <li>Faire la mission hors écran. C'est la partie qui transfère.</li>
      </ul>
      <p className="muted">
        Repère officiel français : entre 3 et 6 ans, l'usage des écrans est recommandé
        fortement limité, avec des contenus de qualité éducative, et accompagné par un
        adulte.
      </p>
      <div className="callout">
        <strong>Cette application ne dépiste rien.</strong> Si un point bloque durablement,
        ou si le langage de l'enfant reste difficile à comprendre pour une personne
        extérieure à la famille, cela relève d'un avis professionnel — pas d'un ajustement
        de paramètre.
      </div>
    </>
  );
}
