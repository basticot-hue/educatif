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

/*
 * Les dessins.
 *
 * Ils ont d'abord été des aplats de couleur sans contour. C'était joli et
 * illisible : à trois ans et demi, un enfant lit une image par ses **bords**,
 * pas par ses masses. Deux formes de la même couleur posées l'une sur l'autre
 * fusionnent, et la vache devenait une tache blanche à points noirs.
 *
 * D'où le parti pris de l'album illustré, appliqué à tous d'un coup :
 *
 * - **un trait d'encre sur chaque forme.** Il est porté par le groupe, donc
 *   automatique : une forme qui ne veut pas de contour doit dire `stroke="none"`,
 *   et c'est réservé aux détails posés *à l'intérieur* d'une masse (un reflet,
 *   une joue), jamais à une silhouette ;
 * - **une ombre au sol.** Sans elle, l'objet flotte et l'œil ne sait pas où le
 *   poser. C'est trois lignes de code pour la moitié du gain de lisibilité ;
 * - **le détail qui nomme l'objet** : les moustaches du chat, les rayures du
 *   zèbre, la couture de la valise. Un dessin reconnaissable n'est pas un
 *   dessin fidèle, c'est un dessin qui garde le trait par lequel on le nomme.
 *
 * Cela reste un dessin, donc une convention. Le parent qui voit son enfant
 * buter sur l'un d'eux le remplace par une photo depuis la planche des mots —
 * c'est `content/wordImages.ts`, et c'est le vrai correctif.
 */

const INK = '#2A2A2A';

/**
 * Encapsule un SVG en URL de données, utilisable en `<img>` comme au canvas.
 *
 * Le corps hérite du contour d'encre et d'un remplissage vide : toute forme
 * déclare la couleur qu'elle veut, et reçoit son trait sans avoir à le redire
 * quarante-cinq fois.
 */
function svg(body: string, ground = true): string {
  const shadow = ground
    ? `<ellipse cx="60" cy="112" rx="38" ry="5" fill="#000000" opacity="0.12" stroke="none"/>`
    : '';
  const doc =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">` +
    shadow +
    `<g fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">${body}</g>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(doc)}`;
}

/** Rayon en triangle : un trait rond ne prend pas le contour, une pointe si. */
function ray(angle: number, inner: number, outer: number, spread: number): string {
  const p = (r: number, a: number) =>
    `${(60 + Math.cos(a) * r).toFixed(1)} ${(58 + Math.sin(a) * r).toFixed(1)}`;
  return `<path d="M${p(inner, angle - spread)} L${p(outer, angle)} L${p(inner, angle + spread)} Z" fill="#F0B429"/>`;
}

const SOLEIL = svg(
  Array.from({ length: 8 }, (_, i) => ray((i * Math.PI) / 4, 30, 52, 0.28)).join('') +
    `<circle cx="60" cy="58" r="30" fill="#F5C542"/>` +
    // Deux yeux et un sourire : c'est ce qui distingue un soleil d'une balle
    // jaune, et rien d'autre dans le dessin ne peut le faire.
    `<circle cx="50" cy="52" r="3.4" fill="${INK}" stroke="none"/>` +
    `<circle cx="70" cy="52" r="3.4" fill="${INK}" stroke="none"/>` +
    `<path d="M48 66 Q60 76 72 66" stroke-width="3"/>`,
  false,
);

const LUNE = svg(
  `<path d="M76 18 A44 44 0 1 0 76 102 A34 34 0 1 1 76 18 Z" fill="#EFE7CE"/>` +
    `<circle cx="52" cy="44" r="6" fill="#DCD2B4" stroke="none"/>` +
    `<circle cx="42" cy="66" r="4" fill="#DCD2B4" stroke="none"/>` +
    `<circle cx="58" cy="80" r="5" fill="#DCD2B4" stroke="none"/>`,
  false,
);

const FLEUR = svg(
  `<path d="M60 62 L60 106" stroke="#4E7F42" stroke-width="6"/>` +
    `<path d="M60 84 Q38 80 32 62 Q52 60 60 84 Z" fill="#5A9A4A"/>` +
    Array.from({ length: 6 }, (_, i) => {
      const a = (i * Math.PI) / 3;
      return `<ellipse cx="${(60 + Math.cos(a) * 21).toFixed(1)}" cy="${(48 + Math.sin(a) * 21).toFixed(1)}" rx="13" ry="13" fill="#E4667A"/>`;
    }).join('') +
    `<circle cx="60" cy="48" r="12" fill="#F0B429"/>`,
);

const MAISON = svg(
  `<rect x="30" y="54" width="60" height="52" fill="#F2E7D3"/>` +
    `<path d="M16 56 L60 20 L104 56 Z" fill="#C0563F"/>` +
    `<rect x="76" y="16" width="12" height="20" fill="#8A5B4A"/>` +
    `<rect x="52" y="74" width="20" height="32" rx="2" fill="#8A5B4A"/>` +
    `<circle cx="68" cy="90" r="2" fill="#F0B429" stroke="none"/>` +
    `<rect x="36" y="64" width="14" height="14" fill="#8FD0E8"/>` +
    `<path d="M43 64 L43 78 M36 71 L50 71" stroke-width="2"/>`,
);

const CHAPEAU = svg(
  `<path d="M36 82 L38 42 Q60 32 82 42 L84 82 Z" fill="#4E86A8"/>` +
    `<ellipse cx="60" cy="84" rx="46" ry="12" fill="#3D6E8C"/>` +
    `<path d="M37 68 L83 68 L84 78 L36 78 Z" fill="#26485C"/>`,
);

