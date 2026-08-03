/**
 * Mots illustrés du pack.
 *
 * Ils alimentent Le Bal des syllabes, Le Sac de Chase et Le Château des mots.
 * Le choix n'est pas décoratif — chaque mot est là pour une propriété
 * phonologique précise :
 *
 * - **attaques continues** (s, l, f, m, ch, v, r, j) : elles se tiennent à
 *   volonté, donc s'entendent isolément. Ce sont les seules utilisables avant
 *   le niveau 4 du Sac ;
 * - **attaques occlusives** (p, b, t) : impossibles à prolonger, donc réservées
 *   aux niveaux hauts. Ce n'est pas une question de difficulté abstraite mais
 *   d'acoustique ;
 * - **familles de rimes** : chaque rime apparaît au moins deux fois, sans quoi
 *   le niveau 0 du Bal n'aurait aucune paire à proposer ;
 * - **1, 2 et 3 syllabes**, pour que le contraste du niveau 3 existe.
 *
 * `onset` est un **son**, jamais un nom de lettre : « chhh », pas « cé ».
 */

export interface WordCard {
  id: string;
  label: string;
  /**
   * Nombre de syllabes **orales**, celles qu'on frappe dans les mains.
   *
   * Le « e » final muet ne compte pas : « banane » se frappe ba-nane, en deux
   * fois, et non ba-na-ne. C'est ce qui se pratique en maternelle, et c'est la
   * réalité de la langue parlée — compter le e muet apprendrait à l'enfant un
   * découpage qu'il n'entend pas.
   */
  syllables: number;
  /** Le découpage effectif, prononcé lentement à la consigne. */
  split: string[];
  onset: string;
  /** Vrai si l'attaque peut être tenue — condition d'usage avant le niveau 4. */
  continuant: boolean;
  rime: string;
  category: string;
  image: string;
}

/** Encapsule un SVG en URL de données, utilisable en `<img>` comme au canvas. */
function svg(body: string): string {
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">${body}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(doc)}`;
}

const SOLEIL = svg(
  `<circle cx="60" cy="60" r="28" fill="#F0B429"/>` +
    Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      const x1 = 60 + Math.cos(a) * 38;
      const y1 = 60 + Math.sin(a) * 38;
      const x2 = 60 + Math.cos(a) * 52;
      const y2 = 60 + Math.sin(a) * 52;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#F0B429" stroke-width="8" stroke-linecap="round"/>`;
    }).join(''),
);

const LUNE = svg(
  `<path d="M78 20 A44 44 0 1 0 78 100 A34 34 0 1 1 78 20 Z" fill="#E8E3D3"/>`,
);

const FLEUR = svg(
  `<line x1="60" y1="60" x2="60" y2="108" stroke="#5A9A4A" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M60 78 Q38 74 34 58 Q52 58 60 78 Z" fill="#5A9A4A"/>` +
    Array.from({ length: 6 }, (_, i) => {
      const a = (i * Math.PI) / 3;
      return `<ellipse cx="${(60 + Math.cos(a) * 22).toFixed(1)}" cy="${(52 + Math.sin(a) * 22).toFixed(1)}" rx="13" ry="13" fill="#E4667A"/>`;
    }).join('') +
    `<circle cx="60" cy="52" r="11" fill="#F0B429"/>`,
);

const MAISON = svg(
  `<path d="M18 58 L60 22 L102 58 Z" fill="#C0563F"/>` +
    `<rect x="30" y="56" width="60" height="48" fill="#EDE3D2"/>` +
    `<rect x="52" y="74" width="18" height="30" rx="2" fill="#7A5A3A"/>` +
    `<rect x="76" y="14" width="12" height="22" fill="#8A5B4A"/>`,
);

const CHAPEAU = svg(
  `<ellipse cx="60" cy="82" rx="48" ry="13" fill="#3D6E8C"/>` +
    `<path d="M36 82 L38 40 Q60 30 82 40 L84 82 Z" fill="#4E86A8"/>` +
    `<rect x="36" y="66" width="48" height="12" fill="#26485C"/>`,
);

