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

/* --- sons continus : c'est sur eux que repose tout le travail des niveaux bas --- */

const SERPENT = svg(
  `<path d="M14 88 Q40 88 40 70 Q40 52 66 52 Q92 52 92 36" fill="none" stroke="#5A9A4A" stroke-width="14" stroke-linecap="round"/>` +
    `<circle cx="92" cy="30" r="12" fill="#5A9A4A"/>` +
    `<circle cx="96" cy="27" r="3" fill="#2A2A2A"/>` +
    `<path d="M100 34 L112 38 M100 34 L110 44" stroke="#D2405C" stroke-width="3" stroke-linecap="round"/>`,
);

const MOTO = svg(
  `<circle cx="28" cy="80" r="20" fill="#2A2A2A"/><circle cx="28" cy="80" r="8" fill="#9AA3AC"/>` +
    `<circle cx="92" cy="80" r="20" fill="#2A2A2A"/><circle cx="92" cy="80" r="8" fill="#9AA3AC"/>` +
    `<path d="M28 80 L54 56 L84 56 L92 80" fill="none" stroke="#D2405C" stroke-width="9" stroke-linecap="round"/>` +
    `<path d="M50 50 L74 50 L80 58 L46 58 Z" fill="#D2405C"/>` +
    `<path d="M84 56 L98 44" stroke="#2A2A2A" stroke-width="6" stroke-linecap="round"/>`,
);

const MAIN = svg(
  `<rect x="42" y="52" width="38" height="52" rx="14" fill="#F0C8A0"/>` +
    `<rect x="44" y="20" width="11" height="42" rx="5.5" fill="#F0C8A0"/>` +
    `<rect x="57" y="12" width="11" height="50" rx="5.5" fill="#F0C8A0"/>` +
    `<rect x="70" y="18" width="11" height="44" rx="5.5" fill="#F0C8A0"/>` +
    `<rect x="82" y="30" width="10" height="34" rx="5" fill="#F0C8A0"/>` +
    `<rect x="26" y="54" width="20" height="11" rx="5.5" fill="#F0C8A0" transform="rotate(-40 36 60)"/>`,
);

const FRAISE = svg(
  `<path d="M60 34 Q92 34 92 62 Q92 98 60 106 Q28 98 28 62 Q28 34 60 34 Z" fill="#D2405C"/>` +
    `<path d="M40 26 Q60 16 80 26 Q68 38 60 34 Q52 38 40 26 Z" fill="#5A9A4A"/>` +
    `<circle cx="48" cy="56" r="3" fill="#FFE08A"/><circle cx="70" cy="52" r="3" fill="#FFE08A"/>` +
    `<circle cx="60" cy="74" r="3" fill="#FFE08A"/><circle cx="44" cy="80" r="3" fill="#FFE08A"/>` +
    `<circle cx="76" cy="76" r="3" fill="#FFE08A"/>`,
);

const FOURMI = svg(
  `<circle cx="30" cy="60" r="14" fill="#7A4A2A"/><circle cx="58" cy="62" r="12" fill="#7A4A2A"/>` +
    `<ellipse cx="88" cy="62" rx="20" ry="16" fill="#7A4A2A"/>` +
    `<circle cx="26" cy="56" r="3" fill="#FFFFFF"/>` +
    `<path d="M24 48 L16 34 M34 46 L40 32" stroke="#7A4A2A" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M52 74 L46 92 M64 74 L70 92 M84 76 L80 94 M96 76 L102 92" stroke="#7A4A2A" stroke-width="4" stroke-linecap="round"/>`,
);

const LIT = svg(
  `<rect x="14" y="56" width="92" height="34" rx="6" fill="#8A5B4A"/>` +
    `<rect x="20" y="46" width="80" height="18" rx="8" fill="#EDE3D2"/>` +
    `<rect x="26" y="36" width="30" height="16" rx="8" fill="#FFFFFF"/>` +
    `<rect x="10" y="52" width="10" height="44" rx="4" fill="#7A4A2A"/>` +
    `<rect x="100" y="52" width="10" height="44" rx="4" fill="#7A4A2A"/>`,
);

const LAPIN = svg(
  `<ellipse cx="60" cy="80" rx="30" ry="24" fill="#EDE3D2"/>` +
    `<circle cx="60" cy="52" r="20" fill="#EDE3D2"/>` +
    `<ellipse cx="48" cy="24" rx="8" ry="20" fill="#EDE3D2"/><ellipse cx="72" cy="24" rx="8" ry="20" fill="#EDE3D2"/>` +
    `<ellipse cx="48" cy="26" rx="4" ry="13" fill="#F2A6B0"/><ellipse cx="72" cy="26" rx="4" ry="13" fill="#F2A6B0"/>` +
    `<circle cx="53" cy="50" r="3.5" fill="#2A2A2A"/><circle cx="67" cy="50" r="3.5" fill="#2A2A2A"/>` +
    `<circle cx="60" cy="58" r="4" fill="#F2A6B0"/>`,
);

