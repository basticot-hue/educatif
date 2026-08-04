/**
 * Personnages créés par le parent.
 *
 * Le pack embarqué n'est qu'un point de départ. Un enfant s'attache à *ses*
 * héros, et le dispositif tout entier repose sur cet attachement — c'est ce qui
 * le fait revenir. Le parent doit donc pouvoir ajouter les siens sans
 * recompiler quoi que ce soit.
 *
 * Ce qui est saisi n'est pas décoratif. Le **découpage syllabique**, le **son
 * d'attaque** et la **rime** sont ce qui rend un personnage utilisable par les
 * ateliers de sons. La spécification est explicite : on ne les déduit pas
 * automatiquement, parce que le français écrit ment trop sur sa prononciation —
 * « Hannah » commence par une voyelle malgré son h, « Stella » se découpe
 * Stel-la et non Ste-lla. C'est le parent qui tranche, en quelques taps.
 */

import { deleteBlob, getBlob, getSetting, setSetting } from '../engine/storage';
import type { PackCharacter, UniversePack } from '../engine/types';

const CUSTOM_KEY = 'pack.characters.custom';
const DISABLED_KEY = 'pack.characters.disabled';

export interface CustomCharacter {
  id: string;
  name: string;
  /** Syllabes orales, celles qu'on frappe. « Raiponce » → ['Rai', 'ponce']. */
  split: string[];
  /** Un *son*, jamais un nom de lettre : « z », qu'on joue « zzz ». */
  onset: string;
  rime: string;
  /** Clé de blob de l'image, ou `null` si le parent n'en a pas encore mis. */
  imageKey: string | null;
}

/**
 * Sons d'attaque proposés au parent.
 *
 * Les **continues** viennent en premier : elles se tiennent à volonté, donc
 * s'entendent isolément, et ce sont les seules utilisables aux niveaux bas du
 * Sac de Chase. Les occlusives ne peuvent pas être prolongées — ce n'est pas
 * une difficulté abstraite mais une contrainte acoustique.
 */
export const ONSET_CHOICES: Array<{ value: string; hint: string; continuant: boolean }> = [
  { value: 'ch', hint: 'chhh — comme chat', continuant: true },
  { value: 's', hint: 'sss — comme soleil', continuant: true },
  { value: 'm', hint: 'mmm — comme maison', continuant: true },
  { value: 'f', hint: 'fff — comme fleur', continuant: true },
  { value: 'l', hint: 'lll — comme lune', continuant: true },
  { value: 'v', hint: 'vvv — comme vache', continuant: true },
  { value: 'r', hint: 'rrr — comme rose', continuant: true },
  { value: 'j', hint: 'jjj — comme jupe', continuant: true },
  { value: 'z', hint: 'zzz — comme zèbre', continuant: true },
  { value: 'n', hint: 'nnn — comme nuage', continuant: true },
  { value: 'p', hint: 'p — comme prune', continuant: false },
  { value: 'b', hint: 'b — comme banane', continuant: false },
  { value: 't', hint: 't — comme tomate', continuant: false },
  { value: 'd', hint: 'd — comme dé', continuant: false },
  { value: 'k', hint: 'k — comme cabane', continuant: false },
  { value: 'g', hint: 'g — comme gâteau', continuant: false },
  { value: 'voyelle', hint: 'commence par une voyelle (Hannah, Anna, Owen)', continuant: true },
];

export function isContinuant(onset: string): boolean {
  return ONSET_CHOICES.find((o) => o.value === onset)?.continuant ?? true;
}

export function customImageKey(id: string): string {
  return `img.custom.character.${id}`;
}

/* ------------------------------------------------------------------ */

export async function loadCustomCharacters(): Promise<CustomCharacter[]> {
  return getSetting<CustomCharacter[]>(CUSTOM_KEY, []);
}

