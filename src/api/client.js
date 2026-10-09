import axios from 'axios'

/* Origine du backend.

   En developpement on ouvre le site depuis la machine de dev, mais aussi depuis
   un telephone pose sur le meme reseau local. `127.0.0.1` depuis le telephone
   designe le telephone lui-meme : la page se charge, et aucune requete ne passe.
   On reprend donc l'hote courant (l'IP locale ou `localhost`) et on change
   seulement de port.

   En production le front est servi par Django : meme origine, `/api` suffit. */
export function apiOrigin() {
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

/* Photo de profil, medias : les URL relatives renvoyees par Django doivent
   partir vers l'hote qui a servi la page, sinon le telephone cherche ses
   propres fichiers. */
export function mediaUrl(url) {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  return `${apiOrigin()}${url}`
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
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
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