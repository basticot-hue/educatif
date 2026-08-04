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
  {
    id: 'syllabes',
    name: 'Le Bal des syllabes',
    goal: 'Entendre qu’un mot est fait de morceaux, et savoir combien il en a.',
    childDoes:
      'Il écoute le mot découpé, frappe une fois dans ses mains par morceau, puis pose la carte sur le podium 1, 2 ou 3.',
    why:
      'L’ordre des niveaux suit l’ordre développemental réel : rime, puis syllabe, puis son isolé. ' +
      'La rime s’entend bien avant qu’on puisse isoler un son, d’où le niveau 0. ' +
      'On frappe dans les mains parce que le rythme du corps donne accès au découpage mieux que l’écoute seule. ' +
      'Le micro ne juge rien : il fait seulement monter le personnage d’une marche par frappe — ' +
      'c’est le podium choisi qui compte. Si le micro est refusé ou la pièce bruyante, on frappe sur l’écran, sans que rien ne le signale à l’enfant.',
    skills: ['phono.rhyme', 'phono.syllable'],
    levels: [
      'Les rimes : « chat » va avec « rat » ou avec « lune » ?',
      'Mots de 2 syllabes.',
      'Mots de 3 syllabes — l’enfant frappe et dit chaque morceau.',
      'Contraste fort : 1 syllabe contre 3.',
      'Où entends-tu ce morceau dans le mot ? Au début, au milieu, à la fin.',
      'Le mot sans son dernier morceau, ça fait quoi ?',
      'Inverser deux morceaux.',
    ],
    prompts: {
      'syllabes.rime': 'Écoute bien. Quel mot finit pareil ?',
      'syllabes.frapper': 'Frappe dans tes mains, une fois par morceau.',
      'syllabes.podium': 'Maintenant, pose la carte sur le bon podium.',
      'syllabes.localiser': 'Écoute où se trouve ce morceau dans le mot.',
      'syllabes.supprimer': 'Enlève le dernier morceau. Quel morceau reste à la fin ?',
      'syllabes.inverser': 'Montre le deuxième morceau du mot.',
    },
  },
  {
    id: 'sons',
    name: 'Le Sac de Chase',
    goal: 'Entendre par quel son un mot commence, puis par lequel il finit.',
    childDoes:
      'Il touche les sacs pour les entendre, touche les objets pour les entendre, ' +
      'puis glisse chaque objet dans le sac dont le mot commence pareil.',
    why:
      'Un sac ne porte jamais de lettre : il est désigné par un mot entier qu’on entend — ' +
      '« le sac de papillon ». C’est ainsi qu’on procède en maternelle, et cela évite le piège ' +
      'du domaine : un enfant qui apprend « cé » là où il faut entendre « chhh » devra ' +
      'désapprendre. Les sons continus (s, l, f, m, ch, v, r, j, z, n) viennent d’abord parce ' +
      'qu’ils se tiennent à volonté, donc s’entendent seuls ; les occlusives (p, b, t, d, k, g) ' +
      'ne se prolongent pas et n’arrivent qu’au niveau 4. Ce n’est pas une difficulté abstraite, ' +
      'c’est de l’acoustique.',
    skills: ['phono.onset', 'phono.coda', 'phono.blend'],
    levels: [
      'Deux sacs, deux objets. Sons continus seulement.',
      'Deux sacs, trois objets.',
      'Trois sacs — l’enfant redit le mot en le rangeant.',
      'Trois sacs, quatre objets.',
      'Les sons qui claquent entrent en jeu : p, b, t, d, k, g.',
      'On écoute la **fin** du mot, plus le début.',
      'Le mot est dit en morceaux détachés : l’enfant retrouve le mot entier.',
    ],
    prompts: {
      'sons.attaque': 'Écoute bien le début des mots, et range chaque objet dans son sac.',
      'sons.finale': 'Cette fois, écoute la fin des mots.',
      'sons.fusion': 'J’ai coupé un mot en morceaux. Devine lequel c’est.',
    },
  },
  {
    id: 'sable',
    name: 'Le Sable',
    goal: 'Conduire un geste jusqu’au bout, puis tracer des lettres.',
    childDoes:
      'Il pose le doigt sur le point vert et suit le sillon. Hors du sillon, rien ne s’écrit.',
    why:
      'Le contrôle de l’erreur est entièrement dans le dispositif : la trace ne se dépose que ' +
      'dans le couloir. Aucune croix, aucun son, aucun message — le doigt sort, la trace ' +
      's’arrête ; il revient, elle reprend. La largeur du couloir dépend de la **dalle** : la ' +
      'sonde tactile de cet espace la mesure, et un écran lent obtient un couloir plus large. ' +
      'Sans cela, l’enfant vivrait un échec qu’il n’a pas commis. On ne dit jamais le nom d’une ' +
      'lettre : après avoir tracé un L, l’enfant redit « lune ».',
    skills: ['letter.pregraphism', 'letter.trace'],
    levels: [
      'Le trait vertical, puis le trait horizontal.',
      'Les obliques, et le premier changement de direction.',
      'Le rond, le pont, le creux.',
      'Vagues et zigzags — l’enfant dit ce qu’il a tracé.',
      'Premières lettres, faites de traits droits : L, T, V, N.',
      'Lettres à courbe : C, S, P, J.',
      'Lettres à plusieurs traits : M, F, R, Z.',
    ],
    prompts: {
      'sable.tracer': 'Pose ton doigt sur le point vert, et suis le chemin.',
      'sable.lettre': 'Suis le chemin de la lettre, sans lever le doigt.',
    },
  },
  {
    id: 'chateau',
    name: 'Le Château des mots',
    goal: 'Ranger les mots par familles — et savoir ce qu’un mot désigne.',
    childDoes:
      'Il écoute les salles et les objets, puis glisse chaque objet dans la salle où il vit.',
    why:
      'Classer est ce qui fait passer un mot du statut d’étiquette à celui de sens : un enfant ' +
      'qui range la banane avec la fraise et non avec le lapin sait de « banane » quelque chose ' +
      'que la répétition du mot ne lui donne pas. L’enseigne d’une salle ne change jamais d’une ' +
      'séance à l’autre — sinon l’enfant réapprend un décor au lieu de classer. Au dernier ' +
      'niveau, toutes les cartes sont de la même famille : il ne reste que le mot à reconnaître.',
    skills: ['lang.category', 'lang.vocabulary'],
    levels: [
      'Deux salles, deux objets.',
      'Deux salles, trois objets.',
      'Trois salles — l’enfant nomme ce qu’il range.',
      'Trois salles, quatre objets.',
      'L’intrus : trois objets d’une famille, un qui n’en est pas.',
      'Trois salles, cinq objets.',
      'Apporter l’objet nommé, parmi ses voisins de famille.',
    ],
    prompts: {
      'chateau.ranger': 'Écoute, puis range chaque objet dans sa salle.',
      'chateau.intrus': 'Un objet n’est pas de la famille. Mets-le dehors.',
      'chateau.apporter': 'Apporte-moi…',
      'chateau.dehors': 'dehors',
      'chateau.salle.animaux': 'les animaux',
      'chateau.salle.cuisine': 'la cuisine',
      'chateau.salle.dehors': 'le jardin',
      'chateau.salle.jouets': 'les jouets',
      'chateau.salle.habits': 'les habits',
      'chateau.salle.chambre': 'la chambre',
      'chateau.salle.corps': 'le corps',
    },
  },
  {
    id: 'recit',
    name: 'Le Récit',
    goal: 'Tenir une histoire entière en tête, et la remettre dans l’ordre.',
    childDoes:
      'Il écoute l’histoire, puis glisse les images à leur place. Toucher une image la redit.',
    why:
      'Remettre en ordre des images entendues une seule fois serait une épreuve de mémoire ' +
      'immédiate, pas de récit : chaque image se redit d’un simple contact, autant de fois qu’il ' +
      'le faut. Les histoires sont chronologiques et non allusives — à cet âge, l’enfant ' +
      'reconstruit un enchaînement qu’il a vécu (se réveiller, puis s’endormir), il ne déduit ' +
      'pas encore. Chaque panneau montre un objet différent : c’est ce qui les rend ' +
      'distinguables une fois mélangés.',
    skills: ['lang.narrative'],
    levels: [
      'Deux images à remettre dans l’ordre.',
      'Trois images.',
      'Trois images — l’enfant raconte à son tour.',
      'Quatre images.',
      'Une question sur l’histoire, deux réponses possibles.',
      'Quatre images, et une question à trois réponses.',
      'Ordonner **puis** répondre, sur la même histoire.',
    ],
    prompts: {
      'recit.ecoute': 'Écoute bien l’histoire.',
      'recit.ordonner': 'Maintenant, remets les images dans l’ordre.',
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
