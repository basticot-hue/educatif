/**
 * Les tuiles de l'étagère.
 *
 * Elles étaient faites de rectangles gris et de ronds jaunes : des formes
 * abstraites, correctes graphiquement et illisibles pour un enfant. Or l'étagère
 * est le **seul** écran où l'enfant décide, et il décide sans savoir lire. Une
 * tuile qui ne montre pas ce qu'on y fait ne lui laisse que la position à
 * mémoriser — et il retourne alors toujours sur les mêmes.
 *
 * Refaites donc au même régime que les mots : un contour d'encre sur chaque
 * forme, une ombre au sol, et surtout **des objets qu'on reconnaît** — un
 * camion, deux mains qui frappent, un sac, un château. Ce sont les mêmes objets
 * que l'atelier montre une fois ouvert.
 *
 * Les couleurs viennent des variables du thème : la tuile suit le monde du
 * personnage choisi, comme le reste de l'application.
 */

import type { ReactNode } from 'react';
import type { ShelfId } from './Shelf';

const INK = 'var(--ink)';
const ACCENT = 'var(--accent)';

/**
 * Cadre commun : le trait d'encre est porté par le groupe, donc automatique.
 * Une forme qui n'en veut pas doit dire `stroke="none"` — réservé aux détails
 * posés *à l'intérieur* d'une masse, jamais à une silhouette.
 */
function Tile({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="100" cy="113" rx="70" ry="5" fill={INK} opacity="0.1" />
      <g
        fill="none"
        stroke={INK}
        strokeWidth="3.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {children}
      </g>
    </svg>
  );
}

