import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useLang } from '../context/LangContext'

const TYPES = [
  { value: 'company', key: 'company', icon: 'fa-solid fa-building' },
  { value: 'ngo', key: 'ngo', icon: 'fa-solid fa-handshake-angle' },
  { value: 'individual', key: 'individual', icon: 'fa-solid fa-user' },
  { value: 'public', key: 'public', icon: 'fa-solid fa-landmark' },
]

const STEP_KEYS = ['who', 'contact', 'proposal']

const LOADING_KEYS = ['sending', 'transmitting', 'almost']

/* Écran d'attente animé pendant le traitement de la demande */
function LoadingOverlay() {
  const { t } = useLang()
  const [msgIndex, setMsgIndex] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setMsgIndex((i) => (i + 1) % LOADING_KEYS.length), 1600)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="loading-overlay">
      <div className="loading-card">
        <img src="/logo-mark.png" alt="" className="loading-logo" />
        <div className="loading-spinner"><span /><span /><span /></div>
        <p className="loading-message" key={msgIndex}>{t(`partner.loading.${LOADING_KEYS[msgIndex]}`)}</p>
      </div>
    </div>
  )
}

const TRACK_KEY = 'mms_partnership_email'

const STATUS_STEPS = [
  { key: 'new', labelKey: 'received', icon: 'mdi-email-check-outline' },
  { key: 'contacted', labelKey: 'processing', icon: 'mdi-progress-clock' },
  { key: 'done', labelKey: 'answered', icon: 'mdi-flag-checkered' },
]

/* Carte de suivi d'une demande existante (état récupéré via le backend).
   Affichée à la place du formulaire dès qu'une demande existe (en cours ou clôturée). */
