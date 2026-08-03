/**
 * Niveaux du Chemin et vivier d'items.
 *
 * L'item n'est pas « ce lancer de dé » — un lancer ne revient jamais et sa dette
 * n'aurait aucun sens. L'item est le couple (case de départ, nombre de cases à
 * franchir) : « partir de 7, avancer de 3 ». Ce grain est fini, il récurre, et
 * il isole les vraies difficultés — le passage de 9 à 10, de 19 à 20.
 */

import type { Item } from '../../engine/types';

export interface LevelConfig {
  /** Nombre de cases du plateau. */
  size: number;
  /** Face maximale du dé. */
  maxRoll: number;
  /** Pas : 1, puis 2 puis 5 aux niveaux hauts. */
  step: number;
  /** +1 on avance, −1 on recule. */
  dir: 1 | -1;
  /** À partir du niveau 2, l'app se tait et c'est l'enfant qui énonce. */
  childSpeaks: boolean;
  /** Où poser le pion en début de plateau. */
  start: 'first' | 'last' | 'random';
}

/**
 * Aucun plafond : au-delà du niveau 6, le plateau s'allonge indéfiniment. Un
 * enfant en avance ne doit jamais rencontrer de mur.
 */
export function configForLevel(level: number): LevelConfig {
  switch (level) {
    case 0:
      // Pion déjà sur la case 1 : il n'y a que le comptage à gérer.
      return { size: 3, maxRoll: 3, step: 1, dir: 1, childSpeaks: false, start: 'first' };
    case 1:
      return { size: 5, maxRoll: 3, step: 1, dir: 1, childSpeaks: false, start: 'first' };
    case 2:
      return { size: 10, maxRoll: 3, step: 1, dir: 1, childSpeaks: true, start: 'first' };
    case 3:
      return { size: 20, maxRoll: 3, step: 1, dir: 1, childSpeaks: true, start: 'first' };
    case 4:
      // Repartir d'ailleurs que de 1 : c'est là qu'on voit si l'enfant récite
      // une comptine apprise par cœur ou s'il compte vraiment.
      return { size: 20, maxRoll: 3, step: 1, dir: 1, childSpeaks: true, start: 'random' };
    case 5:
      return { size: 20, maxRoll: 3, step: 1, dir: -1, childSpeaks: true, start: 'last' };
    case 6:
      return { size: 20, maxRoll: 3, step: 2, dir: 1, childSpeaks: true, start: 'first' };
    case 7:
      return { size: 30, maxRoll: 3, step: 5, dir: 1, childSpeaks: true, start: 'first' };
    default: {
      const extra = level - 7;
      return {
        size: 30 + extra * 10,
        maxRoll: 3,
        step: 5,
        dir: 1,
        childSpeaks: true,
        start: 'random',
      };
    }
  }
}

/**
 * Identifiant canonique d'un item.
 *
 * Il ne contient **pas** la taille du plateau : « partir de 7, avancer de 3 »
 * est la même compétence au niveau 2 (plateau de 10) et au niveau 3 (plateau de
 * 20). Les identifiants sont donc partagés entre niveaux, ce qui fait que la
 * révision des petits nombres au niveau 3 s'appuie sur l'historique réel du
 * niveau 2. Le sens et le pas, eux, changent la tâche : ils entrent dans la clé.
 */
export function itemId(config: LevelConfig, start: number, count: number): string {
  const sign = config.dir > 0 ? 'p' : 'm';
  return `chemin.seq.${sign}${config.step}.${start}_${count}`;
}

export function buildItem(config: LevelConfig, level: number, start: number, count: number): Item {
  return {
    id: itemId(config, start, count),
    skill: 'counting.sequence',
    level,
    params: { start, count, step: config.step, dir: config.dir },
  };
}

/** Toutes les combinaisons (départ, nombre de cases) qui tiennent sur le plateau. */
export function poolForLevel(level: number): Item[] {
  const config = configForLevel(level);
  const items: Item[] = [];

  for (let start = 1; start <= config.size; start++) {
    for (let count = 1; count <= config.maxRoll; count++) {
      const landing = start + config.dir * count * config.step;
      if (landing < 1 || landing > config.size) continue;
      items.push(buildItem(config, level, start, count));
    }
  }

  return items;
}

/** Cases traversées, dans l'ordre où l'enfant doit les énoncer. */
export function casesCrossed(config: LevelConfig, start: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => start + config.dir * (i + 1) * config.step);
}

/** Nombre maximal de bonds encore possibles depuis cette case. */
export function remainingHops(config: LevelConfig, position: number): number {
  const distance = config.dir > 0 ? config.size - position : position - 1;
  return Math.floor(distance / config.step);
}

export function initialPosition(config: LevelConfig, random: () => number): number {
  if (config.start === 'last') return config.size;
  if (config.start === 'random') {
    // On garde de la marge pour que le plateau vaille le déplacement.
    const span = Math.max(1, Math.floor(config.size / 2));
    return 1 + Math.floor(random() * span);
  }
  return 1;
}
