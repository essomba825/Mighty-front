import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import LangToggle from '../components/LangToggle'
import { useAuth } from '../context/AuthContext'
import { pick, useLang } from '../context/LangContext'
import { tr } from '../i18n/education'

/* Pliage pour la recherche : minuscules, sans accents, tirets traites comme
   des espaces. `normalize('NFD')` puis suppression des diacritiques conserve
   la longueur de la chaine, donc les index restent alignes sur le texte
   original — c'est ce qui permet de surligner sans le redecouper. */
const fold = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[-_/]/g, ' ')

const isWeak = (lesson) =>
  lesson.best_score !== null && lesson.best_score !== undefined && lesson.best_score < 70

/* Un mot suffit, l'ordre des mots n'oblige pas : c'est ce qu'on attend
   quand on cherche "premiers nombres" dans une table de matiere. */
const buildPredicate = (needle) => {
  const words = fold(needle).split(/\s+/).filter(Boolean)
  if (!words.length) return null
  return (haystacks) => {
    const bag = haystacks.map(fold).join(' ')
    return words.every((w) => bag.includes(w))
  }
}

/* On indexe les DEUX versions de chaque champ : chercher « premiere » doit
   trouver un cours dont seule la version anglaise contient « prime ». */
const lessonHaystacks = (lesson, chapter) => [
  lesson.title, lesson.title_fr, lesson.summary, lesson.summary_fr,
  lesson.kind_display,
  (lesson.objectives || []).join(' '), (lesson.objectives_fr || []).join(' '),
  chapter.title, chapter.title_fr,
]

/* Surlignage : la recherche accepte les mots dans n'importe quel ordre, donc
   on marque chaque mot séparément plutot qu'une plage unique. */
const highlight = (text, needle) => {
  const source = text ?? ''
  const words = fold(needle).split(/\s+/).filter(Boolean)
  if (!source || !words.length) return source
  const hay = fold(source)
  const ranges = []
  words.forEach((word) => {
    const at = hay.indexOf(word)
    if (at >= 0) ranges.push([at, at + word.length])
  })
  if (!ranges.length) return source
  ranges.sort((a, b) => a[0] - b[0])
  const parts = []
  let cursor = 0
  ranges.forEach(([start, end], i) => {
    if (start < cursor) return
    if (start > cursor) parts.push(source.slice(cursor, start))
    parts.push(<mark className="search-hit" key={i}>{source.slice(start, end)}</mark>)
    cursor = end
  })
  if (cursor < source.length) parts.push(source.slice(cursor))
  return <>{parts}</>
}

