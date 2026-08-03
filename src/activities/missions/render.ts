/**
 * Dessin des Missions.
 *
 * Même discipline que Le Chemin : rien ne bouge qui ne serve la tâche. Le seul
 * mouvement est l'objet qu'on glisse, l'aimantation dans l'alvéole, et le
 * véhicule qui démarre — ou qui cale.
 */

import type { Palette } from '../../engine/types';
import type { Layout } from './layout';
import type { LevelConfig, MissionMode } from './levels';

export interface Slot {
  x: number;
  y: number;
  filled: boolean;
}

export interface Token {
  id: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  /** Index de l'alvéole occupée, ou `null` si l'objet est encore en réserve. */
  slot: number | null;
}

export interface MissionRenderState {
  layout: Layout;
  palette: Palette;
  config: LevelConfig;
  mode: MissionMode;
  dots: Array<[number, number]>;
  slots: Slot[];
  tokens: Token[];
  vehicleOffset: number;
  canDepart: boolean;
  compareLeft: number;
  compareRight: number;
  objectImage: HTMLImageElement | null;
  vehicleImage: HTMLImageElement | null;
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

export function draw(ctx: CanvasRenderingContext2D, s: MissionRenderState): void {
  const { layout, palette } = s;

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, layout.width, layout.height);

  if (s.mode === 'compare') {
    drawCompare(ctx, s);
    return;
  }

  drawCard(ctx, s);
  drawSlots(ctx, s);
  drawGo(ctx, s);
  drawTokens(ctx, s);
}

/* ---------------- carte mission ---------------- */

function drawCard(ctx: CanvasRenderingContext2D, s: MissionRenderState): void {
  const { card } = s.layout;

  ctx.fillStyle = s.palette.surface;
  roundRect(ctx, card.x, card.y, card.w, card.h, 18);
  ctx.fill();

  const r = Math.min(card.w, card.h) * 0.075;
  ctx.fillStyle = s.palette.ink;
  for (const [fx, fy] of s.dots) {
    ctx.beginPath();
    ctx.arc(card.x + fx * card.w, card.y + fy * card.h, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ---------------- véhicule et alvéoles ---------------- */

function drawSlots(ctx: CanvasRenderingContext2D, s: MissionRenderState): void {
  const { layout, palette } = s;
  const size = layout.slotSize;

  ctx.save();
  ctx.translate(s.vehicleOffset, 0);

  // Plateau du véhicule, dessiné derrière les alvéoles.
  const first = s.slots[0];
  const last = s.slots[s.slots.length - 1];
  if (first && last) {
    const left = first.x - size * 0.75;
    const top = first.y - size * 0.75;
    const right = Math.max(...s.slots.map((sl) => sl.x)) + size * 0.75;
    const bottom = Math.max(...s.slots.map((sl) => sl.y)) + size * 0.75;

    ctx.fillStyle = palette.accent;
    roundRect(ctx, left, top, right - left, bottom - top, 20);
    ctx.fill();

    // Deux roues, pour que ce soit un véhicule et pas une boîte.
    ctx.fillStyle = palette.ink;
    const wheelR = size * 0.22;
    for (const wx of [left + size * 0.6, right - size * 0.6]) {
      ctx.beginPath();
      ctx.arc(wx, bottom + wheelR * 0.6, wheelR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /*
   * Une alvéole vide reste **visiblement vide** : c'est elle qui dit ce qui
   * manque. Aucun message, aucune croix — le contrôle de l'erreur est dans le
   * dispositif.
   */
  for (const slot of s.slots) {
    ctx.fillStyle = slot.filled ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.22)';
    roundRect(ctx, slot.x - size / 2, slot.y - size / 2, size, size, size * 0.22);
    ctx.fill();
  }

  ctx.restore();
}

function drawGo(ctx: CanvasRenderingContext2D, s: MissionRenderState): void {
  const { go } = s.layout;

  ctx.globalAlpha = s.canDepart ? 1 : 0.4;
  ctx.fillStyle = s.palette.surface;
  ctx.beginPath();
  ctx.arc(go.x, go.y, go.r, 0, Math.PI * 2);
  ctx.fill();

  // Un simple chevron : zéro texte dans les ateliers.
  ctx.fillStyle = s.palette.ink;
  ctx.beginPath();
  ctx.moveTo(go.x - go.r * 0.22, go.y - go.r * 0.42);
  ctx.lineTo(go.x + go.r * 0.42, go.y);
  ctx.lineTo(go.x - go.r * 0.22, go.y + go.r * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawTokens(ctx: CanvasRenderingContext2D, s: MissionRenderState): void {
  const size = s.layout.tokenSize;

  for (const token of s.tokens) {
    const x = token.slot !== null ? token.x + s.vehicleOffset : token.x;
    const y = token.y;

    if (s.objectImage) {
      const h = size;
      const w = (h * s.objectImage.width) / s.objectImage.height;
      ctx.drawImage(s.objectImage, x - w / 2, y - h / 2, w, h);
    } else {
      // Repli si le pack ne fournit pas d'objet : un disque plein suffit, la
      // tâche porte sur la quantité, pas sur ce qu'on transporte.
      ctx.fillStyle = s.palette.surface;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* ---------------- niveau 0 : comparaison ---------------- */

/**
 * Deux camions, « lequel en a le plus ? ». L'enfant désigne.
 * La comparaison de quantités fonde le sens du nombre autant que le comptage.
 */
function drawCompare(ctx: CanvasRenderingContext2D, s: MissionRenderState): void {
  const { layout, palette } = s;
  const halfW = layout.width / 2;

  const panel = (cx: number, count: number) => {
    const w = halfW * 0.72;
    const h = layout.height * 0.5;
    const x = cx - w / 2;
    const y = (layout.height - h) / 2;

    ctx.fillStyle = palette.surface;
    roundRect(ctx, x, y, w, h, 22);
    ctx.fill();

    const columns = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / columns);
    const cell = Math.min(w / (columns + 1), h / (rows + 1));
    const r = cell * 0.3;

    ctx.fillStyle = palette.accent;
    for (let i = 0; i < count; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      ctx.beginPath();
      ctx.arc(
        x + w / 2 + (col - (columns - 1) / 2) * cell,
        y + h / 2 + (row - (rows - 1) / 2) * cell,
        r,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  };

  panel(halfW / 2, s.compareLeft);
  panel(halfW + halfW / 2, s.compareRight);
}
