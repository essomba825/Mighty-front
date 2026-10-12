import axios from 'axios'

/* Origine du backend.

   En developpement on ouvre le site depuis la machine de dev, mais aussi depuis
   un telephone pose sur le meme reseau local. `127.0.0.1` depuis le telephone
   designe le telephone lui-meme : la page se charge, et aucune requete ne passe.
   On reprend donc l'hote courant (l'IP locale ou `localhost`) et on change
   seulement de port.

   En production le front est servi par Django : meme origine, `/api` suffit. */
export function apiOrigin() {
  /* URL du backend pilotee par l'environnement (VITE_API_URL dans .env) :
     on bascule local <-> web sans toucher au code. */
  const configure = import.meta.env.VITE_API_URL?.trim()
  if (configure) return configure.replace(/\/+$/, '')
  /* Aucune URL fournie : repli automatique. */
  /* Build de production servi par Django : meme origine, pas de port. */
  if (import.meta.env.PROD) return ''
  if (typeof window === 'undefined') return 'http://127.0.0.1:8000'
  const { protocol, hostname } = window.location
  /* `file://` n'a pas d'hote utile : on retombe sur le backend local. */
  if (!hostname || hostname === '') return 'http://127.0.0.1:8000'
  return `${protocol}//${hostname}:8000`
}

export const API_URL = `${apiOrigin()}/api`

const api = axios.create({
  baseURL: API_URL,
})

/* Photo de profil, medias : les URL renvoyees par Django doivent partir vers
   le backend, sinon le telephone cherche ses propres fichiers.

   Django (DRF) renvoie souvent une URL absolue batie depuis l'hote de la
   requete. Derriere le reverse-proxy cet hote peut perdre son port
   (`https://exemple.org` au lieu de `https://exemple.org:8443`) : l'image part
   alors vers un autre service et renvoie 404. Les medias vivent toujours sous
   MEDIA_URL (`/media/`) : on reprend donc le chemin et on l'ancre sur
   l'origine reelle du backend. */
export function mediaUrl(url) {
  if (!url) return null
  const origin = apiOrigin()
  if (/^https?:\/\//i.test(url)) {
    try {
      const { pathname, search } = new URL(url)
      if (pathname.startsWith('/media/')) return `${origin}${pathname}${search}`
    } catch {
      return url
    }
    return url
  }
  return `${origin}${url}`
}

// Ajoute le token JWT à chaque requête si présent
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Renouvelle le token automatiquement en cas d'expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/token/refresh/`, { refresh })
          localStorage.setItem('access_token', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch (refreshError) {
          // Backend injoignable : on conserve la session locale et on remonte
          // une erreur reseau pour ne pas deconnecter l'utilisateur.
          if (!refreshError.response) {
            return Promise.reject(new Error('Backend injoignable'))
          }
          // 401/403 : refresh token invalide, deconnexion reelle.
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('mms_user')
          // On garde la page demandee pour y revenir apres reconnexion
          if (!window.location.pathname.startsWith('/login')) {
            sessionStorage.setItem(
              'mms_redirect_after_login',
              window.location.pathname + window.location.search,
            )
          }
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  },
)

export default api