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

  // Le Récit est un atelier de la passe 2 ; le pack n'a pas encore d'histoires.
  stories: [],

  activityAssets: {
    chemin: {
      // Le dé est dessiné directement au canvas plutôt que chargé en image :
      // l'animation de roulement doit pouvoir s'interrompre à la frame près.
      goal: phare,
    },
  },
};

export default mascottesPack;
