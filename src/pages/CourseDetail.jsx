import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import api from '../api/client'
import LangToggle from '../components/LangToggle'
import { pick, useLang } from '../context/LangContext'
import { tr } from '../i18n/education'
import LessonPlayer from './LessonPlayer'

const youtubeId = (url) => {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/)
  return m?.[1] ?? null
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const RESOURCE_META = {
  video: { icon: 'mdi-play-circle-outline', labelKey: 'video' },
  pdf: { icon: 'mdi-file-pdf-box', labelKey: 'pdf' },
  link: { icon: 'mdi-open-in-new', labelKey: 'link' },
  exam_paper: { icon: 'mdi-file-certificate-outline', labelKey: 'examPaper' },
}

const quizKey = (quizId) => String(quizId)

export default function CourseDetail() {
  const { id } = useParams()
  const { lang } = useLang()
  const T = (k) => tr(k, lang)
  const [lesson, setLesson] = useState(null)
  const [needLogin, setNeedLogin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [hasSteps, setHasSteps] = useState(false)
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState({})
  const [selected, setSelected] = useState(() => new Set())
  const [history, setHistory] = useState({})
  const [quizzes, setQuizzes] = useState({})
  const [submitting, setSubmitting] = useState(null)
  const [readProgress, setReadProgress] = useState(0)
  const [toc, setToc] = useState([])
  const contentRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setLesson(null)
    setAnswers({})
    setResults({})
    setQuizzes({})
    api.get(`/education/lessons/${id}/`)
      .then(({ data }) => {
        setLesson(data)
        setCompleted(data.completed)
        data.quizzes?.forEach((q) => {
          api.get(`/education/quizzes/${q.id}/`)
            .then(({ data: full }) =>
              setQuizzes((prev) => ({ ...prev, [q.id]: full })))
            .catch(() => {})
        })
      })
      .catch((err) => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          setNeedLogin(true)
        }
      })
      .finally(() => setLoading(false))

    // Meilleurs scores deja obtenus sur les quiz de cette lecon
    api.get('/education/results/')
      .then(({ data }) => {
        const best = {}
        data
          .filter((a) => a.lesson_id === Number(id))
          .forEach((a) => {
            const k = quizKey(a.quiz)
            if (best[k] == null || a.percentage > best[k]) best[k] = a.percentage
          })
        setHistory(best)
      })
      .catch(() => {})

    // La version pas-a-pas remplace l'ancien corps de lecon quand elle existe
    setHasSteps(false)
    api.get(`/education/lessons/${id}/steps/`)
      .then(({ data }) => setHasSteps(Array.isArray(data) && data.length > 0))
      .catch(() => setHasSteps(false))
  }, [id])

  const md = lesson && (lang === 'fr' && lesson.content_fr ? lesson.content_fr : lesson.content)

  /* Table des matières : on récupère les titres ## du Markdown */
  useEffect(() => {
    if (!md) { setToc([]); return }
    const heads = md.split('\n')
      .map((l) => l.match(/^## +(.+)/)?.[1])
      .filter(Boolean)
    setToc(heads.filter((h, i, arr) => arr.indexOf(h) === i)
      .map((text) => ({ id: slugify(text), label: text })))
  }, [md])

  /* Barre de progression de lecture */
  useEffect(() => {
    const onScroll = () => {
      const el = contentRef.current
      if (!el) return setReadProgress(0)
      const rect = el.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      const done = total <= 0 ? 1 : Math.min(1, Math.max(0, (window.innerHeight - rect.top) / total))
      setReadProgress(Math.round(done * 100))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [lesson, md])

  /* Une lecon se valide par la reussite du quiz ; la case a cocher reste
     une possibilite pour une lecon sans exercice (revision de cours). */
  const toggleCompleted = async () => {
    try {
      if (completed) {
        await api.delete(`/education/lessons/${id}/complete/`)
        setCompleted(false)
      } else {
        await api.post(`/education/lessons/${id}/complete/`)
        setCompleted(true)
      }
    } catch { /* silencieux */ }
  }

  const selectAnswer = (quizId, questionId, choiceId) =>
    setAnswers({ ...answers, [`${quizId}-${questionId}`]: choiceId })

  const submitQuiz = async (quiz) => {
    setSubmitting(quiz.id)
    const payload = {}
    quiz.questions.forEach((q) => {
      const a = answers[`${quiz.id}-${q.id}`]
      if (a) payload[q.id] = a
    })
    try {
      const { data } = await api.post(`/education/quizzes/${quiz.id}/submit/`, { answers: payload })
      setResults({ ...results, [quiz.id]: data })
      // Une lecon est validee par la maitrise, pas par une case a cocher
      if (data.passed) {
        setCompleted(true)
        api.post(`/education/lessons/${id}/complete/`).catch(() => {})
      }
    } catch {
      alert(T('quiz_error'))
    } finally {
      setSubmitting(null)
    }
  }

  // Reessaie sur place : on garde le resultat et on libere les reponses
  const retryQuiz = (quizId) => {
    setResults((prev) => {
      const next = { ...prev }
      delete next[quizId]
      return next
    })
    setAnswers((prev) => {
      const next = {}
      Object.keys(prev).forEach((k) => {
        if (!k.startsWith(`${quizId}-`)) next[k] = prev[k]
      })
      return next
    })
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(quizId)
      return next
    })
  }

  // La correction reste consultable apres un echec : elle porte l'apprentissage
  const revealQuiz = (quizId) => setSelected((prev) => new Set(prev).add(quizId))

  const isRevealed = (quizId) => selected.has(quizId)

  if (loading) return <p className="page">{T('loading')}</p>

  if (needLogin) {
    return (
      <div className="page">
        <div className="empty-state">
          <i className="mdi mdi-lock-outline empty-icon" />
          <h2>{T('login_gate_title')}</h2>
          <p>{T('login_gate_sub')}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" className="btn-primary">{T('login')}</Link>
            <Link to="/inscription" className="btn-secondary">{T('signup')}</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!lesson) return <p className="page">{T('not_found')}</p>

  const videoEmbed = lesson.video_url ? youtubeId(lesson.video_url) : null

  return (
    <div className="lesson-shell" style={{ '--accent': lesson.subject_color }}>
      {lesson.content && !hasSteps && (
        <div className="read-progress" aria-hidden="true">
          <span style={{ width: `${readProgress}%`, background: lesson.subject_color }} />
        </div>
      )}

      {/* En mode etape, le heros devient une barre discrete : l'eleve doit
          arriver sur la tache, pas sur la presentation. */}
      {hasSteps ? (
        <header className="lesson-focusbar">
          <Link to={`/education/matieres/${lesson.subject_slug}`} className="breadcrumb-back-hero">
            <i className="mdi mdi-arrow-left" /> {lesson.subject}
          </Link>
          <h1>{pick(lesson.title_fr, lesson.title, lang)}</h1>
          <LangToggle />
        </header>
      ) : (
      <section className="lesson-hero">
        {lesson.subject_image && (
          <img className="subject-hero-photo lesson-hero-photo" src={lesson.subject_image} alt=""
               onError={(e) => e.currentTarget.remove()} />
        )}
        <div className="lesson-hero-inner">
          <div className="subject-hero-top">
            <Link to={`/education/matieres/${lesson.subject_slug}`} className="breadcrumb-back-hero">
              <i className="mdi mdi-arrow-left" /> {lesson.subject}
            </Link>
            <LangToggle />
          </div>
          <p className="lesson-hero-eyebrow">
            {T('chapter')} : {pick(lesson.chapter_title_fr, lesson.chapter_title, lang)}
          </p>
          <h1>{pick(lesson.title_fr, lesson.title, lang)}</h1>
          <p className="lesson-hero-sub">{pick(lesson.summary_fr, lesson.summary, lang)}</p>
          <div className="lesson-hero-meta">
            <span><i className="mdi mdi-clock-outline" /> {lesson.estimated_minutes} {T('min')}</span>
            {lesson.author_name && (
              <span><i className="mdi mdi-account-outline" /> {T('by')} {lesson.author_name}</span>
            )}
            {completed && (
              <span className="lesson-done"><i className="mdi mdi-check-circle" /> {T('completed')}</span>
            )}
          </div>
        </div>
      </section>
      )}

      <div className="page lesson-page">
        {hasSteps ? (
          <LessonPlayer lessonId={id} T={T} onLessonComplete={() => {
            setCompleted(true)
            api.post(`/education/lessons/${id}/complete/`).catch(() => {})
          }} />
        ) : (
          <>
        <div className="lesson-toolbar">
          <button type="button" className={`btn-primary btn-ghost ${completed ? 'is-done' : ''}`}
                  onClick={toggleCompleted}>
            <i className={`mdi ${completed ? 'mdi-check-all' : 'mdi-check'}`} />
            {completed ? T('completed') : T('mark_done')}
          </button>
          {toc.length > 0 && (
            <details className="toc-mobile">
              <summary><i className="mdi mdi-format-list-bulleted" /> {T('curriculum')}</summary>
              <nav>
                {toc.map((h) => <a key={h.id} href={`#h-${h.id}`}>{h.label}</a>)}
              </nav>
            </details>
          )}
        </div>

        <div className={`lesson-grid ${toc.length ? 'has-toc' : ''}`}>
          {/* Table des matières (desktop) */}
          {toc.length > 0 && (
            <aside className="lesson-toc card">
              <p className="lesson-toc-title"><i className="mdi mdi-format-list-bulleted" /> {T('curriculum')}</p>
              {toc.map((h) => <a key={h.id} href={`#h-${h.id}`}>{h.label}</a>)}
            </aside>
          )}

          {/* Colonne principale */}
          <div className="lesson-main">
            {/* Objectifs d'apprentissage */}
            {(() => {
              const objs = (lang === 'fr' && lesson.objectives_fr?.length
                ? lesson.objectives_fr : lesson.objectives) || []
              return objs.length > 0 ? (
                <ul className="lesson-objectives">
                  {objs.map((o, i) => (
                    <li key={i}><i className="mdi mdi-check-decagram" /> {o}</li>
                  ))}
                </ul>
              ) : null
            })()}

            {videoEmbed && (
              <div className="lesson-video">
                <iframe src={`https://www.youtube-nocookie.com/embed/${videoEmbed}`}
                        title={lesson.title}
                        allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                        allowFullScreen />
              </div>
            )}

            {md ? (
              <article className="lesson-content card" ref={contentRef}>
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => {
                      const label = typeof children === 'string'
                        ? children
                        : String((children?.[0]) ?? '')
                      return <h2 id={`h-${slugify(label)}`}>{children}</h2>
                    },
                  }}>
                  {md}
                </ReactMarkdown>
              </article>
            ) : (
              <div className="empty-state">
                <i className="mdi mdi-book-clock-outline empty-icon" />
                <h2>{T('writing_title')}</h2>
                <p>{T('writing_hint')}</p>
              </div>
            )}

            {lesson.resources?.length > 0 && (
              <section className="lesson-resources">
                <h2><i className="mdi mdi-book-open-variant" /> {T('resources')}</h2>
                <div className="resource-grid">
                  {lesson.resources.map((r) => {
                    const meta = RESOURCE_META[r.kind] || RESOURCE_META.link
                    const href = r.url || r.file_url
                    return (
                      <a key={r.id} href={href} target="_blank" rel="noreferrer"
                         className="resource-card card resource-glass">
                        <i className={`mdi ${meta.icon} resource-icon resource-${r.kind}`} />
                        <div>
                          <strong>{pick(r.title_fr, r.title, lang)}</strong>
                          <small>
                            {T(`lesson_resource_${meta.labelKey}`)}
                            {r.source_name ? ` — ${r.source_name}` : ''}
                          </small>
                          {r.license_note && <small className="resource-license">{r.license_note}</small>}
                        </div>
                      </a>
                    )
                  })}
                </div>
              </section>
            )}

            {lesson.quizzes?.length > 0 && (
              <section className="lesson-quizzes">
                <h2><i className="mdi mdi-clipboard-check-outline" /> {T('exercises')}</h2>
                {lesson.quizzes.map((q) => {
                  const quiz = quizzes[q.id]
                  const result = results[q.id]
                  const wrong = result?.review?.filter((r) => !r.is_correct).length ?? 0
                  const isPassed = result?.passed
                  const best = history[quizKey(q.id)]
                  return (
                    <section key={q.id}
                             className={`card quiz-card ${result ? (isPassed ? 'is-passed' : 'is-failed') : ''}`}>
                      <div className="quiz-head">
                        <h3>{q.title}</h3>
                        <span className={`quiz-badge ${isPassed ? 'ok' : result ? 'ko' : ''}`}>
                          {isPassed ? T('passed') : result ? T('retry') : `${q.pass_score}%`}
                        </span>
                      </div>
                      <small>
                        {T('pass_score')} : {q.pass_score}% — {q.questions_count} {T('questions')}
                        {best != null && ` · ${T('best_score')} : ${best}%`}
                      </small>

                      {result ? (
                        <div className={`quiz-result ${isPassed ? 'success' : 'fail'}`}>
                          <div className="quiz-score-row">
                            <strong className="quiz-score">{result.percentage}%</strong>
                            <div>
                              <h4>{isPassed ? '🎉 ' + T('passed') : '💪 ' + T('retry')}</h4>
                              <p>
                                {T('score')} : {result.score}/{result.total}
                                {wrong > 0 && !isPassed && (
                                  <> · {wrong} {T('to_review')}</>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="quiz-actions">
                            {!isPassed && (
                              <button type="button" className="btn-secondary" onClick={() => retryQuiz(q.id)}>
                                <i className="mdi mdi-refresh" /> {T('retry')}
                              </button>
                            )}
                            <button type="button"
                                    className="btn-primary btn-ghost"
                                    onClick={() => revealQuiz(q.id)}
                                    aria-expanded={isRevealed(q.id)}>
                              <i className="mdi mdi-lightbulb-on-outline" /> {T('see_corrections')}
                            </button>
                          </div>

                          {result.review && isRevealed(q.id) && (
                            <div className="quiz-review">
                              {result.review.map((rev, i) => (
                                <div key={rev.question_id} className={`quiz-review-row ${rev.is_correct ? 'ok' : 'ko'}`}>
                                  <p className="quiz-review-q">
                                    <i className={`mdi ${rev.is_correct ? 'mdi-check-circle' : 'mdi-close-circle'}`} />
                                    {' '}{i + 1}. {pick(rev.text_fr, rev.text, lang)}
                                  </p>
                                  <p className="quiz-review-a">
                                    <strong>{T('your_answer')}:</strong>{' '}
                                    {pick(rev.choice_text_fr, rev.choice_text, lang) || '—'}
                                    <br />
                                    <strong>{T('correct_answer')}:</strong>{' '}
                                    {pick(rev.correct_choice_text_fr, rev.correct_choice_text, lang)}
                                  </p>
                                  {pick(rev.explanation_fr, rev.explanation, lang) && (
                                    <p className="quiz-review-expl">
                                      <i className="mdi mdi-lightbulb-on-outline" />{' '}
                                      {pick(rev.explanation_fr, rev.explanation, lang)}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : !quiz ? (
                        <div className="skeleton-line w90" />
                      ) : (
                        <>
                          {quiz.questions.map((question) => (
                            <div key={question.id} className="quiz-question">
                              <p><strong>{question.order}. {pick(question.text_fr, question.text, lang)}</strong></p>
                              {question.choices.map((c) => (
                                <label key={c.id} className="quiz-choice">
                                  <input type="radio" name={`q-${question.id}`}
                                         checked={answers[`${q.id}-${question.id}`] === c.id}
                                         onChange={() => selectAnswer(q.id, question.id, c.id)} />
                                  {pick(c.text_fr, c.text, lang)}
                                </label>
                              ))}
                            </div>
                          ))}
                          <button className="btn-primary"
                                  disabled={submitting === q.id || quiz.questions.some(
                                    (question) => !answers[`${q.id}-${question.id}`])}
                                  onClick={() => submitQuiz(quiz)}>
                            {submitting === q.id ? T('correcting') : T('submit')}
                          </button>
                        </>
                      )}
                    </section>
                  )
                })}
              </section>
            )}

            {/* Navigation inter-leçons */}
            <nav className="lesson-nav">
              {lesson.prev_lesson_id && (
                <Link to={`/cours/${lesson.prev_lesson_id}`} className="lesson-nav-link prev">
                  <i className="mdi mdi-arrow-left" /> {T('prev_lesson')}
                </Link>
              )}
              <Link to={`/education/matieres/${lesson.subject_slug}`} className="lesson-nav-link home">
                <i className="mdi mdi-view-grid-outline" /> {T('curriculum')}
              </Link>
              {lesson.next_lesson_id && (
                <Link to={`/cours/${lesson.next_lesson_id}`} className="lesson-nav-link next">
                  {T('next_lesson')} <i className="mdi mdi-arrow-right" />
                </Link>
              )}
            </nav>
          </div>
        </div>
          </>
        )}
      </div>

    </div>
  )
}
