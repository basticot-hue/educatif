import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './shell/App';
import { watchForUpdates } from './engine/update';
import './styles/tokens.css';

/*
 * La surveillance des mises à jour est mise en place avant le rendu — voir
 * `engine/update.ts` pour la raison détaillée. En deux mots : une application
 * installée qu'Android reprend depuis la pile des tâches ne déclenche jamais
 * `load`, donc ne vérifie jamais s'il existe une nouvelle version.
 */
watchForUpdates();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
