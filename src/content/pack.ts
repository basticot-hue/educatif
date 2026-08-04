/**
 * Accès au pack courant et préchargement de ses images.
 *
 * Les images sont chargées **au montage d'un atelier, jamais pendant une
 * tâche** : un décodage d'image au milieu d'un glissement produit une saccade
 * très visible sur un SoC de 2018.
 */

import type { PackCharacter, UniversePack } from '../engine/types';
import { mascottesPack } from './packs/mascottes/manifest';

export const PACKS: UniversePack[] = [mascottesPack];

export function packById(id: string): UniversePack {
  return PACKS.find((p) => p.id === id) ?? mascottesPack;
}

export function defaultPack(): UniversePack {
  return mascottesPack;
}

export function characterById(pack: UniversePack, id: string | null): PackCharacter {
  return pack.characters.find((c) => c.id === id) ?? pack.characters[0];
}

export function pawnCharacters(pack: UniversePack): PackCharacter[] {
  return pack.characters.filter((c) => c.roles.includes('pion'));
}

/** Applique la palette du pack aux variables CSS globales. */
export function applyPalette(pack: UniversePack): void {
  const root = document.documentElement;
  root.style.setProperty('--bg', pack.palette.bg);
  root.style.setProperty('--surface', pack.palette.surface);
  root.style.setProperty('--accent', pack.palette.accent);
  root.style.setProperty('--ink', pack.palette.ink);

  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', pack.palette.bg);
}

/* ---------------- préchargement ---------------- */

const images = new Map<string, HTMLImageElement>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = images.get(src);
  if (cached?.complete) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const img = new Image();
    // Les SVG portent des attributs width/height explicites : sans dimension
    // intrinsèque, Chrome dessine un SVG en 0×0 sur un canvas.
    img.onload = () => {
      images.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`image introuvable : ${src}`));
    img.src = src;
  });
}

export function cachedImage(src: string): HTMLImageElement | null {
  const img = images.get(src);
  return img?.complete ? img : null;
}

/**
 * Un asset d'atelier est-il une image ?
 *
 * Le test portait sur la seule extension du fichier. Il laissait donc passer à
 * côté **toutes les images d'un thème de personnage** : ce sont des `blob:`
 * fabriquées à la volée, sans extension. L'hélicoptère de Stella n'était pas
 * préchargé, et se décodait au premier affichage du plateau — exactement la
 * saccade que le préchargement existe pour éviter.
 */
function looksLikeImage(value: string): boolean {
  return (
    /\.(svg|png|jpe?g|webp)$/i.test(value) ||
    value.startsWith('blob:') ||
    value.startsWith('data:image/')
  );
}

/** Précharge tout ce dont un atelier a besoin. À appeler avant `mount()`. */
export async function preloadPack(pack: UniversePack): Promise<void> {
  const sources = new Set<string>();
  for (const c of pack.characters) {
    sources.add(c.image);
    sources.add(c.portrait);
  }
  for (const assets of Object.values(pack.activityAssets)) {
    for (const value of Object.values(assets ?? {})) {
      if (typeof value === 'string' && looksLikeImage(value)) sources.add(value);
    }
  }
  // Une image manquante ne doit pas empêcher la séance : on ignore les échecs.
  await Promise.allSettled([...sources].map(loadImage));
}
