/**
 * Image du parent à la place d'une tuile de l'étagère.
 *
 * Même mécanique que les photos des mots (`wordImages.ts`) : une clé de blob
 * prend le pas sur le dessin embarqué, et l'étagère ne voit jamais qu'une URL.
 *
 * Elle existe pour une raison précise. Une tuile est une **convention** : il
 * faut déjà savoir ce qu'est « Le Sac de Chase » pour reconnaître deux sacs
 * dessinés. Une photo de l'enfant en train de jouer à cet atelier, ou un
 * personnage qu'il aime, n'a besoin d'aucune convention — et c'est le seul
 * écran où il décide vraiment.
 */

import { blobKeys, deleteBlob, getBlob, putBlob } from '../engine/storage';
import { normalizeImage } from './overrides';

const PREFIX = 'img.atelier.';

export function activityIconKey(id: string): string {
  return PREFIX + id;
}

/**
 * Substitutions résolues, tenues en mémoire.
 *
 * L'étagère se rend de façon synchrone, à chaque retour d'atelier : aller
 * chercher un blob à ce moment-là ferait apparaître les tuiles après coup, et
 * l'enfant taperait sur un écran encore vide.
 */
const urls = new Map<string, string>();

/** Charge les substitutions manquantes, sans toucher à celles déjà en place. */
export async function loadActivityIcons(): Promise<void> {
  const keys = await blobKeys(PREFIX);
  const present = new Set(keys.map((k) => k.slice(PREFIX.length)));

  for (const [id, url] of urls) {
    if (!present.has(id)) {
      URL.revokeObjectURL(url);
      urls.delete(id);
    }
  }

  for (const key of keys) {
    const id = key.slice(PREFIX.length);
    if (urls.has(id)) continue;
    const blob = await getBlob(key);
    if (blob) urls.set(id, URL.createObjectURL(blob));
  }
}

/** L'image du parent, ou `null` si la tuile garde son dessin. */
export function activityIcon(id: string): string | null {
  return urls.get(id) ?? null;
}

export function replacedActivityIds(): string[] {
  return [...urls.keys()];
}

export async function setActivityIcon(id: string, file: File): Promise<void> {
  const blob = await normalizeImage(file);
  await putBlob(activityIconKey(id), blob);
  // On remplace l'URL de cette tuile seule : les autres restent valides, et
  // les images déjà affichées ailleurs ne se cassent pas.
  const previous = urls.get(id);
  if (previous) URL.revokeObjectURL(previous);
  urls.set(id, URL.createObjectURL(blob));
}

export async function clearActivityIcon(id: string): Promise<void> {
  await deleteBlob(activityIconKey(id));
  const previous = urls.get(id);
  if (previous) URL.revokeObjectURL(previous);
  urls.delete(id);
}

/** À appeler avant de recharger, pour ne pas fuir un objet-URL par tuile. */
export function releaseActivityIcons(): void {
  urls.forEach(URL.revokeObjectURL);
  urls.clear();
}
