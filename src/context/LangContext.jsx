import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { dictionaries } from '../i18n'

/* Contexte de langue global : anglais par défaut, français disponible.
   Persisté en localStorage (mms_lang) et appliqué à toute l'interface. */
const LangContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
})

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem('mms_lang') || 'en')

  const setLang = useCallback((value) => {
    setLangState(value)
    localStorage.setItem('mms_lang', value)
    document.documentElement.lang = value
  }, [])

  /* Synchronise l'attribut lang du document au premier rendu aussi. */
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  /* t('nav.home', { n: 3 }) → libellé dans la langue active (repli : anglais) */
  const t = useCallback(
    (key, params) => {
      const template = dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key
      if (!params) return template
      return Object.entries(params).reduce(
        (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), template)
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)

/* Affiche la bonne version d'un champ bilingue : FR si dispo, sinon EN. */
export const pick = (html, en, lang) => {
  if (lang === 'fr' && html) return html
  return en || html || ''
}
