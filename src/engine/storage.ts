/**
 * Accès IndexedDB.
 *
 * `localStorage` ne convient pas : il est synchrone, plafonné à quelques Mo et
 * ne stocke pas de blobs. Or la voix du parent, celle de l'enfant et — dès la
 * passe 2 — les photos de la Fabrique sont tous des blobs. Un seul chemin de
 * stockage, utilisé tel quel plus tard.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  ChildObject,
  ItemResult,
  ItemSchedule,
  Mastery,
  SessionRecord,
  SkillId,
  Treasure,
} from './types';

const DB_NAME = 'educatif';
const DB_VERSION = 2;

interface Schema extends DBSchema {
  mastery: {
    key: SkillId;
    value: Mastery;
  };
  items: {
    key: string;
    value: ItemSchedule;
    indexes: { 'by-skill': SkillId };
  };
  sessions: {
    key: number;
    value: SessionRecord;
  };
  /** Voix du parent (`voice.num.7`) et de l'enfant (`child.<sessionTs>.<itemId>`). */
  blobs: {
    key: string;
    value: { key: string; blob: Blob; createdAt: number };
  };
  settings: {
    key: string;
    value: { key: string; value: unknown };
  };
  /** Objets photographiés à la Fabrique. */
  objects: {
    key: string;
    value: ChildObject;
  };
  /** Le mur des trésors : uniquement la production de l'enfant. */
  treasures: {
    key: string;
    value: Treasure;
    indexes: { 'by-date': number };
  };
}

let dbPromise: Promise<IDBPDatabase<Schema> | null> | null = null;
let openFailed = false;

/**
 * Délai au-delà duquel on renonce à ouvrir la base.
 *
 * Une ouverture IndexedDB peut **bloquer indéfiniment** : c'est le cas quand
 * une autre fenêtre du même site garde une version antérieure ouverte et
 * empêche la migration. Sans ce garde-fou, l'application attendait pour
 * toujours et n'affichait jamais rien — un écran uni, sans erreur, sans
 * explication. C'est le pire mode de panne possible.
 */
const OPEN_TIMEOUT_MS = 4000;

/** Vrai si la base n'a pas pu s'ouvrir : la séance tourne sans rien enregistrer. */
export function storageUnavailable(): boolean {
  return openFailed;
}

function db(): Promise<IDBPDatabase<Schema> | null> {
  if (!dbPromise) {
    const opening = openDB<Schema>(DB_NAME, DB_VERSION, {
      // Les migrations sont cumulatives et sans `break` : une tablette restée
      // en version 1 doit pouvoir passer directement à la dernière sans perdre
      // la progression ni les enregistrements déjà faits.
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          database.createObjectStore('mastery', { keyPath: 'skill' });
          const items = database.createObjectStore('items', { keyPath: 'itemId' });
          items.createIndex('by-skill', 'skill');
          database.createObjectStore('sessions', { keyPath: 'startedAt' });
          database.createObjectStore('blobs', { keyPath: 'key' });
          database.createObjectStore('settings', { keyPath: 'key' });
        }
        if (oldVersion < 2) {
          database.createObjectStore('objects', { keyPath: 'id' });
          const treasures = database.createObjectStore('treasures', { keyPath: 'id' });
          treasures.createIndex('by-date', 'createdAt');
        }
      },

      /**
       * Une autre fenêtre du même site veut migrer la base, et **nous** la
       * bloquons. On ferme aussitôt : sans cela, l'application installée reste
       * coincée au démarrage tant que l'onglet du navigateur est ouvert.
       */
      blocking(_currentVersion, _blockedVersion, event) {
        (event.target as unknown as IDBPDatabase<Schema>)?.close?.();
        dbPromise = null;
      },

      /** Le cas inverse : c'est nous qui attendons. Le délai ci-dessous tranche. */
      blocked() {
        // Rien à faire ici : on ne peut pas fermer la connexion d'autrui.
      },

      /** Connexion perdue (onglet en veille prolongée, éviction) : on rouvrira. */
      terminated() {
        dbPromise = null;
      },
    });

    /*
     * On ne laisse jamais l'ouverture bloquer la séance. Si elle n'aboutit pas,
     * l'application continue de tourner **sans persistance** : l'enfant joue,
     * rien n'est enregistré, et le parent en est averti dans son espace. Cela
     * vaut infiniment mieux qu'un écran uni qui n'explique rien.
     */
    dbPromise = Promise.race([
      opening.catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), OPEN_TIMEOUT_MS)),
    ]).then((database) => {
      if (!database) openFailed = true;
      return database;
    });
  }
  return dbPromise;
}

/** Exécute une opération sur la base, ou rend `fallback` si elle est indisponible. */
async function withDb<T>(
  run: (database: IDBPDatabase<Schema>) => Promise<T>,
  fallback: T,
): Promise<T> {
  const database = await db();
  if (!database) return fallback;
  try {
    return await run(database);
  } catch {
    // Quota dépassé, transaction avortée : la séance continue sans enregistrer.
    return fallback;
  }
}

/* ---------------- maîtrise ---------------- */

