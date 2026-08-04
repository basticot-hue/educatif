/**
 * Le thème d'un personnage.
 *
 * L'attachement au héros est ce qui fait revenir l'enfant — c'est le ressort
 * central du dispositif. Or jusqu'ici tous les personnages jouaient dans le
 * même décor bleu nuit et couraient vers le même phare. Choisir Stella ou
 * choisir Mila ne changeait rien à ce qu'on voyait à l'écran.
 *
 * Un thème rattache donc à chaque personnage **sa couleur et ses objets** :
 * Stella court vers son hélicoptère dans un monde rose, Raiponce vers sa tour
 * dans un monde violet. Rien de tout cela ne touche à ce qui est enseigné —
 * les niveaux, les items, la maîtrise sont identiques d'un personnage à
 * l'autre. Seul le décor change.
 *
 * Le thème vaut pour les mascottes embarquées comme pour les personnages créés
 * par le parent : c'est le même enregistrement, indexé par identifiant.
 */

import { deleteBlob, getBlob, getSetting, putBlob, setSetting } from '../engine/storage';
import { normalizeImage } from './overrides';
import type { ActivityId, Palette, UniversePack } from '../engine/types';

export const THEMES_KEY = 'pack.characters.themes';

/**
 * Emplacements d'image adaptables par personnage.
 *
 * Ce sont exactement les objets que l'enfant regarde longtemps : ce qu'il vise
 * au bout de la piste, ce qu'il transporte, ce dans quoi il range. Le reste du
 * décor est dessiné par les ateliers et n'a pas à changer d'un héros à l'autre.
 */
export const SLOTS = ['goal', 'object', 'bag', 'door'] as const;
export type ThemeSlot = (typeof SLOTS)[number];

export const SLOT_LABELS: Record<ThemeSlot, { name: string; where: string }> = {
  goal: {
    name: 'Le but du Chemin',
    where: 'Ce qu’on atteint au bout de la piste. Le phare, par défaut.',
  },
  object: {
    name: 'L’objet des Missions',
    where: 'Ce qu’on charge dans le camion, une alvéole à la fois.',
  },
  bag: {
    name: 'Le sac',
    where: 'Le sac du dernier niveau du Sac de Chase, où l’on pose le mot trouvé.',
  },
  door: {
    name: 'La porte',
    where: 'La sortie du Château des mots, où va l’objet qui n’est pas de la famille.',
  },
};

export interface CharacterTheme {
  /** Identifiant d'une palette de `PALETTES`. Absent = celle du pack. */
  palette?: string;
  /** Clés de blob, une par emplacement rempli. */
  images?: Partial<Record<ThemeSlot, string>>;
}

/* ------------------------------------------------------------------ *
 * Palettes
 * ------------------------------------------------------------------ */

/**
 * Palettes proposées, écrites à la main plutôt que dérivées d'une couleur.
 *
 * Un sélecteur de couleur libre était tentant, et c'est un piège : la moitié
 * des couleurs qu'on y choisit donnent un fond sur lequel les cartes blanches
 * ne se détachent plus, ou un accent qui disparaît dans le fond. Or l'accent
 * est le **seul** retour positif de l'application — une cible qui s'allume. S'il
 * s'efface, l'enfant ne sait plus qu'il a réussi.
 *
 * Chaque palette est donc vérifiée : fond franchement sombre ou saturé, carte
 * blanche qui tranche dessus, accent chaud et clair qui tranche sur les deux.
 */
export interface NamedPalette extends Palette {
  id: string;
  name: string;
}

export const PALETTES: NamedPalette[] = [
  { id: 'nuit', name: 'Bleu nuit', bg: '#0F2E4C', surface: '#FFFFFF', accent: '#E4B429', ink: '#12212E' },
  { id: 'rose', name: 'Rose', bg: '#A63A63', surface: '#FFFFFF', accent: '#FFD166', ink: '#3A1022' },
  { id: 'violet', name: 'Violet', bg: '#4A2E6B', surface: '#FFFFFF', accent: '#F5C542', ink: '#241338' },
  { id: 'vert', name: 'Vert', bg: '#2C5B3D', surface: '#FFFFFF', accent: '#F0C838', ink: '#12291C' },
  { id: 'turquoise', name: 'Turquoise', bg: '#12565E', surface: '#FFFFFF', accent: '#F5C542', ink: '#08292E' },
  { id: 'terre', name: 'Terre', bg: '#7A4222', surface: '#FFFFFF', accent: '#F5D06A', ink: '#331A0C' },
  { id: 'prune', name: 'Prune', bg: '#5B2140', surface: '#FFFFFF', accent: '#F0B429', ink: '#2A0E1E' },
  { id: 'ardoise', name: 'Ardoise', bg: '#33404A', surface: '#FFFFFF', accent: '#F5C542', ink: '#161D22' },
];

