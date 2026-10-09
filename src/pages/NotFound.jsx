import { Link } from 'react-router-dom'
import { useLang } from '../context/LangContext'

export default function NotFound() {
  const { t } = useLang()

  return (
    <div className="page">
      <div className="empty-state">
        <i className="mdi mdi-map-marker-question-outline empty-icon" />
        <h2>{t('notfound.title')}</h2>
        <p>{t('notfound.sub')}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn-primary">{t('notfound.back_home')}</Link>
          <Link to="/education" className="btn-secondary">{t('nav.education')}</Link>
        </div>
      </div>
    </div>
  )
}