export async function saveCustomCharacter(character: CustomCharacter): Promise<void> {
  const list = await loadCustomCharacters();
  const index = list.findIndex((c) => c.id === character.id);
  if (index >= 0) list[index] = character;
  else list.push(character);
  await setSetting(CUSTOM_KEY, list);
}

export async function deleteCustomCharacter(id: string): Promise<void> {
  const list = await loadCustomCharacters();
  await setSetting(
    CUSTOM_KEY,
    list.filter((c) => c.id !== id),
  );
  // Sans cela l'image resterait en base pour toujours : ce sont les plus gros
  // objets stockés.
  await deleteBlob(customImageKey(id));
}

/* ---------------- personnages désactivés ---------------- */

export async function loadDisabled(): Promise<string[]> {
  return getSetting<string[]>(DISABLED_KEY, []);
}

export async function setDisabled(id: string, disabled: boolean): Promise<void> {
  const list = new Set(await loadDisabled());
  if (disabled) list.add(id);
  else list.delete(id);
  await setSetting(DISABLED_KEY, [...list]);
}

/* ------------------------------------------------------------------ */

/** Identifiant stable et lisible, dérivé du nom. */
export function idFromName(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // enlève les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || `perso-${Date.now().toString(36)}`;
}

/**
 * Découpage proposé au parent — **une suggestion, pas une vérité**.
 *
 * Elle sert seulement à éviter de tout taper au doigt sur une tablette. Le
 * parent doit l'entendre et la corriger : aucune règle automatique ne survit au
 * français, et un découpage faux enseignerait un rythme que l'enfant n'entend
 * pas.
 */
const VOWELS = 'aeiouyàâäéèêëîïôöùûüœ';

/** Groupes consonantiques qui ne se séparent jamais : ils démarrent la syllabe suivante. */
const INSEPARABLE = /^(ch|ph|th|gn|[bcdfgpkstv][lr])/i;

function isVowel(c: string): boolean {
  return VOWELS.includes(c.toLowerCase());
}

export function suggestSplit(name: string): string[] {
  const cleaned = name.trim();
  if (!cleaned) return [];

  /*
   * Découpe en (consonnes)(voyelles)(consonnes finales), puis applique les
   * règles usuelles du français :
   *  - une consonne entre deux voyelles part avec la syllabe suivante ;
   *  - deux consonnes se séparent, sauf les groupes inséparables (ch, pl, tr…) ;
   *  - un « e » final muet ne forme pas de syllabe orale et se recolle.
   */
  const groups: Array<{ onset: string; vowel: string }> = [];
  let coda = '';
  let i = 0;
  let pendingConsonants = '';

  while (i < cleaned.length) {
    const c = cleaned[i];
    if (!isVowel(c)) {
      pendingConsonants += c;
      i += 1;
      continue;
    }

    let vowel = '';
    while (i < cleaned.length && isVowel(cleaned[i])) {
      vowel += cleaned[i];
      i += 1;
    }
    // Une nasale ferme la voyelle quand elle n'est pas suivie d'une voyelle.
    if (/[nm]/i.test(cleaned[i] ?? '') && !isVowel(cleaned[i + 1] ?? '')) {
      vowel += cleaned[i];
      i += 1;
    }

    if (groups.length === 0) {
      groups.push({ onset: pendingConsonants, vowel });
    } else {
      // Répartit les consonnes accumulées entre la syllabe précédente et celle-ci.
      let toPrevious = '';
      let toCurrent = pendingConsonants;

      if (pendingConsonants.length >= 2 && !INSEPARABLE.test(pendingConsonants)) {
        toPrevious = pendingConsonants.slice(0, pendingConsonants.length - 1);
        toCurrent = pendingConsonants.slice(-1);
        // « Stella » : les deux l se séparent, d'où Stel-la.
        if (pendingConsonants.length === 2) {
          toPrevious = pendingConsonants[0];
          toCurrent = pendingConsonants[1];
        }
      }

      groups[groups.length - 1].vowel += toPrevious;
      groups.push({ onset: toCurrent, vowel });
    }
    pendingConsonants = '';
  }

  coda = pendingConsonants;
  if (groups.length === 0) return [cleaned];
  groups[groups.length - 1].vowel += coda;

  const parts = groups.map((g) => g.onset + g.vowel);

  /*
   * Le « e » final muet. « Chase » se frappe en une fois, « Raiponce » en deux :
   * compter ce « e » apprendrait à l'enfant un découpage qu'il n'entend jamais.
   */
  const MUTE_FINAL = new RegExp(`^[^${VOWELS}]*es?$`, 'i');
  if (parts.length > 1 && MUTE_FINAL.test(parts[parts.length - 1])) {
    parts[parts.length - 2] += parts.pop();
  }

  return parts;
}