const VACHE = svg(
  `<path d="M20 40 Q10 26 26 24 Q32 32 30 42 Z" fill="#C9C2B8"/>` +
    `<path d="M100 40 Q110 26 94 24 Q88 32 90 42 Z" fill="#C9C2B8"/>` +
    `<ellipse cx="60" cy="64" rx="42" ry="35" fill="#FFFFFF"/>` +
    `<ellipse cx="40" cy="52" rx="14" ry="11" fill="${INK}" stroke="none"/>` +
    `<ellipse cx="84" cy="72" rx="11" ry="9" fill="${INK}" stroke="none"/>` +
    `<circle cx="46" cy="44" r="4.5" fill="${INK}" stroke="none"/>` +
    `<circle cx="74" cy="44" r="4.5" fill="${INK}" stroke="none"/>` +
    `<ellipse cx="60" cy="84" rx="19" ry="14" fill="#F2A6B0"/>` +
    `<ellipse cx="53" cy="83" rx="3" ry="4" fill="#B76F7C" stroke="none"/>` +
    `<ellipse cx="67" cy="83" rx="3" ry="4" fill="#B76F7C" stroke="none"/>`,
);

const ROSE = svg(
  `<path d="M60 62 L60 106" stroke="#4E7F42" stroke-width="6"/>` +
    `<path d="M60 86 Q40 82 34 68 Q54 66 60 86 Z" fill="#4E7F42"/>` +
    `<circle cx="60" cy="48" r="30" fill="#D2405C"/>` +
    // La spirale est ce qui fait la rose : sans elle, c'est un rond rouge.
    `<path d="M60 30 A18 18 0 1 1 44 52 A13 13 0 1 0 68 58 A8 8 0 1 1 56 48" stroke="#A32F46" stroke-width="3"/>` +
    `<path d="M36 44 L28 34 M84 44 L92 34" stroke="#D2405C" stroke-width="5"/>`,
);

const SOURIS = svg(
  `<circle cx="34" cy="44" r="18" fill="#C6C0B8"/><circle cx="86" cy="44" r="18" fill="#C6C0B8"/>` +
    `<circle cx="34" cy="44" r="10" fill="#E3B7BC" stroke="none"/>` +
    `<circle cx="86" cy="44" r="10" fill="#E3B7BC" stroke="none"/>` +
    `<path d="M94 84 Q114 92 104 108" stroke="#B9B3AC" stroke-width="5"/>` +
    `<ellipse cx="60" cy="72" rx="34" ry="28" fill="#D6D0C8"/>` +
    `<circle cx="49" cy="68" r="4" fill="${INK}" stroke="none"/>` +
    `<circle cx="71" cy="68" r="4" fill="${INK}" stroke="none"/>` +
    `<circle cx="60" cy="82" r="5.5" fill="#E3849A"/>` +
    `<path d="M56 86 L34 92 M56 88 L36 100 M64 86 L86 92 M64 88 L84 100" stroke-width="2"/>`,
);

const JUPE = svg(
  `<path d="M42 34 L78 34 Q92 70 104 100 Q60 110 16 100 Q28 70 42 34 Z" fill="#7A5AA8"/>` +
    // Les plis : sans eux, c'est un trapèze violet.
    `<path d="M50 40 Q46 72 40 102 M62 40 Q62 72 62 104 M74 40 Q78 72 84 102" stroke="#5B3F86" stroke-width="2.4"/>` +
    `<rect x="40" y="24" width="40" height="14" rx="5" fill="#5B3F86"/>`,
);

const CHAT = svg(
  `<path d="M26 48 L28 16 L54 34 Z" fill="#9A8368"/><path d="M94 48 L92 16 L66 34 Z" fill="#9A8368"/>` +
    `<path d="M32 42 L33 24 L48 35 Z" fill="#E3B7BC" stroke="none"/>` +
    `<path d="M88 42 L87 24 L72 35 Z" fill="#E3B7BC" stroke="none"/>` +
    `<circle cx="60" cy="64" r="37" fill="#A88E70"/>` +
    `<ellipse cx="47" cy="58" rx="5" ry="6" fill="#3A5A2E"/>` +
    `<ellipse cx="73" cy="58" rx="5" ry="6" fill="#3A5A2E"/>` +
    `<path d="M47 56 L47 60 M73 56 L73 60" stroke-width="2.4"/>` +
    `<path d="M60 72 L67 78 L53 78 Z" fill="#E3849A"/>` +
    `<path d="M60 78 Q54 86 48 80 M60 78 Q66 86 72 80" stroke-width="2.4"/>` +
    `<path d="M18 70 L42 76 M18 84 L42 80 M102 70 L78 76 M102 84 L78 80" stroke-width="2.2"/>`,
);

const RAT = svg(
  `<path d="M92 84 Q116 88 100 110" stroke="#8C8C94" stroke-width="5"/>` +
    `<circle cx="30" cy="40" r="15" fill="#9A9AA2"/><circle cx="76" cy="32" r="14" fill="#9A9AA2"/>` +
    `<ellipse cx="58" cy="70" rx="38" ry="27" fill="#ACACB4"/>` +
    `<circle cx="42" cy="64" r="4" fill="${INK}" stroke="none"/>` +
    `<circle cx="66" cy="62" r="4" fill="${INK}" stroke="none"/>` +
    `<circle cx="24" cy="74" r="5" fill="#E3849A"/>` +
    `<path d="M28 78 L14 88 M30 80 L18 94 M32 74 L16 78" stroke-width="2"/>`,
);

const PRUNE = svg(
  `<circle cx="58" cy="70" r="35" fill="#7A55A0"/>` +
    `<path d="M58 38 Q50 70 58 102" stroke="#5B3F86" stroke-width="3"/>` +
    `<ellipse cx="44" cy="56" rx="8" ry="11" fill="#9C7ABF" stroke="none" transform="rotate(-25 44 56)"/>` +
    `<path d="M60 38 Q66 22 84 20" stroke="#6B4226" stroke-width="4.5"/>` +
    `<path d="M64 28 Q82 18 94 30 Q76 40 64 28 Z" fill="#5A9A4A"/>`,
);

