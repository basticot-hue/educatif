/**
 * Machine à états de la séance.
 *
 * Déroulé (§5 de la spécification) :
 *   accueil → étagère → série de 8 → interlude → seconde série → mission → fin
 *
 * Durée cible : 12 à 15 minutes, une fois par jour. L'app clôt la séance
 * elle-même — c'est ce qui évite la négociation quotidienne.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { activityEntry, AVAILABLE_IDS } from '../activities/registry';
import { applyPalette, defaultPack, preloadPack } from '../content/pack';
import { applyOverrides, releaseOverrideUrls } from '../content/overrides';
import { loadWordImages } from '../content/wordImages';
import { loadActivityIcons } from '../content/activityIcons';
import { packForCharacter, releaseThemeUrls } from '../content/theme';
import { pickMission, type Mission } from '../content/missions';
import { unlockAudio } from '../engine/audio';
import { enterImmersive, keepAwake, requestPersistentStorage } from '../engine/platform';
import { Session, buildSeries, recentlyFinished } from '../engine/session';
import { createSpeaker, type Speaker } from '../engine/speech';
import { getSetting, lastSession, HIDDEN_ACTIVITIES } from '../engine/storage';
import type {
  ActivityId,
  Item,
  ItemResult,
  PackCharacter,
  UniversePack,
} from '../engine/types';
import { saveChildVoice, startRecording } from '../engine/voice';
import { ActivityHost } from './ActivityHost';
import { EndScreen } from './EndScreen';
import { ExitDoor } from './ExitDoor';
import { Fabrique } from './Fabrique';
import { Interlude } from './Interlude';
import { Parent } from './Parent';
import { ParentDoor } from './ParentDoor';
import { Shelf, type ShelfId } from './Shelf';
import { Studio } from './Studio';
import { Welcome } from './Welcome';
import './shell.css';

type Stage =
  | 'boot'
  | 'welcome'
  | 'shelf'
  | 'activity'
  | 'fabrique'
  | 'studio'
  | 'interlude'
  | 'mission'
  | 'end'
  | 'parent';

/** Deux séries par séance : c'est ce qui tient dans 12 à 15 minutes. */
const SERIES_PER_SESSION = 2;

