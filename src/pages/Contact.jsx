import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useLang } from '../context/LangContext'
import PageHeader from '../components/PageHeader'

/* §4, §8, §11 Phase 1 — Page contact.
   Coordonnees et reseaux servis par le backend (`GET /api/contact/`), avec des
   valeurs de repli si l'API est indisponible. Le formulaire envoie le message
   au backend (`POST /api/contact/`) et replie sur mailto en cas de panne. */

const EMAIL_PAR_DEFAUT = 'contact@megamightysixers.org'

/* Icône et couleur de chaque réseau sont connues du front ; seul le lien vient
   du backend (keys vides omises par l'API). */
const SOCIAL_META = {
  facebook: { icon: 'mdi-facebook', label: 'Facebook', color: '#1877f2' },
  twitter: { icon: 'mdi-twitter', label: 'X / Twitter', color: '#000' },
  instagram: { icon: 'mdi-instagram', label: 'Instagram', color: '#e1306c' },
  youtube: { icon: 'mdi-youtube', label: 'YouTube', color: '#ff0000' },
  whatsapp: { icon: 'mdi-whatsapp', label: 'WhatsApp', color: '#25d366' },
}

const SOCIAL_PAR_DEFAUT = [
  { key: 'facebook', url: 'https://facebook.com/megamightysixers' },
  { key: 'twitter', url: 'https://twitter.com/megamightysixers' },
  { key: 'instagram', url: 'https://instagram.com/megamightysixers' },
  { key: 'youtube', url: 'https://youtube.com/@megamightysixers' },
  { key: 'whatsapp', url: 'https://wa.me/237600000000' },
]