export async function loadMastery(skill: SkillId): Promise<Mastery> {
  const found = await withDb((d) => d.get('mastery', skill), undefined);
  return found ?? { skill, level: 0, streak: 0, failures: 0 };
}

export async function loadAllMastery(): Promise<Mastery[]> {
  return withDb((d) => d.getAll('mastery'), []);
}

export async function saveMastery(m: Mastery): Promise<void> {
  await withDb((d) => d.put('mastery', m), undefined);
}

/* ---------------- répétition espacée ---------------- */

export async function loadSchedules(skill: SkillId): Promise<ItemSchedule[]> {
  return withDb((d) => d.getAllFromIndex('items', 'by-skill', skill), []);
}

export async function saveSchedule(s: ItemSchedule): Promise<void> {
  await withDb((d) => d.put('items', s), undefined);
}

/* ---------------- séances ---------------- */

export async function saveSession(s: SessionRecord): Promise<void> {
  await withDb((d) => d.put('sessions', s), undefined);
}

/** Les `count` séances les plus récentes, de la plus récente à la plus ancienne. */
export async function recentSessions(count: number): Promise<SessionRecord[]> {
  return withDb(async (database) => {
    const out: SessionRecord[] = [];
    let cursor = await database.transaction('sessions').store.openCursor(null, 'prev');
    while (cursor && out.length < count) {
      out.push(cursor.value);
      cursor = await cursor.continue();
    }
    return out;
  }, []);
}

export async function lastSession(): Promise<SessionRecord | null> {
  return (await recentSessions(1))[0] ?? null;
}

/* ---------------- blobs ---------------- */

export async function putBlob(key: string, blob: Blob): Promise<void> {
  await withDb((d) => d.put('blobs', { key, blob, createdAt: Date.now() }), undefined);
}

export async function getBlob(key: string): Promise<Blob | null> {
  const row = await withDb((d) => d.get('blobs', key), undefined);
  return row?.blob ?? null;
}

export async function deleteBlob(key: string): Promise<void> {
  await withDb((d) => d.delete('blobs', key), undefined);
}

/** Les clés présentes, pour que l'espace parent sache ce qui reste à enregistrer. */
export async function blobKeys(prefix = ''): Promise<string[]> {
  const keys = await withDb((d) => d.getAllKeys('blobs'), []);
  return keys.filter((k) => k.startsWith(prefix));
}

/* ---------------- réglages ---------------- */

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await withDb((d) => d.get('settings', key), undefined);
  return row === undefined ? fallback : (row.value as T);
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await withDb((d) => d.put('settings', { key, value }), undefined);
}

/* ---------------- objets de la Fabrique ---------------- */

export async function saveObject(o: ChildObject): Promise<void> {
  await withDb((d) => d.put('objects', o), undefined);
}

export async function allObjects(): Promise<ChildObject[]> {
  return withDb((d) => d.getAll('objects'), []);
}

/**
 * Seuls les objets dont le parent a renseigné la phonologie sont utilisables
 * par Le Sac de Chase : un objet sans attaque connue n'a pas de bon sac.
 */
export async function usableObjects(): Promise<ChildObject[]> {
  return (await allObjects()).filter((o) => o.complete);
}

export async function deleteObject(id: string): Promise<void> {
  await withDb(async (database) => {
    const object = await database.get('objects', id);
    if (object) {
      // Sans cela les blobs associés fuiraient — ce sont de loin les plus gros.
      await database.delete('blobs', object.image);
      if (object.audioLabel) await database.delete('blobs', object.audioLabel);
    }
    await database.delete('objects', id);
  }, undefined);
}

/* ---------------- mur des trésors ---------------- */

export async function addTreasure(t: Treasure): Promise<void> {
  await withDb((d) => d.put('treasures', t), undefined);
}

/** Du plus récent au plus ancien. */
export async function allTreasures(): Promise<Treasure[]> {
  const list = await withDb((d) => d.getAllFromIndex('treasures', 'by-date'), []);
  return [...list].reverse();
}

export async function deleteTreasure(id: string): Promise<void> {
  await withDb(async (database) => {
    const treasure = await database.get('treasures', id);
    if (treasure) {
      if (treasure.image) await database.delete('blobs', treasure.image);
      if (treasure.audio) await database.delete('blobs', treasure.audio);
    }
    await database.delete('treasures', id);
  }, undefined);
}

/* ---------------- utilitaires ---------------- */

/** Utilisé par les tests, et par le bouton de remise à zéro de l'espace parent. */
export async function clearAll(): Promise<void> {
  await withDb(async (database) => {
    const stores = [
      'mastery',
      'items',
      'sessions',
      'blobs',
      'settings',
      'objects',
      'treasures',
    ] as const;
    const tx = database.transaction(stores, 'readwrite');
    await Promise.all(stores.map((s) => tx.objectStore(s).clear()));
    await tx.done;
  }, undefined);
}

export function resetConnectionForTests(): void {
  dbPromise = null;
  openFailed = false;
}

/** Journalise un résultat dans la séance courante. Simple agrégat, pas de calcul. */
export function appendResult(session: SessionRecord, r: ItemResult): void {
  session.results.push(r);
}
