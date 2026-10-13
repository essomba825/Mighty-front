import { useLang } from '../context/LangContext'

/* Sélecteur de langue de l'espace éducatif : pill EN/FR visible en haut des pages.
   Les libelles sont des spans a part, pour pouvoir les raccourcir sur mobile. */
export default function LangToggle({ className = '', compact = false }) {
  const { lang, setLang } = useLang()
  return (
    <div className={`lang-toggle ${compact ? 'is-compact' : ''} ${className}`}
         role="group" aria-label="Language / Langue">
      <button type="button" aria-label="English"
              className={lang === 'en' ? 'active' : ''}
              onClick={() => setLang('en')}>
        <i className="mdi mdi-translate" /><span className="lang-label lang-label-full">English</span><span className="lang-label lang-label-short">EN</span>
      </button>
      <button type="button" aria-label="Français"
              className={lang === 'fr' ? 'active' : ''}
              onClick={() => setLang('fr')}>
        <i className="mdi mdi-translate-variant" /><span className="lang-label lang-label-full">Français</span><span className="lang-label lang-label-short">FR</span>
      </button>
    </div>
  )
}
