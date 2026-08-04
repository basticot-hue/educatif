# Educatif

Application d'apprentissage sur tablette pour un enfant de 3 ans et demi. PWA installée,
hors ligne, plein écran, sans compte ni serveur.

Les **sept ateliers** sont là, chacun sur ses sept niveaux :

| Atelier | Travaille | Geste |
| --- | --- | --- |
| Le Chemin | compter en avançant sur une piste | glisser le pion case par case |
| Les Missions | un objet par emplacement, puis combien | glisser une caisse par alvéole |
| Le Bal des syllabes | rimes, puis découpage en morceaux | frapper dans ses mains, poser la carte |
| Le Sac de Chase | le son du début, puis celui de la fin | écouter, puis glisser dans le bon sac |
| Le Sable | conduire un geste, puis tracer des lettres | suivre un sillon du doigt |
| Le Château des mots | ranger par familles, connaître les mots | écouter, puis glisser dans la bonne salle |
| Le Récit | tenir une histoire entière en tête | remettre les images dans l'ordre |

S'y ajoutent deux espaces **sans consigne**, où rien n'est demandé ni évalué :

- **La Fabrique** — l'enfant photographie ses propres objets et dit leur nom ; ils alimentent
  ensuite les ateliers de sons.
- **Le Studio** — le mur des trésors, et une feuille pour dessiner. C'est le seul endroit où
  l'enfant revoit ce qu'il a produit, et la seule progression visible de l'application : ses
  tracés, ses objets, ses dessins. Aucun score, aucune étoile, aucune série de jours.

Deux mécaniques partagées portent les ateliers de langage :

- **choisir parmi N** (`activities/common/choice.ts`) — taper une option la choisit ;
- **écouter puis glisser** (`activities/common/sort.ts`) — taper une carte la **nomme**,
  glisser répond. C'est le mode par défaut dès qu'il y a des mots en jeu : devant deux images
  muettes, un enfant qui ne connaît pas le mot ne compare pas des sons, il tape au hasard — et
  le moteur enregistre ce hasard comme une réussite ou un échec de phonologie.

## Démarrer

```bash
npm install
```

```bash
npm run dev -- --host
```

```bash
npm test
```

Les icônes PNG de la PWA sont générées sans dépendance (`node:zlib` suffit) :

```bash
node scripts/gen-icons.mjs
```

## Déploiement

Pousser sur `main` déclenche le workflow GitHub Actions, qui construit et publie sur GitHub
Pages. Le site est servi sous `/educatif/` — c'est le `base` de Vite, et le `scope` du service
worker. Renommer le dépôt impose de changer les deux.

Activer une fois : **Settings → Pages → Source : GitHub Actions**.

## Sur la tablette

1. Ouvrir l'URL GitHub Pages dans Chrome, puis **installer** l'app (bannière, ou espace parent).
   L'installation n'est pas cosmétique : elle donne le plein écran, le verrouillage en paysage
   et le stockage durable.
2. Ouvrir l'espace parent — **appui long de 2 s dans le coin bas-droit**, puis `7 × 8`.
3. Y enregistrer sa voix pour les **nombres 1 à 20**. C'est la première chose à faire : la
   synthèse vocale d'Android met 200 à 400 ms à démarrer, ce qui casse le lien entre le doigt
   qui arrive sur la case et le mot entendu.
4. Activer l'**épinglage d'écran** d'Android (la marche à suivre est dans l'espace parent).
   C'est le vrai verrou de séance.

Le débogage se fait **sur la tablette**, via `chrome://inspect` en USB. L'émulation tactile de
DevTools ne reproduit ni la latence ni le bruit de la dalle, et ne dit donc rien d'utile.

## Architecture

Une activité est **une mécanique paramétrée par des données**. Le moteur ne connaît rien du
contenu ; un univers est un dossier de fichiers.

```
src/
  engine/       contrat, persistance, maîtrise, planification, séance, audio, voix, plateforme
  activities/   un dossier par atelier, plus `common/` : les mécaniques partagées
  content/      packs d'univers, missions hors écran, photos substituées aux dessins
  shell/        écrans React : accueil, étagère, interlude, mission, fin, espace parent
```

