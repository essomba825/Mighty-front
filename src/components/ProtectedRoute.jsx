import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const { t } = useLang()
  const location = useLocation()

  if (loading) return <p className="page">{t('app.loading')}</p>

  // On memorise la page demandee pour y revenir apres connexion
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  if (user.status !== 'active') {
    return (
      <div className="page">
        <div className="empty-state">
          <i className="mdi mdi-clock-outline empty-icon" />
          <h2>{t('auth.pending.title')}</h2>
          <p>{t('auth.pending.sub')}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="btn-primary">{t('auth.pending.back_home')}</Link>
            <Link to="/education" className="btn-secondary">{t('nav.education')}</Link>
          </div>
        </div>
      </div>
    )
  }

  return children
}
