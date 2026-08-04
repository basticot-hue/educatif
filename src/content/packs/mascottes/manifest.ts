/**
 * Pack « mascottes » — l'univers embarqué de la passe 1.
 *
 * Il est écrit en TypeScript plutôt qu'en JSON pour que Vite résolve les URL des
 * images, mais il est typé par `UniversePack`, exactement comme le seront les
 * packs importés depuis un `manifest.json` en passe 2. Un seul chemin de
 * contenu : remplacer cet univers ne demandera aucune recompilation du moteur.
 *
 * Les noms ne sont pas décoratifs. Toutes les attaques sont des consonnes
 * **continues** (m, f, ch, r) : elles peuvent être tenues à volonté, donc
 * entendues isolément — ce qui les rend utilisables par Le Sac de Chase en
 * passe 2. Les occlusives (p, b, t, d, k, g) ne peuvent pas être prolongées et
 * n'arrivent qu'aux niveaux hauts.
 *
 * Les nombres de syllabes couvrent 1, 2 et 3, de quoi alimenter Le Bal des
 * syllabes sans ajouter de contenu.
 */

import type { UniversePack } from '../../../engine/types';

import mila from './images/mila.svg';
import filou from './images/filou.svg';
import choum from './images/choum.svg';
import rosalie from './images/rosalie.svg';
import phare from './images/phare.svg';
import caisse from './images/caisse.svg';

export const mascottesPack: UniversePack = {
  id: 'mascottes',
  name: 'Les mascottes',
  version: 1,

  palette: {
    bg: '#0F2E4C',
    surface: '#FFFFFF',
    accent: '#E4B429',
    ink: '#12212E',
  },

  characters: [
    {
      id: 'mila',
      name: 'Mila',
      syllables: 2,
      onset: 'm', // « mmm », jamais « èm »
      coda: 'a',
      rime: 'a',
      image: mila,
      portrait: mila,
      voice: {},
      lines: {
        greet: "Bonjour ! C'est Mila.",
        praise: ['Bravo !', 'Très bien !', "C'est ça !"],
        retry: 'On recommence ensemble.',
      },
      roles: ['pion', 'guide'],
    },
    {
      id: 'filou',
      name: 'Filou',
      syllables: 2,
      onset: 'f', // « fff »
      coda: 'ou',
      rime: 'ou',
      image: filou,
      portrait: filou,
      voice: {},
      lines: {
        greet: 'Salut ! Moi, je suis Filou.',
        praise: ['Bravo !', 'Super !', 'Tu as réussi !'],
        retry: 'Encore une fois.',
      },
      roles: ['pion', 'guide'],
    },
    {
      id: 'choum',
      name: 'Choum',
      syllables: 1,
      onset: 'ch', // « chhh »
      coda: 'm',
      rime: 'oum',
      image: choum,
      portrait: choum,
      voice: {},
      lines: {
        greet: 'Coucou ! Je suis Choum.',
        praise: ['Bravo !', 'Oui !', 'Parfait !'],
        retry: 'On essaie encore.',
      },
      roles: ['pion', 'guide'],
    },
    {
      id: 'rosalie',
      name: 'Rosalie',
      syllables: 3,
      onset: 'r', // « rrr »
      coda: 'ie',
      rime: 'ie',
      image: rosalie,
      portrait: rosalie,
      voice: {},
      lines: {
        greet: 'Bonjour ! Je suis Rosalie.',
        praise: ['Bravo !', 'Très bien !', 'Magnifique !'],
        retry: 'Recommençons doucement.',
      },
      roles: ['pion', 'guide'],
    },
  ],

  /*
   * Les histoires du Récit.
   *
   * Chaque panneau montre **un objet différent** du pack : c'est la seule chose
   * qui permette de les distinguer une fois mélangés, et donc de les remettre
   * dans l'ordre. Deux panneaux montrant la même chose rendraient la tâche
   * insoluble sans avoir retenu les phrases mot à mot, ce qui n'est pas ce
   * qu'on travaille.
   *
   * Les phrases sont courtes, au présent, avec un seul événement chacune, et
   * l'ordre est **causal ou chronologique évident** — se réveiller vient avant
   * s'endormir. À trois ans et demi, l'enfant reconstruit une chronologie qu'il
   * a vécue ; il ne déduit pas encore d'un enchaînement abstrait.
   */
  stories: [
    {
      id: 'journee',
      title: 'La journée de Mila',
      characterId: 'mila',
      panels: [
        { id: 'reveil', wordId: 'lit', text: 'Le matin, Mila se réveille dans son lit.' },
        { id: 'repas', wordId: 'banane', text: 'Mila mange une banane.' },
        { id: 'sortie', wordId: 'velo', text: 'Mila part se promener à vélo.' },
        { id: 'nuit', wordId: 'lune', text: 'La lune se lève, et Mila s’endort.' },
      ],
      questions: [
        {
          id: 'mange',
          prompt: 'Qu’est-ce que Mila a mangé ?',
          options: ['banane', 'tomate', 'fraise'],
          answer: 'banane',
        },
        {
          id: 'promenade',
          prompt: 'Avec quoi Mila s’est-elle promenée ?',
          options: ['velo', 'bateau', 'moto'],
          answer: 'velo',
        },
      ],
    },
    {
      id: 'pluie',
      title: 'Filou sous la pluie',
      characterId: 'filou',
      panels: [
        { id: 'soleil', wordId: 'soleil', text: 'Filou joue dehors, il y a du soleil.' },
        { id: 'nuage', wordId: 'nuage', text: 'Un gros nuage arrive.' },
        { id: 'pluie', wordId: 'parapluie', text: 'Filou ouvre vite son parapluie.' },
        { id: 'retour', wordId: 'maison', text: 'Filou rentre à la maison, tout sec.' },
      ],
      questions: [
        {
          id: 'ouvre',
          prompt: 'Qu’est-ce que Filou a ouvert quand il a plu ?',
          options: ['parapluie', 'chapeau', 'valise'],
          answer: 'parapluie',
        },
        {
          id: 'avant',
          prompt: 'Qu’est-ce qu’il y avait dans le ciel au début ?',
          options: ['soleil', 'lune', 'nuage'],
          answer: 'soleil',
        },
      ],
    },
    {
      id: 'mer',
      title: 'Choum et le dauphin',
      characterId: 'choum',
      panels: [
        { id: 'chapeau', wordId: 'chapeau', text: 'Choum met son chapeau.' },
        { id: 'bateau', wordId: 'bateau', text: 'Choum monte dans le bateau.' },
        { id: 'dauphin', wordId: 'dauphin', text: 'Un dauphin saute tout près du bateau !' },
        { id: 'lit', wordId: 'lit', text: 'Le soir, Choum se couche dans son lit.' },
      ],
      questions: [
        {
          id: 'saute',
          prompt: 'Qui a sauté à côté du bateau ?',
          options: ['dauphin', 'tortue', 'canard'],
          answer: 'dauphin',
        },
        {
          id: 'tete',
          prompt: 'Qu’est-ce que Choum a mis sur sa tête ?',
          options: ['chapeau', 'jupe', 'nid'],
          answer: 'chapeau',
        },
      ],
    },
  ],

  activityAssets: {
    chemin: {
      // Le dé est dessiné directement au canvas plutôt que chargé en image :
      // l'animation de roulement doit pouvoir s'interrompre à la frame près.
      goal: phare,
    },
    missions: {
      // Le véhicule est dessiné au canvas — il doit pouvoir s'allonger selon le
      // nombre d'alvéoles, ce qu'une image fixe ne permet pas.
      object: caisse,
    },
  },
};

export default mascottesPack;