const VACHE = svg(
  `<ellipse cx="60" cy="66" rx="42" ry="34" fill="#FFFFFF"/>` +
    `<ellipse cx="42" cy="56" rx="14" ry="11" fill="#2A2A2A"/>` +
    `<ellipse cx="82" cy="76" rx="11" ry="9" fill="#2A2A2A"/>` +
    `<ellipse cx="60" cy="88" rx="18" ry="13" fill="#F2A6B0"/>` +
    `<circle cx="53" cy="87" r="3" fill="#B76F7C"/><circle cx="67" cy="87" r="3" fill="#B76F7C"/>` +
    `<circle cx="46" cy="44" r="4" fill="#2A2A2A"/><circle cx="74" cy="44" r="4" fill="#2A2A2A"/>` +
    `<path d="M22 40 Q14 28 26 26" stroke="#2A2A2A" stroke-width="6" fill="none" stroke-linecap="round"/>` +
    `<path d="M98 40 Q106 28 94 26" stroke="#2A2A2A" stroke-width="6" fill="none" stroke-linecap="round"/>`,
);

const ROSE = svg(
  `<line x1="60" y1="62" x2="60" y2="108" stroke="#4E7F42" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M60 84 Q40 80 36 66 Q54 66 60 84 Z" fill="#4E7F42"/>` +
    `<circle cx="60" cy="48" r="28" fill="#D2405C"/>` +
    `<circle cx="60" cy="48" r="18" fill="#E4667A"/>` +
    `<circle cx="60" cy="48" r="9" fill="#F08496"/>`,
);

const SOURIS = svg(
  `<circle cx="34" cy="46" r="17" fill="#B9B3AC"/><circle cx="86" cy="46" r="17" fill="#B9B3AC"/>` +
    `<circle cx="34" cy="46" r="9" fill="#E3B7BC"/><circle cx="86" cy="46" r="9" fill="#E3B7BC"/>` +
    `<ellipse cx="60" cy="72" rx="34" ry="27" fill="#CFC9C2"/>` +
    `<circle cx="48" cy="68" r="4" fill="#2A2A2A"/><circle cx="72" cy="68" r="4" fill="#2A2A2A"/>` +
    `<circle cx="60" cy="82" r="5" fill="#E3849A"/>` +
    `<path d="M94 84 Q112 92 104 106" stroke="#B9B3AC" stroke-width="6" fill="none" stroke-linecap="round"/>`,
);

const JUPE = svg(
  `<path d="M42 30 L78 30 L104 100 L16 100 Z" fill="#7A5AA8"/>` +
    `<rect x="40" y="24" width="40" height="12" rx="4" fill="#5B3F86"/>`,
);

const CHAT = svg(
  `<path d="M26 46 L30 18 L52 34 Z" fill="#7E6A56"/><path d="M94 46 L90 18 L68 34 Z" fill="#7E6A56"/>` +
    `<circle cx="60" cy="62" r="36" fill="#9A8368"/>` +
    `<circle cx="47" cy="56" r="5" fill="#2A2A2A"/><circle cx="73" cy="56" r="5" fill="#2A2A2A"/>` +
    `<path d="M60 70 L67 77 L53 77 Z" fill="#E3849A"/>` +
    `<path d="M22 74 L44 78 M22 86 L44 82 M98 74 L76 78 M98 86 L76 82" stroke="#2A2A2A" stroke-width="3" stroke-linecap="round"/>`,
);

const RAT = svg(
  `<circle cx="30" cy="42" r="15" fill="#8C8C94"/><circle cx="78" cy="34" r="13" fill="#8C8C94"/>` +
    `<ellipse cx="58" cy="70" rx="36" ry="26" fill="#A0A0A8"/>` +
    `<circle cx="44" cy="66" r="4" fill="#2A2A2A"/><circle cx="68" cy="64" r="4" fill="#2A2A2A"/>` +
    `<circle cx="30" cy="76" r="5" fill="#E3849A"/>` +
    `<path d="M92 82 Q114 88 100 108" stroke="#8C8C94" stroke-width="6" fill="none" stroke-linecap="round"/>`,
);

const PRUNE = svg(
  `<circle cx="58" cy="70" r="34" fill="#6B4A8A"/>` +
    `<path d="M58 40 Q52 66 58 96" stroke="#563A70" stroke-width="4" fill="none"/>` +
    `<path d="M60 40 Q66 22 84 20" stroke="#4E7F42" stroke-width="6" fill="none" stroke-linecap="round"/>` +
    `<path d="M64 30 Q80 20 92 30 Q78 40 64 30 Z" fill="#5A9A4A"/>`,
);

const PAPILLON = svg(
  `<ellipse cx="34" cy="46" rx="24" ry="20" fill="#E4667A" transform="rotate(-18 34 46)"/>` +
    `<ellipse cx="86" cy="46" rx="24" ry="20" fill="#E4667A" transform="rotate(18 86 46)"/>` +
    `<ellipse cx="40" cy="82" rx="19" ry="16" fill="#F0B429" transform="rotate(14 40 82)"/>` +
    `<ellipse cx="80" cy="82" rx="19" ry="16" fill="#F0B429" transform="rotate(-14 80 82)"/>` +
    `<ellipse cx="60" cy="64" rx="7" ry="30" fill="#3A2A28"/>` +
    `<path d="M57 36 Q48 20 38 18 M63 36 Q72 20 82 18" stroke="#3A2A28" stroke-width="4" fill="none" stroke-linecap="round"/>`,
);

