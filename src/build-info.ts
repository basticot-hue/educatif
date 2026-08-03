/**
 * Empreinte de la version construite.
 *
 * Ces constantes sont remplacées à la compilation par Vite (`define`). Sans
 * elles, impossible de savoir si la tablette exécute la dernière version ou une
 * ancienne retenue par le service worker — et la question se pose à chaque
 * déploiement, sans qu'on puisse y répondre autrement qu'en devinant.
 */

declare const __BUILD_COMMIT__: string;
declare const __BUILD_DATE__: string;

export const BUILD_COMMIT: string =
  typeof __BUILD_COMMIT__ === 'string' ? __BUILD_COMMIT__ : 'dev';

export const BUILD_DATE: string =
  typeof __BUILD_DATE__ === 'string' ? __BUILD_DATE__ : new Date().toISOString();

export function buildLabel(): string {
  const date = new Date(BUILD_DATE);
  if (Number.isNaN(date.getTime())) return BUILD_COMMIT;
  return `${date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })} · ${BUILD_COMMIT}`;
}
