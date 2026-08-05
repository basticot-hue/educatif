/**
 * Géométrie des Missions.
 *
 * Trois zones empilées : la carte mission en haut, le véhicule et ses alvéoles
 * au milieu, la réserve en bas. Tout est calculé pour que chaque alvéole et
 * chaque objet reste au-dessus de 88 px — au-delà d'une dizaine d'alvéoles,
 * c'est la taille qui commande le nombre de colonnes, pas l'inverse.
 */

export const MIN_TARGET = 88;
export const MIN_GAP = 24;

/**
 * Largeur interdite dans les deux coins bas : la porte de sortie de l'enfant à
 * gauche, la porte parent à droite.
 *
 * La réserve était posée à `gap + tokenSize / 2`, c'est-à-dire exactement sous
 * la porte de sortie. Un enfant qui visait la première caisse et touchait un peu
 * bas quittait l'atelier au lieu de charger le camion — le quart bas-gauche de
 * cette caisse ouvrait la porte, et le moteur comptait un abandon.
 *
 * Ce nombre double `--door-zone` dans `styles/tokens.css`, qui tient la même
 * réserve pour les ateliers bâtis en DOM. Les deux doivent bouger ensemble.
 */
export const DOOR_ZONE = 100;

/**
 * Écart entre deux caisses de la réserve.
 *
 * Plus serré que `MIN_GAP`, et c'est volontaire : les 24 px protègent le choix
 * entre deux cibles **différentes**, où toucher la voisine est une erreur. Dans
 * la réserve, toutes les caisses sont identiques et interchangeables — en
 * attraper une autre que celle visée n'a aucune conséquence. Serrer là permet
 * de rendre aux alvéoles, elles bien distinctes, la largeur prise par la
 * réserve des portes.
 */
export const RESERVE_GAP = 16;

export interface Layout {
  width: number;
  height: number;

  /** Carte mission (les pastilles à dénombrer). */
  card: { x: number; y: number; w: number; h: number };

  /** Alvéoles du véhicule. */
  slotOrigin: { x: number; y: number };
  slotColumns: number;
  slotPitch: number;
  slotSize: number;

  /** Réserve d'objets. */
  reserveOrigin: { x: number; y: number };
  reserveColumns: number;
  reservePitch: number;
  tokenSize: number;

  /** Bouton « Partez ! ». */
  go: { x: number; y: number; r: number };
  hitGo(x: number, y: number): boolean;
}

export function computeLayout(
  width: number,
  height: number,
  slotCount: number,
  reserveCount: number,
): Layout {
  const gap = MIN_GAP;

  /*
   * Trois bandes empilées, allouées de haut en bas : carte, véhicule, réserve.
   *
   * Elles sont calculées **dans cet ordre et sans se recouvrir**. Une première
   * version dimensionnait chaque bande en pourcentage de la hauteur, et sur une
   * dalle basse la réserve venait se poser sur le véhicule : deux objets
   * empilés au même endroit, impossible d'attraper le bon.
   */

  const cardH = Math.round(Math.max(84, Math.min(170, height * 0.24)));
  const cardW = Math.round(Math.min(width * 0.44, cardH * 1.6));
  const card = { x: Math.round((width - cardW) / 2), y: gap, w: cardW, h: cardH };

  /*
   * La réserve prend au plus un tiers de la hauteur, et le jeton rétrécit
   * jusqu'au plancher tactile plutôt que de déborder.
   *
   * Elle s'écarte aussi des deux coins bas, où flottent les portes : c'est la
   * seule bande de l'atelier qui les touche, puisqu'elle est posée contre le
   * bas de l'écran.
   */
  const reserveMaxH = height * 0.34;
  const reserveInset = gap + DOOR_ZONE;
  const reserveAreaW = Math.max(MIN_TARGET, width - reserveInset * 2);
  let tokenSize = 92;
  let reserveColumns = 1;
  let reserveRows = 1;
  for (;;) {
    // `n` caisses laissent `n - 1` intervalles, pas `n` : compter l'intervalle
    // de trop perdait une colonne entière sur les dalles étroites.
    reserveColumns = Math.max(
      1,
      Math.floor((reserveAreaW + RESERVE_GAP) / (tokenSize + RESERVE_GAP)),
    );
    reserveRows = Math.max(1, Math.ceil(reserveCount / reserveColumns));
    const needed = reserveRows * (tokenSize + RESERVE_GAP);
    if (needed <= reserveMaxH || tokenSize <= MIN_TARGET * 0.7) break;
    tokenSize -= 4;
  }
  tokenSize = Math.round(tokenSize);
  const reservePitch = tokenSize + RESERVE_GAP;
  const reserveH = reserveRows * reservePitch;

  const reserveOrigin = {
    x: Math.round(reserveInset + tokenSize / 2),
    y: Math.round(height - gap - tokenSize / 2 - (reserveRows - 1) * reservePitch),
  };

  // Ce qui reste entre la carte et la réserve revient au véhicule.
  const vehicleTop = card.y + cardH + gap;
  const vehicleBottom = height - reserveH - gap;
  const vehicleH = Math.max(MIN_TARGET, vehicleBottom - vehicleTop);
  const vehicleMidY = Math.round(vehicleTop + vehicleH / 2);

  const goR = Math.round(Math.min(Math.max(MIN_TARGET, height * 0.11), vehicleH * 0.6) / 2);
  const go = { x: width - goR - gap * 1.5, y: vehicleMidY, r: goR };

  /*
   * On choisit le plus petit nombre de colonnes qui garde l'alvéole au-dessus
   * du seuil tactile : mieux vaut deux rangées confortables qu'une rangée de
   * timbres-poste.
   */
  const slotAreaW = go.x - goR - gap * 2.5;

  /*
   * On retient la disposition qui **maximise** la taille d'alvéole, et on ne
   * clampe qu'à la baisse.
   *
   * Une version précédente forçait un plancher avec `Math.max(...)` : quand la
   * place manquait, l'alvéole était regonflée au-delà de ce qui tenait et la
   * seconde rangée débordait sur la réserve. Un plancher qui casse la
   * contrainte de place ne protège personne.
   */
  let slotColumns = 1;
  let slotSize = 0;
  for (let columns = 1; columns <= slotCount; columns++) {
    const rows = Math.ceil(slotCount / columns);
    const byWidth = (slotAreaW - gap * (columns - 1)) / columns;
    // Les roues et le plateau débordent de l'alvéole : on garde de la marge.
    const byHeight = (vehicleH * 0.78 - gap * (rows - 1)) / rows;
    const size = Math.min(byWidth, byHeight, 120);
    if (size > slotSize) {
      slotSize = size;
      slotColumns = columns;
    }
  }
  slotSize = Math.max(24, slotSize);

  const slotPitch = slotSize + gap;
  const slotRows = Math.ceil(slotCount / slotColumns);
  const slotsW = slotColumns * slotSize + (slotColumns - 1) * gap;

  const slotOrigin = {
    x: Math.round(gap * 1.5 + slotSize / 2 + Math.max(0, (slotAreaW - slotsW) / 2)),
    y: Math.round(vehicleMidY - ((slotRows - 1) * slotPitch) / 2),
  };

  return {
    width,
    height,
    card,
    slotOrigin,
    slotColumns,
    slotPitch,
    slotSize,
    reserveOrigin,
    reserveColumns,
    reservePitch,
    tokenSize,
    go,
    hitGo(x: number, y: number) {
      return Math.hypot(x - go.x, y - go.y) <= go.r * 1.25;
    },
  };
}
