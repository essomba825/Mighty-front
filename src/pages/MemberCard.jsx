import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import ProfileAvatar from '../components/ProfileAvatar'

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

/* Stable reference derived from the card number (display only) */
const fingerprint = (value = '') => {
  let h = 5381
  for (let i = 0; i < value.length; i += 1) h = (h * 33) ^ value.charCodeAt(i)
  const hex = (h >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 8)
  return `${hex.slice(0, 4)}-${hex.slice(4)}`
}

export default function MemberCard() {
  const { user } = useAuth()
  const { t, lang } = useLang()
  const [card, setCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState('')
  const [view, setView] = useState('both')

  useEffect(() => {
    api.get('/alumni/profiles/my_card/')
      .then(({ data }) => setCard(data))
      .catch((err) => setDetail(err.response?.data?.detail || ''))
      .finally(() => setLoading(false))
  }, [])

  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB'
  const fmtShort = (value) =>
    value ? new Date(value).toLocaleDateString(locale, { month: '2-digit', year: '2-digit' }) : '—'

  const valid = card && card.is_active
  const identity = [card?.profession, card?.company].filter(Boolean).join(' · ')
  const location = [card?.city, card?.country].filter(Boolean).join(', ')

  return (
    <div>
      <PageHeader
        eyebrow={t('member.breadcrumb')}
        title={t('card.title')}
        sub={t('card.sub')}
        breadcrumb={t('card.breadcrumb')}
      />

      <div className="page page-narrow mcard-page">
        {loading ? (
          <div className="card" style={{ maxWidth: 460, margin: '0 auto', padding: 30 }}>
            <div className="skeleton-line w60" />
            <div className="skeleton-line w90" />
            <div className="skeleton-line w40" />
          </div>
        ) : !card ? (
          <div className="empty-state">
            <i className="mdi mdi-card-account-details-outline empty-icon" />
            <h2>{t('card.empty.title')}</h2>
            <p>{detail || t('card.empty.hint')}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/profil" className="btn-primary">
                <i className="mdi mdi-account-edit-outline" />
                {detail ? t('profile.create') : t('card.empty.complete')}
              </Link>
              <Link to="/espace-membre" className="btn-secondary">
                <i className="mdi mdi-view-dashboard-outline" /> {t('member.breadcrumb')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Front / back switch — printing always outputs both faces */}
            <div className="mcard-views no-print" role="group" aria-label={t('card.chooseFace')}>
              {[
                { key: 'front', label: t('card.front'), icon: 'mdi-credit-card-outline' },
                { key: 'back', label: t('card.back'), icon: 'mdi-card-account-details-outline' },
                { key: 'both', label: t('card.both'), icon: 'mdi-card-text-outline' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={view === opt.key ? 'on' : ''}
                  onClick={() => setView(opt.key)}
                >
                  <i className={`mdi ${opt.icon}`} /> {opt.label}
                </button>
              ))}
            </div>

            <div className={`mcard-print-zone mcard-view-${view}`}>
              {/* ---------- FRONT ---------- */}
              <div className="mcard-side">
                <p className="mcard-side-label"><span>{t('card.front')}</span> {t('card.obverse')}</p>
                <article className={`mcard ${valid ? '' : 'mcard-off'}`}>
                  <span className="mcard-guilloche" aria-hidden="true" />
                  <span className="mcard-sheen" aria-hidden="true" />
                  <span className="mcard-frame" aria-hidden="true" />
                  <img className="mcard-watermark" src="/logo-mark.png" alt="" aria-hidden="true" />

                  <header className="mcard-top">
                    <span className="mcard-brand">
                      <span className="mcard-logo"><img src="/logo-mark.png" alt="" /></span>
                      Mega Mighty Sixers
                    </span>
                    <span className="mcard-kind">{t('card.kind')}</span>
                  </header>

                  <div className="mcard-main">
                    <div className="mcard-photo">
                      <ProfileAvatar
                        src={card.photo}
                        name={card.full_name}
                        fallback="/mcard-photo-default.svg"
                      />
                    </div>
                    <span className="mcard-chip" aria-hidden="true"><i /><i /></span>
                    <div className="mcard-id">
                      <p className="mcard-label">{t('card.holder')}</p>
                      <h2 className="mcard-name">{card.full_name}</h2>
                      {identity && <p className="mcard-meta">{identity}</p>}
                      <p className="mcard-meta">
                        {t('card.classOf')} {card.graduation_year}
                        {location ? ` · ${location}` : ''}
                      </p>
                    </div>
                  </div>

                  <footer className="mcard-bottom">
                    <div className="mcard-num">
                      <span>{t('memberCard.no')}</span>{card.card_number}
                    </div>
                    <div className="mcard-valid">
                      <span className={valid ? 'ok' : 'ko'}>
                        <i className={`mdi ${valid ? 'mdi-check-circle' : 'mdi-close-circle'}`} />
                        {valid ? t('card.active') : t('card.suspended')}
                      </span>
                    </div>
                  </footer>

                  <p className="mcard-foot-note">
                    {t('card.footNote')} <i /> Cameroon
                  </p>
                </article>
              </div>

              {/* ---------- BACK ---------- */}
              <div className="mcard-side mcard-side-verso">
                <p className="mcard-side-label"><span>{t('card.back')}</span> {t('card.reverse')}</p>
                <aside className={`mcard-verso ${valid ? '' : 'mcard-verso-off'}`}>
                  <span className="mcard-verso-band" aria-hidden="true" />
                  <img className="mcard-verso-watermark" src="/logo-mark.png" alt="" aria-hidden="true" />

                  <header className="mcard-verso-top">
                    <span className="mcard-verso-brand">
                      <img className="mcard-verso-logo" src="/logo-mark.png" alt="" />
                      Mega Mighty Sixers
                    </span>
                    <span className="mcard-verso-kind">
                      {valid ? t('card.active') : t('card.suspended')}
                    </span>
                  </header>

                  <div className="mcard-verso-body">
                    <div className="mcard-verso-legal">
                      <p>{t('card.legal.personal')}</p>
                      <p>{t('card.legal.repro')}</p>
                      <p className="mcard-verso-ref">{t('card.legal.lost')}</p>
                    </div>

                    <div className="mcard-verso-check">
                      <p className="mcard-verso-label">{t('card.verification')}</p>
                      <p className="mcard-verso-num">{card.card_number}</p>
                      <p className="mcard-verso-print">
                        {t('card.reference')} <code>{fingerprint(card.card_number)}</code>
                      </p>
                      <dl className="mcard-verso-dates">
                        <div><dt>{t('card.issued')}</dt><dd>{fmtShort(card.issued_at)}</dd></div>
                        <div><dt>{t('card.validUntil')}</dt><dd>{fmtShort(card.valid_until)}</dd></div>
                      </dl>
                    </div>
                  </div>

                  <div className="mcard-verso-sign">
                    {card.signature && <img className="mcard-sign-img" src={card.signature} alt="" />}
                    <span className="mcard-sign-line">
                      {card.signed_by || t('card.defaultSign')}
                    </span>
                  </div>

                  <footer className="mcard-verso-foot">
                    <span className="mcard-verso-owner">
                      <i className="mdi mdi-email-outline" /> {user?.email}
                    </span>
                    <span>
                      {t('app.associationShort')} · {t('memberCard.no')} {card.card_number}
                    </span>
                  </footer>
                </aside>
              </div>
            </div>

            {!valid && (
              <p className="mcard-alert">
                <i className="mdi mdi-alert-outline" /> {t('card.alert')}
              </p>
            )}

            <div className="mcard-actions no-print">
              <button type="button" className="btn-primary" onClick={() => window.print()}>
                <i className="mdi mdi-printer-outline" /> {t('card.print')}
              </button>
              <Link to="/profil" className="btn-secondary">
                <i className="mdi mdi-pencil-outline" /> {t('card.editInfo')}
              </Link>
              <Link to="/espace-membre" className="btn-secondary">
                <i className="mdi mdi-view-dashboard-outline" /> {t('member.breadcrumb')}
              </Link>
            </div>

            <p className="mcard-tip no-print">{t('card.tip')}</p>
          </>
        )}
      </div>
    </div>
  )
}
