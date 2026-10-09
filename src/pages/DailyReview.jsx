import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { pick, useLang } from '../context/LangContext'
import { tr } from '../i18n/education'

const KIND_ICONS = {
  mcq: 'mdi-checkbox-marked-circle-outline',
  numeric: 'mdi-numeric',
  text: 'mdi-pencil-outline',
  ordered: 'mdi-sort-ascending',
  pairing: 'mdi-cable-data',
}

/* Reponse vide selon le type. Essaye de garder la meme forme que
   LessonPlayer pour que la correction cote backend reste la meme. */
const emptyAnswer = (question) => {
  if (!question) return null
  if (question.kind === 'mcq') return { choice_id: null }
  if (question.kind === 'ordered') {
    const items = question.pair_items?.left ?? question.ordered_items ?? []
    return { order: items.length ? [...items] : [] }
  }
  if (question.kind === 'pairing') {
    const left = question.pair_items?.left ?? []
    return { pairs: left.map(() => null) }
  }
  return { value: '' }
}

export default function DailyReview() {
  const { user } = useAuth()
  const { lang } = useLang()
  const T = (k) => tr(k, lang)

  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState({})
  const [done, setDone] = useState(0)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [sessionDone, setSessionDone] = useState([])

  useEffect(() => {
    let alive = true
    api.get('/education/exercises/review/')
      .then(({ data }) => {
        if (!alive) return
        const list = Array.isArray(data?.questions) ? data.questions : []
        setQuestions(list)
      })
      .catch(() => { if (alive) setQuestions([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const current = questions[index]
  const question = current?.question
  const result = question ? results[question.id] : null
  const answer = question ? answers[question.id] ?? emptyAnswer(question) : null

  const canCheck = Boolean(question) && !result && (
    question.kind === 'mcq'
      ? Boolean(answer?.choice_id)
      : question.kind === 'numeric' || question.kind === 'text'
        ? String(answer?.value ?? '').trim().length > 0
        : question.kind === 'ordered'
          ? (answer?.order ?? []).length > 0
          : question.kind === 'pairing'
            ? (answer?.pairs ?? []).every(Boolean)
            : false
  )

  const setAnswer = (patch) =>
    setAnswers((prev) => ({
      ...prev,
      [question.id]: { ...emptyAnswer(question), ...prev[question.id], ...patch },
    }))

  const check = async () => {
    if (!question || checking || result || !canCheck) return
    setChecking(true)
    try {
      const { data } = await api.post(
        `/education/exercises/${question.id}/attempt/`,
        { answer, hints_used: 0, tries: 1, time_spent_ms: 0 })
      setResults((prev) => ({ ...prev, [question.id]: data }))
      setDone((n) => n + 1)
      setSessionDone((prev) => [...prev, {
        question_id: question.id,
        is_correct: data.is_correct,
        lesson_title: current?.lesson_title_fr || current?.lesson_title,
      }])
    } catch {
      /* pas d'affichage utile ici */
    } finally {
      setChecking(false)
    }
  }

  const next = () => {
    if (index + 1 < questions.length) setIndex((i) => i + 1)
    else setSessionDone((prev) => prev)
  }

  const pending = useMemo(
    () => questions.length - Object.keys(results).length, [questions, results])

  if (loading) return <p className="page">{tr('loading', lang)}</p>

  if (!user) {
    return (
      <div className="page">
        <PageHeader title={tr('rv_daily_review', lang)}
                    subtitle={tr('rv_daily_review_sub', lang)} />
        <div className="rv-empty card">
          <i className="mdi mdi-account-key-outline" />
          <p>{tr('rv_login_hint', lang)}</p>
          <p><Link to="/login">{tr('login', lang)}</Link> · <Link to="/inscription">{tr('signup', lang)}</Link></p>
        </div>
      </div>
    )
  }

  if (!questions.length) {
    return (
      <div className="page">
        <PageHeader title={tr('rv_daily_review', lang)}
                    subtitle={tr('rv_daily_review_sub', lang)} />
        <div className="rv-empty card">
          <i className="mdi mdi-check-all" />
          <h2>{tr('rv_empty_title', lang)}</h2>
          <p>{tr('rv_empty_hint', lang)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader title={tr('rv_daily_review', lang)}
                  subtitle={tr('rv_daily_review_sub', lang)} />

      <div className="rv-head">
        <span className="rv-progress">
          <i className="mdi mdi-progress-check" />
          {tr('rv_of', lang).replace('{done}', String(done)).replace('{total}', String(questions.length))}
        </span>
        {pending > 0 && (
          <span className="rv-pending">
            <i className="mdi mdi-bell-outline" /> {pending} {tr('rv_to_review', lang)}
          </span>
        )}
      </div>

      {current && (
        <article className="rv-card card">
          <div className="rv-badge">
            <i className={`mdi ${KIND_ICONS[question.kind] ?? 'mdi-checkbox-marked-circle-outline'}`} />
            <strong>{tr(`lp_kind_${question.kind}`, lang)}</strong>
            <span className="rv-box">{tr(`rv_box_${current.box === 0 ? '1day' : '3days'}`, lang)}</span>
            {current.is_retry && <em className="rv-failed">{tr('rv_failed', lang)}</em>}
          </div>

          <p className="rv-subject">
            <Link to={`/education/matieres/${current.subject_slug}`}>
              {current.subject_slug}
            </Link>
            {' › '}
            <Link to={`/cours/${current.lesson_id}`}>{pick(current.lesson_title_fr, current.lesson_title, lang)}</Link>
          </p>

          <p className="rv-question"><strong>{pick(question.text_fr, question.text, lang)}</strong></p>

          {question.kind === 'mcq' && (
            <ul className="lp-choices">
              {question.choices.map((c) => (
                <li key={c.id}>
                  <label className={`lp-choice ${result?.correct_choice_id === c.id
                    ? 'ok' : ''} ${result?.is_correct === false && result?.choice_id === c.id
                    ? 'ko' : ''}`}>
                    <input type="radio"
                           name={`rv-q-${question.id}`}
                           disabled={Boolean(result)}
                           checked={answer?.choice_id === c.id}
                           onChange={() => setAnswer({ choice_id: c.id })} />
                    <span>{pick(c.text_fr, c.text, lang)}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          {(question.kind === 'numeric' || question.kind === 'text') && (
            <label className="lp-field">
              <input type="text"
                     inputMode={question.kind === 'numeric' ? 'decimal' : 'text'}
                     value={answer?.value ?? ''}
                     disabled={Boolean(result)}
                     placeholder={question.kind === 'numeric'
                       ? tr('lp_num_placeholder', lang)
                       : tr('lp_text_placeholder', lang)}
                     onChange={(e) => setAnswer({ value: e.target.value })} />
            </label>
          )}

          {result && (
            <div className={`lp-feedback ${result.is_correct ? 'success' : 'fail'}`}>
              <p>
                <i className={`mdi ${result.is_correct ? 'mdi-check-circle' : 'mdi-close-circle'}`} />
                {result.is_correct ? tr('rv_correct_again', lang) : tr('lp_wrong', lang)}
              </p>
              {!result.is_correct && result.explanation && (
                <p className="lp-explain">
                  {pick(result.explanation_fr, result.explanation, lang)}
                </p>
              )}
              <small>{tr('rv_keep_running', lang)}</small>
            </div>
          )}

          {!result && (
            <button type="button" className="btn-primary"
                    disabled={!canCheck || checking}
                    onClick={check}>
              {checking ? tr('correcting', lang) : tr('lp_check', lang)}
            </button>
          )}

          {result && (
            <button type="button" className="btn-secondary"
                    onClick={() => setIndex((i) => i + 1)}>
              <i className="mdi mdi-arrow-right" /> {tr('rv_next', lang)}
            </button>
          )}
        </article>
      )}

      {sessionDone.length > 0 && (
        <details className="rv-session">
          <summary>
            {tr('rv_of', lang).replace('{done}', String(done)).replace('{total}', String(questions.length))} —
            {' '}{sessionDone.filter((s) => s.is_correct).length} {tr('lp_correct', lang).toLowerCase().replace('!.', '')}
          </summary>
          <ul>
            {sessionDone.map((s) => (
              <li key={s.question_id} className={s.is_correct ? 'ok' : 'ko'}>
                {s.lesson_title}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
