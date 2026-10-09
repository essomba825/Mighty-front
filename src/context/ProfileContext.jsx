import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../api/client'
import { useLang } from './LangContext'
import { useAuth } from './AuthContext'

/* Store global du profil alumni : récupère depuis le backend une fois,
   partagé entre l'espace membre, la carte, et la page profil. */

const ProfileContext = createContext({
  profile: null,
  loading: true,
  refresh: () => {},
  save: async () => {},
})

const CACHED_PROFILE_KEY = 'mms_profile'

function readCachedProfile() {
  try {
    const raw = localStorage.getItem(CACHED_PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function ProfileProvider({ children }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(readCachedProfile)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user?.email) {
      setProfile(null)
      localStorage.removeItem(CACHED_PROFILE_KEY)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data } = await api.get('/alumni/profiles/')
      const list = data.results ?? data
      const found = list.find((p) => p.email === user.email) ?? null
      setProfile(found)
      if (found) localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(found))
    } catch (error) {
      /* Backend injoignable : on garde le profil en cache. Un 401/403
         (session invalide) vide le cache. */
      if (error.response?.status === 401 || error.response?.status === 403) {
        setProfile(null)
        localStorage.removeItem(CACHED_PROFILE_KEY)
      }
    } finally {
      setLoading(false)
    }
  }, [user?.email])

  useEffect(() => { refresh() }, [refresh])

  /* Enregistre le profil (create si absent, patch sinon ; multipart si photo). */
  const save = async (form, photoFile) => {
    let payload = form
    if (photoFile) {
      payload = new FormData()
      Object.entries(form).forEach(([key, value]) => payload.append(key, value ?? ''))
      payload.append('photo', photoFile)
    }
    const res = profile
      ? await api.patch(`/alumni/profiles/${profile.id}/`, payload)
      : await api.post('/alumni/profiles/', payload)
    setProfile(res.data)
    localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(res.data))
    return res.data
  }

  return (
    <ProfileContext.Provider value={{ profile, loading, refresh, save }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => useContext(ProfileContext)
