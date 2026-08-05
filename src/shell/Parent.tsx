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
import { PROMPTS, PROMPT_KEYS, docFor } from '../content/prompts';
import { isInstalled, canInstall, promptInstall, storageInfo } from '../engine/platform';
import { NUMBER_KEYS, hasFrenchVoice, numberWord, parentVoiceKey } from '../engine/speech';
import {
  blobKeys,
  clearAll,
  deleteBlob,
  getSetting,
  HIDDEN_ACTIVITIES,
  lastSession,
  putBlob,
  setSetting,
  storageUnavailable,
} from '../engine/storage';
import type { Speaker } from '../engine/speech';
import { ACTIVITY_IDS, type SessionRecord, type UniversePack } from '../engine/types';
import { checkForUpdate, reinstall } from '../engine/update';
import { micStatus, startRecording, type Recording } from '../engine/voice';
import { ActivityDocs } from './ActivityDocs';
import { Characters } from './Characters';
import { Objects } from './Objects';
import { TouchProbe } from './TouchProbe';
import { ShelfSheet } from './ShelfSheet';
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
  const [panel, setPanel] = useState<
    'main' | 'probe' | 'words' | 'tiles' | 'docs' | 'characters' | 'objects'
  >('main');

  if (!open) return <Gate onPass={() => setOpen(true)} onCancel={props.onClose} />;
  if (panel === 'probe') return <TouchProbe onClose={() => setPanel('main')} />;
  if (panel === 'words') {
    // Une photo substituée change ce que les ateliers affichent : le pack est
    // rechargé comme pour un personnage remplacé.
    return <WordSheet onClose={() => setPanel('main')} onChanged={props.onPackChanged} />;
  }
  if (panel === 'tiles') {
    // Une tuile substituée change ce que l'enfant voit sur l'étagère : même
    // rechargement que pour une photo de mot.
    return <ShelfSheet onClose={() => setPanel('main')} onChanged={props.onPackChanged} />;
  }
  if (panel === 'docs') return <ActivityDocs onClose={() => setPanel('main')} />;
  if (panel === 'objects') {
    return <Objects speaker={props.speaker} onClose={() => setPanel('main')} />;
  }
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
      onTiles={() => setPanel('tiles')}
      onDocs={() => setPanel('docs')}
      onCharacters={() => setPanel('characters')}
      onObjects={() => setPanel('objects')}
      onActivitiesChanged={props.onPackChanged}
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
  onTiles,
  onDocs,
  onCharacters,
  onObjects,
  onActivitiesChanged,
}: Props & {
  onProbe: () => void;
  onWords: () => void;
  onTiles: () => void;
  onDocs: () => void;
  onCharacters: () => void;
  onObjects: () => void;
  onActivitiesChanged: () => void;
}) {
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [recorded, setRecorded] = useState<Set<string>>(new Set());
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [storage, setStorage] = useState({ persisted: false, usageBytes: 0, quotaBytes: 0 });
  const [frenchVoice, setFrenchVoice] = useState<boolean | null>(null);
  const [installable, setInstallable] = useState(canInstall());
  /* On mémorise ce qui est **retiré** : voir `HIDDEN_ACTIVITIES` dans storage.ts. */
  const [hidden, setHidden] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setSession(await lastSession());
    setRecorded(new Set(await blobKeys('voice.')));
    setStorage(await storageInfo());
    setFrenchVoice(await hasFrenchVoice());
    setHidden(await getSetting<string[]>(HIDDEN_ACTIVITIES, []));
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
          <button className="btn ghost" onClick={onObjects}>
            Les objets de l'enfant — à compléter
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
          Aucun atelier n'est jamais verrouillé pour l'enfant : il n'y a ni cadenas, ni ordre
          imposé, ni niveau affiché. Cette liste sert uniquement à en <strong>retirer</strong>
          {' '}un de l'étagère — parce qu'il ne prend pas, ou pour alléger le choix.
        </p>
        {ACTIVITY_IDS.map((id) => (
          <label key={id} style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
            <input
              type="checkbox"
              checked={!hidden.includes(id)}
              onChange={async (e) => {
                const next = e.target.checked
                  ? hidden.filter((a) => a !== id)
                  : [...hidden, id];
                setHidden(next);
                await setSetting(HIDDEN_ACTIVITIES, next);
                onActivitiesChanged();
              }}
            />
            {docFor(id)?.name ?? id}
          </label>
        ))}
        {hidden.length >= ACTIVITY_IDS.length && (
          <p className="muted">
            Tout est retiré : l'étagère n'aurait plus rien à montrer. Les ateliers restent donc
            tous en place tant qu'il n'en subsiste aucun.
          </p>
        )}

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

          <h2>Si l'icône ne lance rien</h2>
        <p>
          Une application installée <strong>garde le réglage avec lequel elle a été créée</strong>.
          Recharger le site ne met pas l'icône à jour : Chrome ne la reconstruit que
          lorsqu'il détecte un changement, ce qui peut prendre plusieurs jours.
        </p>
        <ul>
          <li>Appui long sur l'icône → <strong>Désinstaller</strong>. Ne pas se contenter de réinstaller par-dessus.</li>
          <li>Fermer tous les onglets Chrome ouverts sur l'application.</li>
          <li>Rouvrir l'adresse dans Chrome, vérifier que le site s'affiche.</li>
          <li>Menu de Chrome → <strong>Installer l'application</strong>.</li>
        </ul>
        <p className="muted">
          Pour savoir ce qui a réellement été installé, ouvrez{' '}
          <code>chrome://webapks</code> dans Chrome sur la tablette. Si « Educatif » n'y figure pas, l'icône n'est qu'un
          raccourci et non une vraie application — cela arrive quand les services Google sont
          absents ou restreints. Le raccourci ouvre alors simplement le site dans Chrome, ce
          qui reste parfaitement utilisable.
        </p>
        <p className="muted">
          Sur les tablettes Huawei, vérifiez aussi Paramètres → Batterie → Lancement des
          applications : l'application doit y être autorisée à démarrer.
        </p>

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
            Les images des mots
          </button>
          <button className="btn ghost" onClick={onTiles}>
            Les tuiles de l'étagère
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

  /*
   * Ce qui a réellement été travaillé, lu dans la séance.
   *
   * Cette phrase était écrite en dur — « compter en avançant sur une piste » —
   * quels que soient les ateliers ouverts. Un parent dont l'enfant venait de
   * passer un quart d'heure sur les histoires lisait qu'il avait compté. Le
   * récapitulatif est la seule fenêtre du parent sur la séance : s'il ment, il
   * ne sert à rien.
   */
  const worked = session.activities
    .map((id) => docFor(id)?.goal.replace(/\.$/, '').toLowerCase())
    .filter((goal): goal is string => Boolean(goal));

  return (
    <>
      <h2>Récapitulatif du soir</h2>
      <p className="muted">
        {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à{' '}
        {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </p>

      {worked.length > 0 ? (
        <p>
          Travaillé aujourd'hui :{' '}
          {worked.map((goal, i) => (
            <span key={goal}>
              {i > 0 && (i === worked.length - 1 ? ' et ' : ', ')}
              <strong>{goal}</strong>
            </span>
          ))}
          {spoke ? ", en parlant à voix haute" : ''}.
        </p>
      ) : (
        <p className="muted">Aucun atelier ouvert pendant cette séance.</p>
      )}

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

/* ------------------------------------------------------------------ */

/**
 * Mise à jour de l'application installée.
 *
 * Une tablette peut rester des jours sur une version périmée sans que rien ne
 * l'indique : l'application installée est **reprise** depuis la pile des tâches
 * d'Android, jamais rechargée, et ne va donc jamais voir s'il existe mieux.
 * `engine/update.ts` corrige ce cas ; ce panneau donne au parent les deux
 * gestes qui restent utiles — vérifier maintenant, et réinstaller de force.
 */
function UpdatePanel() {
  const [state, setState] = useState<'idle' | 'checking' | 'done' | 'busy'>('idle');

  return (
    <>
      <p className="muted">
        Comparez cette date à celle du dernier déploiement. L'application vérifie d'elle-même
        s'il existe une nouvelle version à chaque fois qu'on la rouvre, et se recharge seule
        quand elle en trouve une.
      </p>

      <div className="btn-row">
        <button
          className="btn ghost"
          disabled={state === 'checking' || state === 'busy'}
          onClick={async () => {
            setState('checking');
            await checkForUpdate(true);
            // Si une version existe, la page se recharge d'elle-même avant
            // d'arriver ici : voir le rechargement sur `controllerchange`.
            setState('done');
          }}
        >
          {state === 'checking' ? 'Recherche…' : 'Chercher une mise à jour'}
        </button>
        <button
          className="btn ghost"
          disabled={state === 'busy'}
          onClick={async () => {
            if (
              !confirm(
                "Retélécharger l'application ? La progression, votre voix et les photos ne " +
                  'sont pas touchées. Une connexion est nécessaire.',
              )
            ) {
              return;
            }
            setState('busy');
            await reinstall();
          }}
        >
          Retélécharger l'application
        </button>
      </div>

      {state === 'done' && (
        <p className="muted">
          Aucune version plus récente n'a été trouvée — celle-ci est à jour, ou la tablette est
          hors ligne.
        </p>
      )}

      <p className="muted">
        Si la date ne bouge toujours pas, utilisez <strong>Retélécharger l'application</strong> :
        les fichiers de l'application sont supprimés et repris depuis le serveur. Rien de ce que
        l'enfant a produit n'est concerné — la progression, les enregistrements et les photos
        sont dans une base séparée, à laquelle cette opération ne touche pas.
      </p>
    </>
  );
}

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
      <UpdatePanel />

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
        <span className={`dot ${installed ? 'ok' : ''}`} />
        <span>
          {installed
            ? 'Lancée depuis son icône, sans barre d’adresse.'
            : "Ouverte dans un onglet de Chrome. C'est parfaitement utilisable — voir plus bas."}
        </span>

        <span className={`dot ${storage.persisted ? 'ok' : 'warn'}`} />
        <span>
          {storage.persisted
            ? 'Stockage durable accordé — les données ne seront pas effacées automatiquement.'
            : 'Stockage non durable : Android pourrait effacer la progression si la tablette manque de place. Utiliser l’application régulièrement suffit généralement à l’éviter.'}
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

      {!installed && (
        <>
          <h2>Poser l'application sur l'écran d'accueil</h2>
          <p>
            Deux façons de faire, et sur tablette elles ne donnent pas le même résultat.
          </p>

          {installable && (
            <>
              <div className="btn-row">
                <button className="btn" onClick={onInstall}>
                  Installer comme application
                </button>
              </div>
              <p className="muted">
                Chrome pose l'icône tout de suite, puis fabrique la vraie application en
                arrière-plan, en contactant les serveurs Google.{' '}
                <strong>Si cette fabrication échoue, l'icône reste mais ne lance rien.</strong>{' '}
                C'est fréquent sur les tablettes dont les services Google sont restreints, et
                cela ne se voit qu'au moment où l'on tape dessus.
              </p>
            </>
          )}

          <div className="callout">
            <strong>Si l'icône ne lance rien, ne vous acharnez pas.</strong> Désinstallez-la,
            puis utilisez le menu de Chrome → <strong>Ajouter à l'écran d'accueil</strong>.
            Cela crée un simple raccourci, qui ouvre le site dans Chrome — et fonctionne
            toujours.
            <br />
            <br />
            Vous y perdez seulement la disparition de la barre d'adresse. Les ateliers, la
            voix, le micro, la progression, le fonctionnement hors ligne : tout marche
            à l'identique. Et le vrai verrou d'une séance n'a jamais été le mode d'affichage,
            c'est l'<strong>épinglage d'écran</strong> d'Android, décrit plus bas.
          </div>
        </>
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