function TrackingCard({ track, onRefresh, onNew }) {
  const { t, lang } = useLang()
  const isDone = !track.pending
  const stepIndex = track.status === 'new' ? 0 : track.status === 'contacted' ? 1 : 2
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB'
  return (
    <div className="wizard-box track-card">
      <p className="wizard-kicker">{t('partner.track.kicker')}</p>
      <div className={`track-status ${isDone ? (track.status === 'accepted' ? 'ok' : 'ko') : 'pending'}`}>
        <i className={`mdi ${isDone ? (track.status === 'accepted' ? 'mdi-check-decagram' : 'mdi-close-octagon') : 'mdi-timer-sand'}`} />
        <div>
          <strong>{t(`partner.track.status.${track.status}`)}</strong>
          <small>
            {track.organization} — {t('partner.track.sentOn')}{' '}
            {new Date(track.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
          </small>
        </div>
      </div>

      {/* Timeline */}
      <div className="track-timeline">
        {STATUS_STEPS.map((s, i) => (
          <div key={s.key} className={`track-step ${i < stepIndex ? 'done' : ''} ${i === stepIndex ? 'current' : ''}`}>
            <span className="track-dot"><i className={`mdi ${s.icon}`} /></span>
            <span className="track-label">{t(`partner.track.step.${s.labelKey}`)}</span>
          </div>
        ))}
      </div>

      {track.pending && (
        <p className="wizard-hint" style={{ textAlign: 'center' }}>
          {t('partner.track.pending')}
        </p>
      )}

      {/* Demande acceptée : tableau de suivi avec les prochaines étapes */}
      {track.status === 'accepted' && (
        <div className="track-next">
          <p className="track-next-title"><i className="mdi mdi-star-four-points" /> {t('partner.track.next.title')}</p>
          <ul>
            <li><i className="mdi mdi-phone-incoming" /> {t('partner.track.next.1')}</li>
            <li><i className="mdi mdi-image-multiple-outline" /> {t('partner.track.next.2')}</li>
          </ul>
          <div className="track-next-actions">
            <Link to="/projets" className="btn-primary">{t('partner.track.discover')}</Link>
          </div>
        </div>
      )}

      {track.status === 'refused' && (
        <p className="wizard-hint" style={{ textAlign: 'center' }}>
          {t('partner.track.refused')}
        </p>
      )}

      <div className="wizard-nav" style={{ justifyContent: 'center' }}>
        <button className="wizard-back" onClick={onRefresh}>
          <i className="mdi mdi-refresh" /> {t('partner.track.refresh')}
        </button>
        {isDone && (
          <button className="btn-primary" onClick={onNew}>
            <i className="fa-solid fa-plus" /> {t('partner.track.newRequest')}
          </button>
        )}
      </div>
    </div>
  )
}

export default function BecomePartner() {
  const { t, lang } = useLang()
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB'
  const fmt = (n) => Number(n).toLocaleString(locale)
  const [projects, setProjects] = useState([])
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    organization: '', contact_name: '', email: '', phone: '',
    partner_type: '', project: '', message: '',
  })
  const [hasOrg, setHasOrg] = useState(null) // null | true | false
  const [wantProject, setWantProject] = useState(null) // null | true | false
  const [track, setTrack] = useState(null) // état d'une demande existante
  const [trackLoading, setTrackLoading] = useState(true)
  const [showLookup, setShowLookup] = useState(false)
  const [lookupEmail, setLookupEmail] = useState('')
  const [lookupEmpty, setLookupEmpty] = useState(false)

  // Récupération de l'état via le backend (email mémorisé en localStorage)
  const fetchTrack = (email) => {
    if (!email) { setTrackLoading(false); return }
    setTrackLoading(true)
    api.get('/donations/partnerships/status/', { params: { email } })
      .then(({ data }) => {
        if (data.exists) {
          localStorage.setItem(TRACK_KEY, email)
          setTrack({ ...data, email })
        } else {
          setTrack(null)
        }
        return data.exists
      })
      .catch(() => false)
      .finally(() => setTrackLoading(false))
  }

  useEffect(() => {
    api.get('/projects/').then(({ data }) => setProjects(data.results ?? data)).catch(() => {})
    fetchTrack(localStorage.getItem(TRACK_KEY))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const pickType = (value) => {
    // Un particulier n'a pas d'organisation par défaut
    setForm({ ...form, partner_type: value })
    setHasOrg(value === 'individual' ? false : null)
  }

  const stepsValid = [
    form.partner_type && form.contact_name.trim(),
    form.email.trim() && /\S+@\S+\.\S+/.test(form.email),
    form.message.trim().length >= 10 && wantProject !== null,
  ]
  const canNext = stepsValid[step] && (step !== 0 || hasOrg !== null)
                                        && (step !== 2 || !wantProject || form.project !== '')

  // Marque les champs en erreur quand l'utilisateur tente de continuer sans valider
  const [attempted, setAttempted] = useState(false)
  const tryNext = () => {
    if (canNext) { setAttempted(false); setStep(step + 1) }
    else setAttempted(true)
  }

  // Détail des erreurs par champ, affiché uniquement après tentative
  const err = {
    type: attempted && step === 0 && !form.partner_type ? t('partner.err.type') : null,
    contact: attempted && step === 0 && !form.contact_name.trim() ? t('partner.err.contact') : null,
    org: attempted && step === 0 && hasOrg === null ? t('partner.err.org') : null,
    email: attempted && step === 1 && form.email.trim() && !/\S+@\S+\.\S+/.test(form.email) ? t('partner.err.email') : null,
    emailEmpty: attempted && step === 1 && !form.email.trim() ? t('partner.err.emailEmpty') : null,
    projectQ: attempted && step === 2 && wantProject === null ? t('partner.err.projectQ') : null,
    project: attempted && step === 2 && wantProject && form.project === '' ? t('partner.err.project') : null,
  }

  /* Recherche d'une demande existante par email (autre navigateur, cache vidé...) */
  const handleLookup = () => {
    setLookupEmpty(false)
    if (!/\S+@\S+\.\S+/.test(lookupEmail)) return
    setTrackLoading(true)
    api.get('/donations/partnerships/status/', { params: { email: lookupEmail } })
      .then(({ data }) => {
        if (data.exists) {
          localStorage.setItem(TRACK_KEY, lookupEmail)
          setTrack({ ...data, email: lookupEmail })
        } else {
          setLookupEmpty(true)
        }
      })
      .catch(() => setLookupEmpty(true))
      .finally(() => setTrackLoading(false))
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    const started = Date.now()
    try {
      const payload = { ...form, project: form.project || null }
      if (!hasOrg) payload.organization = ''
      await api.post('/donations/partnerships/', payload)
      localStorage.setItem(TRACK_KEY, form.email)   // mémorise pour le suivi
      // Animation d'attente visible au moins 2,2 s (sinon c'est trop rapide pour être perçu)
      const elapsed = Date.now() - started
      await new Promise((r) => setTimeout(r, Math.max(0, 2200 - elapsed)))
      // Affiche directement le suivi de la demande qui vient d'être envoyée
      setTrack({
        status: 'new', pending: true,
        organization: form.organization || form.contact_name,
        created_at: new Date().toISOString(), email: form.email,
      })
    } catch (submitErr) {
      const detail = submitErr.response?.data?.detail
      setError(detail || t('partner.err.submit'))
    } finally {
      setLoading(false)
    }
  }

  // Une demande existe (en cours, acceptée ou refusée) : on affiche son suivi, pas le formulaire
  if (track) {
    return (
      <div className="wizard-page">
        {trackLoading && <LoadingOverlay />}
        <TrackingCard
          track={track}
          onRefresh={() => fetchTrack(track.email)}
          onNew={() => setTrack(null)}
        />
      </div>
    )
  }

  return (
    <div className="wizard-page">
      {loading && <LoadingOverlay />}
      {trackLoading && <LoadingOverlay />}
      <div className="wizard-box">
        <p className="wizard-kicker">{t('partner.kicker')}</p>

        {/* Progression */}
        <div className="wizard-progress">
          {STEP_KEYS.map((key, i) => (
            <div key={key} className={`wizard-step ${i < step ? 'done' : ''} ${i === step ? 'current' : ''}`}>
              <span className="wizard-dot">{i < step ? <i className="fa-solid fa-check" /> : i + 1}</span>
              <span className="wizard-step-label">{t(`partner.step.${key}`)}</span>
            </div>
          ))}
          <div className="wizard-track">
            <div className="wizard-track-fill" style={{ width: `${(step / (STEP_KEYS.length - 1)) * 100}%` }} />
          </div>
        </div>

        <div className="wizard-stepbody" key={step}>
          <h1>{t(`partner.step.${STEP_KEYS[step]}`)}</h1>

          {step === 0 && (
            <>
              <div className={`type-cards ${err.type ? 'group-error' : ''}`}>
                {TYPES.map((ty) => (
                  <button type="button" key={ty.value}
                          className={`type-card ${form.partner_type === ty.value ? 'selected' : ''}`}
                          onClick={() => pickType(ty.value)}>
                    <i className={ty.icon} />
                    <span>{t(`partner.type.${ty.key}`)}</span>
                  </button>
                ))}
              </div>
              {err.type && <p className="field-error"><i className="fa-solid fa-circle-exclamation" /> {err.type}</p>}
              <div className="form">
                <label className={err.contact ? 'input-error' : ''}>{t('partner.label.contact')} <span className="required-star">*</span>
                  <input name="contact_name" value={form.contact_name} onChange={update}
                         placeholder={t('partner.ph.contact')} autoFocus />
                </label>
                {err.contact && <p className="field-error"><i className="fa-solid fa-circle-exclamation" /> {err.contact}</p>}

                <div className={err.org ? 'group-error-block' : ''}>
                  <p className="org-question"><i className="fa-solid fa-circle-question" /> {t('partner.q.org')}</p>
                  <div className="org-choice">
                    <button type="button" className={hasOrg === true ? 'active' : ''}
                            onClick={() => setHasOrg(true)}>{t('partner.yes')}</button>
                    <button type="button" className={hasOrg === false ? 'active' : ''}
                            onClick={() => { setHasOrg(false); setForm({ ...form, organization: '' }) }}>{t('partner.no')}</button>
                  </div>
                  {err.org && <p className="field-error"><i className="fa-solid fa-circle-exclamation" /> {err.org}</p>}
                </div>

                {hasOrg === true && (
                  <label>{t('partner.label.org')} <span className="optional">{t('profile.optional')}</span>
                    <input name="organization" value={form.organization} onChange={update}
                           placeholder={t('partner.ph.org')} />
                  </label>
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <div className="form">
              <label className={(err.email || err.emailEmpty) ? 'input-error' : ''}>{t('partner.email')} <span className="required-star">*</span>
                <input name="email" type="email" value={form.email} onChange={update}
                       placeholder="contact@domaine.cm" autoFocus />
              </label>
              {err.emailEmpty && <p className="field-error"><i className="fa-solid fa-circle-exclamation" /> {err.emailEmpty}</p>}
              {err.email && !err.emailEmpty && <p className="field-error"><i className="fa-solid fa-circle-exclamation" /> {err.email}</p>}
              <label>{t('partner.label.phone')} <span className="optional">{t('profile.optional')}</span>
                <input name="phone" value={form.phone} onChange={update} placeholder="6XX XX XX XX" />
              </label>
              <p className="wizard-hint">
                <i className="mdi mdi-shield-lock-outline" /> {t('partner.hint.contact')}
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="form">
              <div>
                <p className="org-question"><i className="fa-solid fa-bullseye" /> {t('partner.q.project')}</p>
                <div className={`org-choice ${err.projectQ ? 'group-error-buttons' : ''}`}>
                  <button type="button" className={wantProject === true ? 'active' : ''}
                          onClick={() => setWantProject(true)}>
                    {t('partner.yesSelect')}
                  </button>
                  <button type="button" className={wantProject === false ? 'active' : ''}
                          onClick={() => { setWantProject(false); setForm({ ...form, project: '' }) }}>
                    {t('partner.noGlobal')}
                  </button>
                </div>
                {err.projectQ && <p className="field-error"><i className="fa-solid fa-circle-exclamation" /> {err.projectQ}</p>}

                {wantProject === true && (
                  <div className="project-picker">
                    {projects.length === 0 && (
                      <p className="wizard-hint">{t('partner.hint.noProject')}</p>
                    )}
                    {projects.map((p) => {
                      const percent = p.budget > 0 ? Math.min(Math.round((p.amount_collected / p.budget) * 100), 100) : 0
                      const chosen = String(form.project) === String(p.id)
                      return (
                        <button type="button" key={p.id}
                                className={`project-pick ${chosen ? 'selected' : ''}`}
                                onClick={() => setForm({ ...form, project: p.id })}>
                          <span className="pick-media">
                            {p.image && <img src={p.image} alt="" />}
                            <span className="pick-percent">{percent}%</span>
                          </span>
                          <span className="pick-info">
                            <strong>{p.title}</strong>
                            <span className="pick-progress"><span style={{ width: `${percent}%` }} /></span>
                            <small>{t('partner.remaining', { n: fmt(p.funds_remaining) })} FCFA</small>
                          </span>
                          {chosen && <i className="fa-solid fa-circle-check pick-check" />}
                        </button>
                      )
                    })}
                  </div>
                )}
                {err.project && <p className="field-error"><i className="fa-solid fa-circle-exclamation" /> {err.project}</p>}

                {wantProject === false && (
                  <p className="wizard-hint" style={{ marginTop: 10 }}>
                    <i className="mdi mdi-handshake" /> {t('partner.hint.globalSupport')}
                  </p>
                )}
              </div>
              <label>{t('partner.label.proposal')}
                <textarea name="message" value={form.message} onChange={update} rows={5}
                          placeholder={t('partner.ph.proposal')} />
              </label>
              <p className={`char-counter ${form.message.trim().length >= 10 ? 'valid' : ''}`}>
                <i className={`mdi ${form.message.trim().length >= 10 ? 'mdi-check-circle' : 'mdi-information-outline'}`} />
                {form.message.trim().length >= 10
                  ? t('partner.counter.ok')
                  : t('partner.counter.min', { n: form.message.trim().length })}
              </p>
            </div>
          )}

          {error && (
            <p className="error error-box">
              <i className="fa-solid fa-circle-exclamation" /> {error}
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="wizard-nav">
          {step > 0 && (
            <button className="wizard-back" onClick={() => setStep(step - 1)}>
              <i className="fa-solid fa-arrow-left" /> {t('common.back')}
            </button>
          )}
          {step < 2 ? (
            <button className="btn-primary wizard-next" onClick={tryNext}>
              {t('register.next')} <i className="fa-solid fa-arrow-right" />
            </button>
          ) : (
            <button className="btn-primary wizard-next" disabled={!canNext || loading}
                    onClick={handleSubmit}>
              {loading
                ? t('common.inProgress')
                : <><i className="fa-solid fa-paper-plane" /> {t('partner.send')}</>}
            </button>
          )}
        </div>

        {/* Retrouver une demande faite depuis un autre navigateur */}
        <div className="track-lookup">
          <button type="button" className="track-lookup-toggle" onClick={() => setShowLookup(!showLookup)}>
            <i className="mdi mdi-email-search-outline" /> {t('partner.lookup.toggle')}
          </button>
          {showLookup && (
            <div className="track-lookup-body">
              <div className="track-lookup-row">
                <input type="email" value={lookupEmail}
                       onChange={(e) => { setLookupEmail(e.target.value); setLookupEmpty(false) }}
                       placeholder={t('partner.ph.lookup')} />
                <button type="button" className="btn-primary"
                        disabled={trackLoading || !/\S+@\S+\.\S+/.test(lookupEmail)}
                        onClick={handleLookup}>
                  {t('partner.lookup.check')}
                </button>
              </div>
              {lookupEmpty && (
                <p className="wizard-hint">
                  <i className="mdi mdi-information-outline" /> {t('partner.lookup.empty')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