const BANANE = svg(
  `<path d="M24 34 Q30 88 92 92 Q100 92 100 84 Q46 76 40 32 Z" fill="#F0C838"/>` +
    `<path d="M24 34 Q30 88 92 92 Q100 92 100 84" fill="none" stroke="#D6A81E" stroke-width="4"/>` +
    `<rect x="20" y="24" width="16" height="14" rx="4" fill="#7A6A3A" transform="rotate(-14 28 31)"/>`,
);

const TOMATE = svg(
  `<circle cx="60" cy="68" r="36" fill="#D63B33"/>` +
    `<circle cx="46" cy="56" r="9" fill="#E8635C" opacity="0.6"/>` +
    `<path d="M60 34 L60 24" stroke="#4E7F42" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M60 36 L42 28 M60 36 L78 28 M60 36 L48 44 M60 36 L72 44" stroke="#5A9A4A" stroke-width="6" stroke-linecap="round"/>`,
);

const BATEAU = svg(
  `<path d="M16 78 L104 78 L88 102 L32 102 Z" fill="#C0563F"/>` +
    `<rect x="57" y="20" width="6" height="58" fill="#7A5A3A"/>` +
    `<path d="M63 24 L96 66 L63 66 Z" fill="#EDE3D2"/>` +
    `<path d="M57 34 L28 66 L57 66 Z" fill="#DCCFB8"/>`,
);

const CHOCOLAT = svg(
  `<rect x="16" y="34" width="88" height="60" rx="6" fill="#6B4226"/>` +
    `<rect x="16" y="34" width="88" height="10" rx="5" fill="#8A5A38"/>` +
    Array.from({ length: 6 }, (_, i) => {
      const cx = 22 + (i % 3) * 29;
      const cy = 50 + Math.floor(i / 3) * 23;
      return `<rect x="${cx}" y="${cy}" width="25" height="19" rx="3" fill="#54321D"/>`;
    }).join('') +
    `<path d="M104 34 L112 26 L112 86 L104 94 Z" fill="#C9A27A"/>`,
);

const PARAPLUIE = svg(
  `<path d="M12 62 A48 48 0 0 1 108 62 Z" fill="#D2405C"/>` +
    `<path d="M12 62 Q24 52 36 62 Q48 52 60 62 Q72 52 84 62 Q96 52 108 62" fill="none" stroke="#A32F46" stroke-width="4"/>` +
    `<line x1="60" y1="62" x2="60" y2="96" stroke="#7A5A3A" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M60 96 Q60 108 46 106" fill="none" stroke="#7A5A3A" stroke-width="6" stroke-linecap="round"/>` +
    `<line x1="60" y1="14" x2="60" y2="22" stroke="#7A5A3A" stroke-width="5" stroke-linecap="round"/>`,
);

const ELEPHANT = svg(
  `<ellipse cx="62" cy="66" rx="38" ry="32" fill="#9AA3AC"/>` +
    `<ellipse cx="30" cy="58" rx="20" ry="24" fill="#828C96"/>` +
    `<path d="M84 78 Q102 88 96 104 Q88 108 86 100 Q90 92 78 88 Z" fill="#9AA3AC"/>` +
    `<circle cx="52" cy="56" r="4" fill="#2A2A2A"/>` +
    `<rect x="44" y="94" width="14" height="14" rx="4" fill="#828C96"/>` +
    `<rect x="70" y="94" width="14" height="14" rx="4" fill="#828C96"/>`,
);