export function App() {
  /**
   * Le pack peut porter des images remplacées par le parent. On le recharge
   * après chaque substitution — `packVersion` sert uniquement de déclencheur.
   */
  const [packVersion, setPackVersion] = useState(0);
  const [packReady, setPackReady] = useState(false);
  const [pack, setPack] = useState<UniversePack>(() => defaultPack());
  /**
   * Vrai quand il n'y a plus de séance derrière le Studio : soit elle vient de
   * se clore, soit on y est arrivé par une relance dans l'heure. Dans les deux
   * cas, en sortir mène à l'écran terminal et non à l'étagère — y renvoyer
   * ferait commencer une séance que l'app vient justement de refuser.
   */
  const relaunchBlocked = useRef(false);

  const [stage, setStage] = useState<Stage>('boot');
  const [character, setCharacter] = useState<PackCharacter | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [level, setLevel] = useState(0);
  /**
   * Une instance neuve par série. Réutiliser la même d'une série à l'autre
   * forcerait chaque atelier à remettre lui-même tout son état à zéro, et l'un
   * d'eux finirait par en oublier une part.
   */
  const [activity, setActivity] = useState(() => activityEntry('chemin').create());
  const [mission, setMission] = useState<Mission | null>(null);
  /** Ateliers présentés sur l'étagère, dans l'ordre du registre. */
  const [shelf, setShelf] = useState<ActivityId[]>(() => [...AVAILABLE_IDS]);
  const [seriesDone, setSeriesDone] = useState(0);

  const session = useRef<Session | null>(null);
  const speaker = useRef<Speaker | null>(null);
  const stageBeforeParent = useRef<Stage>('welcome');

  /* ---------------- démarrage ---------------- */

  /*
   * Chargement du pack, y compris les images remplacées par le parent.
   *
   * Cet effet ne touche **pas** à l'écran courant : il se rejoue à chaque
   * substitution d'image, et repositionner l'écran ici éjectait le parent de son
   * espace au milieu de son travail, pour le renvoyer à l'accueil.
   */
  useEffect(() => {
    void (async () => {
      /*
       * Le démarrage ne doit **jamais** laisser un écran uni.
       *
       * Une version antérieure enchaînait ces appels sans filet : si l'un
       * d'eux échouait ou n'aboutissait pas — typiquement l'ouverture de la
       * base, qui reste bloquée tant qu'une autre fenêtre retient une version
       * antérieure — l'application restait indéfiniment sur son fond bleu. En
       * plein écran, sans barre de navigateur, cela ressemble à une
       * application qui ne se lance pas du tout.
       *
       * Désormais, quoi qu'il arrive, on arrive à l'accueil. La séance tourne,
       * simplement sans rien enregistrer, et le parent en est averti.
       */
      let resolved = defaultPack();
      try {
        releaseOverrideUrls();
        resolved = await applyOverrides(defaultPack());
      } catch {
        // Personnages et images du parent indisponibles : on garde le pack embarqué.
      }

      try {
        // Les photos substituées aux dessins — des mots, et des tuiles de
        // l'étagère. Chargées ici parce que les ateliers et l'étagère lisent
        // ces images de façon synchrone, au milieu d'un tour ou d'un rendu :
        // aller les chercher à ce moment-là les ferait arriver en retard.
        await loadWordImages();
        await loadActivityIcons();
      } catch {
        // Les dessins embarqués font l'affaire.
      }

      applyPalette(resolved);
      try {
        await preloadPack(resolved);
      } catch {
        // Une image manquante n'empêche pas de jouer.
      }
      setPack(resolved);

      /*
       * Un porte-voix est disponible dès le démarrage, avant même que l'enfant
       * ait choisi son personnage. Le parent entre souvent directement dans son
       * espace, où il doit pouvoir écouter un découpage syllabique : sans cela
       * le bouton « Écouter » resterait muet, et c'est précisément l'écoute qui
       * lui permet de valider ce qu'il saisit.
       */
      if (!speaker.current) {
        speaker.current = createSpeaker(resolved, resolved.characters[0]);
      }

      /*
       * Ateliers retirés par le parent.
       *
       * Rien n'est jamais verrouillé *pour l'enfant* — il n'y a ni cadenas ni
       * ordre imposé. Mais le parent doit pouvoir retirer de l'étagère un
       * atelier qui ne prend pas, ou alléger le choix : huit tuiles d'un coup,
       * c'est beaucoup à trois ans et demi. Un atelier retiré disparaît
       * simplement ; l'enfant ne voit pas qu'il manque quelque chose.
       */
      try {
        const hidden = await getSetting<string[]>(HIDDEN_ACTIVITIES, []);
        const kept = AVAILABLE_IDS.filter((id) => !hidden.includes(id));
        // Tout retirer laisserait une étagère vide, donc une séance injouable.
        setShelf(kept.length > 0 ? kept : [...AVAILABLE_IDS]);
      } catch {
        setShelf([...AVAILABLE_IDS]);
      }

      setPackReady(true);
    })();
  }, [packVersion]);

  /** Écran de départ : décidé une seule fois, au tout premier chargement. */
  useEffect(() => {
    if (!packReady) return;
    void (async () => {
      // Une séance terminée il y a moins d'une heure ne se rejoue pas : pas
      // d'apprentissage à la chaîne, et surtout pas de réclamation quotidienne.
      let blocked = false;
      try {
        blocked = await recentlyFinished();
      } catch {
        // Sans historique lisible, on laisse jouer plutôt que de refuser.
      }
      relaunchBlocked.current = blocked;
      /*
       * Relance dans l'heure : on va au Studio, pas à l'écran terminal.
       *
       * La séance ne se rejoue pas — c'est ce qui évite l'apprentissage à la
       * chaîne et la réclamation quotidienne. Mais un écran mort n'était pas
       * l'intention de la spécification, qui renvoie ici vers le Studio :
       * l'enfant qui revient trouve de quoi faire, simplement rien à réussir.
       */
      setStage((current) => (current === 'boot' ? (blocked ? 'studio' : 'welcome') : current));
    })();
  }, [packReady]);

  /* ---------------- choix du personnage ---------------- */

  const onPickCharacter = useCallback(
    async (picked: PackCharacter) => {
      await unlockAudio();
      setCharacter(picked);

      /*
       * Le décor prend les couleurs et les objets du héros choisi.
       *
       * C'est ici et pas au démarrage : avant ce tap, on ne sait pas qui joue.
       * L'échec est sans conséquence — on garde le pack tel quel, l'enfant joue
       * dans le décor par défaut.
       */
      let themed = pack;
      try {
        releaseThemeUrls();
        themed = await packForCharacter(pack, picked.id);
        applyPalette(themed);
        await preloadPack(themed);
        setPack(themed);
      } catch {
        // Thème illisible : le décor du pack fait parfaitement l'affaire.
      }

      speaker.current = createSpeaker(themed, picked);

      const s = new Session(picked.id);
      await s.loadBaselines();
      session.current = s;

      // Demandées ici et pas au démarrage : ces API réclament un geste de
      // l'utilisateur pour aboutir, et aucune n'est indispensable au jeu.
      void requestPersistentStorage();
      void enterImmersive();
      void keepAwake();

      void speaker.current.speak('greet');
      setStage('shelf');
    },
    [pack],
  );

  /* ---------------- séries ---------------- */

  const startSeries = useCallback(async (id: ActivityId) => {
    const entry = activityEntry(id);
    const instance = entry.create();
    const built = await buildSeries(entry.drivingSkill, (l) => instance.itemPool(l));

    setActivity(instance);
    setItems(built.items);
    setLevel(built.level);
    session.current?.noteActivity(id);
    setStage('activity');
  }, []);

  const onPickActivity = useCallback(
    (id: ShelfId) => {
      /*
       * La Fabrique et le Studio ne sont pas des ateliers : ils ne produisent
       * aucun résultat, ne font monter aucun niveau, et ne comptent pas comme
       * une série. L'enfant y va quand il veut, aussi longtemps qu'il veut.
       */
      if (id === 'fabrique' || id === 'studio') {
        setStage(id);
        return;
      }
      void startSeries(id);
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
    // La séance est close : plus rien ne se rejoue, et le Studio devient la
    // seule sortie — exactement comme après une relance dans l'heure.
    relaunchBlocked.current = true;
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

  /** Après l'interlude, l'enfant retourne choisir : c'est lui qui décide. */
  const afterInterlude = useCallback(() => setStage('shelf'), []);

  /**
   * L'enfant quitte un atelier en cours de série.
   *
   * La série est simplement abandonnée : les items déjà faits comptent, les
   * suivants n'existent pas. On ne compte **pas** la série comme faite — sinon
   * traverser deux ateliers en deux secondes suffirait à clore la séance.
   *
   * L'abandon est noté : trois abandons signent une séance « off », et c'est
   * précisément l'information qu'on cherche. Rien n'est dit à l'enfant.
   */
  const leaveActivity = useCallback(() => {
    speaker.current?.stop();
    session.current?.noteAbandon();
    setStage('shelf');
  }, []);

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
    /*
     * On ne revient jamais **dans** un atelier.
     *
     * L'espace parent se rend dans une branche à part, ce qui démonte
     * l'atelier ; au retour, il se remontait, remettait sa file à zéro et
     * repartait de l'item 1. Les items déjà joués, eux, restaient dans la
     * séance : ils étaient donc comptés deux fois. Un parent qui jette un œil
     * au récapitulatif au milieu d'une série faussait la mesure sans le savoir.
     *
     * Rendre la main à l'étagère est honnête : la série s'arrête, l'enfant
     * choisit à nouveau. Ce n'est pas un abandon de sa part — on ne le compte
     * pas comme tel.
     */
    stageBeforeParent.current = stage === 'activity' ? 'shelf' : stage;
    speaker.current?.stop();
    setStage('parent');
  }, [stage]);

  if (stage === 'parent') {
    return (
      <Parent
        pack={pack}
        basePack={defaultPack()}
        speaker={speaker.current}
        onPackChanged={() => setPackVersion((v) => v + 1)}
        onClose={() => setStage(stageBeforeParent.current === 'parent' ? 'welcome' : stageBeforeParent.current)}
        onRestart={() => {
          session.current = null;
          setSeriesDone(0);
          setCharacter(null);
          // Le parent rouvre explicitement une séance : le Studio redevient un
          // lieu dont on ressort vers l'étagère.
          relaunchBlocked.current = false;
          // Le décor du héros précédent ne doit pas survivre à son départ :
          // l'accueil est le seul écran qui n'appartient à personne.
          releaseThemeUrls();
          const base = defaultPack();
          applyPalette(base);
          setPack(base);
          setPackVersion((v) => v + 1);
          setStage('welcome');
        }}
      />
    );
  }

  return (
    <>
      {stage === 'boot' && <div className="screen" />}

      {stage === 'welcome' && <Welcome pack={pack} onPick={(c) => void onPickCharacter(c)} />}

      {stage === 'shelf' && (
        <Shelf available={[...shelf, 'fabrique', 'studio']} onPick={onPickActivity} />
      )}

      {stage === 'fabrique' && <Fabrique onDone={() => setStage('shelf')} />}

      {/*
        Le Studio se quitte vers l'étagère en cours de séance, mais vers l'écran
        terminal quand il n'y a plus de séance derrière — relance dans l'heure,
        ou séance qui vient de se clore. Renvoyer à l'étagère la ferait
        recommencer, exactement ce que la clôture empêche.
      */}
      {stage === 'studio' && (
        <Studio onDone={() => setStage(relaunchBlocked.current ? 'end' : 'shelf')} />
      )}

      {stage === 'activity' && character && (
        <ActivityHost
          activity={activity}
          level={level}
          items={items}
          pack={pack}
          character={character}
          speak={speak}
          recordVoice={recordVoice}
          onItemResult={onItemResult}
          onFinished={onSeriesFinished}
        />
      )}

      {/* Un atelier n'est jamais une impasse : on peut toujours en ressortir. */}
      {stage === 'activity' && character && <ExitDoor onExit={leaveActivity} />}

      {stage === 'interlude' && character && (
        <Interlude character={character} speak={() => speak('praise')} onDone={afterInterlude} />
      )}

      {stage === 'mission' && character && (
        <Interlude
          character={character}
          minMs={3000}
          speak={async () => {
            if (mission) await speaker.current?.say(mission.text);
          }}
          /*
           * La mission dite, on va au Studio — pas à l'écran terminal.
           *
           * L'app clôt bien la séance : plus aucun atelier, plus rien à
           * réussir, aucune invitation à recommencer. Mais tomber sur un rond
           * gris immédiatement après le personnage se lit comme une panne, pas
           * comme une fin. Le Studio est déjà la réponse retenue pour la
           * relance dans l'heure : l'enfant regarde ses trésors, dessine, et
           * c'est lui qui referme en touchant la maison.
           */
          onDone={() => setStage('studio')}
        />
      )}

      {stage === 'end' && <EndScreen />}

      <ParentDoor onOpen={openParent} />
    </>
  );
}
