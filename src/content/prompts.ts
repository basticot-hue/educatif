/**
 * Consignes parlées et documentation des ateliers — **une seule source**.
 *
 * Le même fichier alimente deux choses qui doivent rester d'accord :
 *
 * 1. ce que le personnage **dit** à l'enfant (qui ne lit pas) ;
 * 2. ce que l'espace parent **affiche** à l'adulte, qui doit savoir ce que
 *    l'atelier travaille et ce qu'on attend de l'enfant pour l'accompagner.
 *
 * Les tenir séparés garantissait qu'ils divergent. Une première version n'avait
 * tout simplement aucun texte pour les consignes : les clés existaient dans le
 * code des ateliers, mais rien ne les résolvait, et l'atelier restait muet sans
 * qu'aucune erreur ne le signale.
 *
 * **Zéro texte à l'écran des ateliers** reste la règle. La consigne passe par
 * le son, jamais par un libellé — un enfant de 3 ans et demi ne lit pas.
 */

import type { ActivityId, SkillId } from '../engine/types';

export interface ActivityDoc {
  id: ActivityId;
  /** Nom montré au parent. L'enfant, lui, reconnaît l'atelier à son motif. */
  name: string;
  /** Ce que l'atelier construit, en une phrase. */
  goal: string;
  /** Ce que l'enfant doit faire, concrètement. */
  childDoes: string;
  /** Pourquoi c'est fait comme ça — la raison pédagogique, pas la technique. */
  why: string;
  skills: SkillId[];
  /** Contenu de chaque niveau, du 0 au 6. Jamais montré à l'enfant. */
  levels: string[];
  /** Clé d'énoncé → texte prononcé. */
  prompts: Record<string, string>;
}

export const ACTIVITY_DOCS: ActivityDoc[] = [
  {
    id: 'chemin',
    name: 'Le Chemin',
    goal: 'Compter en avançant sur une piste, et comprendre que les nombres ont un ordre.',
    childDoes:
      'Il tape sur le dé, puis glisse le personnage case par case, en s’arrêtant au bon nombre.',
    why:
      'On énonce le numéro de la case — « sept, huit, neuf » — et jamais « un, deux, trois ». ' +
      'C’est cet énoncé ordinal, sur une piste droite, qui construit le sens du nombre. ' +
      'À partir du niveau 2 l’application se tait : c’est l’enfant qui compte à voix haute.',
    skills: ['counting.sequence'],
    levels: [
      'Cases 1 à 3, le personnage est déjà sur la case 1.',
      'Cases 1 à 5.',
      'Cases 1 à 10 — l’enfant énonce les numéros lui-même.',
      'Cases 1 à 20, la piste défile.',
      'Le départ n’est plus la case 1 : il faut repartir de 7, de 12…',
      'On recule : compter à rebours.',
      'On avance de 2 en 2, puis de 5 en 5.',
    ],
    prompts: {
      'chemin.roll': 'Tape sur le dé.',
      'chemin.move': 'Maintenant avance, une case à la fois.',
      'chemin.say': 'À toi de compter les cases, tout haut.',
    },
  },
  {
    id: 'missions',
    name: 'Les Missions',
    goal: 'Donner un objet et un seul par emplacement, puis savoir dire combien il y en a.',
    childDoes:
      'Il regarde la carte, puis glisse une caisse par alvéole du camion, et appuie sur la flèche pour le faire partir.',
    why:
      'La réserve contient toujours plus de caisses que nécessaire : sans ce surplus, il n’y a ' +
      'aucune décision à prendre. On glisse au lieu de taper, parce que le tap rapide casse le ' +
      'lien « un geste, un objet ». Si le compte est faux, le camion avance à peine et s’arrête — ' +
      'aucun son d’échec, l’alvéole vide dit ce qui manque.',
    skills: [
      'counting.compare',
      'counting.subitize',
      'counting.one_to_one',
      'counting.cardinal',
      'counting.arithmetic',
    ],
    levels: [
      'Deux tas : lequel en a le plus ? L’enfant désigne.',
      'Charger 1 à 3 caisses, points disposés comme sur un dé.',
      'Charger 1 à 5 — puis dire combien il en a chargé.',
      'Charger 1 à 10.',
      'Les points sont en désordre : impossible de reconnaître une forme apprise.',
      'Le camion est déjà à moitié plein : il en manque combien ?',
      'Il en faut 2 de plus — première addition.',
    ],
    prompts: {
      'mission.compare': 'Lequel en a le plus ? Montre-le du doigt.',
      'mission.charge': 'Regarde la carte, et mets autant de caisses dans le camion.',
      'mission.combien': 'Et combien en as-tu mis ? Dis-le tout haut.',
      'mission.missing': 'Le camion est à moitié plein. Complète-le.',
      'mission.addition': 'Il en faut deux de plus. Ajoute-les.',
    },
  },
];

/* ------------------------------------------------------------------ */

/** Toutes les consignes, à plat : clé d'énoncé → texte. */
export const PROMPTS: Record<string, string> = Object.fromEntries(
  ACTIVITY_DOCS.flatMap((doc) => Object.entries(doc.prompts)),
);

export function promptText(key: string): string | null {
  return PROMPTS[key] ?? null;
}

export function docFor(id: ActivityId): ActivityDoc | undefined {
  return ACTIVITY_DOCS.find((d) => d.id === id);
}

/** Clés de consigne, pour que le parent puisse les enregistrer de sa voix. */
export const PROMPT_KEYS = Object.keys(PROMPTS);
