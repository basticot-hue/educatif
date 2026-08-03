/**
 * Remplacement des images du pack par des fichiers choisis sur la tablette.
 *
 * Le parent peut substituer sa propre image à n'importe quel personnage sans
 * recompiler quoi que ce soit. C'est le premier pas vers les packs importables
 * de la spécification, et le mécanisme est le même : une clé de blob prend le
 * pas sur l'asset embarqué, et tout le reste de l'application continue de ne
 * voir qu'une URL.
 */

import { deleteBlob, getBlob, putBlob } from '../engine/storage';
import type { PackCharacter, UniversePack } from '../engine/types';
import { mergeCharacters } from './characters';

/**
 * Côté maximal d'une image importée.
 *
 * Une photo de tablette fait 3000 px et plusieurs mégaoctets. La redessiner à
 * chaque image d'un canvas à cette taille effondre la fréquence sur un SoC de
 * 2018, et quelques photos suffiraient à saturer le quota de stockage.
 */
export const MAX_IMAGE_SIDE = 512;

export function characterImageKey(packId: string, characterId: string): string {
  return `img.${packId}.character.${characterId}`;
}

/**
 * Réduit et réencode une image choisie par le parent.
 *
 * Le PNG est conservé pour préserver la transparence — un personnage détouré
 * sur fond transparent se pose bien mieux sur une case du Chemin qu'un
 * rectangle blanc. Le JPEG serait plus léger mais collerait un fond.
 */
export async function normalizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponible');

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob) throw new Error('encodage impossible');
  return blob;
}

export async function setCharacterImage(
  packId: string,
  characterId: string,
  file: File,
): Promise<void> {
  await putBlob(characterImageKey(packId, characterId), await normalizeImage(file));
}

export async function clearCharacterImage(packId: string, characterId: string): Promise<void> {
  await deleteBlob(characterImageKey(packId, characterId));
}

export async function hasCharacterImage(packId: string, characterId: string): Promise<boolean> {
  return (await getBlob(characterImageKey(packId, characterId))) !== null;
}

/* ------------------------------------------------------------------ */

const objectUrls: string[] = [];

/**
 * Rend une copie du pack dont les images remplacées pointent vers les fichiers
 * du parent.
 *
 * Tout le reste de l'application — ateliers compris — continue de ne manipuler
 * qu'une chaîne d'URL et ignore complètement d'où elle vient. C'est ce qui
 * permettra aux packs importés d'arriver sans toucher un seul atelier.
 */
export async function applyOverrides(pack: UniversePack): Promise<UniversePack> {
  const characters: PackCharacter[] = await Promise.all(
    pack.characters.map(async (character) => {
      const blob = await getBlob(characterImageKey(pack.id, character.id));
      if (!blob) return character;
      const url = URL.createObjectURL(blob);
      objectUrls.push(url);
      return { ...character, image: url, portrait: url };
    }),
  );

  // Puis les personnages créés par le parent, dans le même format : aucun
  // atelier ne sait d'où vient un personnage.
  return mergeCharacters({ ...pack, characters }, (url) => objectUrls.push(url));
}

/** À appeler avant de recalculer les substitutions, pour ne pas fuir. */
export function releaseOverrideUrls(): void {
  objectUrls.splice(0).forEach(URL.revokeObjectURL);
}
