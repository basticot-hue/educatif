/**
 * Géométrie du plateau et aimantation.
 *
 * Tout est pur : aucune dépendance au canvas ni au DOM. C'est ce qui permet de
 * régler l'aimantation sans relancer une séance.
 */

import type { LevelConfig } from './levels';

export interface Geometry {
  width: number;
  height: number;
  /** Côté d'une case. Jamais moins de 88 px : une main de 3 ans est imprécise. */
  caseSize: number;
  /** Écart entre deux cases. Jamais moins de 24 px. */
  gap: number;
  /** Distance de centre à centre. */
  pitch: number;
  /** Ordonnée du centre de la bande. */
  boardY: number;
  /** Abscisse du centre de la case 1, en coordonnées plateau. */
  originX: number;
  boardWidth: number;
  dieSize: number;
  dieX: number;
  dieY: number;
  goalWidth: number;
  goalHeight: number;
}

export const MIN_TARGET = 88;
export const MIN_GAP = 24;

const MAX_CASE = 132;

function gapFor(caseSize: number): number {
  return Math.max(MIN_GAP, Math.round(caseSize * 0.26));
}

function goalWidthFor(caseSize: number): number {
  return Math.round((Math.round(caseSize * 1.5) * 100) / 160); // ratio du SVG du phare
}

/** Largeur totale de la bande, phare compris, pour une taille de case donnée. */
function contentWidthFor(caseSize: number, size: number): number {
  const gap = gapFor(caseSize);
  return caseSize + (size - 1) * (caseSize + gap) + gap + goalWidthFor(caseSize) + gap * 2;
}

export function computeGeometry(width: number, height: number, config: LevelConfig): Geometry {
  const byHeight = Math.max(MIN_TARGET, Math.min(MAX_CASE, Math.round(height * 0.24)));

  /*
   * On rétrécit les cases juste ce qu'il faut pour que le plateau tienne d'un
   * seul tenant — jamais en dessous de 88 px, qui est le plancher tactile. Un
   * plateau de 10 cases entre ainsi en entier, et le défilement n'apparaît qu'à
   * partir du niveau 3 (1 à 20), là où la spécification le prévoit.
   */
  let caseSize = byHeight;
  while (caseSize > MIN_TARGET && contentWidthFor(caseSize, config.size) > width) {
    caseSize -= 1;
  }

  const gap = gapFor(caseSize);
  const pitch = caseSize + gap;

  const dieSize = Math.max(MIN_TARGET, Math.min(148, Math.round(height * 0.2)));
  const goalHeight = Math.round(caseSize * 1.5);
  const goalWidth = goalWidthFor(caseSize);

  const contentWidth = contentWidthFor(caseSize, config.size);

  // Un plateau court (3 ou 5 cases) est centré : collé au bord gauche, il
  // donnerait l'impression que l'écran est mal rempli, et le regard de l'enfant
  // n'irait pas là où se passe la tâche.
  const originX =
    contentWidth < width ? (width - contentWidth) / 2 + gap + caseSize / 2 : caseSize / 2 + gap;

  const boardWidth = Math.max(width, contentWidth);

  return {
    width,
    height,
    caseSize,
    gap,
    pitch,
    boardY: Math.round(height * 0.4),
    originX,
    boardWidth,
    dieSize,
    dieX: Math.round(width / 2),
    dieY: Math.round(height - dieSize / 2 - Math.max(MIN_GAP, height * 0.05)),
    goalWidth,
    goalHeight,
  };
}

/** Abscisse du centre d'une case, en coordonnées plateau (1-based). */
export function caseCenterX(geo: Geometry, index: number): number {
  return geo.originX + (index - 1) * geo.pitch;
}

/**
 * Décalage de la caméra.
 *
 * Le plateau ne défile que s'il dépasse la largeur de l'écran (à partir du
 * niveau 3). Le pion est maintenu au tiers gauche pour que l'enfant voie où il
 * va plutôt que d'où il vient.
 */
export function cameraFor(geo: Geometry, pawnX: number): number {
  if (geo.boardWidth <= geo.width) return 0;
  const target = pawnX - geo.width * 0.35;
  return Math.max(0, Math.min(geo.boardWidth - geo.width, target));
}

/**
 * Rayon d'accroche de l'aimantation.
 *
 * Généreux — plus de la moitié du pas — parce qu'un doigt d'enfant de 3 ans
 * dérive verticalement et qu'une dalle d'entrée de gamme échantillonne mal.
 * Une case ratée alors que le geste était bon est vécue comme un échec que
 * l'enfant n'a pas commis.
 */
export function snapRadius(geo: Geometry): number {
  return geo.pitch * 0.62;
}

/**
 * Case suivante si le doigt est assez près d'elle, sinon `null`.
 *
 * On ne teste **que** la case immédiatement suivante : un geste rapide ne doit
 * jamais faire sauter deux cases d'un coup. Un geste = une case, c'est ce qui
 * construit la correspondance terme à terme.
 */
export function nextSnap(
  geo: Geometry,
  config: LevelConfig,
  position: number,
  pointerBoardX: number,
): number | null {
  const next = position + config.dir * config.step;
  const distance = Math.abs(pointerBoardX - caseCenterX(geo, next));
  return distance <= snapRadius(geo) ? next : null;
}

/**
 * Position du pion contrainte par la butée souple du dé.
 *
 * Le pion suit le doigt puis se bloque au compte du dé, sans message ni son :
 * le contrôle de l'erreur est dans le dispositif, pas dans un avertissement.
 */
export function clampToAllowance(
  position: number,
  config: LevelConfig,
  startPosition: number,
  allowance: number,
): number {
  const limit = startPosition + config.dir * allowance * config.step;
  return config.dir > 0 ? Math.min(position, limit) : Math.max(position, limit);
}

/** Nombre de cases franchies depuis le début du tour. */
export function hopsFrom(config: LevelConfig, startPosition: number, position: number): number {
  return Math.abs(position - startPosition) / config.step;
}

/**
 * Le doigt est-il sur le pion ?
 *
 * La zone couvre le personnage **et** la case sous lui, et déborde largement :
 * un enfant de 3 ans vise le milieu de ce qu'il veut attraper, pas ses contours.
 * Rater la prise est bien plus coûteux qu'une zone trop généreuse — rien d'autre
 * n'est cliquable à cet endroit.
 */
export function hitsPawn(geo: Geometry, pawnX: number, x: number, y: number): boolean {
  const top = geo.boardY - geo.caseSize * 1.8;
  const bottom = geo.boardY + geo.caseSize * 0.7;
  return Math.abs(x - pawnX) <= geo.caseSize * 0.85 && y >= top && y <= bottom;
}

export function hitsDie(geo: Geometry, x: number, y: number): boolean {
  const half = geo.dieSize * 0.75;
  return Math.abs(x - geo.dieX) <= half && Math.abs(y - geo.dieY) <= half;
}
