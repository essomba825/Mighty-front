import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import LangToggle from '../components/LangToggle'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { tr } from '../i18n/education'

/* Les niveaux sont des SECTIONS, pas des onglets : un onglet cache la moitié
   du programme et oblige a cliquer pour savoir ce qu'il reste. On groupe pour
   que tout reste visible en un seul regard. */
const LEVELS = [
  { value: 'ol', icon: 'mdi-alpha-o-circle-outline', en: 'GCE Ordinary Level', fr: 'GCE Ordinary Level' },
  { value: 'al', icon: 'mdi-alpha-a-circle-outline', en: 'GCE Advanced Level', fr: 'GCE Advanced Level' },
]

export default function Education() {
  const { user } = useAuth()
  const { lang } = useLang()
  const T = (k) => tr(k, lang)
  const [subjects, setSubjects] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const startedAt = performance.now()
    let active = true
    let loadingTimer

    api.get('/education/subjects/')
      .then(({ data }) => {
        if (active) setSubjects(data.results ?? data)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (!active) return
        const remaining = Math.max(0, 420 - (performance.now() - startedAt))
        loadingTimer = window.setTimeout(() => {
          if (active) setLoading(false)
        }, remaining)
      })

    return () => {
      active = false
      window.clearTimeout(loadingTimer)
    }
  }, [])

  const q = search.trim().toLowerCase()
  const visible = useMemo(() => subjects.filter((s) => {
    if (!q) return true
    return `${s.name} ${s.description ?? ''}`.toLowerCase().includes(q)
  }), [subjects, q])

  const byLevel = useMemo(() => LEVELS
    .map((level) => ({ ...level, subjects: visible.filter((s) => s.level === level.value) }))
    .filter((group) => group.subjects.length > 0),
  [visible])

  /* Progression globale : donne le « ou j'en suis » avant le detail par
     matiere. Sans cela, huit cartes affichent chacune « 0/10 terminees » et
     la page repond huit fois a une question posee une seule fois. */
  const totalLessons = subjects.reduce((n, s) => n + (s.lessons_count ?? 0), 0)
  const totalDone = subjects.reduce((n, s) => n + (s.lessons_completed ?? 0), 0)
  const totalWeak = subjects.reduce((n, s) => n + (s.weak_lessons_count ?? 0), 0)
  const globalProgress = totalLessons
    ? Math.round(totalDone / totalLessons * 100) : 0

  /* Bandeau de remplacement quand l'image est absente ou ne charge pas. Il
     porte l'icone en filigrane pour que la carte ne paraisse pas cassee. */
  const placeholder = (s) => (
    <div className="subject-card-media subject-card-fallback" aria-hidden="true">
      <i className={`mdi ${s.icon}`} />
    </div>
  )

  const renderCard = (s) => {
    /* Une matiere sans aucune lecon ne doit pas ressembler a une matiere
       pleine : le clic ne menait qu'a un « programme en preparation », et rien
       sur la carte ne l'annoncait. On la marque et on la rend non cliquable
       plutot que de la masquer, pour que le programme reste lisible. */
    const empty = !s.lessons_count
    const pct = s.lessons_count
      ? Math.round(s.lessons_completed / s.lessons_count * 100) : 0
    const body = (
      <>
        {/* La carte attend toujours une zone « media » : la pastille de niveau
            et l'icone sont positionnees en absolu au-dessus d'elle. Sans image,
            le titre se retrouvait Covered par ces deux elements. Un bandeau
            teinte a la couleur de la matiere garde la grille reguliere. */}
        {s.image_url ? (
          <div className="subject-card-media">
            <img src={s.image_url} alt="" loading="lazy"
                 onError={(e) => e.currentTarget.parentElement.replaceWith(
                   placeholder(s))} />
          </div>
        ) : (
          placeholder(s)
        )}
        <div className="subject-card-top">
          <span className="subject-icon"><i className={`mdi ${s.icon}`} /></span>
          <span className="badge-level">{s.level_display}</span>
        </div>
        <div className="subject-info">
          <h3>{s.name}</h3>
          {s.description && <p>{s.description}</p>}
        </div>
        <div className="subject-foot">
          {empty ? (
            <>
              <span className="subject-soon">
                <i className="mdi mdi-clock-outline" /> {T('preparing')}
              </span>
              <span className="subject-badge-soon">{T('coming_soon')}</span>
            </>
          ) : (
            <>
              <span>
                <i className="mdi mdi-book-open-variant" /> {s.lessons_count} {T('lessons')}
              </span>
              {user && (
                <div className="subject-progress-wrap">
                  <div className="subject-progress-bar">
                    <span style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                  <small>{s.lessons_completed}/{s.lessons_count} {T('done')}</small>
                </div>
              )}
              {user && s.weak_lessons_count > 0 && (
                <span className="subject-weak" title={T('weak_hint')}>
                  <i className="mdi mdi-alert-circle-outline" /> {s.weak_lessons_count} {T('weak_spots')}
                </span>
              )}
              <i className="mdi mdi-chevron-right subject-go" />
            </>
          )}
        </div>
      </>
    )
    if (empty) {
      return (
        <div key={s.id} className="subject-card card is-empty"
             style={{ '--accent': s.color }} aria-disabled="true">
          {body}
        </div>
      )
    }
    return (
      <Link key={s.id} to={`/education/matieres/${s.slug}`}
            className="subject-card card" style={{ '--accent': s.color }}>
        {body}
      </Link>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow={T('learn')}
        title={T('title')}
        sub={T('subtitle')}
        breadcrumb={T('learn_breadcrumb')}
        image="/education-hero-illustration.svg"
      >
        <LangToggle />
      </PageHeader>

      <div className="page">
        {!user && (
          <p className="edu-banner">
            <i className="mdi mdi-account-circle-outline" /> {T('guest_banner')}{' '}
            <Link to="/login" className="link-accent">{T('login')}</Link>
            {' '}{T('or')}{' '}
            <Link to="/inscription" className="link-accent">{T('signup')}</Link>.
          </p>
        )}

        {error ? (
          <div className="empty-state">
            <i className="mdi mdi-server-network-off empty-icon" />
            <h2>{T('server_down_title')}</h2>
            <p>{T('server_down_hint')}</p>
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              <i className="mdi mdi-refresh" /> {T('retry')}
            </button>
          </div>
        ) : loading ? (
          <>
            <div className="edu-loading-state" role="status">
              <i className="mdi mdi-loading edu-loading-spinner" aria-hidden="true" />
              <span>{T('loading')}</span>
            </div>
            <div className="subject-grid" aria-busy="true">
              {[1, 2, 3].map((i) => <div key={i} className="card" style={{ padding: 26 }}><div className="skeleton-line w60" /><div className="skeleton-line w90" /></div>)}
            </div>
          </>
        ) : byLevel.length === 0 ? (
          <div className="empty-state">
            <i className="mdi mdi-school-outline empty-icon" />
            <h2>{T('no_subject')}</h2>
            <p>{T('no_subject_hint')}</p>
          </div>
        ) : (
          <>
            {user && totalLessons > 0 && (
              <div className="edu-overview">
                <div className="edu-overview-figure">
                  <strong>{globalProgress}%</strong>
                  <span>{T('your_progress')}</span>
                </div>
                <div className="edu-overview-facts">
                  <span>
                    <i className="mdi mdi-book-check-outline" />
                    {totalDone} / {totalLessons} {T('lessons_published')}
                  </span>
                  {totalWeak > 0 && (
                    <span className="edu-overview-weak">
                      <i className="mdi mdi-alert-circle-outline" />
                      {totalWeak} {T('weak_spots')}
                    </span>
                  )}
                </div>
                <div className="subject-progress-bar edu-overview-bar">
                  <span style={{ width: `${globalProgress}%` }} />
                </div>
              </div>
            )}

            <div className="edu-toolbar">
              <div className="edu-search">
                <i className="mdi mdi-magnify" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                       placeholder={T('search')} aria-label={T('search')} />
              </div>
            </div>

            {byLevel.map((group) => {
              const ready = group.subjects.filter((s) => s.lessons_count).length
              return (
                <section key={group.value} className="edu-level">
                  <header className="edu-level-head">
                    <i className={`mdi ${group.icon}`} />
                    <h2>{lang === 'fr' ? group.fr : group.en}</h2>
                    <span className="tab-count">{group.subjects.length}</span>
                    {ready < group.subjects.length && (
                      <small>
                        {group.subjects.length - ready} {T('coming_soon').toLowerCase()}
                      </small>
                    )}
                  </header>
                  <div className="subject-grid">
                    {group.subjects.map(renderCard)}
                  </div>
                </section>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}