/* ------------------------------------------------------------------ */

/**
 * Fusionne les personnages du parent dans le pack.
 *
 * Le reste de l'application ne voit qu'un `UniversePack` ordinaire : aucun
 * atelier ne sait qu'un personnage vient du pack embarqué ou du parent.
 */
/**
 * Personnage sans photo : une silhouette, jamais rien.
 *
 * Un personnage créé sans image recevait la chaîne vide, et `<img src="">`
 * n'est pas neutre : le navigateur retélécharge la page entière, et l'accueil
 * proposait une tuile invisible que l'enfant ne pouvait pas viser. Une
 * silhouette dit « ce héros existe, il n'a pas encore de visage » — le parent
 * ajoute la photo quand il veut.
 */
export const SILHOUETTE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">` +
    `<circle cx="60" cy="42" r="24" fill="#B9C2CC"/>` +
    `<path d="M18 116 Q18 74 60 74 Q102 74 102 116 Z" fill="#B9C2CC"/>` +
    `</svg>`,
)}`;

export async function mergeCharacters(
  pack: UniversePack,
  trackUrl: (url: string) => void,
): Promise<UniversePack> {
  const [custom, disabled] = await Promise.all([loadCustomCharacters(), loadDisabled()]);
  const hidden = new Set(disabled);

  const built = pack.characters.filter((c) => !hidden.has(c.id));

  const added: PackCharacter[] = [];
  for (const c of custom) {
    if (hidden.has(c.id)) continue;

    let image = SILHOUETTE;
    if (c.imageKey) {
      const blob = await getBlob(c.imageKey);
      if (blob) {
        image = URL.createObjectURL(blob);
        trackUrl(image);
      }
    }

    added.push({
      id: c.id,
      name: c.name,
      syllables: c.split.length,
      onset: c.onset,
      coda: c.rime,
      rime: c.rime,
      image,
      portrait: image,
      voice: {},
      lines: {
        greet: `Bonjour ! C'est ${c.name}.`,
        praise: ['Bravo !', 'Très bien !', "C'est ça !"],
        retry: 'On recommence ensemble.',
      },
      roles: ['pion', 'guide'],
    });
  }

  const characters = [...built, ...added];

  // Une étagère sans personnage rendrait l'accueil injouable : si le parent a
  // tout désactivé, on remet le pack embarqué.
  return { ...pack, characters: characters.length > 0 ? characters : pack.characters };
}

/**
 * Toutes les syllabes présentes dans le contenu, dédupliquées.
 *
 * Sert à l'espace parent : ce sont exactement les syllabes qu'il peut
 * enregistrer de sa voix. Elles n'ont pas besoin d'exister à l'avance — la
 * synthèse prononce n'importe quelle syllabe — mais une voix familière reste
 * nettement plus efficace à cet âge.
 */
export function syllablesInUse(pack: UniversePack, custom: CustomCharacter[], wordSplits: string[][]): string[] {
  const set = new Set<string>();
  for (const c of custom) for (const part of c.split) set.add(part.toLowerCase());
  for (const split of wordSplits) for (const part of split) set.add(part.toLowerCase());
  void pack;
  return [...set].sort((a, b) => a.localeCompare(b, 'fr'));
}