/** Des points, jamais un chiffre : l'enfant ne lit pas encore. */
function Pips({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={x + (i - (n - 1) / 2) * 11} cy={y} r="3.6" fill={INK} stroke="none" />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */

/** Trois cases, le pion dessus, et le but au bout de la piste. */
function CheminIcon() {
  return (
    <Tile>
      <rect x="14" y="62" width="40" height="40" rx="9" fill="#FFFFFF" />
      <rect x="60" y="62" width="40" height="40" rx="9" fill="#FFFFFF" />
      <rect x="106" y="62" width="40" height="40" rx="9" fill="#FFFFFF" />
      <Pips x={34} y={82} n={1} />
      <Pips x={80} y={82} n={2} />
      <Pips x={126} y={82} n={3} />
      <circle cx="34" cy="44" r="13" fill={ACCENT} />
      <path d="M22 62 Q34 50 46 62 Z" fill={ACCENT} />
      <path d="M160 100 L166 40 L184 40 L190 100 Z" fill="#FFFFFF" />
      <path d="M164 68 L186 68 M162 84 L188 84" strokeWidth="3" />
      <path d="M166 40 L184 40 L180 26 L170 26 Z" fill={ACCENT} />
    </Tile>
  );
}

/** Un camion, ses caisses, et l'alvéole encore vide. */
function MissionsIcon() {
  return (
    <Tile>
      <path d="M18 46 L112 46 L112 88 L18 88 Z" fill="#FFFFFF" />
      <path d="M112 58 L146 58 L166 76 L166 88 L112 88 Z" fill={ACCENT} />
      <rect x="122" y="62" width="24" height="16" rx="3" fill="#FFFFFF" />
      <rect x="26" y="54" width="24" height="26" rx="3" fill={ACCENT} />
      <rect x="54" y="54" width="24" height="26" rx="3" fill={ACCENT} />
      <rect x="82" y="54" width="24" height="26" rx="3" fill="#FFFFFF" />
      <circle cx="48" cy="94" r="13" fill="#FFFFFF" />
      <circle cx="144" cy="94" r="13" fill="#FFFFFF" />
      <circle cx="48" cy="94" r="4.5" fill={INK} stroke="none" />
      <circle cx="144" cy="94" r="4.5" fill={INK} stroke="none" />
    </Tile>
  );
}

/** Deux mains qui frappent, et les marches qu'on monte à chaque coup. */
function SyllabesIcon() {
  return (
    <Tile>
      <rect x="24" y="88" width="40" height="18" rx="4" fill="#FFFFFF" />
      <rect x="70" y="76" width="40" height="30" rx="4" fill="#FFFFFF" />
      <rect x="116" y="62" width="40" height="44" rx="4" fill={ACCENT} />
      <Pips x={44} y={97} n={1} />
      <Pips x={90} y={91} n={2} />
      <Pips x={136} y={84} n={3} />
      {/*
        Deux mains ouvertes qui se rejoignent, doigts vers le haut. La première
        version les dessinait comme deux masses lisses : elles se lisaient
        comme deux yeux fermés. Ce sont les doigts séparés qui font la main.
      */}
      <g transform="rotate(-16 84 34)">
        <path d="M62 50 L62 32 Q62 25 68 25 Q74 25 74 32 L74 24 Q74 17 80 17 Q86 17 86 24 L86 50 Q86 56 74 56 Q62 56 62 50 Z" fill="#FFFFFF" />
        <path d="M74 32 L74 44 M68 25 L68 30" strokeWidth="2.4" />
      </g>
      <g transform="rotate(16 116 34)">
        <path d="M126 50 L126 32 Q126 25 132 25 Q138 25 138 32 L138 24 Q138 17 132 17 Q126 17 126 24 Z" fill="#FFFFFF" transform="scale(-1 1) translate(-264 0)" />
        <path d="M114 50 L114 32 Q114 25 120 25 Q126 25 126 32 L126 24 Q126 17 120 17 Q114 17 114 24 L114 50 Q114 56 126 56 Q138 56 138 50 L138 32" fill="#FFFFFF" />
        <path d="M126 32 L126 44 M132 25 L132 30" strokeWidth="2.4" />
      </g>
      <path d="M100 14 L100 4 M84 12 L79 4 M116 12 L121 4" strokeWidth="3.4" />
    </Tile>
  );
}

/** Deux sacs ouverts, et l'objet qu'on va poser dans l'un d'eux. */
function SonsIcon() {
  return (
    <Tile>
      {/*
        Deux sacs, col noué, et l'objet qu'on vient poser dans l'un d'eux. Le
        premier jet dessinait l'objet en rond au-dessus du sac, avec des traits
        de mouvement de part et d'autre : l'ensemble se lisait comme une tête et
        des épaules. Une balle franche, et rien autour.
      */}
      <path d="M22 62 Q56 48 90 62 L98 104 Q56 114 14 104 Z" fill="#FFFFFF" />
      <path d="M32 60 Q56 68 80 60" strokeWidth="3" />
      <path d="M40 56 Q56 44 72 56" strokeWidth="5" />
      <path d="M112 62 Q146 48 180 62 L188 104 Q146 114 104 104 Z" fill={ACCENT} />
      <path d="M122 60 Q146 68 170 60" strokeWidth="3" />
      <path d="M130 56 Q146 44 162 56" strokeWidth="5" />
      <circle cx="146" cy="24" r="16" fill="#FFFFFF" />
      <path d="M132 18 Q146 28 160 18 M146 8 L146 40" strokeWidth="2.6" />
    </Tile>
  );
}

/** Le bac, le sillon creusé, et le doigt qui le suit. */
function SableIcon() {
  return (
    <Tile>
      <rect x="12" y="18" width="176" height="86" rx="12" fill="#EFE3CE" />
      <path
        d="M44 88 Q44 34 92 34 Q140 34 140 88"
        strokeWidth="20"
        stroke={INK}
        opacity="0.14"
      />
      <path d="M44 88 Q44 34 92 34" strokeWidth="13" stroke={ACCENT} />
      <path d="M120 66 L120 40 Q120 32 128 32 Q136 32 136 40 L136 66" fill="#FFFFFF" />
      <path d="M136 52 Q152 48 154 62 Q156 84 140 92 Q124 98 118 86 L112 72 Q110 64 118 62 Z" fill="#FFFFFF" />
    </Tile>
  );
}

/** Un château, ses deux salles ouvertes, et l'objet à ranger. */
function ChateauIcon() {
  return (
    <Tile>
      <path d="M16 104 L16 46 L30 46 L30 34 L44 34 L44 46 L58 46 L58 104 Z" fill="#FFFFFF" />
      <path d="M142 104 L142 46 L156 46 L156 34 L170 34 L170 46 L184 46 L184 104 Z" fill="#FFFFFF" />
      <path d="M58 104 L58 58 L142 58 L142 104 Z" fill="#FFFFFF" />
      <path d="M30 104 L30 78 Q37 68 44 78 L44 104 Z" fill={INK} />
      <path d="M156 104 L156 78 Q163 68 170 78 L170 104 Z" fill={INK} />
      <path d="M88 104 L88 74 Q100 60 112 74 L112 104 Z" fill={ACCENT} />
      <path d="M70 44 L78 30 L86 44 Z" fill={ACCENT} />
      <path d="M114 44 L122 30 L130 44 Z" fill={ACCENT} />
    </Tile>
  );
}

/** Trois vignettes, dans l'ordre — la dernière encore de travers. */
function RecitIcon() {
  return (
    <Tile>
      <rect x="14" y="34" width="48" height="54" rx="7" fill="#FFFFFF" />
      <rect x="76" y="34" width="48" height="54" rx="7" fill="#FFFFFF" />
      <g transform="rotate(10 162 60)">
        <rect x="138" y="32" width="48" height="54" rx="7" fill={ACCENT} />
      </g>
      <circle cx="38" cy="54" r="9" fill={INK} stroke="none" opacity="0.5" />
      <path d="M22 78 L54 78" strokeWidth="4" opacity="0.4" />
      <circle cx="100" cy="54" r="9" fill={INK} stroke="none" opacity="0.5" />
      <path d="M84 78 L116 78" strokeWidth="4" opacity="0.4" />
      <path d="M64 61 L74 61 M70 56 L75 61 L70 66" strokeWidth="3.4" />
    </Tile>
  );
}

/** Un appareil photo, et l'objet qu'il vise. */
function FabriqueIcon() {
  return (
    <Tile>
      <rect x="16" y="40" width="92" height="62" rx="10" fill="#FFFFFF" />
      <rect x="42" y="28" width="34" height="14" rx="4" fill="#FFFFFF" />
      <circle cx="62" cy="72" r="21" fill={ACCENT} />
      <circle cx="62" cy="72" r="9" fill="#FFFFFF" />
      {/*
        L'objet photographié est une balle, pas un triangle : la Fabrique sert
        à prendre en photo des choses de la maison, et un triangle n'est une
        chose de la maison pour personne.
      */}
      <circle cx="152" cy="70" r="30" fill={ACCENT} />
      <path d="M126 56 Q152 68 178 56 M152 40 L152 100" strokeWidth="3" />
      <path d="M112 52 L122 58 M114 40 L123 45" strokeWidth="3" />
    </Tile>
  );
}

/** Une feuille sur son chevalet, et le pinceau qui vient d'y passer. */
function StudioIcon() {
  return (
    <Tile>
      <path d="M46 104 L62 46 M118 104 L102 46" strokeWidth="4" />
      <rect x="34" y="18" width="96" height="62" rx="6" fill="#FFFFFF" />
      <path d="M48 62 Q66 38 84 58 Q98 72 116 44" strokeWidth="4" stroke={ACCENT} />
      <path d="M152 30 L182 60 L162 80 L132 50 Z" fill={ACCENT} />
      <path d="M132 50 L162 80 L146 92 Q130 96 128 82 Z" fill="#FFFFFF" />
    </Tile>
  );
}

export const SHELF_ICONS: Partial<Record<ShelfId, () => React.ReactElement>> = {
  chemin: CheminIcon,
  missions: MissionsIcon,
  syllabes: SyllabesIcon,
  sons: SonsIcon,
  sable: SableIcon,
  chateau: ChateauIcon,
  recit: RecitIcon,
  fabrique: FabriqueIcon,
  studio: StudioIcon,
};

/** Nom montré au parent, pour la planche de remplacement des tuiles. */
export const SHELF_LABELS: Record<string, string> = {
  chemin: 'Le Chemin',
  missions: 'Les Missions',
  syllabes: 'Le Bal des syllabes',
  sons: 'Le Sac de Chase',
  sable: 'Le Sable',
  chateau: 'Le Château des mots',
  recit: 'Le Récit',
  fabrique: 'La Fabrique',
  studio: 'Le Studio',
};
