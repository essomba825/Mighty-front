import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import AuthLayout from '../components/AuthLayout'
import { useLang } from '../context/LangContext'

const STEP_KEYS = ['identity', 'account', 'security']

/* Champ → étape à rouvrir si le serveur renvoie une erreur dessus */
const FIELD_STEP = {
  first_name: 0, last_name: 0, email: 0,
  username: 1, phone: 1,
  password: 2,
}

export default function Register() {
  const { t } = useLang()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1) // 1 = avance, -1 = recule (animation)
  const [form, setForm] = useState({
    email: '', username: '', password: '', password2: '',
    first_name: '', last_name: '', phone: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const update = (e) => {
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'username') {
        next._usernameEdited = true
      } else if ((name === 'first_name' || name === 'last_name') && !prev._usernameEdited) {
        const fn = (name === 'first_name' ? value : prev.first_name).trim()
        const ln = (name === 'last_name' ? value : prev.last_name).trim()
        if (fn && ln) {
          const base = (fn[0] + ln).toLowerCase().replace(/[^a-z0-9]/g, '')
          next.username = base.slice(0, 20)
        }
      }
      return next
    })
  }
  const match = form.password2 && form.password === form.password2
  const initials = `${form.first_name.trim()[0] || ''}${form.last_name.trim()[0] || ''}`.toUpperCase()

  const subs = [
    t('register.step.identity.sub'),
    form.first_name
      ? t('register.step.account.subNamed').replace('{name}', form.first_name)
      : t('register.step.account.sub'),
    t('register.step.security.sub'),
  ]

  const goTo = (s) => {
    if (s === step) return
    setError('')
    setFieldErrors({})
    setDir(s > step ? 1 : -1)
    setStep(s)
  }

  /* Validations par étape */
  const validateIdentity = () => {
    const errs = {}
    if (!form.first_name.trim()) errs.first_name = t('register.err.firstName')
    if (!form.last_name.trim()) errs.last_name = t('register.err.lastName')
    if (!form.email.trim()) errs.email = t('register.err.emailRequired')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = t('register.err.emailInvalid')
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }
  const validateAccount = () => {
    const errs = {}
    if (!form.username.trim()) errs.username = t('register.err.username')
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }
  const goNext = () => {
    const ok = step === 0 ? validateIdentity() : validateAccount()
    if (ok) goTo(step + 1)
  }

  const doSubmit = async () => {
    setError('')
    setFieldErrors({})

    if (form.password !== form.password2) {
      setFieldErrors({ password2: t('register.err.passwordMismatch') })
      return
    }

    setLoading(true)
    try {
      const { password2, ...payload } = form
      await api.post('/auth/register/', payload)
      setDone(true)
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const errs = Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.join(' ') : String(v)])
        )
        setFieldErrors(errs)
        // Rouvrir l'étape où se trouve le champ en erreur
        const faulty = Object.keys(errs).find((k) => k in FIELD_STEP)
        if (faulty) {
          setDir(-1)
          setStep(FIELD_STEP[faulty])
        }
      } else {
        setError(t('register.err.submit'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (step < 2) goNext()
    else doSubmit()
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="wizard-success" style={{ padding: 0 }}>
          <span className="wizard-success-icon"><i className="fa-solid fa-check" /></span>
          <h1>{t('register.done.title').replace('{name}', form.first_name)} 🎉</h1>
          <p>{t('register.done.sub')}</p>
          <Link to="/login" className="btn-primary btn-full">
            <i className="fa-solid fa-right-to-bracket" /> {t('register.done.cta')}
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <p className="wizard-eyebrow">
        {t('register.stepOf').replace('{n}', step + 1)} / {STEP_KEYS.length}
      </p>
      <h1 className="auth-title">{t('register.title')}</h1>
      <p className="auth-sub">{subs[step]}</p>

      {/* Progression — les étapes passées sont cliquables pour revenir en arrière */}
      <div className="wizard-progress">
        {STEP_KEYS.map((key, i) => {
          const label = t(`register.step.${key}.title`)
          return (
            <div key={key} className={`wizard-step ${i < step ? 'done' : ''} ${i === step ? 'current' : ''}`}>
              {i < step ? (
                <button type="button" className="wizard-dot wizard-step-jump"
                        onClick={() => goTo(i)}
                        aria-label={t('register.backToStep').replace('{n}', i + 1).replace('{label}', label)}>
                  <i className="fa-solid fa-check" />
                </button>
              ) : (
                <span className="wizard-dot">{i + 1}</span>
              )}
              <span className="wizard-step-label">{label}</span>
            </div>
          )
        })}
        <div className="wizard-track">
          <div className="wizard-track-fill" style={{ width: `${(step / (STEP_KEYS.length - 1)) * 100}%` }} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form auth-form">
        {error && <p className="field-error field-error-top">{error}</p>}

        <div className={`wizard-stepbody ${dir > 0 ? 'slide-fwd' : 'slide-back'}`} key={step}>
          {/* Step 1 : identity */}
          {step === 0 && (
            <>
              <div className="form-row">
                <div className="float-field">
                  <input name="first_name" value={form.first_name} onChange={update} placeholder=" " id="r-fn" autoFocus />
                  <label htmlFor="r-fn">{t('auth.firstName')} *</label><span className="float-icon"><i className="fa-regular fa-user" /></span>
                  {fieldErrors.first_name && <p className="field-error">{fieldErrors.first_name}</p>}
                </div>
                <div className="float-field">
                  <input name="last_name" value={form.last_name} onChange={update} placeholder=" " id="r-ln" />
                  <label htmlFor="r-ln">{t('auth.lastName')} *</label><span className="float-icon"><i className="fa-regular fa-user" /></span>
                  {fieldErrors.last_name && <p className="field-error">{fieldErrors.last_name}</p>}
                </div>
              </div>

              <div className="float-field">
                <input name="email" type="email" value={form.email} onChange={update} placeholder=" " id="r-email" />
                <label htmlFor="r-email">{t('register.email')} *</label><span className="float-icon"><i className="fa-regular fa-envelope" /></span>
                {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
              </div>
            </>
          )}

          {/* Step 2 : account */}
          {step === 1 && (
            <>
              <div className="float-field">
                <input name="username" value={form.username} onChange={update} placeholder=" " id="r-un" autoFocus />
                <label htmlFor="r-un">{t('auth.username')} *</label><span className="float-icon"><i className="fa-solid fa-at" /></span>
                {fieldErrors.username && <p className="field-error">{fieldErrors.username}</p>}
              </div>

              <div className="float-field">
                <input name="phone" value={form.phone} onChange={update} placeholder=" " id="r-phone" />
                <label htmlFor="r-phone">{t('auth.phone')} ({t('profile.optional')})</label><span className="float-icon"><i className="fa-solid fa-phone" /></span>
              </div>

              <p className="auth-hint">
                <i className="fa-solid fa-shield-halved" /> {t('register.accountHint')}
              </p>
            </>
          )}

          {/* Step 3 : security */}
          {step === 2 && (
            <>
              {/* Récapitulatif avant de créer le compte */}
              <div className="reg-recap">
                <span className="reg-avatar">{initials}</span>
                <span className="reg-recap-info">
                  <strong>{form.first_name} {form.last_name}</strong>
                  <span>@{form.username} · {form.email}</span>
                </span>
                <button type="button" onClick={() => goTo(0)} aria-label={t('register.editInfo')}>
                  <i className="fa-solid fa-pen" /> {t('common.edit')}
                </button>
              </div>

              <div className="float-field">
                <input name="password" type={showPassword ? 'text' : 'password'} value={form.password}
                       onChange={update} minLength={8} placeholder=" " id="r-pw" autoFocus />
                <label htmlFor="r-pw">{t('auth.password')} *</label><span className="float-icon float-icon-pw"><i className="fa-solid fa-lock" /></span>
                <button type="button" className="toggle-pw" onClick={() => setShowPassword(!showPassword)}
                        aria-label={t('auth.login.showPassword')}>
                  <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
                {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
              </div>
              <p className="auth-hint">
                <i className="fa-solid fa-lock" /> {t('register.passwordHint')}
              </p>

              <div className="float-field">
                <input name="password2" type={showPassword ? 'text' : 'password'} value={form.password2}
                       onChange={update} placeholder=" " id="r-pw2" />
                <label htmlFor="r-pw2">{t('auth.passwordConfirm')} *</label>
                {!form.password2 && <span className="float-icon"><i className="fa-solid fa-lock" /></span>}
                {form.password2 && (
                  <span className={`pw-match ${match ? 'ok' : 'ko'}`}>
                    <i className={`fa-solid ${match ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                  </span>
                )}
                {fieldErrors.password2 && <p className="field-error">{fieldErrors.password2}</p>}
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="wizard-nav">
          {step > 0 && (
            <button type="button" className="wizard-back" onClick={() => goTo(step - 1)}>
              <i className="fa-solid fa-arrow-left" /> {t('common.back')}
            </button>
          )}
          {step < 2 ? (
            <button type="button" className="btn-primary wizard-next" onClick={goNext}>
              {t('register.next')} <i className="fa-solid fa-arrow-right" />
            </button>
          ) : (
            <button className="btn-primary wizard-next btn-glow" disabled={loading}>
              {loading
                ? <><i className="fa-solid fa-circle-notch fa-spin" /> {t('register.creating')}</>
                : <><i className="fa-solid fa-user-plus" /> {t('register.submit')}</>}
            </button>
          )}
        </div>
      </form>

      <p className="auth-switch">
        {t('auth.alreadyMember')} <Link to="/login">{t('auth.login.link')}</Link>
      </p>
    </AuthLayout>
  )
}
