// Génère les icônes PNG de la PWA sans dépendance externe.
//
// Chrome n'accepte de fabriquer un WebAPK (icône sur l'écran d'accueil, lancement
// plein écran sans barre de navigateur) que si le manifeste pointe vers des
// icônes matricielles. Un SVG ne suffit pas. On encode donc de vrais PNG à la
// main : signature, IHDR, IDAT (zlib), IEND.
//
//   node scripts/gen-icons.mjs

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const BG = [0x0f, 0x2e, 0x4c]; // bleu nuit
const ACCENT = [0xe4, 0xb4, 0x29]; // or
const SURFACE = [0xff, 0xff, 0xff];

/* ---------- encodage PNG ---------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** @param {number} size @param {Uint8Array} rgba pixels RGBA sans filtre */
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 6; // RGBA
  // 10..12 : compression, filtre, entrelacement — tous à 0

  // Chaque scanline est préfixée de son octet de filtre (0 = aucun).
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const src = y * size * 4;
    const dst = y * (size * 4 + 1);
    raw[dst] = 0;
    Buffer.from(rgba.buffer, src, size * 4).copy(raw, dst + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- dessin ---------- */

function canvas(size, fill) {
  const px = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    px[i * 4] = fill[0];
    px[i * 4 + 1] = fill[1];
    px[i * 4 + 2] = fill[2];
    px[i * 4 + 3] = 255;
  }
  return px;
}

/** Rectangle à coins arrondis, avec anticrénelage par supersampling 3x3. */
function roundRect(px, size, x0, y0, w, h, r, color) {
  const inside = (fx, fy) => {
    if (fx < x0 || fy < y0 || fx > x0 + w || fy > y0 + h) return false;
    const cx = Math.min(Math.max(fx, x0 + r), x0 + w - r);
    const cy = Math.min(Math.max(fy, y0 + r), y0 + h - r);
    return (fx - cx) ** 2 + (fy - cy) ** 2 <= r * r;
  };

  const yMin = Math.max(0, Math.floor(y0));
  const yMax = Math.min(size - 1, Math.ceil(y0 + h));
  const xMin = Math.max(0, Math.floor(x0));
  const xMax = Math.min(size - 1, Math.ceil(x0 + w));

  for (let y = yMin; y <= yMax; y++) {
    for (let x = xMin; x <= xMax; x++) {
      let hits = 0;
      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 3; sx++) {
          if (inside(x + (sx + 0.5) / 3, y + (sy + 0.5) / 3)) hits++;
        }
      }
      if (!hits) continue;
      const a = hits / 9;
      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) px[i + c] = Math.round(px[i + c] * (1 - a) + color[c] * a);
    }
  }
}

function circle(px, size, cx, cy, r, color) {
  roundRect(px, size, cx - r, cy - r, r * 2, r * 2, r, color);
}

/**
 * Le motif : trois cases du Chemin, et le pion posé sur la dernière.
 * Reconnaissable en 48 px sur une grille d'écran d'accueil.
 *
 * @param inset fraction de marge — 0.10 pour l'icône normale, 0.22 pour la
 *   maskable, dont Android peut rogner jusqu'à 20 % de chaque bord.
 */
function drawMark(size, inset) {
  const px = canvas(size, BG);
  const pad = size * inset;
  const area = size - pad * 2;

  const gap = area * 0.07;
  const cell = (area - gap * 2) / 3;
  const cy = pad + area * 0.62;

  for (let i = 0; i < 3; i++) {
    const x = pad + i * (cell + gap);
    roundRect(px, size, x, cy - cell / 2, cell, cell, cell * 0.24, SURFACE);
  }

  // Le pion, sur la troisième case, débordant vers le haut.
  const lastCx = pad + 2 * (cell + gap) + cell / 2;
  const headR = cell * 0.42;
  circle(px, size, lastCx, cy - cell * 0.62, headR, ACCENT);
  roundRect(
    px,
    size,
    lastCx - cell * 0.3,
    cy - cell * 0.34,
    cell * 0.6,
    cell * 0.62,
    cell * 0.24,
    ACCENT,
  );

  return px;
}

/* ---------- sortie ---------- */

mkdirSync(OUT, { recursive: true });

const outputs = [
  ['icon-192.png', 192, 0.1],
  ['icon-512.png', 512, 0.1],
  ['maskable-512.png', 512, 0.22],
];

for (const [name, size, inset] of outputs) {
  const png = encodePng(size, drawMark(size, inset));
  writeFileSync(join(OUT, name), png);
  console.log(`${name.padEnd(18)} ${String(png.length).padStart(6)} octets`);
}