export function paletteById(id: string | undefined): NamedPalette | null {
  return PALETTES.find((p) => p.id === id) ?? null;
}

/* ------------------------------------------------------------------ *
 * Persistance
 * ------------------------------------------------------------------ */

export type ThemeMap = Record<string, CharacterTheme>;

export async function loadThemes(): Promise<ThemeMap> {
  return getSetting<ThemeMap>(THEMES_KEY, {});
}

export async function saveTheme(characterId: string, theme: CharacterTheme): Promise<void> {
  const all = await loadThemes();
  await setSetting(THEMES_KEY, { ...all, [characterId]: theme });
}

export function themeImageKey(characterId: string, slot: ThemeSlot): string {
  return `img.theme.${characterId}.${slot}`;
}

export async function setThemeImage(
  characterId: string,
  slot: ThemeSlot,
  file: File,
): Promise<void> {
  const key = themeImageKey(characterId, slot);
  await putBlob(key, await normalizeImage(file));

  const all = await loadThemes();
  const theme = all[characterId] ?? {};
  await setSetting(THEMES_KEY, {
    ...all,
    [characterId]: { ...theme, images: { ...theme.images, [slot]: key } },
  });
}

export async function clearThemeImage(characterId: string, slot: ThemeSlot): Promise<void> {
  await deleteBlob(themeImageKey(characterId, slot));

  const all = await loadThemes();
  const theme = all[characterId];
  if (!theme?.images) return;
  const images = { ...theme.images };
  delete images[slot];
  await setSetting(THEMES_KEY, { ...all, [characterId]: { ...theme, images } });
}

/* ------------------------------------------------------------------ *
 * Application
 * ------------------------------------------------------------------ */

/**
 * Où va chaque emplacement, une fois résolu.
 *
 * `activityAssets` est un dictionnaire opaque pour le moteur : c'est ici, et
 * seulement ici, qu'on décide que « le but » est l'asset `goal` du Chemin.
 */
const SLOT_TARGETS: Record<ThemeSlot, { activity: ActivityId; asset: string }> = {
  goal: { activity: 'chemin', asset: 'goal' },
  object: { activity: 'missions', asset: 'object' },
  bag: { activity: 'sons', asset: 'bag' },
  door: { activity: 'chateau', asset: 'door' },
};

const urls: string[] = [];

/** À appeler avant de recalculer un thème, pour ne pas fuir un objet-URL. */
export function releaseThemeUrls(): void {
  urls.splice(0).forEach(URL.revokeObjectURL);
}

/**
 * Rend une copie du pack habillée aux couleurs et aux objets d'un personnage.
 *
 * Tout le reste de l'application continue de ne voir qu'un `UniversePack`
 * ordinaire : aucun atelier ne sait qu'un thème existe. C'est ce qui permet
 * d'en ajouter un emplacement sans toucher à un seul atelier.
 */
export async function packForCharacter(
  pack: UniversePack,
  characterId: string | null,
): Promise<UniversePack> {
  if (!characterId) return pack;

  const theme = (await loadThemes())[characterId];
  if (!theme) return pack;

  const palette = paletteById(theme.palette);
  const activityAssets = { ...pack.activityAssets };

  for (const slot of SLOTS) {
    const key = theme.images?.[slot];
    if (!key) continue;
    const blob = await getBlob(key);
    if (!blob) continue;

    const url = URL.createObjectURL(blob);
    urls.push(url);

    const target = SLOT_TARGETS[slot];
    activityAssets[target.activity] = {
      ...activityAssets[target.activity],
      [target.asset]: url,
    };
  }

  return {
    ...pack,
    palette: palette ? { bg: palette.bg, surface: palette.surface, accent: palette.accent, ink: palette.ink } : pack.palette,
    activityAssets,
  };
}
