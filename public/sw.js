/* Service worker — mode « coquille » volontairement.
   On ne met PAS en cache les appels API : le contenu du site (leçons, événements,
   dons) change souvent, et afficher une version périmée serait pire que pas de
   cache. Le précache ne contient que l'interface et les fichiers statiques, ce
   qui suffit à faire demarrer l'application hors ligne.
*/
const VERSION = 'mms-v1'
const COQUILLE = `${VERSION}-coquille`
const STATIQUES = `${VERSION}-statiques`

/* Préchargement : l'utilisateur gagne du temps sur la route qui compte. */
const PRECHARGE = ['/', '/index.html', '/manifest.webmanifest', '/logo-mark.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(COQUILLE)
      .then((cache) => cache.addAll(PRECHARGE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) =>
        Promise.all(
          cles
            .filter((c) => !c.startsWith(VERSION))
            /* Un cache effacé par erreur laisse l'application sans mode hors
               ligne ; on ne le supprime que si le nom correspond bien à une
               ancienne version. */
            .map((c) => caches.delete(c))
        )
      )
      .then(() => self.clients.claim())
  )
})

function estNavigation(request) {
  return request.mode === 'navigate'
}

function estApi(request) {
  const url = new URL(request.url)
  /* Le backend est sur un autre port en développement : toute requête vers
     127.0.0.1:8000 est un appel de données, jamais une page à servir du cache. */
  return url.pathname.startsWith('/api/') || url.port === '8000'
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  if (estApi(request)) return

  if (estNavigation(request)) {
    /* Réseau d'abord, cache en secours : un visiteur hors ligne doit quand même
       voir l'interface, mais jamais une page périmée s'il est en ligne. */
    event.respondWith(
      fetch(request)
        .then((reponse) => {
          const copie = reponse.clone()
          caches.open(COQUILLE).then((cache) => cache.put('/index.html', copie))
          return reponse
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    )
    return
  }

  /* Statique : le cache d'abord, puis on rafraichit en arrière-plan pour que
     la prochaine visite reparte sur une version fraîche. */
  event.respondWith(
    caches.match(request).then((cache) => {
      const depuisReseau = fetch(request)
        .then((reponse) => {
          if (reponse && reponse.status === 200 && reponse.type === 'basic') {
            const copie = reponse.clone()
            caches.open(STATIQUES).then((c) => c.put(request, copie))
          }
          return reponse
        })
        .catch(() => cache)
      return cache || depuisReseau
    })
  )
})

/* Permet a la page de demander la mise a jour immediate du service worker. */
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

/* --- Poussées web (Push API) ---
   Le backend envoie {title, body, url} ; on affiche la notification et, au
   clic, on ouvre (ou reprend) l'onglet de l'application sur la page visee. */
self.addEventListener('push', (event) => {
  let charge = { title: 'Mega Mighty Sixers', body: '', url: '/' }
  if (event.data) {
    try {
      charge = { ...charge, ...event.data.json() }
    } catch {
      charge.body = event.data.text()
    }
  }
  event.waitUntil(
    self.registration.showNotification(charge.title, {
      body: charge.body,
      icon: '/logo-mark.png',
      badge: '/logo-mark.png',
      data: { url: charge.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
      /* Un onglet deja ouvert est reutilise : pas de doublon. */
      for (const fenetre of fenetres) {
        if ('focus' in fenetre) return fenetre.navigate(url).then((f) => f.focus())
      }
      return self.clients.openWindow(url)
    })
  )
})