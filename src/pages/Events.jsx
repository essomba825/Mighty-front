import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import { useLang } from '../context/LangContext'
import ConfirmDialog from '../components/ConfirmDialog'

function DateBlock({ iso }) {
  const { lang } = useLang()
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB'
  const d = new Date(iso)
  const month = new Intl.DateTimeFormat(locale, { month: 'short' }).format(d).replace('.', '')
  return (
    <div className="event-date-block">
      <span className="event-day">{d.getDate()}</span>
      <span className="event-month">{month}</span>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="skeleton-wrap">
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-img" />
          <div className="skeleton-line w60" />
          <div className="skeleton-line w90" />
          <div className="skeleton-line w40" />
        </div>
      ))}
    </div>
  )
}

export default function Events() {
  const { t, lang } = useLang()
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB'
  const [events, setEvents] = useState([])
  const [busyIds, setBusyIds] = useState(new Set())
  const [tab, setTab] = useState('upcoming')
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null) // { event, action: 'register'|'unregister' }
  const { user } = useAuth()

  useEffect(() => {
    api.get('/events/')
      .then(({ data }) => setEvents(data.results ?? data))
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const upcoming = events.filter((e) => new Date(e.date) >= now)
  const past = events.filter((e) => new Date(e.date) < now)
  const shown = tab === 'upcoming' ? upcoming : past

  const applyAction = async () => {
    if (!confirm) return
    const { event, action } = confirm
    setBusyIds(new Set([...busyIds, event.id]))
    try {
      await api.post(`/events/${event.id}/${action}/`)
      setEvents(events.map((e) => e.id === event.id ? {
        ...e,
        is_registered: action === 'register',
        registrations_count: e.registrations_count + (action === 'register' ? 1 : -1),
      } : e))
    } catch { /* silencieux : l'état se resynchronise au prochain chargement */ }
    setBusyIds((s) => { const n = new Set(s); n.delete(event.id); return n })
    setConfirm(null)
  }

  return (
    <div>
      <PageHeader
        eyebrow={t('events.eyebrow')}
        title={t('events.title')}
        sub={t('events.sub')}
        breadcrumb={t('events.title')}
      />

      <div className="page">
        {/* Onglets */}
        <div className="tabs">
          <button className={tab === 'upcoming' ? 'active' : ''} onClick={() => setTab('upcoming')}>
            <i className="mdi mdi-calendar-clock" /> {t('events.upcoming')} <span className="tab-count">{upcoming.length}</span>
          </button>
          <button className={tab === 'past' ? 'active' : ''} onClick={() => setTab('past')}>
            <i className="mdi mdi-calendar-check" /> {t('events.past')} <span className="tab-count">{past.length}</span>
          </button>
        </div>

        {loading ? <Skeleton /> : shown.length === 0 ? (
          <div className="empty-state">
            <i className="fa-regular fa-calendar-days empty-icon" />
            <h2>{t('events.empty')}</h2>
            <p>{tab === 'upcoming'
              ? t('events.emptyHint')
              : t('events.pastHint')}</p>
          </div>
        ) : (
          <div className="events-grid">
            {shown.map((e) => {
              const isPast = new Date(e.date) < now
              const isRegistered = e.is_registered
              const busy = busyIds.has(e.id)
              return (
                <article key={e.id} className={`event-card ${isPast ? 'event-past' : ''}`}>
                  {e.image && (
                    <div className="event-media">
                      <img src={e.image} alt={e.title} loading="lazy" />
                      <DateBlock iso={e.date} />
                    </div>
                  )}
                  {!e.image && <DateBlock iso={e.date} />}
                  <div className="event-body">
                    <h3>{e.title}</h3>
                    <p className="event-desc">{e.description}</p>
                    <div className="event-meta">
                      <span><i className="mdi mdi-clock-outline" /> {new Date(e.date).toLocaleString(locale, { weekday: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                      <span><i className="fa-solid fa-location-dot" /> {e.location}</span>
                      <span><i className="fa-solid fa-users" /> {t('events.registered', { n: e.registrations_count })}</span>
                    </div>
                    {!isPast && (
                      user?.status === 'active' ? (
                        <div className="event-actions">
                          {isRegistered ? (
                            <>
                              <span className="btn-registered"><i className="fa-solid fa-circle-check" /> {t('events.registeredShort')}</span>
                              <button className="btn-unregister" disabled={busy}
                                      onClick={() => setConfirm({ event: e, action: 'unregister' })}>
                                <i className="fa-solid fa-xmark" /> {t('common.cancel')}
                              </button>
                            </>
                          ) : (
                            <button className="btn-primary" disabled={busy}
                                    onClick={() => setConfirm({ event: e, action: 'register' })}>
                              <i className="fa-solid fa-ticket" /> S'inscrire
                            </button>
                          )}
                        </div>
                      ) : !user && (
                        <a href="/login" className="btn-primary"><i className="fa-solid fa-right-to-bracket" /> {t('events.signinToRegister')}</a>
                      )
                    )}
                    {isPast && <span className="badge badge-completed"><i className="mdi mdi-history" /> {t('events.pastBadge')}</span>}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* Dialogue de confirmation */}
      <ConfirmDialog
        open={!!confirm}
        danger={confirm?.action === 'unregister'}
        loading={confirm ? busyIds.has(confirm.event.id) : false}
        icon={confirm?.action === 'unregister'
          ? <i className="fa-solid fa-calendar-xmark" />
          : <i className="fa-solid fa-ticket" />}
        title={confirm?.action === 'unregister'
          ? t('events.confirmUnregister.title')
          : t('events.confirmRegister.title')}
        message={confirm ? t('events.confirmMessage', {
          title: confirm.event.title,
          date: new Date(confirm.event.date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
          location: confirm.event.location,
        }) : ''}
        confirmLabel={confirm?.action === 'unregister' ? t('events.confirmUnregister.label') : t('events.confirmRegister.label')}
        onConfirm={applyAction}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
