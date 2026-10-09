import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import { useLang } from '../context/LangContext'

const REQUEST_STATUS = {
  pending: { className: 'badge-active', icon: 'mdi-timer-sand' },
  accepted: { className: 'badge-funded', icon: 'mdi-check-decagram' },
  declined: { className: 'badge-completed', icon: 'mdi-close-octagon-outline' },
}

export default function Mentorship() {
  const { t } = useLang()
  const { user } = useAuth()
  const [offers, setOffers] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ field: '', description: '', availability: '' })
  const [messages, setMessages] = useState({})
  const [reqError, setReqError] = useState({})
  const [savingOffer, setSavingOffer] = useState(false)

  const fullName = `${user.first_name} ${user.last_name}`

  const load = () => {
    Promise.all([
      api.get('/mentorship/offers/'),
      api.get('/mentorship/requests/'),
    ]).then(([o, r]) => {
      setOffers(o.data.results ?? o.data)
      setRequests(r.data.results ?? r.data)
    }).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const createOffer = async (e) => {
    e.preventDefault()
    setSavingOffer(true)
    try {
      await api.post('/mentorship/offers/', form)
      setForm({ field: '', description: '', availability: '' })
      setShowForm(false)
      load()
    } finally {
      setSavingOffer(false)
    }
  }

  const sendRequest = async (offerId) => {
    const message = messages[offerId]?.trim()
    if (!message) {
      setReqError({ ...reqError, [offerId]: t('mentor.err.message') })
      return
    }
    try {
      await api.post('/mentorship/requests/', { offer: offerId, message })
      setMessages({ ...messages, [offerId]: '' })
      setReqError({ ...reqError, [offerId]: '' })
      load()
    } catch {
      setReqError({ ...reqError, [offerId]: t('mentor.err.send') })
    }
  }

  const respond = async (id, action) => {
    await api.post(`/mentorship/requests/${id}/${action}/`)
    load()
  }

  const activeOffers = offers.filter((o) => o.is_active)
  const myOfferIds = offers.filter((o) => o.mentor_name === fullName).map((o) => o.id)
  const received = requests.filter((r) => myOfferIds.includes(r.offer))
  const canMentor = user.role === 'alumni' || user.role === 'admin'

  return (
    <div>
      <PageHeader
        eyebrow={t('mentor.eyebrow')}
        title={t('mentor.title2')}
        sub={t('mentor.sub')}
        breadcrumb={t('mentor.title')}
      />

      <div className="page">
        {canMentor && (
          <div className="page-actions">
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm
                ? <><i className="fa-solid fa-xmark" /> {t('common.cancel')}</>
                : <><i className="fa-solid fa-hand-holding-heart" /> {t('mentor.offer')}</>}
            </button>
          </div>
        )}

        {showForm && (
          <form onSubmit={createOffer} className="form card mentor-form">
            <label>{t('mentor.domain')} <span className="required-star">*</span>
              <input value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })}
                     required placeholder={t('mentor.field.ph')} autoFocus />
            </label>
            <label>{t('mentor.propose')} <span className="required-star">*</span>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                        required placeholder={t('mentor.propose.ph')} />
            </label>
            <label>{t('mentor.availability')} <span className="optional">{t('profile.optional')}</span>
              <input value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })}
                     placeholder={t('mentor.availability.ph')} />
            </label>
            <button className="btn-primary" disabled={savingOffer}>
              {savingOffer ? <><i className="fa-solid fa-circle-notch fa-spin" /> {t('common.inProgress')}</> : t('mentor.publish')}
            </button>
          </form>
        )}

        <p className="donate-step-title"><i className="mdi mdi-account-group-outline" /> {t('mentor.available')}</p>

        {loading ? (
          <div className="skeleton-wrap">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-line w40" />
                <div className="skeleton-line w90" />
                <div className="skeleton-line w60" />
              </div>
            ))}
          </div>
        ) : activeOffers.length === 0 ? (
          <div className="empty-state">
            <i className="mdi mdi-account-heart-outline empty-icon" />
            <h2>{t('mentor.empty')}</h2>
            {canMentor && <p>{t('mentor.emptyHint')}</p>}
          </div>
        ) : (
          <div className="member-grid">
            {activeOffers.map((o) => {
              const alreadyRequested = requests.some((r) => r.offer === o.id)
              const isMine = o.mentor_name === fullName
              return (
                <article key={o.id} className="card mentor-card">
                  <span className="badge badge-active"><i className="mdi mdi-tag-outline" /> {o.field}</span>
                  <h3>{o.mentor_name}{isMine && ` (${t('mentor.you')})`}</h3>
                  <p className="event-desc">{o.description}</p>
                  {o.availability && (
                    <p className="mentor-availability"><i className="mdi mdi-clock-outline" /> {o.availability}</p>
                  )}
                  {isMine && <p className="wizard-hint"><i className="mdi mdi-information-outline" /> {t('mentor.myOffer')}</p>}
                  {!isMine && (alreadyRequested ? (
                    <p className="mentor-sent"><i className="fa-solid fa-circle-check" /> {t('mentor.requestSent')}</p>
                  ) : (
                    <div className="mentor-request">
                      {reqError[o.id] && <p className="field-error"><i className="fa-solid fa-circle-exclamation" /> {reqError[o.id]}</p>}
                      <textarea rows={2} placeholder={t('mentor.message.ph')}
                                value={messages[o.id] || ''}
                                onChange={(e) => { setMessages({ ...messages, [o.id]: e.target.value }); setReqError({ ...reqError, [o.id]: '' }) }} />
                      <button className="btn-primary" onClick={() => sendRequest(o.id)}>
                        <i className="fa-solid fa-paper-plane" /> {t('mentor.request')}
                      </button>
                    </div>
                  ))}
                </article>
              )
            })}
          </div>
        )}

        {received.length > 0 && (
          <>
            <p className="donate-step-title" style={{ marginTop: 36 }}><i className="mdi mdi-inbox-arrow-down-outline" /> {t('mentor.received')}</p>
            <div className="member-grid">
              {received.map((r) => {
                const st = REQUEST_STATUS[r.status] || REQUEST_STATUS.pending
                return (
                  <article key={r.id} className="card">
                    <span className={`badge ${st.className}`}><i className={`mdi ${st.icon}`} /> {t(`mentor.reqStatus.${r.status}`)}</span>
                    <h3>{r.mentee_name} — {r.offer_title}</h3>
                    <p className="event-desc">« {r.message} »</p>
                    {r.status === 'pending' && (
                      <div className="mentor-actions">
                        <button className="btn-primary" onClick={() => respond(r.id, 'accept')}>
                          <i className="fa-solid fa-check" /> {t('mentor.accept')}
                        </button>
                        <button className="btn-secondary btn-secondary-navy" onClick={() => respond(r.id, 'decline')}>
                          <i className="fa-solid fa-xmark" /> {t('mentor.decline')}
                        </button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
