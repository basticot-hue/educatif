# Educatif — passe 1

Application d'apprentissage sur tablette pour un enfant de 3 ans et demi. PWA installée,
hors ligne, plein écran, sans compte ni serveur.

Cette passe livre la **fondation complète** et **un seul atelier** — Le Chemin, sur ses sept
niveaux. Les six autres viendront en passe 2, après une séance réelle observée : plusieurs
paramètres (longueur d'une série, appétence pour le glisser-déposer, acceptation de parler à
voix haute) ne peuvent pas être tranchés autrement.

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
  activities/   un dossier par atelier — seul `chemin/` existe en passe 1
  content/      packs d'univers, missions hors écran
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
- Les transitions d'état passent par des `setTimeout`, jamais par `requestAnimationFrame` :
  celui-ci est suspendu en arrière-plan et laisserait la séance figée.

## Écarts assumés par rapport à la spécification

- **« L'app se ferme »** n'est pas réalisable : `window.close()` est refusé sur une fenêtre que
  le script n'a pas ouverte, PWA installée comprise. À la place, un écran terminal sans aucune
  cible tactile, dont on ne sort que par l'espace parent. L'intention — jamais de « encore une
  partie ? » — est préservée ; le verrou réel est l'épinglage d'écran.
- **Relance dans l'heure** : la spécification renvoie vers le Studio, qui n'existe pas en
  passe 1. On va donc directement à l'écran terminal.
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
