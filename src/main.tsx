import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './shell/App';
import './styles/tokens.css';

/*
 * Recharge la page dès qu'une nouvelle version prend le relais.
 *
 * Le service worker récupère bien la nouvelle version en arrière-plan, mais la
 * page déjà ouverte continue d'exécuter l'ancienne jusqu'à un rechargement
 * manuel — et il en fallait souvent deux. Résultat : la tablette affichait une
 * version périmée sans que rien ne l'indique, et sans moyen simple de forcer
 * la mise à jour.
 *
 * Le garde-fou empêche toute boucle : on ne recharge qu'une fois par page.
 */
let reloading = false;
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (reloading) return;
  reloading = true;
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
