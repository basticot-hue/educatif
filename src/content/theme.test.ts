import { describe, expect, it } from 'vitest';
import { PALETTES, SLOTS, SLOT_LABELS, paletteById } from './theme';
import { ACTIVITY_IDS } from '../engine/types';

/**
 * Luminance relative, formule WCAG. Elle sert ici à une seule question : la
 * carte blanche se détache-t-elle du fond, et l'accent se voit-il sur les deux ?
 */
function luminance(hex: string): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

describe('les palettes des personnages', () => {
  it('portent un identifiant unique', () => {
    const ids = PALETTES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PALETTES) expect(paletteById(p.id)).toBe(p);
  });

  it('ignorent un identifiant inconnu plutôt que de rendre n’importe quoi', () => {
    expect(paletteById('rose-fluo')).toBeNull();
    expect(paletteById(undefined)).toBeNull();
  });

  /*
   * Ces deux seuils sont la raison pour laquelle il n'y a pas de sélecteur de
   * couleur libre dans l'espace parent. Une carte qui ne se détache plus du
   * fond, ou un accent qui s'y noie, rendent l'application illisible — et
   * l'accent est le **seul** retour positif de tout le dispositif : s'il
   * s'efface, l'enfant ne sait plus qu'il a réussi.
   */
  it('détachent la carte du fond', () => {
    for (const p of PALETTES) {
      expect(contrast(p.surface, p.bg), p.name).toBeGreaterThanOrEqual(3);
    }
  });

  it('font ressortir l’accent sur le fond', () => {
    for (const p of PALETTES) {
      expect(contrast(p.accent, p.bg), p.name).toBeGreaterThanOrEqual(3);
    }
  });

  it('gardent une encre lisible sur la carte', () => {
    for (const p of PALETTES) {
      expect(contrast(p.ink, p.surface), p.name).toBeGreaterThanOrEqual(7);
    }
  });

  it('n’emploient que des couleurs hexadécimales pleines', () => {
    for (const p of PALETTES) {
      for (const value of [p.bg, p.surface, p.accent, p.ink]) {
        expect(value, `${p.name} : ${value}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });
});

describe('les emplacements d’image', () => {
  it('sont tous décrits au parent', () => {
    for (const slot of SLOTS) {
      expect(SLOT_LABELS[slot]?.name.length).toBeGreaterThan(0);
      expect(SLOT_LABELS[slot]?.where.length).toBeGreaterThan(0);
    }
  });

  it('visent des ateliers qui existent', () => {
    // `packForCharacter` range chaque image dans `activityAssets[atelier]` :
    // un atelier inconnu la rendrait invisible sans qu'aucune erreur ne sorte.
    const targets = ['chemin', 'missions', 'sons', 'chateau'];
    for (const target of targets) expect(ACTIVITY_IDS).toContain(target);
    expect(targets.length).toBe(SLOTS.length);
  });
});
