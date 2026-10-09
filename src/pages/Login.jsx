import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import AuthLayout from '../components/AuthLayout'

export default function Login() {
  const { t } = useLang()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Nettoyer toute redirection residuelle au montage pour eviter les redirections inattendues
  useEffect(() => {
    sessionStorage.removeItem('mms_redirect_after_login')
  }, [])

  // Page d'origine demandee avant la connexion (renvoyee par ProtectedRoute / 401)
  const from = location.state?.from
  const safeFrom = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
    ? from
    : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const account = await login(identifier, password)
      const stored = sessionStorage.getItem('mms_redirect_after_login')
      sessionStorage.removeItem('mms_redirect_after_login')
      const isAdmin = account?.is_staff || account?.role === 'admin'
      const defaultTarget = isAdmin ? '/admin' : '/espace-membre'
      let target = safeFrom || stored || defaultTarget
      if (isAdmin && (target === '/espace-membre' || !safeFrom)) {
        target = '/admin'
      }
      // Un compte en attente ne peut pas ouvrir l'espace membre
      navigate(target === '/espace-membre' && account?.status !== 'active' ? '/' : target, {
        replace: true,
      })
    } catch {
      setError(t('auth.error.credentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="auth-title">{t('auth.login.welcome')}</h1>
      <p className="auth-sub">{t('auth.login.waiting')}</p>

      <form onSubmit={handleSubmit} className="form auth-form">
        {error && (
          <p className="field-error field-error-top">
            <i className="fa-solid fa-circle-exclamation" /> {error}
          </p>
        )}

        <div className="float-field">
          <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                 required placeholder=" " autoFocus id="login-id" autoComplete="username" />
          <label htmlFor="login-id">{t('auth.login.identifierOrEmail')}</label>
          <span className="float-icon"><i className="fa-regular fa-user" /></span>
        </div>

        <div className="float-field">
          <input type={showPassword ? 'text' : 'password'} value={password}
                 onChange={(e) => setPassword(e.target.value)} required placeholder=" "
                 id="login-pw" autoComplete="current-password" />
          <label htmlFor="login-pw">{t('auth.password')}</label>
          <span className="float-icon float-icon-pw"><i className="fa-solid fa-lock" /></span>
          <button type="button" className="toggle-pw"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={t('auth.login.showPassword')}>
            <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
          </button>
        </div>

        <button className="btn-primary btn-full btn-glow" disabled={loading}>
          {loading
            ? <><i className="fa-solid fa-circle-notch fa-spin" /> {t('app.loading')}</>
            : <><i className="fa-solid fa-right-to-bracket" /> {t('auth.login.submit')}</>}
        </button>
      </form>

      <p className="auth-switch">
        {t('auth.login.noAccount')} <Link to="/inscription">{t('auth.login.create')}</Link>
      </p>

      <figure className="auth-visual">
        <img src="/login-marketing.gif" alt={t('auth.login.alt')} />
        <figcaption>{t('auth.login.figcaption')}</figcaption>
      </figure>
    </AuthLayout>
  )
}
