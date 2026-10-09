import { useEffect, useRef, useState } from 'react'
import { useLang } from '../context/LangContext'
import { LANGUAGES } from '../i18n'

/* Sélecteur de langue global ( navbar + usage libre dans les pages). */
export default function LanguageSwitcher({ className = '' }) {
  const { lang, setLang } = useLang()
  const [open, setOpen] = useState(false)
  const box = useRef(null)

  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const active = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0]

  return (
    <div className={`lang-switcher ${className}`} ref={box}>
      <button type="button"
              className="lang-current"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={open}>
        <i className="mdi mdi-translate" />
        <span>{active.label}</span>
        <i className={`mdi mdi-chevron-down lang-caret ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <ul className="lang-menu" role="listbox">
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button type="button"
                      role="option"
                      aria-selected={l.code === lang}
                      className={l.code === lang ? 'on' : ''}
                      onClick={() => { setLang(l.code); setOpen(false) }}>
                <span className="lang-flag">{l.flag}</span>
                <span>{l.full}</span>
                {l.code === lang && <i className="mdi mdi-check" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
