import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { activerPush, desactiverPush, etatPush, synchroniserPush } from '../api/push'
import PageHeader from '../components/PageHeader'
import { useLang } from '../context/LangContext'

export default function Notifications() {
  const { t, lang } = useLang()
const locale = lang === 'fr' ? 'fr-FR' : 'en-GB'
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [pushEtat, setPushEtat] = useState(() => etatPush())

  const load = () => {
    api.get('/notifications/')
      .then(({ data }) => setNotifications(data.results ?? data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  // Permission deja accordee : on refait une synchro silencieuse au montage.
  useEffect(() => {
    if (etatPush() === 'on') synchroniserPush()
  }, [])

  const basculerPush = async () => {
    if (pushEtat === 'on') {
      await desactiverPush()
      setPushEtat('off')
    } else {
      await activerPush()
      setPushEtat(etatPush())
    }
  }

  const markAllRead = async () => {
    await api.post('/notifications/mark_all_read/')
    load()
  }

  const unread = notifications.filter((n) => !n.is_read).length

  return (
    <div>
      <PageHeader
        eyebrow={t('member.breadcrumb')}
        title={t('notif.title')}
        sub={unread > 0 ? t('notif.unread').replace('{n}', unread) : t('notif.upToDate')}
        breadcrumb={t('notif.title')}
      />

      <div className="page page-narrow">
        {/* Bascule des poussées web : activer / desactiver depuis l'app. */}
        {pushEtat !== 'unsupported' && (
          <div className="notif-item notif-push-card">
            <div className="notif-push-card-content">
              <span className="notif-icon">
                <i className={`mdi ${pushEtat === 'on' ? 'mdi-bell-ring-outline' : 'mdi-bell-outline'}`} />
              </span>
              <div className="notif-body">
                <h3>{t('push.manage')}</h3>
                <p>{pushEtat === 'on' ? t('push.granted') : t('push.manageHint')}</p>
              </div>
            </div>
            <button
              type="button"
              className={`notif-push-btn ${pushEtat === 'on' ? 'btn-secondary' : 'btn-primary'}`}
              onClick={basculerPush}
            >
              {pushEtat === 'on' ? t('push.disable') : t('push.allow')}
            </button>
          </div>
        )}

        {loading ? (
          <div className="notif-list">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-line w60" />
                <div className="skeleton-line w90" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <i className="mdi mdi-bell-sleep-outline empty-icon" />
            <h2>{t('notif.empty')}</h2>
            <p>{t('notif.emptyHint')}</p>
          </div>
        ) : (
          <>
            <div className="notif-toolbar">
              <p className="results-count" style={{ margin: 0 }}>
                {unread > 0 ? t('notif.countUnread').replace('{n}', unread).replace('{t}', notifications.length) : t('notif.countAll').replace('{n}', notifications.length)}
              </p>
              {unread > 0 && (
                <button className="btn-secondary notif-clear" onClick={markAllRead}>
                  <i className="mdi mdi-email-check-outline" /> {t('notif.markAll')}
                </button>
              )}
            </div>

            <div className="notif-list">
              {notifications.map((n) => (
                <article key={n.id} className={`notif-item ${n.is_read ? 'read' : 'unread'}`}>
                  <span className="notif-icon">
                    <i className={`mdi ${n.is_read ? 'mdi-bell-outline' : 'mdi-bell-badge-outline'}`} />
                  </span>
                  <div className="notif-body">
                    <h3>{n.title}</h3>
                    <p>{n.message}</p>
                    <small className="notif-meta">
                      <span className="notif-date">
                        <i className="mdi mdi-clock-outline" /> {new Date(n.created_at).toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {n.link && (
                        <Link to={n.link} className="notif-link">
                          {t('notif.viewDetail')} <i className="mdi mdi-arrow-right" />
                        </Link>
                      )}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