export default function SubjectCurriculum() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { lang } = useLang()
  const T = (k) => tr(k, lang)
  const [searchParams, setSearchParams] = useSearchParams()
  const [subject, setSubject] = useState(null)
  const [chapters, setChapters] = useState([])
  const [loading, setLoading] = useState(true)
  const [onlyWeak, setOnlyWeak] = useState(false)
  const searchRef = useRef(null)
  const query = searchParams.get('q') ?? ''

  const setQuery = (value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('q', value)
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    api.get('/education/subjects/')
      .then(({ data }) => {
        const list = data.results ?? data
        const found = list.find((s) => s.slug === slug)
        if (!found) return
        setSubject(found)
        return api.get(`/education/subjects/${found.id}/curriculum/`)
      })
      .then((res) => { if (res) setChapters(res.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const allLessons = useMemo(
    () => chapters.flatMap((c) => c.lessons).filter(Boolean), [chapters])
  const doneCount = allLessons.filter((l) => l.completed).length
  const weakCount = allLessons.filter(isWeak).length
  const nextLesson = allLessons.find((l) => !l.completed)
  const firstWeak = allLessons.find(isWeak)
  const progress = allLessons.length
    ? Math.round(doneCount / allLessons.length * 100) : 0

  /* Un chapitre sans aucune lecon ne fait que promettre du contenu absent : on
     ne l'affiche pas, et on ne le compte pas non plus. Sans cela l'en-tete
     annonce 9 chapitres alors que la page n'en montre que 4. Les chapitres
     restants sont renumerotes a la suite : montrer 01, 02, 03 puis 09 pour une
     lecon d'entrainement renforce l'impression d'un programme incomplet. Le
     numero est calcule sur la liste complete et non sur le resultat de la
     recherche, pour qu'il ne bouge pas quand l'eleve filtre. */
  const filledChapters = useMemo(
    () => chapters.filter((c) => (c.lessons || []).filter(Boolean).length > 0),
    [chapters])
  const chapterNumber = useMemo(() => {
    const map = new Map()
    filledChapters.forEach((c, i) => map.set(c.id, i + 1))
    return map
  }, [filledChapters])

  const [showDetails, setShowDetails] = useState(false)

  /* Sur mobile les chapitres sont des accordeons. Un seul est ouvert : celui qui
     contient la lecon a suivre, parce que c'est le seul endroit ou replier
     apporte quelque chose. L'etat est DERIVE, avec seulement les choix
     explicites de l'eleve en surcharge — pas de setState dans un effet, qui
     provoquerait un rendu en cascade et refermerait ce qu'il vient d'ouvrir. */
  const defaultOpenId = useMemo(() => {
    if (filledChapters.length === 0) return null
    if (!nextLesson) return null
    const owner = filledChapters.find(
      (c) => c.lessons.some((l) => l && l.id === nextLesson.id))
    return owner ? owner.id : null
  }, [filledChapters, nextLesson])
  const [chapterChoice, setChapterChoice] = useState({})
  const isChapterOpen = (id) => {
    if (id in chapterChoice) return chapterChoice[id]
    return defaultOpenId === null ? filledChapters.length <= 1 : id === defaultOpenId
  }
  const toggleChapter = (id) =>
    setChapterChoice((prev) => ({ ...prev, [id]: !isChapterOpen(id) }))

  /* Chapitres filtres : recherche + points faibles. Un chapitre sans aucun
     resultat disparait, sinon la page garde des trous vides. */
  const matches = useMemo(() => buildPredicate(query.trim()), [query])
  const visibleChapters = useMemo(() => chapters
    .map((chapter) => ({
      ...chapter,
      lessons: (chapter.lessons || []).filter(Boolean).filter((lesson) => {
        if (onlyWeak && !isWeak(lesson)) return false
        return !matches || matches(lessonHaystacks(lesson, chapter))
      }),
    }))
    .filter((chapter) => chapter.lessons.length > 0),
  [chapters, matches, onlyWeak])
  const matchedCount = visibleChapters.reduce((n, c) => n + c.lessons.length, 0)
  const searching = query.trim().length > 0

  /* Une seule pastille par lecon : la terminaison prime, sinon le score s'il
     existe, sinon la duree. Empiler quiz + duree + score + « terminee » sur
     chaque ligne donnait a la page son aspect de liste administrative. */
  const lessonStatus = (lesson) => {
    if (lesson.completed) {
      return <span className="lesson-status done">
        <i className="mdi mdi-check-circle" /> {T('completed')}
      </span>
    }
    const score = lesson.best_score
    if (score !== null && score !== undefined) {
      return (
        <span className={`lesson-status score ${score < 70 ? 'ko' : 'ok'}`}
              title={T('score')}>
          <i className={`mdi ${score < 70 ? 'mdi-alert-circle-outline' : 'mdi-check-circle-outline'}`} />
          {score}%
        </span>
      )
    }
    return (
      <span className="lesson-status quiet" title={T('min')}>
        <i className="mdi mdi-clock-outline" /> {lesson.estimated_minutes} {T('min')}
      </span>
    )
  }

  /* Le "/" place le curseur dans la recherche : on cherche souvent sans
     prendre la souris, comme dans un code editor. */
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (loading) {
    return <div className="page"><div className="skeleton-line w60" /><div className="skeleton-line w90" /></div>
  }
  if (!subject) {
    return (
      <div className="page">
        <div className="empty-state">
          <i className="mdi mdi-book-search-outline empty-icon" />
          <h2>{T('not_found')}</h2>
          <Link to="/education" className="btn-primary">{T('back_subjects')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ '--accent': subject.color }}>
      {/* En-tete compact : ou l'on est, ce que l'on va apprendre, ou l'on en
          est. Les actions vivent desormais dans la colonne de droite, pour ne
          pas repeter la meme information deux fois sur l'ecran. */}
      <section className="subject-hero subject-hero-compact" style={{ '--accent': subject.color }}>
        {subject.image_url && (
          <img className="subject-hero-photo" src={subject.image_url} alt=""
               onError={(e) => e.currentTarget.remove()} />
        )}
        <div className="subject-hero-inner">
          <div className="subject-hero-top">
            <Link to="/education" className="breadcrumb-back-hero">
              <i className="mdi mdi-arrow-left" /> {T('back_subjects')}
            </Link>
            <LangToggle />
          </div>
          <div className="subject-hero-body">
            <span className="subject-icon hero"><i className={`mdi ${subject.icon}`} /></span>
            <div className="subject-hero-id">
              <p className="subject-hero-level">{subject.level_display}</p>
              <h1>{subject.name}</h1>
            </div>
          </div>
          <p className="subject-hero-desc">{subject.description}</p>
          <div className="subject-hero-facts">
            <span><i className="mdi mdi-book-open-page-variant-outline" /> {allLessons.length} {T('lessons')}</span>
            <span><i className="mdi mdi-format-list-numbered" /> {filledChapters.length} {T('chapters')}</span>
            {user && (
              <span className="subject-hero-facts-progress">
                <span className="subject-progress-bar">
                  <span style={{ width: `${progress}%`, background: subject.color }} />
                </span>
                {progress}% {T('done')}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="page">
        {chapters.length === 0 || allLessons.length === 0 ? (
          <div className="empty-state">
            <i className="mdi mdi-book-education-outline empty-icon" />
            <h2>{T('preparing')}</h2>
            <p>{T('preparing_hint')}</p>
          </div>
        ) : (
          /* La colonne de droite n'existe que pour un eleve connecte. Sans la classe
             `has-rail`, la grille reserverait 280px vides a un visiteur. */
          <div className={`curriculum-layout ${user ? 'has-rail' : ''}`}>
            <div className="curriculum-main">
              <div className="curriculum-search">
                <i className="mdi mdi-magnify curriculum-search-icon" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={T('search_lesson')}
                  aria-label={T('search_lesson')} />
                {query && (
                  <button type="button" className="curriculum-search-clear"
                          onClick={() => { setQuery(''); searchRef.current?.focus() }}
                          aria-label={T('clear_search')}>
                    <i className="mdi mdi-close-circle" />
                  </button>
                )}
              </div>

              <div className="lesson-filters">
                {user && (
                  <>
                    <button type="button" className={`edu-tab ${!onlyWeak ? 'active' : ''}`}
                            onClick={() => setOnlyWeak(false)}>
                      <i className="mdi mdi-view-list" /> {T('all_lessons')}
                    </button>
                    <button type="button" className={`edu-tab weak-tab ${onlyWeak ? 'active' : ''}`}
                            onClick={() => setOnlyWeak(true)} disabled={!weakCount}>
                      <i className="mdi mdi-alert-circle-outline" /> {T('filter_weak')}
                      {weakCount > 0 && <span className="tab-count">{weakCount}</span>}
                    </button>
                  </>
                )}
                <button type="button" className={`edu-tab details-tab ${showDetails ? 'active' : ''}`}
                        onClick={() => setShowDetails((v) => !v)}>
                  <i className="mdi mdi-text-box-outline" />
                  {showDetails ? T('hide_details') : T('show_details')}
                </button>
              </div>

              {(searching || onlyWeak) && (
                <p className="curriculum-count">
                  {searching
                    ? T('search_results').replace('{n}', String(matchedCount))
                    : `${weakCount} ${T('weak_spots')}`}
                </p>
              )}

              {visibleChapters.length === 0 ? (
                <div className="empty-state">
                  <i className="mdi mdi-text-search empty-icon" />
                  <h2>{T('no_search_result')}</h2>
                  <p>{T('no_search_result_hint')}</p>
                  {(searching || onlyWeak) && (
                    <button type="button" className="btn-secondary"
                            onClick={() => { setQuery(''); setOnlyWeak(false) }}>
                      <i className="mdi mdi-filter-remove-outline" /> {T('reset_filters')}
                    </button>
                  )}
                </div>
              ) : (
              <div className="curriculum">
                {visibleChapters.map((chapter) => {
                  const chapDone = chapter.lessons.filter((l) => l.completed).length
                  const isOpen = isChapterOpen(chapter.id)
                  return (
                    <section key={chapter.id} className="chapter" data-open={isOpen}>
                      <button type="button" className="chapter-head chapter-toggle"
                              onClick={() => toggleChapter(chapter.id)}
                              aria-expanded={isOpen}
                              aria-label={T('open_chapter')}>
                        <span className="chapter-num">
                          {String(chapterNumber.get(chapter.id) ?? chapter.order).padStart(2, '0')}
                        </span>
                        <span className="chapter-titles">
                          <h2>{pick(chapter.title_fr, chapter.title, lang)}</h2>
                        </span>
                        {user && chapter.lessons.length > 0 && (
                          <span className="chapter-progress">
                            {chapDone}/{chapter.lessons.length}
                          </span>
                        )}
                        <i className="mdi mdi-chevron-down chapter-chevron" />
                      </button>

                      <div className="chapter-body">
                        {chapter.description && (
                          <p className="chapter-desc">{chapter.description}</p>
                        )}
                        <ol className="lesson-list">
                          {chapter.lessons.map((lesson) => (
                            <li key={lesson.id}>
                              <Link to={`/cours/${lesson.id}`}
                                    className={`lesson-row ${lesson.completed ? 'done' : ''} ${
                                      isWeak(lesson) ? 'weak' : ''
                                    }`}>
                                <span className="lesson-order">{lesson.order}</span>
                                <span className="lesson-main">
                                  <strong>
                                    {searching
                                      ? highlight(pick(lesson.title_fr, lesson.title, lang), query)
                                      : pick(lesson.title_fr, lesson.title, lang)}
                                  </strong>
                                  {showDetails && (lesson.summary || lesson.summary_fr) && (
                                    <small className="lesson-summary">
                                      {searching
                                        ? highlight(pick(lesson.summary_fr, lesson.summary, lang), query)
                                        : pick(lesson.summary_fr, lesson.summary, lang)}
                                    </small>
                                  )}
                                </span>
                                <span className="lesson-badges">
                                  {lesson.kind === 'exam_paper' && (
                                    <span className="lesson-kind exam">
                                      <i className="mdi mdi-file-certificate-outline" /> {T('exam_paper')}
                                    </span>
                                  )}
                                  {lessonStatus(lesson)}
                                  {!lesson.completed && (
                                    <i className="mdi mdi-play-circle-outline lesson-icon" />
                                  )}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </section>
                  )
                })}
              </div>
              )}
            </div>

            {user && (
              <aside className="curriculum-rail">
                <div className="rail-card">
                  <h2 className="rail-title">
                    <i className="mdi mdi-chart-donut" /> {T('your_progress')}
                  </h2>
                  <p className="rail-figure">{progress}%</p>
                  <p className="rail-sub">
                    {T('lessons_done_of')
                      .replace('{done}', String(doneCount))
                      .replace('{total}', String(allLessons.length))}
                  </p>
                  <div className="subject-progress-bar">
                    <span style={{ width: `${progress}%`, background: subject.color }} />
                  </div>
                </div>

                {nextLesson && (
                  <div className="rail-card">
                    <h2 className="rail-title">
                      <i className="mdi mdi-play-circle" /> {doneCount > 0 ? T('continue') : T('start')}
                    </h2>
                    <Link to={`/cours/${nextLesson.id}`} className="rail-lesson">
                      {pick(nextLesson.title_fr, nextLesson.title, lang)}
                    </Link>
                  </div>
                )}

                {firstWeak && (
                  <div className="rail-card rail-weak">
                    <h2 className="rail-title">
                      <i className="mdi mdi-refresh-circle" /> {T('weak_spots')}
                    </h2>
                    <Link to={`/cours/${firstWeak.id}`} className="rail-lesson">
                      {pick(firstWeak.title_fr, firstWeak.title, lang)}
                    </Link>
                    {weakCount > 1 && (
                      <p className="rail-sub">{weakCount} {T('weak_spots').toLowerCase()}</p>
                    )}
                  </div>
                )}

                <div className="rail-card">
                  <Link to="/education/revision-du-jour" className="rail-review">
                    <i className="mdi mdi-timer-refresh" /> {T('rv_daily_review')}
                  </Link>
                </div>
              </aside>
            )}
          </div>
        )}

        {!user && (
          <p className="edu-banner" style={{ marginTop: 30 }}>
            <i className="mdi mdi-lock-open-outline" /> {T('guest_banner')}{' '}
            <Link to="/login" className="link-accent">{T('login')}</Link>{' '}
            {T('or')}{' '}
            <Link to="/inscription" className="link-accent">{T('signup')}</Link>.
          </p>
        )}
      </div>
    </div>
  )
}
