import { describe, expect, it } from 'vitest';
import { idFromName, isContinuant, ONSET_CHOICES, suggestSplit } from './characters';
import { WORDS } from './packs/mascottes/words';

/** Découpage proposé, sous forme lisible. */
const split = (name: string) => suggestSplit(name).join('-');

describe('découpage proposé', () => {
  it('gère les prénoms que le parent va saisir', () => {
    expect(split('Zuma')).toBe('Zu-ma');
    expect(split('Rosalie')).toBe('Ro-sa-lie');
    expect(split('Hannah')).toBe('Han-nah');
  });

  it('ne compte pas le « e » final muet', () => {
    /*
     * C'est l'erreur qui coûte le plus cher : « Chase » se frappe en une fois,
     * « Raiponce » en deux. Compter ce « e » apprendrait à l'enfant un
     * découpage qu'il n'entend jamais.
     */
    expect(suggestSplit('Chase')).toHaveLength(1);
    expect(suggestSplit('Raiponce')).toHaveLength(2);
    expect(suggestSplit('banane')).toHaveLength(2);
    expect(suggestSplit('tomate')).toHaveLength(2);
    expect(suggestSplit('lune')).toHaveLength(1);
    expect(suggestSplit('prune')).toHaveLength(1);
  });

  it('ne perd aucune lettre du nom', () => {
    // Une version antérieure avalait le « s » de Marcus.
    for (const name of ['Marcus', 'Raiponce', 'Stella', 'Zuma', 'Hannah', 'chocolat', 'soleil']) {
      expect(suggestSplit(name).join(''), name).toBe(name);
    }
  });

  it('garde les groupes inséparables avec la syllabe suivante', () => {
    // « ch », « pl », « tr » ne se coupent pas.
    expect(split('chocolat')).toBe('cho-co-lat');
    expect(split('parapluie')).toBe('pa-ra-pluie');
    expect(split('chapeau')).toBe('cha-peau');
  });

  it('sépare une double consonne', () => {
    expect(split('Stella')).toBe('Stel-la');
  });

  it('ferme la voyelle sur une nasale', () => {
    expect(split('maison')).toBe('mai-son');
  });

  it('vise le bon nombre de morceaux, la frontière exacte restant approximative', () => {
    /*
     * « papillon » sort en pa-pil-lon là où l'oreille entend pa-pi-llon : le
     * « ll » après un i se prononce comme un yod, ce qu'aucune règle simple ne
     * capture. Le **compte** est juste, et c'est lui qui gouverne la frappe
     * dans les mains. La frontière exacte se corrige à l'écoute — d'où le
     * bouton « Écouter » avant validation.
     */
    expect(suggestSplit('papillon')).toHaveLength(3);
    expect(suggestSplit('soleil')).toHaveLength(2);
    expect(suggestSplit('éléphant')).toHaveLength(3);
  });

  it('rend un seul morceau pour un nom sans découpe possible', () => {
    expect(suggestSplit('Bob')).toHaveLength(1);
    expect(suggestSplit('')).toHaveLength(0);
  });

  it('retrouve le découpage des mots du pack dans la grande majorité des cas', () => {
    /*
     * Le vrai juge reste l'oreille du parent : cette suggestion n'existe que
     * pour lui éviter de tout taper au doigt. On vérifie néanmoins qu'elle
     * tombe juste sur l'essentiel du contenu réel, sans quoi elle ferait plus
     * de mal que de bien.
     */
    const justes = WORDS.filter((w) => suggestSplit(w.label).length === w.syllables);
    expect(justes.length / WORDS.length).toBeGreaterThan(0.8);
  });
});

describe('identifiants', () => {
  it('sont lisibles et sans accent', () => {
    expect(idFromName('Raiponce')).toBe('raiponce');
    expect(idFromName('Éléphant Bleu')).toBe('elephant-bleu');
  });

  it('restent utilisables sur un nom vide ou exotique', () => {
    expect(idFromName('  ').length).toBeGreaterThan(0);
    expect(idFromName('★★').length).toBeGreaterThan(0);
  });
});

describe("sons d'attaque proposés", () => {
  it('mettent les continues en tête', () => {
    // Ce sont les seules utilisables aux niveaux bas : elles se tiennent, donc
    // elles s'entendent isolément.
    const premieres = ONSET_CHOICES.slice(0, 8);
    expect(premieres.every((o) => o.continuant)).toBe(true);
  });

  it('marquent correctement les occlusives', () => {
    expect(isContinuant('ch')).toBe(true);
    expect(isContinuant('z')).toBe(true);
    expect(isContinuant('p')).toBe(false);
    expect(isContinuant('t')).toBe(false);
  });

  it('offrent une option pour les noms commençant par une voyelle', () => {
    // « Hannah » commence par une voyelle malgré son h.
    expect(ONSET_CHOICES.some((o) => o.value === 'voyelle')).toBe(true);
  });

  it("n'utilisent jamais un nom de lettre", () => {
    for (const choice of ONSET_CHOICES) {
      expect(choice.value).not.toMatch(/^(zède|cé|bé|effe|elle|emme)$/);
    }
  });
});