const VELO = svg(
  `<circle cx="28" cy="76" r="22" fill="none" stroke="#2A2A2A" stroke-width="6"/>` +
    `<circle cx="92" cy="76" r="22" fill="none" stroke="#2A2A2A" stroke-width="6"/>` +
    `<path d="M28 76 L54 42 L74 76 L28 76 M54 42 L86 42 M92 76 L80 42" fill="none" stroke="#3D6E8C" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M46 36 L64 36" stroke="#2A2A2A" stroke-width="6" stroke-linecap="round"/>`,
);

const VALISE = svg(
  `<rect x="18" y="42" width="84" height="58" rx="8" fill="#8A5B4A"/>` +
    `<rect x="18" y="62" width="84" height="12" fill="#6B4226"/>` +
    `<path d="M46 42 L46 30 Q46 24 52 24 L68 24 Q74 24 74 30 L74 42" fill="none" stroke="#6B4226" stroke-width="7"/>` +
    `<rect x="52" y="60" width="16" height="16" rx="3" fill="#E4B429"/>`,
);

const GIRAFE = svg(
  `<rect x="52" y="30" width="18" height="52" fill="#F0C838"/>` +
    `<ellipse cx="60" cy="92" rx="26" ry="18" fill="#F0C838"/>` +
    `<ellipse cx="62" cy="24" rx="16" ry="12" fill="#F0C838"/>` +
    `<circle cx="56" cy="20" r="3" fill="#2A2A2A"/>` +
    `<path d="M52 12 L50 4 M70 12 L72 4" stroke="#7A4A2A" stroke-width="4" stroke-linecap="round"/>` +
    `<circle cx="58" cy="44" r="5" fill="#B07A20"/><circle cx="64" cy="60" r="5" fill="#B07A20"/>` +
    `<circle cx="48" cy="92" r="6" fill="#B07A20"/><circle cx="74" cy="96" r="6" fill="#B07A20"/>`,
);

const ZEBRE = svg(
  `<ellipse cx="58" cy="72" rx="36" ry="26" fill="#FFFFFF"/>` +
    `<ellipse cx="94" cy="44" rx="16" ry="12" fill="#FFFFFF" transform="rotate(-30 94 44)"/>` +
    `<rect x="80" y="44" width="10" height="26" fill="#FFFFFF" transform="rotate(-25 85 57)"/>` +
    `<path d="M36 50 L36 94 M52 48 L52 98 M68 48 L68 98" stroke="#2A2A2A" stroke-width="8"/>` +
    `<circle cx="98" cy="40" r="3" fill="#2A2A2A"/>` +
    `<path d="M40 96 L38 110 M56 98 L56 110 M72 98 L74 110" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>`,
);

const ZOO = svg(
  `<rect x="14" y="26" width="92" height="76" rx="8" fill="#8A6E33"/>` +
    `<rect x="22" y="34" width="76" height="60" rx="4" fill="#5B8FB9"/>` +
    `<ellipse cx="60" cy="76" rx="24" ry="18" fill="#E08A28"/>` +
    `<circle cx="60" cy="54" r="15" fill="#E08A28"/>` +
    `<circle cx="47" cy="44" r="7" fill="#C06A18"/><circle cx="73" cy="44" r="7" fill="#C06A18"/>` +
    `<circle cx="55" cy="52" r="2.5" fill="#2A2A2A"/><circle cx="65" cy="52" r="2.5" fill="#2A2A2A"/>` +
    `<path d="M34 30 L34 98 M50 30 L50 98 M70 30 L70 98 M86 30 L86 98" stroke="#6B5222" stroke-width="6"/>`,
);

const NID = svg(
  `<path d="M18 74 Q60 58 102 74 Q98 100 60 100 Q22 100 18 74 Z" fill="#8A6E33"/>` +
    `<path d="M22 76 Q60 66 98 76" fill="none" stroke="#6B5222" stroke-width="4"/>` +
    `<ellipse cx="44" cy="70" rx="13" ry="11" fill="#EDE3D2"/>` +
    `<ellipse cx="70" cy="68" rx="13" ry="11" fill="#EDE3D2"/>` +
    `<ellipse cx="58" cy="78" rx="13" ry="11" fill="#F5EEE0"/>`,
);

const NUAGE = svg(
  `<circle cx="42" cy="62" r="20" fill="#FFFFFF"/><circle cx="66" cy="54" r="26" fill="#FFFFFF"/>` +
    `<circle cx="88" cy="66" r="18" fill="#FFFFFF"/>` +
    `<rect x="34" y="62" width="60" height="22" rx="11" fill="#FFFFFF"/>`,
);

/* --- sons qui claquent : niveaux hauts uniquement --- */

const DE = svg(
  `<rect x="20" y="20" width="80" height="80" rx="14" fill="#FFFFFF"/>` +
    `<circle cx="42" cy="42" r="8" fill="#12212E"/><circle cx="78" cy="42" r="8" fill="#12212E"/>` +
    `<circle cx="60" cy="60" r="8" fill="#12212E"/>` +
    `<circle cx="42" cy="78" r="8" fill="#12212E"/><circle cx="78" cy="78" r="8" fill="#12212E"/>`,
);

