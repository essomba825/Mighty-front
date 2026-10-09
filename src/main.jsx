import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@fortawesome/fontawesome-free/css/all.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/* §1/§9 : installation de la PWA.
   L'enregistrement du service worker se fait uniquement en production ou quand
   le serveur est servi en HTTPS. En developpement sur http://localhost, le
   navigateur refuse le service worker : on ne veut pas d'erreur dans la
   console a chaque rechargement. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* Un echec d'enregistrement ne doit pas empecher le site de
         fonctionner : on reste en navigation classique. Sans service worker,
         Chrome mobile ne propose jamais l'invite d'installation, donc on
         essaie toujours plutot que de l'ecarter par defaut. */
    })
  })
}