const PAPILLON = svg(
  `<ellipse cx="32" cy="44" rx="25" ry="21" fill="#E4667A" transform="rotate(-18 32 44)"/>` +
    `<ellipse cx="88" cy="44" rx="25" ry="21" fill="#E4667A" transform="rotate(18 88 44)"/>` +
    `<ellipse cx="38" cy="82" rx="20" ry="17" fill="#F0B429" transform="rotate(14 38 82)"/>` +
    `<ellipse cx="82" cy="82" rx="20" ry="17" fill="#F0B429" transform="rotate(-14 82 82)"/>` +
    `<circle cx="32" cy="44" r="7" fill="#FFFFFF" stroke="none"/>` +
    `<circle cx="88" cy="44" r="7" fill="#FFFFFF" stroke="none"/>` +
    `<ellipse cx="60" cy="62" rx="8" ry="31" fill="#4A3A38"/>` +
    `<path d="M56 34 Q46 18 36 16 M64 34 Q74 18 84 16" stroke-width="3"/>` +
    `<circle cx="36" cy="16" r="3.5" fill="#4A3A38"/><circle cx="84" cy="16" r="3.5" fill="#4A3A38"/>`,
  false,
);

const BANANE = svg(
  // Deux arcs qui se referment : c'est la seule façon d'obtenir un croissant
  // qui se lit comme une banane et non comme un boomerang.
  `<path d="M22 30 Q26 84 78 96 Q100 100 104 84 Q56 82 38 28 Z" fill="#F5CE3E"/>` +
    `<path d="M28 34 Q34 78 78 88" stroke="#D6A81E" stroke-width="2.4"/>` +
    `<path d="M20 22 L38 26 L36 34 L18 30 Z" fill="#6B5A32"/>` +
    `<path d="M100 86 L108 82" stroke-width="3"/>`,
);

const TOMATE = svg(
  `<circle cx="60" cy="70" r="36" fill="#D63B33"/>` +
    `<ellipse cx="45" cy="56" rx="9" ry="12" fill="#E8635C" stroke="none" transform="rotate(-25 45 56)"/>` +
    `<path d="M60 36 L60 22" stroke="#4E7F42" stroke-width="5"/>` +
    `<path d="M60 38 L40 26 M60 38 L80 26 M60 40 L44 48 M60 40 L76 48" stroke="#5A9A4A" stroke-width="6"/>`,
);

const BATEAU = svg(
  `<path d="M60 20 L60 78" stroke="#7A5A3A" stroke-width="5"/>` +
    `<path d="M64 24 L98 68 L64 68 Z" fill="#FFFFFF"/>` +
    `<path d="M56 34 L26 68 L56 68 Z" fill="#E4E9EE"/>` +
    `<path d="M14 76 L106 76 L88 102 L32 102 Z" fill="#C0563F"/>` +
    `<path d="M18 84 L102 84" stroke-width="2.4"/>` +
    `<path d="M6 108 Q18 100 30 108 Q42 116 54 108 Q66 100 78 108 Q90 116 102 108" stroke="#5B8FB9" stroke-width="3"/>`,
  false,
);

const CHOCOLAT = svg(
  `<path d="M100 30 L112 22 L112 82 L100 90 Z" fill="#C9A27A"/>` +
    `<rect x="16" y="30" width="84" height="60" rx="4" fill="#6B4226"/>` +
    Array.from({ length: 6 }, (_, i) => {
      const x = 22 + (i % 3) * 27;
      const y = 38 + Math.floor(i / 3) * 24;
      return `<rect x="${x}" y="${y}" width="23" height="18" rx="3" fill="#54321D"/>`;
    }).join('') +
    `<path d="M16 30 L100 30 L112 22" stroke-width="2.4"/>`,
);

const PARAPLUIE = svg(
  `<path d="M60 96 Q60 108 46 106" stroke="#7A5A3A" stroke-width="5"/>` +
    `<path d="M60 60 L60 98" stroke="#7A5A3A" stroke-width="5"/>` +
    `<path d="M10 62 A50 50 0 0 1 110 62 Z" fill="#D2405C"/>` +
    `<path d="M10 62 Q22 50 34 62 Q46 50 60 62 Q74 50 86 62 Q98 50 110 62" stroke-width="2.6"/>` +
    `<path d="M60 12 L60 20" stroke-width="3"/>`,
  false,
);

const ELEPHANT = svg(
  /*
   * La trompe part de la tête, et la tête est à gauche.
   *
   * Le dessin précédent avait l'oreille d'un côté et la trompe de l'autre : il
   * ne représentait aucun animal. La trompe est le trait par lequel on nomme
   * l'éléphant — mal placée, elle empêche de le reconnaître au lieu d'y aider.
   */
  `<rect x="44" y="82" width="17" height="26" rx="7" fill="#8C97A2"/>` +
    `<rect x="72" y="82" width="17" height="26" rx="7" fill="#8C97A2"/>` +
    `<ellipse cx="68" cy="60" rx="36" ry="29" fill="#9AA3AC"/>` +
    `<path d="M100 52 Q114 56 108 70" stroke-width="4"/>` +
    `<circle cx="36" cy="52" r="27" fill="#A3ACB5"/>` +
    `<ellipse cx="52" cy="46" rx="17" ry="21" fill="#8C97A2"/>` +
    `<path d="M16 62 Q4 86 14 102 Q24 110 30 100" stroke="${INK}" stroke-width="17"/>` +
    `<path d="M16 62 Q4 86 14 102 Q24 110 30 100" stroke="#A3ACB5" stroke-width="12"/>` +
    `<circle cx="30" cy="44" r="3.8" fill="${INK}" stroke="none"/>` +
    `<path d="M26 74 Q20 84 24 90" stroke="#FFFFFF" stroke-width="5"/>`,
);

/* --- sons continus : c'est sur eux que repose tout le travail des niveaux bas --- */

