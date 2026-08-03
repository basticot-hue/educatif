/**
 * Dessin du Chemin.
 *
 * Une seule règle gouverne ce fichier : **rien ne bouge qui ne serve la tâche**.
 * Pas de décor vivant, pas de particules, pas de dégradé animé. Le seul
 * mouvement est la case qui s'illumine, le pion qui s'aimante, le dé qui roule
 * et la pulsation d'aide. Ce parti pris sert la pédagogie et la fluidité sur du
 * matériel de 2018 — les deux à la fois.
 */

import type { Palette } from '../../engine/types';
import { caseCenterX, type Geometry } from './board';
import type { LevelConfig } from './levels';

export const FLASH_MS = 420;
const PULSE_PERIOD_MS = 1600;

export interface RenderState {
  geo: Geometry;
  config: LevelConfig;
  palette: Palette;

  /** Case logique du pion. */
  position: number;
  /** Abscisse visuelle du pion, en coordonnées plateau. */
  pawnX: number;
  camera: number;

  /** Valeur affichée par le dé, ou `null` quand il n'a pas encore été lancé. */
  die: number | null;
  /** Compte encore disponible ce tour-ci — sert à griser les points consommés. */
  dieRemaining: number;
  dieRolling: boolean;
  dieFace: number;

  /** Case → instant du début de l'illumination. */
  flashes: Map<number, number>;
  /** Cases qui pulsent (aide après un arrêt trop tôt). */
  pulsing: Set<number>;
  pulseStart: number;

  goalLit: boolean;
  pawnImage: HTMLImageElement | null;
  goalImage: HTMLImageElement | null;

  reducedMotion: boolean;
  now: number;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Interpolation de deux couleurs hexadécimales. */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round((((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t));
  const g = Math.round((((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t));
  const bl = Math.round(((pa & 255) * (1 - t) + (pb & 255) * t));
  return `rgb(${r},${g},${bl})`;
}

export function draw(ctx: CanvasRenderingContext2D, s: RenderState): void {
  const { geo, palette } = s;

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, geo.width, geo.height);

  ctx.save();
  ctx.translate(-Math.round(s.camera), 0);

  drawCases(ctx, s);
  drawGoal(ctx, s);
  drawPawn(ctx, s);

  ctx.restore();

  drawDie(ctx, s);
}

/* ---------------- cases ---------------- */

function drawCases(ctx: CanvasRenderingContext2D, s: RenderState): void {
  const { geo, palette, config } = s;
  const half = geo.caseSize / 2;
  const radius = geo.caseSize * 0.18;

  // On ne peint que ce qui est visible : à 30 cases, dessiner tout le plateau
  // coûterait inutilement cher à chaque image.
  const first = Math.max(1, Math.floor((s.camera - geo.originX) / geo.pitch));
  const last = Math.min(config.size, Math.ceil((s.camera + geo.width - geo.originX) / geo.pitch) + 1);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(geo.caseSize * 0.4)}px system-ui, sans-serif`;

  for (let i = first; i <= last; i++) {
    const cx = caseCenterX(geo, i);
    const y = geo.boardY - half;

    let fill = palette.surface;
    let alpha = 1;

    const flashedAt = s.flashes.get(i);
    if (flashedAt !== undefined) {
      const t = Math.min(1, (s.now - flashedAt) / FLASH_MS);
      // Montée immédiate puis retour progressif : l'accusé de réception doit
      // être perçu à l'instant du contact.
      fill = mix(palette.accent, palette.surface, t * t);
    }

    if (s.pulsing.has(i)) {
      if (s.reducedMotion) {
        alpha = 0.72;
      } else {
        const phase = ((s.now - s.pulseStart) % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
        alpha = 0.62 + 0.38 * (0.5 + 0.5 * Math.cos(phase * Math.PI * 2));
      }
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    roundRect(ctx, cx - half, y, geo.caseSize, geo.caseSize, radius);
    ctx.fill();

    ctx.fillStyle = palette.ink;
    ctx.fillText(String(i), cx, geo.boardY + 1);
    ctx.globalAlpha = 1;
  }
}

/* ---------------- phare ---------------- */

function drawGoal(ctx: CanvasRenderingContext2D, s: RenderState): void {
  const { geo, config } = s;
  if (!s.goalImage) return;

  const x = caseCenterX(geo, config.size) + geo.caseSize / 2 + geo.gap;
  const y = geo.boardY + geo.caseSize / 2 - geo.goalHeight;

  if (s.goalLit) {
    // Halo peint en dur plutôt qu'en `filter` : les filtres canvas ne sont pas
    // accélérés et effondrent la fréquence d'images sur ce matériel.
    const cx = x + geo.goalWidth / 2;
    const cy = y + geo.goalHeight * 0.16;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, geo.goalHeight * 0.75);
    glow.addColorStop(0, 'rgba(228,180,41,0.55)');
    glow.addColorStop(1, 'rgba(228,180,41,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, geo.goalHeight * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.drawImage(s.goalImage, x, y, geo.goalWidth, geo.goalHeight);
}

/* ---------------- pion ---------------- */

function drawPawn(ctx: CanvasRenderingContext2D, s: RenderState): void {
  const { geo } = s;
  if (!s.pawnImage) return;

  const h = geo.caseSize * 1.25;
  const w = (h * s.pawnImage.width) / s.pawnImage.height;

  // Le pion se tient **au-dessus** de sa case, pas dessus : le numéro doit
  // rester lisible, c'est lui que l'enfant entend et devra bientôt énoncer.
  const bottom = geo.boardY - geo.caseSize / 2 + geo.caseSize * 0.12;
  ctx.drawImage(s.pawnImage, s.pawnX - w / 2, bottom - h, w, h);
}

/* ---------------- dé ---------------- */

const DOT_LAYOUTS: Record<number, Array<[number, number]>> = {
  1: [[0, 0]],
  2: [
    [-0.24, -0.24],
    [0.24, 0.24],
  ],
  3: [
    [-0.26, -0.26],
    [0, 0],
    [0.26, 0.26],
  ],
};

function drawDie(ctx: CanvasRenderingContext2D, s: RenderState): void {
  const { geo, palette } = s;
  const size = geo.dieSize;
  const face = s.dieRolling ? s.dieFace : s.die;

  ctx.save();
  ctx.translate(geo.dieX, geo.dieY);

  ctx.fillStyle = palette.surface;
  roundRect(ctx, -size / 2, -size / 2, size, size, size * 0.2);
  ctx.fill();

  if (face) {
    const dotR = size * 0.09;
    for (const [dx, dy] of DOT_LAYOUTS[face] ?? []) {
      ctx.beginPath();
      ctx.arc(dx * size, dy * size, dotR, 0, Math.PI * 2);
      ctx.fillStyle = palette.ink;
      ctx.fill();
    }
  } else {
    // Dé pas encore lancé : un point d'appel discret, en accent.
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.13, 0, Math.PI * 2);
    ctx.fillStyle = palette.accent;
    ctx.fill();
  }

  ctx.restore();
}