export const WORDS: WordCard[] = [
  // --- attaques continues : utilisables à tous les niveaux du Sac ---
  { id: 'soleil', label: 'soleil', syllables: 2, split: ['so', 'leil'], onset: 's', continuant: true, rime: 'eil', category: 'dehors', image: SOLEIL },
  { id: 'souris', label: 'souris', syllables: 2, split: ['sou', 'ris'], onset: 's', continuant: true, rime: 'i', category: 'animaux', image: SOURIS },
  { id: 'lune', label: 'lune', syllables: 1, split: ['lune'], onset: 'l', continuant: true, rime: 'une', category: 'dehors', image: LUNE },
  { id: 'fleur', label: 'fleur', syllables: 1, split: ['fleur'], onset: 'f', continuant: true, rime: 'eur', category: 'dehors', image: FLEUR },
  { id: 'maison', label: 'maison', syllables: 2, split: ['mai', 'son'], onset: 'm', continuant: true, rime: 'on', category: 'dehors', image: MAISON },
  { id: 'chapeau', label: 'chapeau', syllables: 2, split: ['cha', 'peau'], onset: 'ch', continuant: true, rime: 'o', category: 'habits', image: CHAPEAU },
  { id: 'chat', label: 'chat', syllables: 1, split: ['chat'], onset: 'ch', continuant: true, rime: 'a', category: 'animaux', image: CHAT },
  { id: 'chocolat', label: 'chocolat', syllables: 3, split: ['cho', 'co', 'lat'], onset: 'ch', continuant: true, rime: 'a', category: 'cuisine', image: CHOCOLAT },
  { id: 'vache', label: 'vache', syllables: 1, split: ['vache'], onset: 'v', continuant: true, rime: 'ache', category: 'animaux', image: VACHE },
  { id: 'rose', label: 'rose', syllables: 1, split: ['rose'], onset: 'r', continuant: true, rime: 'ose', category: 'dehors', image: ROSE },
  { id: 'rat', label: 'rat', syllables: 1, split: ['rat'], onset: 'r', continuant: true, rime: 'a', category: 'animaux', image: RAT },
  { id: 'jupe', label: 'jupe', syllables: 1, split: ['jupe'], onset: 'j', continuant: true, rime: 'upe', category: 'habits', image: JUPE },

  // --- attaques occlusives : niveau 4 du Sac et au-delà ---
  { id: 'papillon', label: 'papillon', syllables: 3, split: ['pa', 'pi', 'llon'], onset: 'p', continuant: false, rime: 'on', category: 'animaux', image: PAPILLON },
  { id: 'parapluie', label: 'parapluie', syllables: 3, split: ['pa', 'ra', 'pluie'], onset: 'p', continuant: false, rime: 'uie', category: 'dehors', image: PARAPLUIE },
  { id: 'prune', label: 'prune', syllables: 1, split: ['prune'], onset: 'p', continuant: false, rime: 'une', category: 'cuisine', image: PRUNE },
  { id: 'banane', label: 'banane', syllables: 2, split: ['ba', 'nane'], onset: 'b', continuant: false, rime: 'ane', category: 'cuisine', image: BANANE },
  { id: 'bateau', label: 'bateau', syllables: 2, split: ['ba', 'teau'], onset: 'b', continuant: false, rime: 'o', category: 'dehors', image: BATEAU },
  { id: 'tomate', label: 'tomate', syllables: 2, split: ['to', 'mate'], onset: 't', continuant: false, rime: 'ate', category: 'cuisine', image: TOMATE },

  // Attaque vocalique : inutilisable par Le Sac, qui travaille les consonnes,
  // mais parfaitement valable pour frapper trois syllabes.
  { id: 'elephant', label: 'éléphant', syllables: 3, split: ['é', 'lé', 'phant'], onset: 'é', continuant: true, rime: 'ant', category: 'animaux', image: ELEPHANT },
];

export function wordsWithSyllables(n: number): WordCard[] {
  return WORDS.filter((w) => w.syllables === n);
}

/**
 * Attaques consonantiques exploitables par Le Sac de Chase.
 *
 * Une attaque vocalique (« éléphant ») ne se range dans aucun sac : l'atelier
 * oppose des consonnes. Le mot reste utile au Bal, qui ne travaille que le
 * découpage en syllabes.
 */
export const CONSONANT_ONSETS = new Set(['s', 'l', 'f', 'm', 'ch', 'v', 'r', 'j', 'z', 'p', 'b', 't', 'd', 'k', 'g']);

export function withConsonantOnset(): WordCard[] {
  return WORDS.filter((w) => CONSONANT_ONSETS.has(w.onset));
}

export function continuants(): WordCard[] {
  return withConsonantOnset().filter((w) => w.continuant);
}

/** Familles de rimes comptant au moins deux mots — les seules utilisables. */
export function rhymeFamilies(): Map<string, WordCard[]> {
  const families = new Map<string, WordCard[]>();
  for (const word of WORDS) {
    const list = families.get(word.rime) ?? [];
    list.push(word);
    families.set(word.rime, list);
  }
  for (const [rime, list] of families) if (list.length < 2) families.delete(rime);
  return families;
}

export function wordById(id: string): WordCard | undefined {
  return WORDS.find((w) => w.id === id);
}
