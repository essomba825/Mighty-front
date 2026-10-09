import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

/* Profil utilisateur mis en cache pour rester connecte meme si le backend
   est injoignable (hors ligne, serveur en maintenance, reseau coupe). */
export const CACHED_USER_KEY = 'mms_user'

function readCachedUser() {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readCachedUser)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      localStorage.removeItem(CACHED_USER_KEY)
      setUser(null)
      setLoading(false)
      return
    }
    /* Session deja en cache : on considere l'utilisateur connecte tout de
       suite, sans attendre le backend. */
    if (readCachedUser()) setLoading(false)
    api.get('/auth/me/')
      .then(({ data }) => {
        setUser(data)
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(data))
      })
      .catch((error) => {
        /* 401 seulement = session reellement invalide. Une erreur reseau
           (backend injoignable) ne doit pas deconnecter l'utilisateur. */
        if (error.response?.status === 401) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem(CACHED_USER_KEY)
          setUser(null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (identifier, password) => {
    const { data } = await api.post('/auth/login/', { identifier, password })
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    const me = await api.get('/auth/me/')
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(me.data))
    setUser(me.data)
    return me.data
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem(CACHED_USER_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
