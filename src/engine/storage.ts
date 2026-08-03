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

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<Schema>(DB_NAME, DB_VERSION, {
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
    });
  }
  return dbPromise;
}

/* ---------------- maîtrise ---------------- */

export async function loadMastery(skill: SkillId): Promise<Mastery> {
  const found = await (await db()).get('mastery', skill);
  return found ?? { skill, level: 0, streak: 0, failures: 0 };
}

export async function loadAllMastery(): Promise<Mastery[]> {
  return (await db()).getAll('mastery');
}

export async function saveMastery(m: Mastery): Promise<void> {
  await (await db()).put('mastery', m);
}

/* ---------------- répétition espacée ---------------- */

export async function loadSchedules(skill: SkillId): Promise<ItemSchedule[]> {
  return (await db()).getAllFromIndex('items', 'by-skill', skill);
}

export async function saveSchedule(s: ItemSchedule): Promise<void> {
  await (await db()).put('items', s);
}

/* ---------------- séances ---------------- */

export async function saveSession(s: SessionRecord): Promise<void> {
  await (await db()).put('sessions', s);
}

/** Les `count` séances les plus récentes, de la plus récente à la plus ancienne. */
export async function recentSessions(count: number): Promise<SessionRecord[]> {
  const database = await db();
  const out: SessionRecord[] = [];
  let cursor = await database.transaction('sessions').store.openCursor(null, 'prev');
  while (cursor && out.length < count) {
    out.push(cursor.value);
    cursor = await cursor.continue();
  }
  return out;
}

export async function lastSession(): Promise<SessionRecord | null> {
  return (await recentSessions(1))[0] ?? null;
}

/* ---------------- blobs ---------------- */

export async function putBlob(key: string, blob: Blob): Promise<void> {
  await (await db()).put('blobs', { key, blob, createdAt: Date.now() });
}

export async function getBlob(key: string): Promise<Blob | null> {
  return (await (await db()).get('blobs', key))?.blob ?? null;
}

export async function deleteBlob(key: string): Promise<void> {
  await (await db()).delete('blobs', key);
}

/** Les clés présentes, pour que l'espace parent sache ce qui reste à enregistrer. */
export async function blobKeys(prefix = ''): Promise<string[]> {
  const keys = await (await db()).getAllKeys('blobs');
  return keys.filter((k) => k.startsWith(prefix));
}

/* ---------------- réglages ---------------- */

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await (await db()).get('settings', key);
  return row === undefined ? fallback : (row.value as T);
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await (await db()).put('settings', { key, value });
}

/* ---------------- objets de la Fabrique ---------------- */

export async function saveObject(o: ChildObject): Promise<void> {
  await (await db()).put('objects', o);
}

export async function allObjects(): Promise<ChildObject[]> {
  return (await db()).getAll('objects');
}

/**
 * Seuls les objets dont le parent a renseigné la phonologie sont utilisables
 * par Le Sac de Chase : un objet sans attaque connue n'a pas de bon sac.
 */
export async function usableObjects(): Promise<ChildObject[]> {
  return (await allObjects()).filter((o) => o.complete);
}

export async function deleteObject(id: string): Promise<void> {
  const database = await db();
  const object = await database.get('objects', id);
  if (object) {
    // Sans cela les blobs associés fuiraient — ce sont de loin les plus gros.
    await database.delete('blobs', object.image);
    if (object.audioLabel) await database.delete('blobs', object.audioLabel);
  }
  await database.delete('objects', id);
}

/* ---------------- mur des trésors ---------------- */

export async function addTreasure(t: Treasure): Promise<void> {
  await (await db()).put('treasures', t);
}

/** Du plus récent au plus ancien. */
export async function allTreasures(): Promise<Treasure[]> {
  const list = await (await db()).getAllFromIndex('treasures', 'by-date');
  return list.reverse();
}

export async function deleteTreasure(id: string): Promise<void> {
  const database = await db();
  const treasure = await database.get('treasures', id);
  if (treasure) {
    if (treasure.image) await database.delete('blobs', treasure.image);
    if (treasure.audio) await database.delete('blobs', treasure.audio);
  }
  await database.delete('treasures', id);
}

/* ---------------- utilitaires ---------------- */

/** Utilisé par les tests, et par le bouton de remise à zéro de l'espace parent. */
export async function clearAll(): Promise<void> {
  const database = await db();
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
}

export function resetConnectionForTests(): void {
  dbPromise = null;
}

/** Journalise un résultat dans la séance courante. Simple agrégat, pas de calcul. */
export function appendResult(session: SessionRecord, r: ItemResult): void {
  session.results.push(r);
}
