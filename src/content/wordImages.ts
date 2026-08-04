/**
 * Photo réelle à la place du dessin d'un mot.
 *
 * Un dessin, aussi soigné soit-il, reste une convention : l'enfant doit déjà
 * savoir à quoi ressemble un zèbre stylisé pour reconnaître un zèbre. La photo
 * de *sa* fraise, dans *sa* cuisine, ne demande rien de tel — et c'est
 * exactement ce que la Fabrique fait déjà pour les objets de l'enfant.
 *
 * Aucune photo n'est livrée avec l'application : elles pèsent, elles se
 * périment, et aucune banque d'images ne se redistribue sans conditions. Le
 * parent substitue les siennes, mot par mot, depuis son espace ; le dessin sert
 * de repli tant qu'il ne l'a pas fait.
 *
 * Le mécanisme est celui de `overrides.ts` — une clé de blob prend le pas sur
 * l'asset embarqué, et les ateliers ne voient jamais qu'une URL.
 */

import { deleteBlob, getBlob, blobKeys, putBlob } from '../engine/storage';
import { normalizeImage } from './overrides';
import type { WordCard } from './packs/mascottes/words';

const PREFIX = 'img.mot.';

export function wordImageKey(wordId: string): string {
  return PREFIX + wordId;
}

/**
 * Substitutions résolues, tenues en mémoire.
 *
 * Les ateliers lisent l'image d'un mot **de façon synchrone**, au milieu d'un
 * tour : aller chercher un blob à ce moment-là ferait apparaître la carte après
 * la consigne. On les charge donc une fois au démarrage.
 */
const urls = new Map<string, string>();

/**
 * Charge les substitutions manquantes, **sans toucher à celles déjà en place**.
 *
 * Cette fonction est rappelée à chaque rechargement du pack, y compris pendant
 * que la planche des mots est à l'écran. Une version antérieure révoquait tout
 * puis rechargeait : les `<img>` déjà affichées pointaient alors vers des URL
 * mortes, et la planche se vidait au moment précis où le parent venait d'y
 * ajouter une photo.
 */
export async function loadWordImages(): Promise<void> {
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

/** L'image à afficher : la photo du parent si elle existe, sinon le dessin. */
export function wordImage(word: WordCard): string {
  return urls.get(word.id) ?? word.image;
}

export function hasWordImage(wordId: string): boolean {
  return urls.has(wordId);
}

/** Les mots déjà photographiés, pour que l'espace parent sache où il en est. */
export function replacedWordIds(): string[] {
  return [...urls.keys()];
}

export async function setWordImage(wordId: string, file: File): Promise<void> {
  const blob = await normalizeImage(file);
  await putBlob(wordImageKey(wordId), blob);
  // On remplace l'URL de ce mot **seul** : les autres restent valides, et les
  // images déjà affichées ailleurs ne se cassent pas.
  const previous = urls.get(wordId);
  if (previous) URL.revokeObjectURL(previous);
  urls.set(wordId, URL.createObjectURL(blob));
}

export async function clearWordImage(wordId: string): Promise<void> {
  await deleteBlob(wordImageKey(wordId));
  const previous = urls.get(wordId);
  if (previous) URL.revokeObjectURL(previous);
  urls.delete(wordId);
}

/** À appeler avant de recharger, pour ne pas fuir un objet-URL par photo. */
export function releaseWordImages(): void {
  urls.forEach(URL.revokeObjectURL);
  urls.clear();
}