const DAUPHIN = svg(
  `<path d="M12 74 Q40 46 76 50 Q98 52 108 40 Q104 66 84 74 Q56 90 12 74 Z" fill="#5B8FB9"/>` +
    `<path d="M56 50 Q60 28 72 26 Q68 42 62 50 Z" fill="#4A7A9E"/>` +
    `<path d="M30 78 Q42 92 58 84" fill="none" stroke="#4A7A9E" stroke-width="6" stroke-linecap="round"/>` +
    `<circle cx="94" cy="52" r="3.5" fill="#12212E"/>`,
);

const CABANE = svg(
  `<path d="M16 56 L60 20 L104 56 Z" fill="#8A5B4A"/>` +
    `<rect x="28" y="54" width="64" height="46" fill="#C09A6B"/>` +
    `<rect x="50" y="70" width="20" height="30" rx="2" fill="#6B4226"/>` +
    `<rect x="34" y="62" width="12" height="12" fill="#8FD0E8"/>` +
    `<rect x="76" y="62" width="12" height="12" fill="#8FD0E8"/>`,
);

const CANARD = svg(
  `<ellipse cx="54" cy="76" rx="34" ry="24" fill="#F0C838"/>` +
    `<circle cx="86" cy="48" r="18" fill="#F0C838"/>` +
    `<path d="M100 46 L118 50 L100 56 Z" fill="#E07A28"/>` +
    `<circle cx="90" cy="42" r="3.5" fill="#2A2A2A"/>` +
    `<path d="M40 72 Q54 62 68 72 Q54 82 40 72 Z" fill="#D6A81E"/>`,
);

const GATEAU = svg(
  `<rect x="22" y="56" width="76" height="44" rx="6" fill="#C09A6B"/>` +
    `<path d="M22 62 Q34 74 46 62 Q58 74 70 62 Q82 74 94 62 L98 62 L98 56 L22 56 Z" fill="#E4667A"/>` +
    `<rect x="56" y="30" width="8" height="24" rx="3" fill="#FFFFFF"/>` +
    `<path d="M60 30 Q54 22 60 14 Q66 22 60 30 Z" fill="#F0B429"/>` +
    `<circle cx="38" cy="80" r="4" fill="#FFFFFF"/><circle cx="60" cy="86" r="4" fill="#FFFFFF"/>` +
    `<circle cx="82" cy="80" r="4" fill="#FFFFFF"/>`,
);

const GORILLE = svg(
  `<ellipse cx="60" cy="74" rx="38" ry="32" fill="#4A4A52"/>` +
    `<circle cx="24" cy="58" r="12" fill="#4A4A52"/><circle cx="96" cy="58" r="12" fill="#4A4A52"/>` +
    `<ellipse cx="60" cy="72" rx="24" ry="22" fill="#7A6A62"/>` +
    `<circle cx="51" cy="62" r="4" fill="#2A2A2A"/><circle cx="69" cy="62" r="4" fill="#2A2A2A"/>` +
    `<ellipse cx="60" cy="78" rx="10" ry="7" fill="#5A4A44"/>` +
    `<circle cx="56" cy="78" r="2.5" fill="#2A2A2A"/><circle cx="64" cy="78" r="2.5" fill="#2A2A2A"/>` +
    `<path d="M44 32 Q60 22 76 32" fill="none" stroke="#4A4A52" stroke-width="14" stroke-linecap="round"/>`,
);

const TORTUE = svg(
  `<path d="M22 76 Q60 36 98 76 Z" fill="#5A9A4A"/>` +
    `<ellipse cx="60" cy="78" rx="40" ry="12" fill="#4A7F3A"/>` +
    `<circle cx="106" cy="72" r="11" fill="#8FBF6A"/>` +
    `<circle cx="110" cy="69" r="3" fill="#2A2A2A"/>` +
    `<rect x="32" y="84" width="14" height="12" rx="5" fill="#8FBF6A"/>` +
    `<rect x="74" y="84" width="14" height="12" rx="5" fill="#8FBF6A"/>` +
    `<path d="M46 60 L46 74 M60 52 L60 74 M74 60 L74 74" stroke="#3A6B2E" stroke-width="4"/>`,
);

const TABLE = svg(
  `<rect x="12" y="44" width="96" height="14" rx="5" fill="#C09A6B"/>` +
    `<rect x="20" y="56" width="10" height="46" rx="4" fill="#8A5B4A"/>` +
    `<rect x="90" y="56" width="10" height="46" rx="4" fill="#8A5B4A"/>`,
);

const BALLON = svg(
  `<circle cx="60" cy="62" r="38" fill="#FFFFFF"/>` +
    `<path d="M60 30 L78 44 L70 66 L50 66 L42 44 Z" fill="#2A2A2A"/>` +
    `<path d="M60 24 L60 30 M28 52 L42 44 M92 52 L78 44 M44 94 L50 66 M76 94 L70 66" stroke="#2A2A2A" stroke-width="4"/>` +
    `<circle cx="60" cy="62" r="38" fill="none" stroke="#2A2A2A" stroke-width="4"/>`,
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
