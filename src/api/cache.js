import { useEffect, useRef, useState } from 'react'
import api from './client'

/* Cache client des lectures GET, pour ne plus recharger chaque page.

   Principe "stale-while-revalidate" adapte a la navigation :
   - a l'arrivee sur une page, on affiche immediatement la derniere donnee
     connue (skeleton seulement au tout premier chargement) ;
   - en arriere-plan on rafraichit quand la donnee a plus de `ttlMs`.

   Le cache est scope par session : le suffixe du jeton JWT distingue deux
   comptes sur le meme telephone, et les donnees privees (progressions,
   resultats) ne passent donc jamais d'un compte a l'autre. */

const STORE = new Map()    // key -> { data, at }
const INFLIGHT = new Map() // key -> Promise (dedouble les appels simultanes)

function keyOf(path, scope) {
  let tag = 'anon'
  if (scope === undefined) {
    try {
      const token = localStorage.getItem('access_token')
      tag = token ? token.slice(-12) : 'anon'
    } catch { tag = 'anon' }
  } else {
    tag = scope
  }
  return `${path}::${tag}`
}

/** Vide ce qui commence par prefix, ex. invalidate('/education/subjects') */
export function invalidate(prefix) {
  for (const key of STORE.keys()) if (key.startsWith(`${prefix}::`)) STORE.delete(key)
  for (const key of INFLIGHT.keys()) if (key.startsWith(`${prefix}::`)) INFLIGHT.delete(key)
}

/** Tout vider (logout, changement de compte). */
export function clearApiCache() {
  STORE.clear()
  INFLIGHT.clear()
}

/** Lecture immediate du cache, sans reseau (utile pour un premier rendu). */
export function peekApi(path, scope = undefined) {
  return STORE.get(keyOf(path, scope))?.data ?? null
}

/**
 * GET mis en cache, avec rafraichissement silencieux.
 *
 * Retourne { data, loading, error, setData, reload } :
 * - loading n'est vrai que lorsqu'il n'y a RIEN a montrer (premier passage) ;
 * - au retour sur la page, data est deja pret et le rafraichissement se fait
 *   en silence.
 */
export function useApi(path, { ttlMs = 60000, enabled = true, scope } = {}) {
  const key = path ? keyOf(path, scope) : null
  const entry = key ? STORE.get(key) : null
  const [data, setData] = useState(entry ? entry.data : null)
  const [loading, setLoading] = useState(!entry)
  const [error, setError] = useState(false)
  const seq = useRef(0)

  const reload = () => {
    if (!key || !enabled) return undefined
    // On ne re-lance que si plus frais-que-ttl : sinon on montre le cache.
    const fresh = (e) => e && Date.now() - e.at < ttlMs
    if (fresh(STORE.get(key))) return undefined

    let promise = INFLIGHT.get(key)
    if (!promise) {
      promise = api.get(path)
        .then(({ data: d }) => {
          STORE.set(key, { data: d, at: Date.now() })
          return d
        })
        .finally(() => INFLIGHT.delete(key))
      INFLIGHT.set(key, promise)
    }
    const mine = ++seq.current
    promise
      .then((d) => {
        if (mine !== seq.current) return
        setData(d)
        setError(false)
      })
      .catch(() => {
        if (mine !== seq.current) return
        // Seule une absence totale de donnee est une erreur visible :
        // hors-ligne avec cache chaud, on garde l'existant a l'ecran.
        if (!STORE.get(key)) setError(true)
      })
      .finally(() => { if (mine === seq.current) setLoading(false) })
    return promise
  }

  useEffect(() => {
    const e = key ? STORE.get(key) : null
    if (e) {
      setData(e.data)
      setLoading(false)
      setError(false)
    }
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled, ttlMs])

  return { data, setData, loading, error, reload }
}
