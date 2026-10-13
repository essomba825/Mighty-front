import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../api/cache'
import LangToggle from '../components/LangToggle'
import PageLoader from '../components/PageLoader'
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
  const [search, setSearch] = useState('')
  const [mineOnly, setMineOnly] = useState(false)

  /* Le cache partage les matieres entre les pages : deuxieme visite = rendu
     immediat, le rafraichissement se fait derriere. */
  const { data: subjectsData, loading, error } =
    useApi('/education/subjects/', { ttlMs: 120000 })
  const subjects = useMemo(
    () => (subjectsData?.results ?? subjectsData ?? []), [subjectsData])

  const q = search.trim().toLowerCase()
  const visible = useMemo(() => subjects.filter((s) => {
    if (mineOnly && user && !(s.lessons_completed > 0 || s.weak_lessons_count > 0)) return false
    if (!q) return true
    return `${s.name} ${s.description ?? ''}`.toLowerCase().includes(q)
  }), [subjects, q, mineOnly, user])

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

  /* Une carte-matiere compacte, pensee mobile d'abord : icone ronde aux
     couleurs de la matiere, nom, niveau et nombre de cours, progression reelle
     (pas simulee) a droite quand l'eleve est connecte. Une matiere vide reste
     visible mais marquee, jamais cliquable vers une page blanche. */
  const renderCard = (s) => {
    const empty = !s.lessons_count
    const pct = s.lessons_count
      ? Math.round(s.lessons_completed / s.lessons_count * 100) : 0
    const cls = `subject-card sc ${empty ? 'is-empty' : ''}`
    const style = { '--accent': s.color }
    const inner = (
      <>
        <span className="sc-icon" aria-hidden="true"><i className={`mdi ${s.icon}`} /></span>
        <span className="sc-meta">
          <strong>{s.name}</strong>
          <small>
            {s.level_display} · {s.lessons_count || 0} {T('lessons')}
            {user && s.weak_lessons_count > 0 && (
              <span className="sc-weak">
                {' '}· {s.weak_lessons_count} {T('weak_spots').toLowerCase()}
              </span>
            )}
          </small>
        </span>
        {empty ? (
          <span className="sc-soon"><i className="mdi mdi-clock-outline" /> {T('coming_soon')}</span>
        ) : user ? (
          <span className="sc-progress">
            <span className="sc-bar"><span style={{ width: `${pct}%` }} /></span>
            <em>{pct}%</em>
          </span>
        ) : null}
      </>
    )
    if (empty) {
      return <div key={s.id} className={cls} style={style} aria-disabled="true">{inner}</div>
    }
    return (
      <Link key={s.id} to={`/education/matieres/${s.slug}`} className={cls} style={style}>
        {inner}
        <i className="mdi mdi-chevron-right sc-go" aria-hidden="true" />
      </Link>
    )
  }

  return (
    <div>
      {/* Hero sombre a la maniere du mockup : marque, titre, sous-titre,
          progression reelle en anneau, recherche et filtres. Tout tient dans
          la zone de confort du pouce sur telephone. */}
      <header className="edu-hero2">
        <div className="edu-hero2-inner">
          <div className="edu-hero2-top">
            <span className="edu-hero2-brand">
              <img src="/logo-mark.png" alt="" />
              <span>Mega Mighty Sixers</span>
            </span>
            <LangToggle />
          </div>

          <div className="edu-hero2-head">
            <div className="edu-hero2-titles">
              <h1>{T('title')}</h1>
              <p>{T('subtitle')}</p>
            </div>
            {user && totalLessons > 0 && (
              <div className="edu-ring-wrap" title={T('your_progress')}>
                <span className="edu-ring" style={{ '--p': globalProgress }}>
                  <em>{globalProgress}%</em>
                </span>
              </div>
            )}
          </div>

          <div className="edu-hero2-search">
            <i className="mdi mdi-magnify" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
                   placeholder={T('search')} aria-label={T('search')} />
          </div>

          {user ? (
            <div className="edu-chips" role="tablist">
              <button type="button" role="tab" aria-selected={!mineOnly}
                      className={`edu-chip ${!mineOnly ? 'active' : ''}`}
                      onClick={() => setMineOnly(false)}>
                {T('edu_all')}
              </button>
              <button type="button" role="tab" aria-selected={mineOnly}
                      className={`edu-chip ${mineOnly ? 'active' : ''}`}
                      onClick={() => setMineOnly(true)}>
                {T('edu_mine')}
              </button>
              {totalWeak > 0 && (
                <span className="edu-chip edu-chip-warn" title={T('weak_hint')}>
                  <i className="mdi mdi-alert-circle-outline" /> {totalWeak}
                </span>
              )}
            </div>
          ) : (
            <p className="edu-hero2-guest">
              {T('guest_banner')}{' '}
              <Link to="/login" className="link-accent">{T('login')}</Link>
              {' '}{T('or')}{' '}
              <Link to="/inscription" className="link-accent">{T('signup')}</Link>.
            </p>
          )}
        </div>
      </header>

      <div className="page">
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
          <PageLoader label={T('loading')} />
        ) : byLevel.length === 0 ? (
          <div className="empty-state">
            <i className="mdi mdi-school-outline empty-icon" />
            <h2>{mineOnly ? T('edu_mine_empty') : T('no_subject')}</h2>
            <p>{mineOnly ? T('edu_mine_empty_hint') : T('no_subject_hint')}</p>
          </div>
        ) : (
          <>
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
                  <div className="subject-grid subject-grid-list">
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
