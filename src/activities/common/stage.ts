/**
 * Petits utilitaires de construction DOM pour les ateliers.
 *
 * Les ateliers qui ne demandent pas de contrôle du geste au pixel près (choisir
 * parmi N, ranger dans une pièce, remettre en ordre) sont bâtis en DOM plutôt
 * qu'au canvas : c'est moins de code, et le navigateur gère déjà l'aimantation
 * visuelle, le rognage des images et l'accessibilité. Le canvas reste réservé
 * au Chemin, aux Missions et au Sable, où le geste est la tâche elle-même.
 */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  parent?: HTMLElement,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (parent) parent.appendChild(node);
  return node;
}

/** Racine d'un atelier DOM : occupe tout le conteneur, fond du pack. */
export function stage(container: HTMLElement): HTMLElement {
  const root = el('div', 'stage', container);
  return root;
}

export function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Mélange de Fisher-Yates. */
export function shuffle<T>(list: T[], random: () => number = Math.random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickOne<T>(list: T[], random: () => number = Math.random): T {
  return list[Math.floor(random() * list.length)];
}

/**
 * Tire `n` éléments distincts, en complétant par répétition si le vivier est
 * trop petit. Aux premiers usages de la Fabrique, il n'y a que trois objets :
 * mieux vaut répéter que ne rien proposer.
 */
export function sample<T>(list: T[], n: number, random: () => number = Math.random): T[] {
  if (list.length === 0) return [];
  const out = shuffle(list, random).slice(0, n);
  while (out.length < n) out.push(list[out.length % list.length]);
  return out;
}

/** Objet-URL révoqué automatiquement au démontage de l'atelier. */
export class BlobUrls {
  private urls: string[] = [];

  create(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    this.urls.push(url);
    return url;
  }

  revokeAll(): void {
    // Sans cela, une séance à la Fabrique laisserait plusieurs mégaoctets de
    // blobs vivants jusqu'au rechargement de la page.
    this.urls.forEach(URL.revokeObjectURL);
    this.urls = [];
  }
}
