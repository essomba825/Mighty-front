import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import { useLang } from '../context/LangContext'

const STATUS = {
  active: { labelKey: 'active', icon: 'mdi-rocket-launch', className: 'badge-active' },
  funded: { labelKey: 'funded', icon: 'mdi-check-decagram', className: 'badge-funded' },
  completed: { labelKey: 'completed', icon: 'mdi-trophy', className: 'badge-completed' },
}

const FILTERS = [
  { value: '', labelKey: 'all', icon: 'mdi-view-grid' },
  { value: 'active', labelKey: 'active', icon: 'mdi-rocket-launch' },
  { value: 'funded', labelKey: 'funded', icon: 'mdi-check-decagram' },
  { value: 'completed', labelKey: 'completed', icon: 'mdi-trophy' },
]

const fmt = (n, locale) => Number(n).toLocaleString(locale)
const percentOf = (p) => p.budget > 0 ? Math.min(Math.round((p.amount_collected / p.budget) * 100), 100) : 0

/* Barre de progression animée à l'apparition */
function AnimatedProgress({ percent }) {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setWidth(percent); obs.disconnect() }
    }, { threshold: 0.4 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [percent])
  return (
    <div className="progress" ref={ref}>
      <div className="progress-bar" style={{ width: `${width}%` }} />
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

/* Chiffre qui compte (effet compteur), format compact lisible */
function CountUp({ value, suffix = '', locale = 'en-GB' }) {
  const ref = useRef(null)
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      obs.disconnect()
      const start = performance.now()
      const dur = 1400
      const tick = (t) => {
        const p = Math.min((t - start) / dur, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        setDisplay(Math.round(Number(value) * eased))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [value])

  // compactage : 2 100 000 -> "2,1 M" (lisible sur mobile)
  let shown = fmt(display, locale)
  if (display >= 1000000) shown = (display / 1000000).toLocaleString(locale, { maximumFractionDigits: 1 }) + ' M'
  else if (display >= 10000) shown = Math.round(display / 1000) + ' k'
  return <span ref={ref}>{shown}{suffix}</span>
}

export default function Projects() {
  const { t, lang } = useLang()
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB'
  const [projects, setProjects] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/projects/')
      .then(({ data }) => setProjects(data.results ?? data))
      .finally(() => setLoading(false))
  }, [])

  const shown = projects.filter((p) => !filter || p.status === filter)
  const activeProjects = projects.filter((p) => p.status === 'active')
  const featured = [...activeProjects].sort((a, b) => percentOf(b) - percentOf(a))[0]
  const others = shown.filter((p) => p !== featured)
  const totalCollected = projects.reduce((sum, p) => sum + Number(p.amount_collected || 0), 0)

  return (
    <div>
      <PageHeader
        eyebrow={t('projects.eyebrow')}
        title={t('projects.title')}
        sub={t('projects.sub')}
        breadcrumb={t('projects.title')}
      />

      {/* Bandeau d'impact */}
      <section className="impact-band">
        <div className="section-inner impact-grid">
          <div className="impact-item">
            <span className="impact-icon"><i className="mdi mdi-hand-heart" /></span>
            <div className="impact-text">
              <p className="impact-value"><CountUp value={totalCollected} suffix=" FCFA" locale={locale} /></p>
              <p className="impact-label">{t('projects.collected')}</p>
            </div>
          </div>
          <div className="impact-item">
            <span className="impact-icon"><i className="mdi mdi-rocket-launch" /></span>
            <div className="impact-text">
              <p className="impact-value"><CountUp value={activeProjects.length} locale={locale} /></p>
              <p className="impact-label">{t('projects.funding')}</p>
            </div>
          </div>
          <div className="impact-item">
            <span className="impact-icon"><i className="mdi mdi-bank-outline" /></span>
            <div className="impact-text">
              <p className="impact-value"><CountUp value={projects.reduce((s, p) => s + Number(p.budget || 0), 0)} suffix=" FCFA" locale={locale} /></p>
              <p className="impact-label">{t('projects.goals')}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="page">
        {/* Filtres par statut */}
        <div className="tabs">
          {FILTERS.map((f) => (
            <button key={f.value} className={filter === f.value ? 'active' : ''}
                    onClick={() => setFilter(f.value)}>
              <i className={`mdi ${f.icon}`} /> {t(`projects.filter.${f.labelKey}`)}
              <span className="tab-count">
                {f.value ? projects.filter((p) => p.status === f.value).length : projects.length}
              </span>
            </button>
          ))}
        </div>

        {loading ? <Skeleton /> : shown.length === 0 ? (
          <div className="empty-state">
            <i className="mdi mdi-briefcase-variant-outline empty-icon" />
            <h2>{t('projects.empty')}</h2>
            <p>{t('projects.emptyHint')}</p>
          </div>
        ) : (
          <>
            {/* Projet vedette */}
            {featured && !filter && (
              <article className="project-featured">
                {featured.image && (
                  <div className="project-featured-media">
                    <img src={featured.image} alt={featured.title} />
                    <span className={`badge ${STATUS[featured.status].className} project-badge`}>
                      <i className={`mdi ${STATUS[featured.status].icon}`} /> {t(`projects.status.${STATUS[featured.status].labelKey}`)}
                    </span>
                  </div>
                )}
                <div className="project-featured-body">
                  <p className="ph-eyebrow" style={{ color: 'var(--gold)' }}>
                    <span className="ph-line" /> {t('projects.featured')}
                  </p>
                  <h2>{featured.title}</h2>
                  <p className="event-desc">{featured.description}</p>
                  <p className="project-objective">
                    <i className="fa-solid fa-bullseye" /> {featured.objective}
                  </p>
                  <AnimatedProgress percent={percentOf(featured)} />
                  <div className="project-figures project-figures-big">
                    <span><strong>{fmt(featured.amount_collected, locale)}</strong> {t('projects.collectedShort')}</span>
                    <span className="project-percent">{percentOf(featured)}%</span>
                  </div>
                  <small className="project-remaining">
                    {t('donate.goal', { budget: fmt(featured.budget, locale) })} — <i className="mdi mdi-target" /> {t('donate.remaining', { n: fmt(featured.funds_remaining, locale) })}
                  </small>
                  <div className="project-featured-actions">
                    <Link to={`/contribuer/${featured.id}`} className="btn-primary">
                      <i className="fa-solid fa-hand-holding-heart" /> {t('projects.contributeNow')}
                    </Link>
                    <Link to="/partenaires" className="btn-text-gold">
                      {t('projects.sponsorThis')} <i className="fa-solid fa-arrow-right" />
                    </Link>
                  </div>
                </div>
              </article>
            )}

            {/* Autres projets */}
            <div className="events-grid" style={{ marginTop: featured && !filter ? 30 : 0 }}>
              {others.map((p) => {
                const s = STATUS[p.status] || STATUS.active
                return (
                  <article key={p.id} className="project-card">
                    {p.image && (
                      <div className="event-media">
                        <img src={p.image} alt={p.title} loading="lazy" />
                        <span className={`badge ${s.className} project-badge`}>
                          <i className={`mdi ${s.icon}`} /> {t(`projects.status.${s.labelKey}`)}
                        </span>
                      </div>
                    )}
                    <div className="event-body">
                      <h3>{p.title}</h3>
                      <p className="event-desc">{p.description}</p>
                      <p className="project-objective">
                        <i className="fa-solid fa-bullseye" /> {p.objective}
                      </p>
                      <AnimatedProgress percent={percentOf(p)} />
                      <div className="project-figures">
                        <span><strong>{fmt(p.amount_collected, locale)}</strong> {t('projects.collectedShort')}</span>
                        <span className="project-percent">{percentOf(p)}%</span>
                      </div>
                      <small className="project-remaining">
                        {t('donate.goal', { budget: fmt(p.budget, locale) })} — <i className="mdi mdi-target" /> {t('donate.remaining', { n: fmt(p.funds_remaining, locale) })}
                      </small>
                      {p.status === 'active' && (
                        <Link to={`/contribuer/${p.id}`} className="btn-primary">
                          <i className="fa-solid fa-hand-holding-heart" /> {t('projects.contribute')}
                        </Link>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}

        {/* Bandeau partenaires */}
        <div className="projects-cta card">
          <div>
              <h3><i className="fa-solid fa-handshake" style={{ color: 'var(--gold)' }} /> {t('projects.sponsorTitle')}</h3>
            <p>{t('projects.sponsor')}</p>
          </div>
          <Link to="/partenaires" className="btn-primary">{t('projects.becomePartner')}</Link>
        </div>
      </div>
    </div>
  )
}
