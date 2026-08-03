/**
 * Machine à états de la séance.
 *
 * Déroulé (§5 de la spécification) :
 *   accueil → étagère → série de 8 → interlude → seconde série → mission → fin
 *
 * Durée cible : 12 à 15 minutes, une fois par jour. L'app clôt la séance
 * elle-même — c'est ce qui évite la négociation quotidienne.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createChemin } from '../activities/chemin';
import { applyPalette, defaultPack, preloadPack } from '../content/pack';
import { pickMission, type Mission } from '../content/missions';
import { unlockAudio } from '../engine/audio';
import { keepAwake, lockLandscape, requestPersistentStorage } from '../engine/platform';
import { Session, buildSeries, recentlyFinished } from '../engine/session';
import { createSpeaker, type Speaker } from '../engine/speech';
import { lastSession } from '../engine/storage';
import type { ActivityId, Item, ItemResult, PackCharacter } from '../engine/types';
import { saveChildVoice, startRecording } from '../engine/voice';
import { ActivityHost } from './ActivityHost';
import { EndScreen } from './EndScreen';
import { Interlude } from './Interlude';
import { Parent } from './Parent';
import { ParentDoor } from './ParentDoor';
import { Shelf } from './Shelf';
import { Welcome } from './Welcome';
import './shell.css';

type Stage =
  | 'boot'
  | 'welcome'
  | 'shelf'
  | 'activity'
  | 'interlude'
  | 'mission'
  | 'end'
  | 'parent';

/** Deux séries par séance : c'est ce qui tient dans 12 à 15 minutes. */
const SERIES_PER_SESSION = 2;

export function App() {
  const pack = useMemo(() => defaultPack(), []);
  const activity = useMemo(() => createChemin(), []);

  const [stage, setStage] = useState<Stage>('boot');
  const [character, setCharacter] = useState<PackCharacter | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [level, setLevel] = useState(0);
  const [mission, setMission] = useState<Mission | null>(null);
  const [seriesDone, setSeriesDone] = useState(0);

  const session = useRef<Session | null>(null);
  const speaker = useRef<Speaker | null>(null);
  const stageBeforeParent = useRef<Stage>('welcome');

  /* ---------------- démarrage ---------------- */

  useEffect(() => {
    applyPalette(pack);

    void (async () => {
      await preloadPack(pack);
      // Une séance terminée il y a moins d'une heure ne se rejoue pas : pas
      // d'apprentissage à la chaîne, et surtout pas de réclamation quotidienne.
      setStage((await recentlyFinished()) ? 'end' : 'welcome');
    })();
  }, [pack]);

  /* ---------------- choix du personnage ---------------- */

  const onPickCharacter = useCallback(
    async (picked: PackCharacter) => {
      await unlockAudio();
      setCharacter(picked);
      speaker.current = createSpeaker(pack, picked);

      const s = new Session(picked.id);
      await s.loadBaselines();
      session.current = s;

      // Demandées ici et pas au démarrage : ces API réclament un contexte
      // d'installation ou de plein écran pour aboutir.
      void requestPersistentStorage();
      void lockLandscape();
      void keepAwake();

      void speaker.current.speak('greet');
      setStage('shelf');
    },
    [pack],
  );

  /* ---------------- séries ---------------- */

  const startSeries = useCallback(async () => {
    const built = await buildSeries('counting.sequence', (l) => activity.itemPool(l));
    setItems(built.items);
    setLevel(built.level);
    session.current?.noteActivity('chemin');
    setStage('activity');
  }, [activity]);

  const onPickActivity = useCallback(
    (_id: ActivityId) => {
      void startSeries();
    },
    [startSeries],
  );

  const onItemResult = useCallback((result: ItemResult) => {
    void session.current?.recordResult(result);
  }, []);

  const finishMission = useCallback(async () => {
    const s = session.current;
    const previous = (await lastSession())?.missionId ?? null;
    const chosen = pickMission(s?.dominantSkill() ?? 'counting.sequence', previous);
    setMission(chosen);
    await s?.finish(chosen?.id ?? null);
    setStage('mission');
  }, []);

  const onSeriesFinished = useCallback(() => {
    const done = seriesDone + 1;
    setSeriesDone(done);

    // Séance « off » : on n'insiste pas. Le moteur a déjà cessé d'évaluer ;
    // on abrège et on passe à la mission, sans rien dire à l'enfant.
    const off = session.current?.evaluating === false;

    if (done >= SERIES_PER_SESSION || off) {
      void finishMission();
    } else {
      setStage('interlude');
    }
  }, [seriesDone, finishMission]);

  /* ---------------- voix de l'enfant ---------------- */

  const speak = useCallback(async (key: string) => {
    await speaker.current?.speak(key);
  }, []);

  const recordVoice = useCallback(async (itemId: string) => {
    const recording = await startRecording();
    if (!recording) return null; // micro refusé : rien ne change à l'écran
    const blob = await recording.stop();
    const startedAt = session.current?.startedAt;
    if (blob && startedAt) void saveChildVoice(startedAt, itemId, blob);
    return blob;
  }, []);

  /* ---------------- rendu ---------------- */

  const openParent = useCallback(() => {
    stageBeforeParent.current = stage;
    speaker.current?.stop();
    setStage('parent');
  }, [stage]);

  if (stage === 'parent') {
    return (
      <Parent
        pack={pack}
        onClose={() => setStage(stageBeforeParent.current === 'parent' ? 'welcome' : stageBeforeParent.current)}
        onRestart={() => {
          session.current = null;
          setSeriesDone(0);
          setCharacter(null);
          setStage('welcome');
        }}
      />
    );
  }

  return (
    <>
      {stage === 'boot' && <div className="screen" />}

      {stage === 'welcome' && <Welcome pack={pack} onPick={(c) => void onPickCharacter(c)} />}

      {stage === 'shelf' && <Shelf available={['chemin']} onPick={onPickActivity} />}

      {stage === 'activity' && character && (
        <ActivityHost
          activity={activity}
          level={level}
          items={items}
          pack={pack}
          speak={speak}
          recordVoice={recordVoice}
          onItemResult={onItemResult}
          onFinished={onSeriesFinished}
        />
      )}

      {stage === 'interlude' && character && (
        <Interlude
          character={character}
          speak={() => speak('praise')}
          onDone={() => void startSeries()}
        />
      )}

      {stage === 'mission' && character && (
        <Interlude
          character={character}
          minMs={3000}
          speak={async () => {
            if (mission) await speaker.current?.say(mission.text);
          }}
          onDone={() => setStage('end')}
        />
      )}

      {stage === 'end' && <EndScreen />}

      <ParentDoor onOpen={openParent} />
    </>
  );
}
