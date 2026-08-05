import { describe, expect, it } from 'vitest';
import { computeLayout, DOOR_ZONE, MIN_TARGET } from './layout';
import { configForLevel, MAX_ON_SCREEN, reserveSize } from './levels';

/**
 * Dalles de la classe visée : tablettes en paysage, 4:3 et 16:9.
 * La plus petite retenue est 960×540 — en deçà on est sur un téléphone, qui
 * n'est pas la cible et où trois bandes empilées ne tiennent de toute façon pas.
 */
const VIEWPORTS: Array<[number, number]> = [
  [1043, 595],
  [1280, 760],
  [1280, 800],
  [1024, 768],
  [960, 540],
  [1920, 1080],
];

/** Effectifs réellement produits par la table des niveaux. */
const SLOT_COUNTS = [1, 3, 5, 7, 10, MAX_ON_SCREEN];

describe('mise en page des Missions', () => {
  for (const [w, h] of VIEWPORTS) {
    for (const need of SLOT_COUNTS) {
      const layout = computeLayout(w, h, need, reserveSize(need));

      it(`ne chevauche pas véhicule et réserve — ${w}×${h}, ${need} alvéoles`, () => {
        const slotBottom = Math.max(...Array.from({ length: need }, (_, i) =>
          layout.slotOrigin.y + Math.floor(i / layout.slotColumns) * layout.slotPitch,
        )) + layout.slotSize / 2;

        const tokenTop = layout.reserveOrigin.y - layout.tokenSize / 2;

        // Deux objets empilés au même endroit, et l'enfant ne peut plus
        // attraper le bon : c'est le bug que ce test verrouille.
        expect(tokenTop).toBeGreaterThanOrEqual(slotBottom);
      });

      it(`garde tout à l'écran — ${w}×${h}, ${need} alvéoles`, () => {
        const reserve = reserveSize(need);
        const rows = Math.ceil(reserve / layout.reserveColumns);
        const lastRowY = layout.reserveOrigin.y + (rows - 1) * layout.reservePitch;

        expect(lastRowY + layout.tokenSize / 2).toBeLessThanOrEqual(h);
        expect(layout.reserveOrigin.y - layout.tokenSize / 2).toBeGreaterThanOrEqual(0);
        expect(layout.go.x + layout.go.r).toBeLessThanOrEqual(w);
        expect(layout.card.y + layout.card.h).toBeLessThanOrEqual(h);
      });

      it(`ne descend pas sous le seuil tactile — ${w}×${h}, ${need} alvéoles`, () => {
        // Une main de 3 ans est imprécise : on tolère une marge sous les 88 px
        // quand il y a vingt alvéoles, mais jamais un jeton minuscule.
        expect(layout.tokenSize).toBeGreaterThanOrEqual(MIN_TARGET * 0.68);
        expect(layout.slotSize).toBeGreaterThanOrEqual(MIN_TARGET * 0.58);
      });
    }
  }

  it('laisse toujours plus d’objets en réserve que d’alvéoles', () => {
    // Sans surplus, il n'y a aucune décision à prendre : l'enfant vide la
    // réserve et « réussit » sans avoir compté.
    for (let need = 1; need <= 30; need++) {
      expect(reserveSize(need)).toBeGreaterThan(need);
    }
  });

  it('ne demande jamais plus que ce qui tient à l’écran, à aucun niveau', () => {
    // La progression des niveaux hauts passe par l'opération, pas par un tas
    // plus gros : au-delà, la difficulté deviendrait visuelle et non numérique.
    for (let level = 0; level <= 40; level++) {
      const config = configForLevel(level);
      expect(config.max + config.addend).toBeLessThanOrEqual(MAX_ON_SCREEN);
      expect(config.max).toBeGreaterThanOrEqual(config.min);
    }
  });

  /*
   * Les deux portes flottent dans les coins bas, au-dessus du canvas : la
   * sortie de l'enfant à gauche, l'espace parent à droite.
   *
   * La réserve est la seule bande de l'atelier posée contre le bas de l'écran,
   * donc la seule qui puisse passer dessous. Elle l'a fait : la première caisse
   * était centrée à 70 px du bord gauche, sous une porte qui va jusqu'à 100.
   * L'enfant qui l'attrapait par le bas quittait l'atelier, et le moteur
   * comptait un abandon. Un tiers de sa surface de préhension ouvrait la porte.
   */
  it('ne pose aucune caisse sous les portes des coins bas', () => {
    for (const [w, h] of VIEWPORTS) {
      for (const need of SLOT_COUNTS) {
        const reserve = reserveSize(need);
        const layout = computeLayout(w, h, need, reserve);
        const where = `${w}×${h}, ${need} alvéoles`;

        const left = layout.reserveOrigin.x - layout.tokenSize / 2;
        expect(left, `bord gauche — ${where}`).toBeGreaterThanOrEqual(DOOR_ZONE);

        const lastColumn = Math.min(reserve, layout.reserveColumns) - 1;
        const right =
          layout.reserveOrigin.x + lastColumn * layout.reservePitch + layout.tokenSize / 2;
        expect(right, `bord droit — ${where}`).toBeLessThanOrEqual(w - DOOR_ZONE);
      }
    }
  });

  it('ne fait pas déborder les alvéoles sur le bouton de départ', () => {
    for (const [w, h] of VIEWPORTS) {
      const layout = computeLayout(w, h, 10, reserveSize(10));
      const rightMost = layout.slotOrigin.x + (layout.slotColumns - 1) * layout.slotPitch;
      expect(rightMost + layout.slotSize / 2).toBeLessThanOrEqual(layout.go.x - layout.go.r);
    }
  });
});