const SERPENT = svg(
  `<path d="M12 92 Q40 92 40 72 Q40 52 66 52 Q92 52 92 36" stroke="${INK}" stroke-width="20"/>` +
    `<path d="M12 92 Q40 92 40 72 Q40 52 66 52 Q92 52 92 36" stroke="#5A9A4A" stroke-width="15"/>` +
    `<circle cx="94" cy="30" r="13" fill="#6BAF58"/>` +
    `<circle cx="98" cy="26" r="3" fill="${INK}" stroke="none"/>` +
    `<path d="M104 34 L116 38 M104 34 L114 46" stroke="#D2405C" stroke-width="3"/>` +
    `<circle cx="52" cy="62" r="4" fill="#4A7F3A" stroke="none"/>` +
    `<circle cx="30" cy="86" r="4" fill="#4A7F3A" stroke="none"/>`,
  false,
);

const MOTO = svg(
  `<circle cx="28" cy="80" r="21" fill="#3A3A42"/><circle cx="28" cy="80" r="8" fill="#B9C2CC"/>` +
    `<circle cx="92" cy="80" r="21" fill="#3A3A42"/><circle cx="92" cy="80" r="8" fill="#B9C2CC"/>` +
    `<path d="M28 80 L54 54 L84 54 L92 80" stroke="#D2405C" stroke-width="8"/>` +
    `<path d="M46 56 L74 48 L82 58 L44 62 Z" fill="#D2405C"/>` +
    `<path d="M84 54 L100 42" stroke-width="5"/>` +
    `<circle cx="102" cy="40" r="4" fill="${INK}" stroke="none"/>`,
  false,
);

const MAIN = svg(
  // Une paume et quatre doigts d'un seul tenant : les doigts séparés se
  // lisaient comme un peigne.
  `<path d="M40 66 Q38 46 44 46 Q50 46 51 62 L52 30 Q52 22 58 22 Q64 22 64 30 L65 58 L66 26 Q66 18 72 18 Q78 18 78 26 L79 60 L81 36 Q81 28 87 28 Q93 28 93 36 L92 76 Q92 104 68 104 L58 104 Q44 104 40 88 L26 66 Q22 58 28 55 Q34 52 38 60 Z" fill="#F0C8A0"/>` +
    `<path d="M52 62 L52 78 M65 58 L65 78 M79 60 L79 78" stroke="#D8A87E" stroke-width="2.2"/>`,
);

