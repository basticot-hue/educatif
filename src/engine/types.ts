/**
 * Le contrat que partagent toutes les activités.
 *
 * C'est le seul fichier dont une erreur se propage dans les sept ateliers. Il
 * doit être stabilisé avant d'en écrire un deuxième.
 */

/* ------------------------------------------------------------------ *
 * Compétences
 * ------------------------------------------------------------------ */

export const SKILLS = [
  'counting.compare',
  'counting.subitize',
  'counting.one_to_one',
  'counting.cardinal',
  'counting.sequence',
  'counting.arithmetic',
  'phono.rhyme',
  'phono.syllable',
  'phono.onset',
  'phono.coda',
  'phono.blend',
  'letter.pregraphism',
  'letter.trace',
  'letter.sound',
  'lang.vocabulary',
  'lang.category',
  'lang.narrative',
] as const;

export type SkillId = (typeof SKILLS)[number];

export const ACTIVITY_IDS = [
  'chemin',
  'missions',
  'syllabes',
  'sons',
  'sable',
  'chateau',
  'recit',
] as const;

export type ActivityId = (typeof ACTIVITY_IDS)[number];

/* ------------------------------------------------------------------ *
 * Items
 * ------------------------------------------------------------------ */

/**
 * Un item est l'unité que le planificateur sélectionne et que la répétition
 * espacée suit dans le temps. Son identité doit donc être *stable et
 * récurrente* : « partir de 7, avancer de 3 » est un item ; « ce lancer de dé »
 * n'en est pas un, car il ne reviendra jamais et sa dette n'aurait aucun sens.
 *
 * `params` est opaque pour le moteur — chaque activité y range ce dont elle a
 * besoin pour rejouer exactement le même item.
 */
export interface Item {
  id: string;
  skill: SkillId;
  level: number;
  params: Record<string, unknown>;
}

export interface ItemResult {
  itemId: string;
  skill: SkillId;
  correct: boolean;
  /** Nombre d'essais avant réussite. 1 = réussi du premier coup. */
  attempts: number;
  latencyMs: number;
  /** L'aide a-t-elle été déclenchée (pulsation, rejeu, démonstration) ? */
  assisted: boolean;
  /** L'enfant a-t-il produit quelque chose à l'oral sur cet item ? */
  spoke: boolean;
}

/* ------------------------------------------------------------------ *
 * Voix
 * ------------------------------------------------------------------ */

/**
 * Clé d'énoncé. Les activités ne savent jamais d'où vient la voix : c'est
 * `speech.ts` qui résout, dans l'ordre, l'enregistrement du parent, l'asset du
 * pack, puis la synthèse vocale.
 *
 *   'num.1' … 'num.20'   les numéros de case
 *   'greet' | 'praise' | 'retry'
 *   'mission.<id>'
 */
export type SpeechKey = string;

/* ------------------------------------------------------------------ *
 * Pack d'univers
 * ------------------------------------------------------------------ */

export interface Palette {
  bg: string;
  surface: string;
  accent: string;
  ink: string;
}

export interface PackCharacter {
  id: string;
  name: string;
  syllables: number;
  /**
   * Un *son*, jamais un nom de lettre : on stocke « ch » et on joue « chhh ».
   * Un enfant qui apprend « cé » au lieu de « chhh » devra désapprendre.
   */
  onset: string;
  coda: string;
  rime: string;
  image: string;
  portrait: string;
  /** Chemins vers les fichiers audio du pack. */
  voice: {
    greet?: string;
    praise?: string[];
    retry?: string;
  };
  /**
   * Texte des mêmes répliques, pour la synthèse vocale quand ni le parent ni le
   * pack ne fournissent d'enregistrement. Sans cela, un pack sans audio rendrait
   * l'app muette au lieu de simplement moins bonne.
   */
  lines?: {
    greet?: string;
    praise?: string[];
    retry?: string;
  };
  roles: Array<'pion' | 'guide' | 'sac'>;
}

export interface PackStory {
  id: string;
  title: string;
  panels: string[];
  audio?: string;
  questions: Array<
    | { type: 'order'; solution: string[] }
    | { type: 'inference'; prompt: string; answers: string[] }
  >;
}

/**
 * Le pack en dur de la passe 1 et les packs importés de la passe 2 utilisent
 * cette même interface — un seul chemin de contenu à maintenir.
 */
export interface UniversePack {
  id: string;
  name: string;
  version: number;
  palette: Palette;
  characters: PackCharacter[];
  stories: PackStory[];
  activityAssets: Partial<Record<ActivityId, Record<string, unknown>>>;
}

/* ------------------------------------------------------------------ *
 * Activités
 * ------------------------------------------------------------------ */

export interface ActivityProps {
  /** Point de montage. L'activité en possède le contenu et le vide au démontage. */
  container: HTMLElement;
  level: number;
  items: Item[];
  pack: UniversePack;

  /** Énonce une clé. Résout quand l'énoncé est terminé. */
  speak(key: SpeechKey): Promise<void>;

  /**
   * Enregistre la voix de l'enfant sur cet item. Le blob est conservé mais
   * jamais analysé : à cet âge, le fait de produire est ce qui compte.
   * Résout à `null` si le micro est refusé ou indisponible — l'appelant ne doit
   * rien changer à l'écran dans ce cas.
   */
  recordVoice(itemId: string): Promise<Blob | null>;

  onItemResult(r: ItemResult): void;
  onFinished(): void;
}

/**
 * Contrat impératif, volontairement hors de React : les activités pilotent un
 * canvas avec capture de pointeur, et passer par la réconciliation créerait des
 * conflits de cycle de vie. `ActivityHost` fait le pont.
 */
export interface Activity {
  id: ActivityId;
  skills: SkillId[];
  /** Toujours >= 6. Aucun atelier ne pose de plafond bloquant. */
  maxLevel: number;
  mount(props: ActivityProps): void;
  unmount(): void;
  /** Construit le vivier d'items d'un niveau, pour le planificateur. */
  itemPool(level: number): Item[];
}

/* ------------------------------------------------------------------ *
 * Progression
 * ------------------------------------------------------------------ */

export interface Mastery {
  skill: SkillId;
  /** 0 à l'infini. Pas de plafond : un enfant en avance doit pouvoir monter. */
  level: number;
  /** Réussites consécutives au premier essai. */
  streak: number;
  /** Échecs consécutifs. */
  failures: number;
}

/** État de répétition espacée d'un item (Leitner). */
export interface ItemSchedule {
  itemId: string;
  skill: SkillId;
  /** 1 à 5. */
  box: number;
  lastSeen: number;
}

/* ------------------------------------------------------------------ *
 * Journal de séance
 * ------------------------------------------------------------------ */

export interface SessionRecord {
  startedAt: number;
  endedAt: number | null;
  activities: ActivityId[];
  results: ItemResult[];
  /** Séance détectée comme « off » : les résultats n'ont pas été évalués. */
  off: boolean;
  missionId: string | null;
  characterId: string | null;
}