Le contrat `Activity` est **impératif** (`mount` / `unmount`), volontairement hors de React :
les ateliers pilotent un canvas avec capture de pointeur, et passer par la réconciliation
créerait des conflits de cycle de vie. `shell/ActivityHost.tsx` fait le pont.

**Ce qui doit rester vrai** en ajoutant un atelier :

- Rien ne bouge pendant une tâche, hors mouvement fonctionnel. Le personnage encadre, il ne
  décore pas.
- Aucune récompense extrinsèque, aucun score, aucun niveau affiché, aucun atelier verrouillé.
- L'erreur n'est pas un évènement : pas de croix, pas de son grave. Le contrôle de l'erreur est
  dans le dispositif — une trace qui ne s'écrit pas, un véhicule qui ne démarre pas.
- Chaque atelier comporte un moment où l'enfant **dit** quelque chose à voix haute.
- Zéro texte hors de l'espace parent. Cibles ≥ 88 px, espacées de ≥ 24 px.
- **Aucune image muette sur laquelle on demande de décider.** Si la tâche porte sur un mot, ce
  mot doit avoir été entendu, et pouvoir être réentendu d'un simple contact.
- **Jamais un nom de lettre.** Un sac se désigne par un mot entier (« comme papillon »), une
  lettre tracée se conclut par un mot (« lune » pour le L). « cé » à la place de « chhh »
  devra être désappris.
- Les transitions d'état passent par des `setTimeout`, jamais par `requestAnimationFrame` :
  celui-ci est suspendu en arrière-plan et laisserait la séance figée.

## Écarts assumés par rapport à la spécification

- **« L'app se ferme »** n'est pas réalisable : `window.close()` est refusé sur une fenêtre que
  le script n'a pas ouverte, PWA installée comprise. À la place, un écran terminal sans aucune
  cible tactile, dont on ne sort que par l'espace parent. L'intention — jamais de « encore une
  partie ? » — est préservée ; le verrou réel est l'épinglage d'écran.
- **Relance dans l'heure** : conforme à la spécification — on arrive au Studio. La séance ne se
  rejoue pas, mais l'enfant qui revient trouve de quoi faire plutôt qu'un écran mort. Il n'y a
  simplement rien à y réussir.
- **Images des mots** : aucune photographie n'est livrée. Une banque d'images pèserait
  plusieurs dizaines de mégaoctets à embarquer hors ligne et ne se redistribuerait pas sans
  conditions. Les mots sont donc dessinés — contour d'encre et ombre au sol, parce qu'à cet âge
  une image se lit par ses bords — et le parent remplace n'importe lequel par **sa** photo
  depuis la planche des mots. C'est ce remplacement qui est le vrai correctif, pas le dessin.
- **Panneaux du Récit** : ils se composent d'un personnage et d'un objet du pack plutôt que
  d'être illustrés un à un. Une illustration par panneau demanderait un dessinateur à chaque
  histoire ajoutée, alors qu'un pack doit pouvoir s'écrire en quelques lignes.
- **Ordre de révision** : la spécification écrit « par ordre de dette croissante ». Pris à la
  lettre, cela reverrait en priorité l'item vu il y a cinq minutes et jamais celui vu il y a
  seize jours, ce qui annule la répétition espacée. `scheduler.ts` trie donc par dette
  **décroissante**.
- **Sonde tactile** : la mesure d'échantillonnage exigée avant Le Sable est déjà en place dans
  l'espace parent, pour ne pas avoir à redéployer et refaire une séance juste pour mesurer.

## Contenu

Le pack embarqué (`content/packs/mascottes/`) utilise **quatre personnages originaux**. Les
noms sont choisis pour leurs propriétés phonologiques : attaques toutes **continues**
(m, f, ch, r), tenables à volonté donc audibles isolément, et nombres de syllabes variés (1, 2,
3). C'est ce qui les rendra utilisables tels quels par Le Sac de Chase et Le Bal des syllabes.

`onset` est toujours un **son**, jamais un nom de lettre : on stocke `"ch"` et on joue
« chhh ». Un enfant qui apprend « cé » au lieu de « chhh » devra désapprendre.

Le manifeste est typé par la même interface que les futurs packs importables : remplacer
l'univers ne demandera aucune recompilation du moteur.