const FRAISE = svg(
  `<path d="M60 32 Q94 34 92 64 Q90 100 60 108 Q30 100 28 64 Q26 34 60 32 Z" fill="#D2405C"/>` +
    `<path d="M38 26 Q60 14 82 26 Q68 38 60 34 Q52 38 38 26 Z" fill="#5A9A4A"/>` +
    `<path d="M60 22 L60 32" stroke="#4E7F42" stroke-width="4"/>` +
    [
      [48, 54], [70, 50], [60, 70], [42, 76], [76, 74], [58, 92], [72, 92], [44, 92],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#FFE08A" stroke="none"/>`)
      .join(''),
);

const FOURMI = svg(
  `<path d="M50 74 L44 96 M62 74 L68 96 M84 76 L78 98 M96 76 L104 96" stroke="#5A3A20" stroke-width="3.4"/>` +
    `<ellipse cx="90" cy="62" rx="22" ry="17" fill="#7A4A2A"/>` +
    `<circle cx="60" cy="62" r="13" fill="#7A4A2A"/>` +
    `<circle cx="30" cy="58" r="15" fill="#8A5A38"/>` +
    `<circle cx="24" cy="54" r="3.2" fill="#FFFFFF" stroke="none"/>` +
    `<path d="M22 46 L12 30 M34 44 L42 28" stroke-width="3"/>` +
    `<circle cx="12" cy="30" r="3" fill="#7A4A2A"/><circle cx="42" cy="28" r="3" fill="#7A4A2A"/>`,
);

const LIT = svg(
  `<rect x="8" y="46" width="12" height="52" rx="4" fill="#8A5B4A"/>` +
    `<rect x="100" y="56" width="12" height="42" rx="4" fill="#8A5B4A"/>` +
    `<rect x="14" y="66" width="92" height="30" rx="5" fill="#B9825F"/>` +
    `<path d="M18 60 L102 60 L102 76 L18 76 Z" fill="#EDE3D2"/>` +
    `<path d="M50 60 L102 60 L102 76 L50 76 Z" fill="#8FB6D8"/>` +
    `<rect x="22" y="48" width="30" height="16" rx="8" fill="#FFFFFF"/>`,
);

const LAPIN = svg(
  `<ellipse cx="46" cy="26" rx="9" ry="22" fill="#F5EDE0" transform="rotate(-8 46 26)"/>` +
    `<ellipse cx="74" cy="26" rx="9" ry="22" fill="#F5EDE0" transform="rotate(8 74 26)"/>` +
    `<ellipse cx="46" cy="28" rx="4" ry="14" fill="#F2A6B0" stroke="none" transform="rotate(-8 46 28)"/>` +
    `<ellipse cx="74" cy="28" rx="4" ry="14" fill="#F2A6B0" stroke="none" transform="rotate(8 74 28)"/>` +
    `<ellipse cx="60" cy="84" rx="31" ry="24" fill="#F5EDE0"/>` +
    `<circle cx="60" cy="58" r="21" fill="#F5EDE0"/>` +
    `<circle cx="52" cy="54" r="3.6" fill="${INK}" stroke="none"/>` +
    `<circle cx="68" cy="54" r="3.6" fill="${INK}" stroke="none"/>` +
    `<path d="M60 62 L56 66 L64 66 Z" fill="#F2A6B0"/>` +
    `<path d="M60 66 L60 70 M60 70 Q54 74 50 70 M60 70 Q66 74 70 70" stroke-width="2.2"/>` +
    `<circle cx="92" cy="94" r="9" fill="#FFFFFF"/>`,
);

const VELO = svg(
  `<circle cx="28" cy="76" r="23" fill="#FFFFFF" stroke="${INK}" stroke-width="4"/>` +
    `<circle cx="92" cy="76" r="23" fill="#FFFFFF" stroke="${INK}" stroke-width="4"/>` +
    `<circle cx="28" cy="76" r="4" fill="${INK}" stroke="none"/>` +
    `<circle cx="92" cy="76" r="4" fill="${INK}" stroke="none"/>` +
    `<path d="M28 76 L54 42 L74 76 L28 76 M54 42 L84 42 M92 76 L78 42" stroke="#3D6E8C" stroke-width="5"/>` +
    `<path d="M46 34 L64 34" stroke-width="5"/>` +
    `<path d="M78 36 L90 36" stroke-width="5"/>` +
    `<circle cx="60" cy="76" r="7" fill="#B9C2CC"/>`,
  false,
);

const VALISE = svg(
  `<path d="M46 44 L46 30 Q46 22 54 22 L66 22 Q74 22 74 30 L74 44" stroke-width="5"/>` +
    `<rect x="16" y="42" width="88" height="60" rx="8" fill="#8A5B4A"/>` +
    `<rect x="16" y="62" width="88" height="12" fill="#6B4226"/>` +
    `<rect x="52" y="60" width="16" height="16" rx="3" fill="#E4B429"/>` +
    `<path d="M28 42 L28 102 M92 42 L92 102" stroke="#6B4226" stroke-width="2.4"/>`,
);

const GIRAFE = svg(
  `<path d="M50 12 L48 2 M74 12 L76 2" stroke="#7A4A2A" stroke-width="3.4"/>` +
    `<circle cx="48" cy="4" r="4" fill="#7A4A2A"/><circle cx="76" cy="4" r="4" fill="#7A4A2A"/>` +
    `<rect x="52" y="28" width="20" height="54" fill="#F0C838"/>` +
    `<ellipse cx="60" cy="94" rx="28" ry="18" fill="#F0C838"/>` +
    `<ellipse cx="62" cy="22" rx="18" ry="13" fill="#F5D75E"/>` +
    `<circle cx="55" cy="17" r="3.2" fill="${INK}" stroke="none"/>` +
    `<circle cx="70" cy="26" r="2" fill="${INK}" stroke="none"/>` +
    [
      [58, 42], [66, 56], [56, 70], [46, 92], [74, 96], [62, 100],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="#B07A20" stroke="none"/>`)
      .join(''),
);

const ZEBRE = svg(
  /*
   * Un cheval de profil entier — quatre pattes, une encolure, une tête.
   *
   * Le dessin précédent n'était qu'un tronc rayé surmonté d'un cou en bâton :
   * il se lisait comme un tonneau, ou comme un code-barres. Les rayures ne
   * font pas le zèbre ; c'est la silhouette du cheval qui le fait, et les
   * rayures qui disent lequel.
   */
  `<rect x="24" y="68" width="11" height="38" rx="5" fill="#FFFFFF"/>` +
    `<rect x="42" y="70" width="11" height="36" rx="5" fill="#FFFFFF"/>` +
    `<rect x="60" y="70" width="11" height="36" rx="5" fill="#FFFFFF"/>` +
    `<rect x="76" y="68" width="11" height="38" rx="5" fill="#FFFFFF"/>` +
    `<path d="M18 56 Q4 62 10 80" stroke-width="4"/>` +
    `<ellipse cx="54" cy="62" rx="36" ry="22" fill="#FFFFFF"/>` +
    `<defs><clipPath id="z"><ellipse cx="54" cy="62" rx="36" ry="22"/></clipPath></defs>` +
    `<g clip-path="url(#z)" stroke="${INK}" stroke-width="8" stroke-linecap="butt">` +
    `<path d="M32 34 L30 92 M48 32 L48 94 M64 32 L66 94 M78 36 L82 90"/></g>` +
    `<path d="M68 56 L78 20 L100 26 L90 64 Z" fill="#FFFFFF"/>` +
    `<path d="M78 22 L82 10 L88 20 L94 12 L100 26 Z" fill="${INK}"/>` +
    `<ellipse cx="100" cy="24" rx="17" ry="12" fill="#FFFFFF" transform="rotate(-16 100 24)"/>` +
    `<path d="M90 14 L92 2 L100 12 Z" fill="#FFFFFF"/>` +
    `<circle cx="99" cy="20" r="2.8" fill="${INK}" stroke="none"/>` +
    `<ellipse cx="114" cy="22" rx="4" ry="3" fill="#8C8C94" stroke="none"/>`,
);

const ZOO = svg(
  // Un lion derrière des barreaux : « zoo » n'a pas de forme propre, il faut
  // donc un animal reconnaissable *et* la cage qui dit que ce n'est pas la savane.
  `<rect x="12" y="20" width="96" height="82" rx="8" fill="#7CA8C8"/>` +
    `<circle cx="60" cy="66" r="26" fill="#C87A18"/>` +
    `<circle cx="60" cy="66" r="18" fill="#E8A54A"/>` +
    `<circle cx="47" cy="50" r="8" fill="#C87A18"/><circle cx="73" cy="50" r="8" fill="#C87A18"/>` +
    `<circle cx="54" cy="62" r="2.8" fill="${INK}" stroke="none"/>` +
    `<circle cx="66" cy="62" r="2.8" fill="${INK}" stroke="none"/>` +
    `<path d="M60 70 L56 74 L64 74 Z" fill="${INK}" stroke="none"/>` +
    `<path d="M60 74 Q54 80 50 74 M60 74 Q66 80 70 74" stroke-width="2"/>` +
    `<path d="M30 22 L30 100 M48 22 L48 100 M72 22 L72 100 M90 22 L90 100" stroke="#5B5248" stroke-width="6"/>` +
    `<rect x="10" y="16" width="100" height="10" rx="4" fill="#8A6E33"/>` +
    `<rect x="10" y="96" width="100" height="10" rx="4" fill="#8A6E33"/>`,
  false,
);

const NID = svg(
  `<ellipse cx="44" cy="68" rx="14" ry="12" fill="#F5EEE0"/>` +
    `<ellipse cx="72" cy="66" rx="14" ry="12" fill="#F5EEE0"/>` +
    `<ellipse cx="58" cy="76" rx="14" ry="12" fill="#FFFFFF"/>` +
    `<path d="M14 72 Q60 56 106 72 Q102 104 60 104 Q18 104 14 72 Z" fill="#9A7A3A"/>` +
    `<path d="M20 78 Q60 68 100 78 M24 88 Q60 80 96 88" stroke="#6B5222" stroke-width="2.4"/>` +
    `<path d="M8 74 Q30 66 40 70 M112 74 Q90 64 78 68" stroke="#8A6E33" stroke-width="3"/>`,
);

const NUAGE = svg(
  // Un seul contour fermé : trois cercles qui se chevauchent laissaient des
  // traits d'encre *à l'intérieur* du nuage, et le faisaient lire comme un tas
  // de boules.
  `<path d="M28 88 Q10 88 10 72 Q10 58 26 56 Q28 34 52 30 Q76 26 84 46 Q104 44 108 62 Q112 88 92 88 Z" fill="#FFFFFF"/>` +
    `<path d="M30 76 Q46 70 64 76" stroke="#D8E2EA" stroke-width="3"/>`,
  false,
);

/* --- sons qui claquent : niveaux hauts uniquement --- */

const DE = svg(
  `<rect x="20" y="20" width="80" height="80" rx="14" fill="#FFFFFF"/>` +
    `<circle cx="42" cy="42" r="8" fill="#12212E" stroke="none"/>` +
    `<circle cx="78" cy="42" r="8" fill="#12212E" stroke="none"/>` +
    `<circle cx="60" cy="60" r="8" fill="#12212E" stroke="none"/>` +
    `<circle cx="42" cy="78" r="8" fill="#12212E" stroke="none"/>` +
    `<circle cx="78" cy="78" r="8" fill="#12212E" stroke="none"/>`,
);

const DAUPHIN = svg(
  `<path d="M10 72 Q38 42 76 46 Q98 48 110 34 Q106 64 84 74 Q54 92 10 72 Z" fill="#5B8FB9"/>` +
    `<path d="M54 48 Q58 24 72 22 Q68 40 62 48 Z" fill="#4A7A9E"/>` +
    `<path d="M28 76 Q42 92 60 84" stroke="#4A7A9E" stroke-width="4"/>` +
    `<path d="M40 66 Q64 72 88 62" stroke="#CFE3F0" stroke-width="7"/>` +
    `<circle cx="95" cy="48" r="3.4" fill="${INK}" stroke="none"/>` +
    `<path d="M100 56 Q94 60 88 58" stroke-width="2.4"/>`,
  false,
);

const CABANE = svg(
  // Rondins et arbre : sans eux, c'était la maison en plus petit.
  `<path d="M96 46 L110 30 L104 74 Z" fill="#4E7F42"/>` +
    `<rect x="28" y="54" width="64" height="48" fill="#C09A6B"/>` +
    `<path d="M28 66 L92 66 M28 78 L92 78 M28 90 L92 90" stroke="#9A7A50" stroke-width="2.4"/>` +
    `<path d="M14 56 L60 20 L106 56 Z" fill="#7A5A3A"/>` +
    `<rect x="50" y="72" width="22" height="30" rx="2" fill="#6B4226"/>` +
    `<rect x="34" y="60" width="14" height="14" fill="#8FD0E8"/>` +
    `<path d="M41 60 L41 74 M34 67 L48 67" stroke-width="2"/>`,
);

const CANARD = svg(
  `<ellipse cx="52" cy="76" rx="36" ry="25" fill="#F5CE3E"/>` +
    `<path d="M52 52 Q66 40 80 52 Q66 62 52 52 Z" fill="#E0B420"/>` +
    `<circle cx="84" cy="46" r="19" fill="#F5CE3E"/>` +
    `<path d="M100 40 Q118 44 100 54 Z" fill="#E07A28"/>` +
    `<circle cx="88" cy="40" r="3.4" fill="${INK}" stroke="none"/>` +
    `<path d="M16 78 Q4 74 10 88" fill="#F5CE3E"/>` +
    `<path d="M46 100 L40 108 M62 100 L66 108" stroke="#E07A28" stroke-width="3.4"/>`,
);

const GATEAU = svg(
  `<path d="M60 32 Q52 22 60 10 Q68 22 60 32 Z" fill="#F0B429"/>` +
    `<rect x="55" y="30" width="9" height="26" rx="3" fill="#FFFFFF"/>` +
    `<rect x="20" y="56" width="80" height="46" rx="6" fill="#D8B383"/>` +
    `<path d="M20 62 Q34 76 46 62 Q58 76 72 62 Q84 76 98 62 L100 62 L100 54 L20 54 Z" fill="#E4667A"/>` +
    `<path d="M20 82 L100 82" stroke="#C09A6B" stroke-width="2.4"/>` +
    `<circle cx="36" cy="92" r="4" fill="#FFFFFF" stroke="none"/>` +
    `<circle cx="60" cy="94" r="4" fill="#FFFFFF" stroke="none"/>` +
    `<circle cx="84" cy="92" r="4" fill="#FFFFFF" stroke="none"/>`,
);

const GORILLE = svg(
  `<circle cx="22" cy="58" r="13" fill="#4A4A52"/><circle cx="98" cy="58" r="13" fill="#4A4A52"/>` +
    // Une crête, pas une calotte : détachée de la tête, elle se lisait comme un
    // chapeau melon posé sur un singe.
    `<ellipse cx="60" cy="70" rx="39" ry="35" fill="#4A4A52"/>` +
    `<path d="M40 44 Q60 26 80 44 Q60 34 40 44 Z" fill="#3A3A42" stroke="none"/>` +
    `<ellipse cx="60" cy="76" rx="25" ry="23" fill="#8A786E"/>` +
    `<ellipse cx="50" cy="64" rx="5" ry="4" fill="#FFFFFF"/>` +
    `<ellipse cx="70" cy="64" rx="5" ry="4" fill="#FFFFFF"/>` +
    `<circle cx="50" cy="64" r="2.6" fill="${INK}" stroke="none"/>` +
    `<circle cx="70" cy="64" r="2.6" fill="${INK}" stroke="none"/>` +
    `<ellipse cx="60" cy="80" rx="11" ry="8" fill="#6B5C54"/>` +
    `<circle cx="56" cy="79" r="2.2" fill="${INK}" stroke="none"/>` +
    `<circle cx="64" cy="79" r="2.2" fill="${INK}" stroke="none"/>` +
    `<path d="M50 90 Q60 96 70 90" stroke-width="2.4"/>`,
);

const TORTUE = svg(
  `<circle cx="104" cy="70" r="12" fill="#8FBF6A"/>` +
    `<circle cx="108" cy="66" r="2.8" fill="${INK}" stroke="none"/>` +
    `<path d="M20 76 Q60 32 100 76 Z" fill="#5A9A4A"/>` +
    `<path d="M42 60 L44 76 M60 50 L60 76 M78 60 L76 76" stroke="#3A6B2E" stroke-width="2.6"/>` +
    `<path d="M32 66 Q60 60 88 66" stroke="#3A6B2E" stroke-width="2.6"/>` +
    `<ellipse cx="60" cy="80" rx="41" ry="11" fill="#4A7F3A"/>` +
    `<rect x="30" y="86" width="16" height="12" rx="5" fill="#8FBF6A"/>` +
    `<rect x="74" y="86" width="16" height="12" rx="5" fill="#8FBF6A"/>` +
    `<path d="M18 82 Q6 84 12 92" fill="#8FBF6A"/>`,
);

const TABLE = svg(
  `<rect x="10" y="42" width="100" height="14" rx="5" fill="#C09A6B"/>` +
    `<rect x="20" y="54" width="11" height="50" rx="4" fill="#8A5B4A"/>` +
    `<rect x="89" y="54" width="11" height="50" rx="4" fill="#8A5B4A"/>` +
    `<path d="M31 62 L89 62" stroke="#8A5B4A" stroke-width="5"/>` +
    // Une assiette : une table nue se lit comme une planche.
    `<ellipse cx="60" cy="40" rx="20" ry="7" fill="#FFFFFF"/>` +
    `<ellipse cx="60" cy="39" rx="11" ry="4" fill="#EDE3D2"/>`,
);

/**
 * Ballon de football : un pentagone au centre, cinq coutures qui en partent, et
 * cinq pentagones coupés par le bord.
 *
 * Écrit en calcul plutôt qu'à la main : posés à l'œil, les traits ne
 * retombaient pas sur les sommets et le ballon se lisait comme une boule
 * fêlée.
 */
const BALLON = (() => {
  const cx = 60;
  const cy = 62;
  const radius = 39;
  const point = (r: number, a: number) =>
    `${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`;
  const pentagon = (r: number, a: number, size: number) =>
    `M` +
    Array.from({ length: 5 }, (_, i) => {
      const angle = a + (i * 2 * Math.PI) / 5;
      return `${(cx + Math.cos(a) * r + Math.cos(angle) * size).toFixed(1)} ${(
        cy +
        Math.sin(a) * r +
        Math.sin(angle) * size
      ).toFixed(1)}`;
    }).join(' L') +
    ' Z';

  const top = -Math.PI / 2;
  const seams = Array.from(
    { length: 5 },
    (_, i) => `<path d="M${point(16, top + (i * 2 * Math.PI) / 5)} L${point(radius, top + (i * 2 * Math.PI) / 5)}" stroke-width="3"/>`,
  ).join('');
  const rim = Array.from(
    { length: 5 },
    (_, i) =>
      `<path d="${pentagon(radius + 8, top + ((i + 0.5) * 2 * Math.PI) / 5, 15)}" fill="${INK}" stroke="none"/>`,
  ).join('');

  return svg(
    `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="#FFFFFF"/>` +
      `<defs><clipPath id="b"><circle cx="${cx}" cy="${cy}" r="${radius}"/></clipPath></defs>` +
      `<g clip-path="url(#b)">${rim}${seams}</g>` +
      `<path d="${pentagon(0, top, 17)}" fill="${INK}" stroke="none"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${INK}" stroke-width="3"/>`,
  );
})();

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
  { id: 'serpent', label: 'serpent', syllables: 2, split: ['ser', 'pent'], onset: 's', continuant: true, rime: 'an', category: 'animaux', image: SERPENT },
  { id: 'moto', label: 'moto', syllables: 2, split: ['mo', 'to'], onset: 'm', continuant: true, rime: 'o', category: 'jouets', image: MOTO },
  { id: 'main', label: 'main', syllables: 1, split: ['main'], onset: 'm', continuant: true, rime: 'in', category: 'corps', image: MAIN },
  { id: 'fraise', label: 'fraise', syllables: 1, split: ['fraise'], onset: 'f', continuant: true, rime: 'aise', category: 'cuisine', image: FRAISE },
  { id: 'fourmi', label: 'fourmi', syllables: 2, split: ['four', 'mi'], onset: 'f', continuant: true, rime: 'i', category: 'animaux', image: FOURMI },
  { id: 'lit', label: 'lit', syllables: 1, split: ['lit'], onset: 'l', continuant: true, rime: 'i', category: 'chambre', image: LIT },
  { id: 'lapin', label: 'lapin', syllables: 2, split: ['la', 'pin'], onset: 'l', continuant: true, rime: 'in', category: 'animaux', image: LAPIN },
  { id: 'velo', label: 'vélo', syllables: 2, split: ['vé', 'lo'], onset: 'v', continuant: true, rime: 'o', category: 'dehors', image: VELO },
  { id: 'valise', label: 'valise', syllables: 2, split: ['va', 'lise'], onset: 'v', continuant: true, rime: 'ise', category: 'chambre', image: VALISE },
  // « girafe » commence par le même son que « jupe » : c'est le son qui compte,
  // pas la lettre. C'est exactement ce que l'enfant doit apprendre à entendre.
  { id: 'girafe', label: 'girafe', syllables: 2, split: ['gi', 'rafe'], onset: 'j', continuant: true, rime: 'afe', category: 'animaux', image: GIRAFE },
  { id: 'zebre', label: 'zèbre', syllables: 2, split: ['zè', 'bre'], onset: 'z', continuant: true, rime: 'ebre', category: 'animaux', image: ZEBRE },
  { id: 'zoo', label: 'zoo', syllables: 1, split: ['zoo'], onset: 'z', continuant: true, rime: 'o', category: 'dehors', image: ZOO },
  { id: 'nid', label: 'nid', syllables: 1, split: ['nid'], onset: 'n', continuant: true, rime: 'i', category: 'dehors', image: NID },
  { id: 'nuage', label: 'nuage', syllables: 2, split: ['nu', 'age'], onset: 'n', continuant: true, rime: 'age', category: 'dehors', image: NUAGE },

  // --- attaques occlusives : niveau 4 du Sac et au-delà ---
  { id: 'papillon', label: 'papillon', syllables: 3, split: ['pa', 'pi', 'llon'], onset: 'p', continuant: false, rime: 'on', category: 'animaux', image: PAPILLON },
  { id: 'parapluie', label: 'parapluie', syllables: 3, split: ['pa', 'ra', 'pluie'], onset: 'p', continuant: false, rime: 'uie', category: 'dehors', image: PARAPLUIE },
  { id: 'prune', label: 'prune', syllables: 1, split: ['prune'], onset: 'p', continuant: false, rime: 'une', category: 'cuisine', image: PRUNE },
  { id: 'banane', label: 'banane', syllables: 2, split: ['ba', 'nane'], onset: 'b', continuant: false, rime: 'ane', category: 'cuisine', image: BANANE },
  { id: 'bateau', label: 'bateau', syllables: 2, split: ['ba', 'teau'], onset: 'b', continuant: false, rime: 'o', category: 'dehors', image: BATEAU },
  { id: 'tomate', label: 'tomate', syllables: 2, split: ['to', 'mate'], onset: 't', continuant: false, rime: 'ate', category: 'cuisine', image: TOMATE },
  { id: 'tortue', label: 'tortue', syllables: 2, split: ['tor', 'tue'], onset: 't', continuant: false, rime: 'ue', category: 'animaux', image: TORTUE },
  { id: 'table', label: 'table', syllables: 1, split: ['table'], onset: 't', continuant: false, rime: 'able', category: 'cuisine', image: TABLE },
  { id: 'ballon', label: 'ballon', syllables: 2, split: ['bal', 'lon'], onset: 'b', continuant: false, rime: 'on', category: 'jouets', image: BALLON },
  { id: 'de', label: 'dé', syllables: 1, split: ['dé'], onset: 'd', continuant: false, rime: 'é', category: 'jouets', image: DE },
  { id: 'dauphin', label: 'dauphin', syllables: 2, split: ['dau', 'phin'], onset: 'd', continuant: false, rime: 'in', category: 'animaux', image: DAUPHIN },
  // « cabane » et « canard » s'écrivent avec un c et s'entendent « k » : encore
  // une fois, c'est le son qui est stocké, pas la lettre.
  { id: 'cabane', label: 'cabane', syllables: 2, split: ['ca', 'bane'], onset: 'k', continuant: false, rime: 'ane', category: 'dehors', image: CABANE },
  { id: 'canard', label: 'canard', syllables: 2, split: ['ca', 'nard'], onset: 'k', continuant: false, rime: 'ard', category: 'animaux', image: CANARD },
  { id: 'gateau', label: 'gâteau', syllables: 2, split: ['gâ', 'teau'], onset: 'g', continuant: false, rime: 'o', category: 'cuisine', image: GATEAU },
  { id: 'gorille', label: 'gorille', syllables: 2, split: ['go', 'rille'], onset: 'g', continuant: false, rime: 'ille', category: 'animaux', image: GORILLE },

  // Attaque vocalique : inutilisable par Le Sac, qui travaille les consonnes,
  // mais parfaitement valable pour frapper trois syllabes.
  { id: 'elephant', label: 'éléphant', syllables: 3, split: ['é', 'lé', 'phant'], onset: 'é', continuant: true, rime: 'an', category: 'animaux', image: ELEPHANT },
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
export const CONSONANT_ONSETS = new Set([
  // Continues : tenables, donc audibles isolément.
  's', 'l', 'f', 'm', 'ch', 'v', 'r', 'j', 'z', 'n',
  // Occlusives : impossibles à prolonger, réservées aux niveaux hauts.
  'p', 'b', 't', 'd', 'k', 'g',
]);

export function withConsonantOnset(): WordCard[] {
  return WORDS.filter((w) => CONSONANT_ONSETS.has(w.onset));
}

export function continuants(): WordCard[] {
  return withConsonantOnset().filter((w) => w.continuant);
}

/** Nombre minimal de mots pour qu'un son puisse tenir un sac. */
export const MIN_PER_ONSET = 2;

/**
 * Sons utilisables par Le Sac, groupés par attaque.
 *
 * Un sac ne contenant qu'un seul objet possible se devine du premier coup :
 * l'enfant y met tout ce qui reste sans jamais écouter. On écarte donc les sons
 * trop peu fournis, plutôt que de proposer un exercice qui ne teste rien.
 */
export function onsetGroups(options: { continuantOnly: boolean }): Map<string, WordCard[]> {
  const source = options.continuantOnly ? continuants() : withConsonantOnset();
  const groups = new Map<string, WordCard[]>();

  for (const word of source) {
    const list = groups.get(word.onset) ?? [];
    list.push(word);
    groups.set(word.onset, list);
  }

  for (const [onset, list] of groups) {
    if (list.length < MIN_PER_ONSET) groups.delete(onset);
  }
  return groups;
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
