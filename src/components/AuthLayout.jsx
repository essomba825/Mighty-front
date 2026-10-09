import { useLang } from '../context/LangContext'

/* Layout auth : plein écran immersif, carte en verre, fond animé. */
export default function AuthLayout({ children }) {
  const { t } = useLang()
  return (
    <div className="auth-stage">
      {/* Fond animé : halos or/bleu + guilloché */}
      <div className="auth-bg" aria-hidden="true">
        <span className="auth-orb auth-orb-1" />
        <span className="auth-orb auth-orb-2" />
        <span className="auth-orb auth-orb-3" />
        <div className="ph-guilloche" />
      </div>

      <div className="auth-card">
        <div className="auth-card-head">
          <img src="/logo-mark.png" alt="Mega Mighty Sixers" className="auth-logo" />
          <blockquote className="auth-quote">{t('auth.quote')}</blockquote>
        </div>
        {children}
      </div>
    </div>
  )
}