export default function Contact() {
  const { t, lang } = useLang()

  const [info, setInfo] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | sending | success | error

  useEffect(() => {
    api.get('/contact/')
      .then(({ data }) => setInfo(data))
      .catch(() => {})
  }, [])

  const subjects = [
    'contact.subject.general',
    'contact.subject.partner',
    'contact.subject.donation',
    'contact.subject.education',
    'contact.subject.press',
    'contact.subject.other',
  ]

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')

    /* Envoi via l'API backend ; si la route est indisponible ou rejette le
       message, on replie sur mailto pour ne jamais bloquer l'utilisateur. */
    try {
      await api.post('/contact/', form)
      setStatus('success')
      setForm({ name: '', email: '', subject: '', message: '' })
      return
    } catch {
      /* Le backend n'a pas répondu : on bascule sur mailto. */
    }

    const email = info?.email || EMAIL_PAR_DEFAUT
    const body = encodeURIComponent(
      `Nom : ${form.name}\nEmail : ${form.email}\nObjet : ${form.subject}\n\n${form.message}`
    )
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(form.subject)}&body=${body}`
    setStatus('success')
  }

  const email = info?.email || t('contact.info.email.value')
  const phone = info?.phone || ''
  const address = info?.address ? info.address[lang] : t('contact.info.office.value')
  const hours = info?.hours ? info.hours[lang] : ''
  const socials = info?.social?.length ? info.social : SOCIAL_PAR_DEFAUT
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null

  return (
    <>
      <PageHeader
        eyebrow={t('contact.eyebrow')}
        title={t('contact.title')}
        sub={t('contact.sub')}
        breadcrumb={t('nav.contact')}
      />

      <div className="page contact-page">
        {status === 'success' ? (
          /* --- État de succès --- */
          <div className="contact-success reveal-up">
            <span className="contact-success-icon">
              <i className="mdi mdi-check-circle-outline" />
            </span>
            <h2>{t('contact.form.success.title')}</h2>
            <p>{t('contact.form.success.body')}</p>
            <div className="cta-actions" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStatus('idle')}
              >
                <i className="mdi mdi-pencil-outline" /> {t('contact.form.new')}
              </button>
              <Link to="/" className="btn-primary">
                <i className="mdi mdi-home-outline" /> {t('nav.home')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="contact-grid">
            {/* --- Formulaire --- */}
            <form
              id="contact-form"
              className="contact-form card"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="form-group">
                <label htmlFor="contact-name">{t('contact.form.name')}</label>
                <input
                  id="contact-name"
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  required
                  autoComplete="name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact-email">{t('contact.form.email')}</label>
                <input
                  id="contact-email"
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact-subject">{t('contact.form.subject')}</label>
                <select
                  id="contact-subject"
                  value={form.subject}
                  onChange={set('subject')}
                  required
                >
                  <option value="">{t('contact.form.subject.ph')}</option>
                  {subjects.map((key) => (
                    <option key={key} value={t(key)}>
                      {t(key)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="contact-message">{t('contact.form.message')}</label>
                <textarea
                  id="contact-message"
                  rows={6}
                  value={form.message}
                  onChange={set('message')}
                  placeholder={t('contact.form.message.ph')}
                  required
                />
              </div>

              {status === 'error' && (
                <p className="form-error">
                  <i className="mdi mdi-alert-outline" /> {t('contact.form.error')}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary contact-submit"
                disabled={status === 'sending'}
              >
                {status === 'sending' ? (
                  <><i className="mdi mdi-loading mdi-spin" /> {t('contact.form.sending')}</>
                ) : (
                  <><i className="mdi mdi-send-outline" /> {t('contact.form.submit')}</>
                )}
              </button>
            </form>

            {/* --- Coordonnées servies par le backend --- */}
            <aside className="contact-info">
              <h2 className="contact-info-title">{t('contact.info.title')}</h2>

              <div className="contact-info-item">
                <span className="contact-info-icon">
                  <i className="mdi mdi-email-outline" />
                </span>
                <div>
                  <p className="contact-info-label">{t('contact.info.email.label')}</p>
                  <a href={`mailto:${email}`} className="contact-info-value">
                    {email}
                  </a>
                </div>
              </div>

              {phone && (
                <div className="contact-info-item">
                  <span className="contact-info-icon">
                    <i className="mdi mdi-phone-outline" />
                  </span>
                  <div>
                    <p className="contact-info-label">{t('contact.info.phone.label')}</p>
                    {telHref && (
                      <a href={telHref} className="contact-info-value">
                        {phone}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {address && (
                <div className="contact-info-item">
                  <span className="contact-info-icon">
                    <i className="mdi mdi-map-marker-outline" />
                  </span>
                  <div>
                    <p className="contact-info-label">{t('contact.info.office.label')}</p>
                    <p className="contact-info-value">{address}</p>
                  </div>
                </div>
              )}

              {hours && (
                <div className="contact-info-item">
                  <span className="contact-info-icon">
                    <i className="mdi mdi-clock-outline" />
                  </span>
                  <div>
                    <p className="contact-info-label">{t('contact.info.hours.label')}</p>
                    <p className="contact-info-value">{hours}</p>
                  </div>
                </div>
              )}

              <div className="contact-social-block">
                <p className="contact-info-label">
                  <i className="mdi mdi-share-variant-outline" /> {t('contact.info.social.label')}
                </p>
                <div className="contact-social-links">
                  {socials
                    .filter((s) => SOCIAL_META[s.key])
                    .map((s) => {
                      const meta = SOCIAL_META[s.key]
                      return (
                        <a
                          key={s.key}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={meta.label}
                          className="contact-social-btn"
                          style={{ '--social-color': meta.color }}
                        >
                          <i className={`mdi ${meta.icon}`} />
                        </a>
                      )
                    })}
                </div>
              </div>

              <div className="contact-info-cta">
                <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
                  {t('contact.sub')}
                </p>
                <Link to="/partenaires" className="btn-secondary" style={{ marginTop: '1rem' }}>
                  <i className="mdi mdi-handshake-outline" /> {t('nav.partners')}
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  )
}