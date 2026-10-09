import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { detectNetwork, isMobileNumber, ussdCode as buildUssd, ussdTel as buildUssdTel } from '../lib/paynow'

const METHODS = [
  { value: 'mtn_momo', key: 'mtn', logo: '/operators/mtn.png' },
  { value: 'orange_money', key: 'orange', logo: '/operators/orange.png' },
]
const PRESETS = [1000, 2500, 5000, 10000, 25000]

const STATUS = {
  active: { labelKey: 'active', icon: 'mdi-rocket-launch', className: 'badge-active' },
  funded: { labelKey: 'funded', icon: 'mdi-check-decagram', className: 'badge-funded' },
  completed: { labelKey: 'completed', icon: 'mdi-trophy', className: 'badge-completed' },
}

const percentOf = (p) => (p.budget > 0 ? Math.min(Math.round((p.amount_collected / p.budget) * 100), 100) : 0)

export default function Contribute() {
  const { id } = useParams()
  const { user } = useAuth()
  const { t, lang } = useLang()
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB'
  const fmt = (n) => Number(n || 0).toLocaleString(locale)

  const [project, setProject] = useState(null)
  const [projectLoading, setProjectLoading] = useState(true)
  const [projectError, setProjectError] = useState(false)
  const [progress, setProgress] = useState(0)
  const [form, setForm] = useState({ donor_name: '', donor_email: '', amount: '', method: '', message: '' })
  const [phone, setPhone] = useState('')
  const [network, setNetwork] = useState(null)
  const [payConfig, setPayConfig] = useState(null)
  const [totalRequests, setTotalRequests] = useState(null)
  const [paymentRef, setPaymentRef] = useState(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [pendingRequest, setPendingRequest] = useState(null)
  const [help, setHelp] = useState(null)

  const [done, setDone] = useState(false)
  const [result, setResult] = useState(null)

  const limit = payConfig?.daily_limit ?? 3
  const atLimit = totalRequests !== null && totalRequests >= limit

  useEffect(() => {
    api.get(`/projects/${id}/`)
      .then(({ data }) => {
        setProject(data)
        requestAnimationFrame(() => setProgress(percentOf(data)))
      })
      .catch(() => setProjectError(true))
      .finally(() => setProjectLoading(false))
  }, [id])

  useEffect(() => {
    api.get('/payments/requests/config/')
      .then(({ data }) => setPayConfig(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!user || !id) return
    api.get('/payments/requests/reference/')
      .then(({ data }) => setPaymentRef(data.reference))
      .catch(() => {})
    api.get('/payments/requests/total/', { params: { project: id } })
      .then(({ data }) => setTotalRequests(data.total_requests))
      .catch(() => {})
  }, [user, id])

  const update = (e) => {
    setFieldErrors({ ...fieldErrors, [e.target.name]: undefined })
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const selectMethod = (value) => {
    setFieldErrors({ ...fieldErrors, method: undefined })
    setForm({ ...form, method: value })
  }

  const handlePhone = (e) => {
    const value = e.target.value
    const detected = isMobileNumber(value) ? detectNetwork(value) : null
    setPhone(value)
    setFieldErrors({ ...fieldErrors, phone: undefined })
    setNetwork(detected)
    if (detected) {
      const matched = detected === 'MTN' ? 'mtn_momo' : detected === 'Orange' ? 'orange_money' : null
      setForm((f) => {
        if (matched) {
          if (f.method === '' || f.method === 'mtn_momo' || f.method === 'orange_money') return { ...f, method: matched }
          return f
        }
        if (METHODS.some((m) => m.value === f.method)) return { ...f, method: '' }
        return f
      })
    }
  }

  const amount = Number(form.amount) || 0
  const method = METHODS.find((m) => m.value === form.method)
  const isMobile = Boolean(method)

  const networkLockedFor = (value) => {
    if (!network) return false
    if (network === 'MTN') return value !== 'mtn_momo'
    if (network === 'Orange') return value !== 'orange_money'
    return true
  }

  const ussdCode = () => (form.method && payConfig
    ? buildUssd(form.method, payConfig[form.method].merchant_code, Number(form.amount) || 0)
    : '')

  const ussdTel = () => (form.method && payConfig
    ? buildUssdTel(form.method, payConfig[form.method].merchant_code, Number(form.amount) || 0)
    : undefined)

  const validate = () => {
    const errs = {}
    if (!form.donor_name.trim()) errs.donor_name = t('donate.err.name')
    if (!form.donor_email.trim()) errs.donor_email = t('donate.err.email')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.donor_email)) errs.donor_email = t('register.err.emailInvalid')
    if (!amount) errs.amount = t('donate.err.amount')
    else if (amount < 500) errs.amount = t('donate.err.min')
    if (!form.method) errs.method = t('donate.err.operator')
    if (isMobile && !isMobileNumber(phone)) errs.phone = t('donate.err.phone')
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const serverMsg = (text) =>
    ({
      invalid_amount: t('donate.err.amount'),
      invalid_phone: t('donate.err.phone'),
      invalid_operator: t('donate.err.operator'),
      invalid_code: t('donate.err.code'),
      limit_reached: t('donate.err.limit', { limit }),
    })[text] || t('donate.err.submit')

  const apiError = (err) => {
    const text = err?.response?.data?.text
    if (text) return serverMsg(text)
    const detail = err?.response?.data?.detail
    return detail || t('donate.err.submit')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!validate()) return

    if (isMobile) {
      if (!user) {
        setError(t('donate.signinRequired'))
        return
      }
      if (pendingRequest) {
        setVerifyCode('')
        setVerifyError('')
        setVerifyOpen(true)
        return
      }
      if (atLimit) {
        setError(t('donate.err.limit', { limit }))
        return
      }
      setLoading(true)
      try {
        const { data: total } = await api.get('/payments/requests/total/', { params: { project: id } })
        setTotalRequests(total.total_requests)
        if (total.total_requests >= total.limit) {
          setError(t('donate.err.limit', { limit: total.limit }))
          return
        }
        setConfirmOpen(true)
      } catch {
        setError(t('donate.err.submit'))
      } finally {
        setLoading(false)
      }
      return
    }
  }

  const doConfirm = async () => {
    setConfirmLoading(true)
    setError('')
    try {
      let ref = paymentRef
      if (!ref) {
        const { data } = await api.get('/payments/requests/reference/')
        ref = data.reference
        setPaymentRef(ref)
      }
      const payload = {
        project: id, donor_name: form.donor_name, donor_email: form.donor_email,
        message: form.message, amount, phone_number: phone, provider: form.method,
      }
      if (ref) payload.payment_ref = ref
      let data
      try {
        const res = await api.post('/payments/requests/', payload)
        data = res.data
      } catch (err) {
        if (err?.response?.data?.text === 'payment_ref_used') {
          const { data: fresh } = await api.get('/payments/requests/reference/')
          data = (await api.post('/payments/requests/', { ...payload, payment_ref: fresh.reference })).data
          setPaymentRef(fresh.reference)
        } else {
          throw err
        }
      }
      if (!data.valid) {
        setConfirmOpen(false)
        setError(serverMsg(data.text))
        return
      }
      setPendingRequest({ id: data.payment_request_id })
      setConfirmOpen(false)
      setVerifyCode('')
      setVerifyError('')
      setVerifyOpen(true)
    } catch (submitErr) {
      setConfirmOpen(false)
      setError(apiError(submitErr))
    } finally {
      setConfirmLoading(false)
    }
  }

  const doVerify = async () => {
    const code = verifyCode.trim()
    if (!code) {
      setVerifyError(t('donate.err.code'))
      return
    }
    setVerifyLoading(true)
    setVerifyError('')
    try {
      const { data } = await api.post(`/payments/requests/${pendingRequest.id}/verify/`, { transaction_code: code })
      if (!data.valid) {
        setVerifyError(t('donate.err.code'))
        return
      }
      setVerifyOpen(false)
      setResult({ mode: 'online', reference: data.reference, status: 'success' })
      setPendingRequest(null)
      setDone(true)
    } catch (err) {
      setVerifyError(apiError(err))
    } finally {
      setVerifyLoading(false)
    }
  }

  if (done) {
    return (
      <div>
        <PageHeader
          eyebrow={t('donate.eyebrow')}
          title={t('donate.done.title')}
          breadcrumb={t('donate.title')}
        />
        <div className="page page-donate">
          <div className="donate-success card">
            <span className="wizard-success-icon"><i className="fa-solid fa-check" /></span>
            <h1>{t('donate.done.thanks', { name: form.donor_name.split(' ')[0] })}</h1>
            <p className="donate-success-lead">
              {t('donate.done.payment', { status: t('donate.status.confirmed') })}
            </p>
            <div className="donate-recap">
              <div className="donate-recap-row"><span>{t('donate.label.amount')}</span><strong>{fmt(amount)} FCFA</strong></div>
              <div className="donate-recap-row"><span>{t('donate.label.method')}</span><strong>{t(`donate.method.${method.key}`)}</strong></div>
              {project && <div className="donate-recap-row"><span>{t('donate.label.project')}</span><strong>{project.title}</strong></div>}
              {result?.reference && <div className="donate-recap-row"><span>{t('donate.label.reference')}</span><strong>{result.reference}</strong></div>}
            </div>
            <div className="donate-success-actions">
              <Link to="/projets" className="btn-primary">
                <i className="fa-solid fa-briefcase" /> {t('donate.done.backProjects')}
              </Link>
              <Link to="/partenaires" className="btn-text-gold">
                {t('donate.done.sponsor')} <i className="fa-solid fa-arrow-right" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow={t('donate.eyebrow')}
        title={t('donate.title')}
        sub={t('donate.sub')}
        breadcrumb={t('donate.title')}
      />

      <div className="page page-donate">
        <div className="donate-layout">
          <aside className="donate-project-card card">
            {projectLoading ? (
              <div className="skeleton-card" style={{ margin: 0 }}>
                <div className="skeleton-img" />
                <div className="skeleton-line w90" />
                <div className="skeleton-line w60" />
              </div>
            ) : projectError || !project ? (
              <p className="event-desc">
                {t('donate.notFound')} <Link to="/projets">{t('common.viewAll')}</Link>
              </p>
            ) : (
              <>
                {project.image && (
                  <div className="event-media">
                    <img src={project.image} alt={project.title} loading="lazy" />
                    <span className={`badge ${STATUS[project.status].className} project-badge`}>
                      <i className={`mdi ${STATUS[project.status].icon}`} />
                      {t(`donate.projectStatus.${STATUS[project.status].labelKey}`)}
                    </span>
                  </div>
                )}
                <div className="event-body">
                  <p className="ph-eyebrow" style={{ color: 'var(--gold)' }}>
                    <span className="ph-line" /> {t('donate.supporting')}
                  </p>
                  <h3>{project.title}</h3>
                  <p className="project-objective"><i className="fa-solid fa-bullseye" /> {project.objective}</p>
                  <div className="progress"><div className="progress-bar" style={{ width: `${progress}%` }} /></div>
                  <div className="project-figures">
                    <span><strong>{fmt(project.amount_collected)}</strong> {t('projects.collectedShort')}</span>
                    <span className="project-percent">{progress}%</span>
                  </div>
                  <small className="project-remaining">
                    {t('donate.goal', { budget: fmt(project.budget) })} —{' '}
                    <i className="mdi mdi-target" /> {t('donate.remaining', { n: fmt(project.funds_remaining) })}
                  </small>
                </div>
              </>
            )}
          </aside>

          <div className="donate-card card">
            <form onSubmit={handleSubmit} className="form">
              {error && <p className="error error-box"><i className="fa-solid fa-circle-exclamation" /> {error}</p>}

              <p className="donate-payee">
                <i className="mdi mdi-cellphone-arrow-down" />
                {t('donate.payeeNote', { name: payConfig?.beneficiary || 'Mega Mighty Sixers' })}
              </p>

              <div className="donate-step-head">
                <p className="donate-step-title"><i className="mdi mdi-cash-fast" /> {t('donate.step.amount')}</p>
                <button type="button" className="field-help" onClick={() => setHelp('amount')}
                        aria-label={t('donate.help.title')}><i className="fa-solid fa-circle-question" /></button>
              </div>
              <div className={fieldErrors.amount ? 'input-error' : ''}>
                <div className="amount-grid" role="group" aria-label={t('donate.presets')}>
                  {PRESETS.map((v) => (
                    <button type="button" key={v}
                            className={`amount-chip ${amount === v ? 'selected' : ''}`}
                            onClick={() => { setFieldErrors({ ...fieldErrors, amount: undefined }); setForm({ ...form, amount: String(v) }) }}>
                      {fmt(v)} <small>FCFA</small>
                    </button>
                  ))}
                </div>
                <div className="amount-input">
                  <input name="amount" type="number" min="500" value={form.amount}
                         onChange={update} placeholder={t('donate.customAmount')} inputMode="numeric" />
                  <span>FCFA</span>
                </div>
              </div>
              {fieldErrors.amount && <p className="field-error"><i className="fa-solid fa-circle-exclamation" /> {fieldErrors.amount}</p>}
              <p className="wizard-hint"><i className="mdi mdi-information-outline" /> {t('donate.err.min')}</p>

              <div className="donate-step-head">
                <p className="donate-step-title"><i className="mdi mdi-credit-card-outline" /> {t('donate.step.method')}</p>
                <button type="button" className="field-help" onClick={() => setHelp('operator')}
                        aria-label={t('donate.help.title')}><i className="fa-solid fa-circle-question" /></button>
              </div>

              <div className={fieldErrors.phone ? 'input-error' : ''}>
                <div className="field-with-help">
                  <label>{t('donate.label.phone')} {isMobile && <span className="required-star">*</span>}
                    <input value={phone} onChange={handlePhone} placeholder="690 00 00 00" inputMode="tel" />
                  </label>
                  <button type="button" className="field-help" onClick={() => setHelp('phone')}
                          aria-label={t('donate.help.title')}><i className="fa-solid fa-circle-question" /></button>
                </div>
                {fieldErrors.phone && <p className="field-error"><i className="fa-solid fa-circle-exclamation" /> {fieldErrors.phone}</p>}
                {network && (
                  <div className="network-row">
                    <span className={`network-chip chip-${network.toLowerCase()}`}>
                      <i className="mdi mdi-signal-cellular-1" /> {t(`donate.network.${network.toLowerCase()}`)}
                    </span>
                    <small>{t('donate.network.locked')}</small>
                  </div>
                )}
              </div>

              <div className="method-grid" role="group" aria-label={t('donate.label.method')}>
                {METHODS.map((m) => {
                  const locked = networkLockedFor(m.value)
                  return (
                    <button type="button" key={m.value} disabled={locked}
                            className={`method-card ${form.method === m.value ? 'selected' : ''} ${locked ? 'locked' : ''}`}
                            onClick={() => selectMethod(m.value)}>
                      <img className="method-logo" src={m.logo} alt={t(`donate.method.${m.key}`)} />
                      <span>{t(`donate.method.${m.key}`)}</span>
                      {form.method === m.value && <span className="method-check"><i className="fa-solid fa-check" /></span>}
                      {locked && <small><i className="mdi mdi-lock-outline" /></small>}
                    </button>
                  )
                })}
              </div>
              {fieldErrors.method && <p className="field-error"><i className="fa-solid fa-circle-exclamation" /> {fieldErrors.method}</p>}

              {isMobile && !user && (
                <p className="wizard-hint">
                  <i className="mdi mdi-lock-outline" /> <Link to="/login">{t('auth.login.link')}</Link> {t('donate.signinRequired')}
                </p>
              )}

              <div className="donate-step-head">
                <p className="donate-step-title"><i className="mdi mdi-account-outline" /> {t('donate.step.identity')}</p>
              </div>
              <div className="form-row">
                <label className={fieldErrors.donor_name ? 'input-error' : ''}>{t('donate.label.name')} <span className="required-star">*</span>
                  <input name="donor_name" value={form.donor_name} onChange={update} placeholder={t('donate.label.namePh')} />
                </label>
                <label className={fieldErrors.donor_email ? 'input-error' : ''}>{t('donate.label.email')} <span className="required-star">*</span>
                  <input name="donor_email" type="email" value={form.donor_email} onChange={update} placeholder="toi@exemple.cm" />
                </label>
              </div>
              {fieldErrors.donor_name && <p className="field-error"><i className="fa-solid fa-circle-exclamation" /> {fieldErrors.donor_name}</p>}
              {fieldErrors.donor_email && <p className="field-error"><i className="fa-solid fa-circle-exclamation" /> {fieldErrors.donor_email}</p>}

              <label>{t('donate.label.message')} <span className="optional">{t('profile.optional')}</span>
                <textarea name="message" value={form.message} onChange={update} rows={3}
                          placeholder={t('donate.label.messagePh')} />
              </label>

              {amount > 0 && (
                <p className="donate-summary">
                  <i className="mdi mdi-gift-outline" />
                  {t('donate.summary')} <strong>{fmt(amount)} FCFA</strong>{' '}
                  {t('donate.via')} <strong>{method ? t(`donate.method.${method.key}`) : '—'}</strong>
                  {project && <> {t('donate.forProject')} « {project.title} »</>}
                </p>
              )}

              {atLimit && (
                <p className="wizard-hint"><i className="mdi mdi-information-outline" /> {t('donate.limitNote', { limit })}</p>
              )}

              <button className="btn-primary btn-full btn-glow" disabled={loading || atLimit}>
                {loading
                  ? <><i className="fa-solid fa-circle-notch fa-spin" /> {t('common.inProgress')}</>
                  : <><i className="fa-solid fa-hand-holding-heart" /> {t('donate.submit')}</>}
              </button>
              <p className="donate-secure">
                <i className="mdi mdi-shield-check-outline" /> {t('donate.secure')}
              </p>
            </form>
          </div>
        </div>
      </div>

      {help && (
        <div className="dialog-overlay" onClick={() => setHelp(null)}>
          <div className="dialog help-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-icon"><i className="fa-solid fa-circle-question" /></div>
            <h3 className="dialog-title">{t('donate.help.title')}</h3>
            <p className="dialog-message">{t(`donate.help.${help}`)}</p>
            <div className="dialog-actions">
              <button className="btn-dialog-confirm" onClick={() => setHelp(null)}>{t('common.close')}</button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="dialog-overlay" onClick={() => !confirmLoading && setConfirmOpen(false)}>
          <div className="dialog donate-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-icon"><i className="fa-solid fa-mobile-screen" /></div>
            <h3 className="dialog-title">{t('donate.confirm.title')}</h3>
            <p className="dialog-message">
              {t('donate.confirm.pop', { amount: fmt(amount), beneficiary: payConfig?.beneficiary || 'Mega Mighty Sixers' })}
            </p>
            <div className="donate-recap">
              <div className="donate-recap-row"><span>{t('donate.label.amount')}</span><strong>{fmt(amount)} FCFA</strong></div>
              <div className="donate-recap-row"><span>{t('donate.label.method')}</span><strong>{t(`donate.method.${method.key}`)}</strong></div>
              <div className="donate-recap-row"><span>{t('donate.label.phone')}</span><strong>{phone}</strong></div>
            </div>
            <div className="donate-ussd">
              <span className="donate-ussd-label"><i className="fa-solid fa-dial" /> {t('donate.confirm.ussd')}</span>
              <code className="donate-ussd-code">{ussdCode()}</code>
              <small>
                {form.method === 'mtn_momo' ? t('donate.confirm.mtnRef') : t('donate.confirm.orangeAmount')}
              </small>
            </div>
            <p className="donate-tap"><i className="mdi mdi-cellphone-information" /> {t('donate.confirm.tap')}</p>
            <div className="dialog-actions">
              <button className="btn-dialog-cancel" disabled={confirmLoading} onClick={() => setConfirmOpen(false)}>
                {t('common.cancel')}
              </button>
              <a className="btn-dialog-confirm donate-dial" href={ussdTel()}
                 onClick={(e) => { if (confirmLoading) { e.preventDefault(); return } doConfirm() }}>
                {confirmLoading
                  ? <><i className="fa-solid fa-circle-notch fa-spin" /> {t('common.inProgress')}</>
                  : <><i className="mdi mdi-dialpad" /> {t('donate.confirm.pay')}</>}
              </a>
            </div>
          </div>
        </div>
      )}

      {verifyOpen && pendingRequest && (
        <div className="dialog-overlay" onClick={() => !verifyLoading && setVerifyOpen(false)}>
          <div className="dialog donate-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-icon"><i className="fa-solid fa-shield-halved" /></div>
            <h3 className="dialog-title">{t('donate.verify.title')}</h3>
            <p className="dialog-message">{t('donate.verify.body')}</p>
            <div className={verifyError ? 'field-with-help input-error' : 'field-with-help'}>
              <label>{t('donate.verify.label')} <span className="required-star">*</span>
                <input value={verifyCode}
                       onChange={(e) => { setVerifyCode(e.target.value); setVerifyError('') }}
                       placeholder={t('donate.verify.placeholder')} />
              </label>
              <button type="button" className="field-help" onClick={() => setHelp('code')} aria-label={t('donate.help.title')}>
                <i className="fa-solid fa-circle-question" />
              </button>
            </div>
            {verifyError && <p className="field-error"><i className="fa-solid fa-circle-exclamation" /> {verifyError}</p>}
            <div className="dialog-actions">
              <button className="btn-dialog-cancel" disabled={verifyLoading} onClick={() => setVerifyOpen(false)}>
                {t('common.cancel')}
              </button>
              <button className="btn-dialog-confirm" disabled={verifyLoading || !verifyCode.trim()} onClick={doVerify}>
                {verifyLoading
                  ? <><i className="fa-solid fa-circle-notch fa-spin" /> {t('common.inProgress')}</>
                  : <>{t('donate.verify.submit')}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}