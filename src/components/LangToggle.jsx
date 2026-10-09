import { useLang } from '../context/LangContext'

/* Sélecteur de langue de l'espace éducatif : pill EN/FR visible en haut des pages. */
export default function LangToggle({ className = '' }) {
  const { lang, setLang } = useLang()
  return (
    <div className={`lang-toggle ${className}`} role="group" aria-label="Language / Langue">
      <button type="button"
              className={lang === 'en' ? 'active' : ''}
              onClick={() => setLang('en')}>
        <i className="mdi mdi-translate" /> English
      </button>
      <button type="button"
              className={lang === 'fr' ? 'active' : ''}
              onClick={() => setLang('fr')}>
        <i className="mdi mdi-translate-variant" /> Français
      </button>
    </div>
  )
}
