import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import api from '../api/client'
import { tr } from '../i18n/education'
import { pick, useLang } from '../context/LangContext'
import { etapeVerrouillee, indiceReprise } from '../lib/learning/lessonRules'

const youtubeId = (url) => {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/)
  return m?.[1] ?? null
}

const STEP_KINDS = {
  concept: { icon: 'mdi-lightbulb-on-outline', key: 'lp_step_concept' },
  explain: { icon: 'mdi-book-open-variant', key: 'lp_step_explain' },
  example: { icon: 'mdi-school-outline', key: 'lp_step_example' },
  practice: { icon: 'mdi-pencil-outline', key: 'lp_step_practice' },
  question: { icon: 'mdi-check-decagram-outline', key: 'lp_step_question' },
  summary: { icon: 'mdi-flag-checkered', key: 'lp_step_summary' },
}

const KIND_LABELS = {
  mcq: 'lp_kind_mcq',
  numeric: 'lp_kind_numeric',
  text: 'lp_kind_text',
  ordered: 'lp_kind_ordered',
  pairing: 'lp_kind_pairing',
}

const emptyAnswer = (question) => {
  if (!question) return null
  if (question.kind === 'mcq') return { choice_id: null }
  if (question.kind === 'ordered') return { order: [] }
  if (question.kind === 'pairing') {
    const pairs = question.pair_items || { left: [], right: [] }
    return { pairs: pairs.left.map(() => null) }
  }
  return { value: '' }
}

const move = (list, index, delta) => {
  const next = [...list]
  const target = index + delta
  if (target < 0 || target >= next.length) return next
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export default function LessonPlayer({ lessonId, T, onMasteryChange, onLessonComplete }) {
  const { lang } = useLang()
  const [steps, setSteps] = useState([])
  const [mastery, setMastery] = useState(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState({})
  const [hints, setHints] = useState({})
  const [tries, setTries] = useState({})
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [checking, setChecking] = useState(false)
  const [revealing, setRevealing] = useState(false)
  const [dir, setDir] = useState(1)
  const [xp, setXp] = useState(0)
  const [bravo, setBravo] = useState(false)
  const enteredAt = useRef(Date.now())
  const solvedOnce = useRef(new Set())
  const celebrated = useRef(false)

  const firstSolved = useRef(null)
  if (firstSolved.current === null && steps.length) {
    firstSolved.current = steps.find((s) => s.solved)?.id ?? 0
  }

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([
      api.get(`/education/lessons/${lessonId}/steps/`).catch(() => null),
      api.get(`/education/lessons/${lessonId}/progress/`).catch(() => null),
    ]).then(([stepsRes, progressRes]) => {
      if (!alive) return
      const list = stepsRes?.data ?? []
      // Reprise : premiere etape obligatoire non reussie. Regle documentee
      // dans lib/learning/lessonRules.js.
      setIndex(indiceReprise(list))
      setSteps(list)
      setMastery(progressRes?.data?.mastery ?? null)
      setLoading(false)
      solvedOnce.current = new Set(list.filter((s) => s.solved).map((s) => s.id))
      if (progressRes?.data?.mastery?.is_mastered) celebrated.current = true
    })
    return () => { alive = false }
  }, [lessonId])

  const step = steps[index]
  const question = step?.question ?? null
  const result = step ? results[step.id] : null
  const shownHints = step ? hints[step.id] ?? [] : []
  const answer = step ? answers[step.id] ?? emptyAnswer(question) : null
  const stepTries = step ? tries[step.id] ?? 0 : 0

  /* Une reponse exploitable : on ne corrige jamais un formulaire vide, sinon
     l'eleve prend un echec gratuit en appuyant sur Entree trop tot. */
  const canCheck = Boolean(question) && !result && (
    question.kind === 'mcq' ? Boolean(answer?.choice_id)
      : question.kind === 'ordered'
        ? (answer?.order ?? []).filter(Boolean).length === (question.ordered_items?.length ?? 0)
        : question.kind === 'pairing'
          ? (answer?.pairs ?? []).length > 0 && (answer?.pairs ?? []).every(Boolean)
          : String(answer?.value ?? '').trim().length > 0
  )

  const solvedCount = useMemo(
    () => steps.filter((s) => s.solved).length, [steps])

  const locked = useCallback(
    (target) => etapeVerrouillee(steps, target),
    [steps],
  )

  const applyMastery = (next) => {
    if (!next) return
    const wasMastered = celebrated.current
    setMastery(next)
    onMasteryChange?.(next)
    if (next.is_mastered) {
      onLessonComplete?.()
      // la celebration se joue une seule fois, pas a chaque reussite
      if (!wasMastered) {
        celebrated.current = true
        setBravo(true)
      }
    }
  }

  const go = (target) => {
    if (target < 0 || target >= steps.length) return
    if (!locked(target)) return
    setDir(target > index ? 1 : -1)
    setIndex(target)
    enteredAt.current = Date.now()
  }

  const setAnswer = (patch) =>
    setAnswers((prev) => ({ ...prev, [step.id]: { ...answer, ...patch } }))

  const revealHint = async () => {
    if (!question || revealing) return
    setRevealing(true)
    try {
      const next = shownHints.length + 1
      const { data } = await api.get(
        `/education/exercises/${question.id}/reveal_hint/`, { params: { step: next } })
      if (data?.hint) {
        // On stocke l'objet complet (text + text_fr) et non le texte final :
        // un changement de langue ne doit pas exiger un nouvel appel.
        setHints((prev) => ({ ...prev, [step.id]: [...shownHints, data.hint] }))
      }
    } catch { /* indice indisponible */ } finally {
      setRevealing(false)
    }
  }

  const check = async () => {
    if (!question || checking || result?.is_correct || !canCheck) return
    setChecking(true)
    try {
      const { data } = await api.post(`/education/exercises/${question.id}/attempt/`, {
        answer,
        hints_used: shownHints.length,
        tries: stepTries + 1,
        time_spent_ms: Date.now() - enteredAt.current,
      })
      setResults((prev) => ({ ...prev, [step.id]: data }))
      setTries((prev) => ({ ...prev, [step.id]: stepTries + 1 }))
      if (data.is_correct) {
        setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, solved: true } : s)))
        if (!solvedOnce.current.has(step.id)) {
          solvedOnce.current.add(step.id)
          setXp((prev) => prev + (step.xp ?? 0))
        }
      }
      applyMastery(data.mastery)
    } catch {
      setFailed(true)
    } finally {
      setChecking(false)
    }
  }

  const retry = () =>
    setResults((prev) => {
      const next = { ...prev }
      delete next[step.id]
      return next
    })

  /* Raccourcis : 1-9 pour choisir une reponse, Entree pour verifier,
     H pour un indice. Un eleve sur de son temps n'a pas a viser la souris. */
  useEffect(() => {
    if (loading) return undefined
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = e.target?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      if (!typing && question?.kind === 'mcq' && !result && /^[1-9]$/.test(e.key)) {
        const choice = question.choices[Number(e.key) - 1]
        if (choice) {
          e.preventDefault()
          setAnswer({ choice_id: choice.id })
        }
        return
      }
      if (!typing && e.key.toLowerCase() === 'h' && !result) {
        e.preventDefault()
        revealHint()
        return
      }
      if (e.key === 'Enter' && !result && !checking && canCheck) {
        e.preventDefault()
        check()
        return
      }
      // `go` refuse deja les etapes verrouillees : le test ici etait inverse,
      // donc les fleches clavier ne naviguaient jamais, meme vers une etape
      // accessible.
      if (!typing && e.key === 'ArrowRight') go(index + 1)
      if (!typing && e.key === 'ArrowLeft') go(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [question, result, index, checking, canCheck, locked, go, check, revealHint])

  if (loading) return <p className="page">{T('loading')}</p>

  if (!steps.length) {
    return (
      <div className="empty-state">
        <i className="mdi mdi-book-open-blank-variant empty-icon" />
        <h2>{T('lp_not_ready_title')}</h2>
        <p>{T('lp_not_ready_hint')}</p>
      </div>
    )
  }

  const total = steps.length
  const kindMeta = STEP_KINDS[step.kind] ?? STEP_KINDS.explain
  const videoEmbed = step.video_url ? youtubeId(step.video_url) : null
  const pairs = question?.pair_items || { left: [], right: [] }
  const pairsFr = question?.pair_items_fr || pairs
  const orderedItems = question?.ordered_items || []
  const orderedItemsFr = question?.ordered_items_fr || orderedItems
  const hintsLeft = Math.max((question?.hints_count ?? 0) - shownHints.length, 0)

  return (
    <section className="lp">
      {bravo && (
        <div className="lp-bravo" role="status">
          <i className="mdi mdi-trophy-outline" />
          <div>
            <strong>{T('lp_mastered')}</strong>
            <small>{T('lp_bravo_hint')}</small>
          </div>
          <button type="button" aria-label={T('lp_bravo_close')}
                  onClick={() => setBravo(false)}>
            <i className="mdi mdi-close" />
          </button>
        </div>
      )}

      <header className="lp-head">
        <div className="lp-progress-meta">
          <span>{T('lp_step_of').replace('{n}', String(index + 1)).replace('{total}', String(total))}</span>
          <span className="lp-kind"><i className={`mdi ${kindMeta.icon}`} /> {T(kindMeta.key)}</span>
          {step.required
            ? <span className="lp-req">{T('lp_required')}</span>
            : <span className="lp-optional">{T('lp_optional')}</span>}
          <span className="lp-xp" aria-label={`${xp} XP`}>
            <i className="mdi mdi-star-four-points" /> +{xp}
          </span>
        </div>
        <div className="lp-bar" role="progressbar" aria-valuenow={solvedCount}
             aria-valuemin={0} aria-valuemax={total}>
          <span style={{ width: `${(solvedCount / total) * 100}%` }} />
        </div>
      </header>

      {mastery && (
        <p className={`lp-mastery ${mastery.is_mastered ? 'is-mastered' : ''}`}>
          <i className={`mdi ${mastery.is_mastered ? 'mdi-medal-outline' : 'mdi-progress-check'}`} />
          {mastery.is_mastered
            ? T('lp_mastered')
            : T('lp_mastery').replace('{n}', String(mastery.validated))
              .replace('{total}', String(mastery.required))}
        </p>
      )}

      <article key={step.id}
               className={`lp-card card lp-from-${dir > 0 ? 'next' : 'prev'} ${
                 result ? (result.is_correct ? 'is-correct' : 'is-wrong') : ''}`}>
        <h2 className="lp-title">{pick(step.title_fr, step.title, lang)}</h2>

        {pick(step.content_fr, step.content, lang) && (
          <div className="lp-content">
            <ReactMarkdown>{pick(step.content_fr, step.content, lang)}</ReactMarkdown>
          </div>
        )}

        {videoEmbed && (
          <div className="lp-video">
            <iframe src={`https://www.youtube-nocookie.com/embed/${videoEmbed}`}
                    title={pick(step.title_fr, step.title, lang)} allowFullScreen />
          </div>
        )}

        {step.image_url && <img className="lp-image" src={step.image_url} alt="" />}

        {question && (
          <div className="lp-exercise">
            <p className="lp-kind-tag">{T(KIND_LABELS[question.kind] ?? 'lp_kind_mcq')}</p>
            <p className="lp-question">
              <strong>{pick(question.text_fr, question.text, lang)}</strong>
            </p>
            {pick(question.hint_prompt_fr, question.hint_prompt, lang) && (
              <p className="lp-prompt">
                {pick(question.hint_prompt_fr, question.hint_prompt, lang)}
              </p>
            )}

            {question.kind === 'mcq' && (
              <ul className="lp-choices">
                {question.choices.map((c, ci) => {
                  const picked = answer?.choice_id === c.id
                  const isRight = result?.correct_choice_id === c.id
                  const state = result
                    ? (picked ? (result.is_correct ? 'ok' : 'ko') : isRight ? 'ok' : '')
                    : picked ? 'is-picked' : ''
                  return (
                    <li key={c.id}>
                      <label className={`lp-choice ${state}`}>
                        <input type="radio" name={`lp-q-${question.id}`} disabled={Boolean(result)}
                               checked={picked}
                               onChange={() => setAnswer({ choice_id: c.id })} />
                        {!result && <kbd className="lp-kbd">{ci + 1}</kbd>}
                        <span>{pick(c.text_fr, c.text, lang)}</span>
                        {result && (picked || isRight) && (
                          <i className={`mdi ${result.is_correct || isRight ? 'mdi-check-circle' : 'mdi-close-circle'}`} />
                        )}
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}

            {(question.kind === 'numeric' || question.kind === 'text') && (
              <label className="lp-field">
                <input
                  type={question.kind === 'numeric' ? 'text' : 'text'}
                  inputMode={question.kind === 'numeric' ? 'decimal' : 'text'}
                  value={answer?.value ?? ''}
                  disabled={Boolean(result)}
                  placeholder={question.kind === 'numeric' ? T('lp_num_placeholder') : T('lp_text_placeholder')}
                  onChange={(e) => setAnswer({ value: e.target.value })} />
              </label>
            )}

            {question.kind === 'ordered' && (
              <ol className="lp-order">
                {(answer?.order ?? []).map((value, i) => (
                  <li key={i}>
                    <span>{value || '—'}</span>
                    <button type="button" disabled={Boolean(result)}
                            onClick={() => setAnswer({ order: move(answer.order, i, -1) })}
                            aria-label={T('lp_move_up')}>
                      <i className="mdi mdi-arrow-up" />
                    </button>
                    <button type="button" disabled={Boolean(result)}
                            onClick={() => setAnswer({ order: move(answer.order, i, 1) })}
                            aria-label={T('lp_move_down')}>
                      <i className="mdi mdi-arrow-down" />
                    </button>
                  </li>
                ))}
              </ol>
            )}

            {question.kind === 'pairing' && (
              <ul className="lp-pairs">
                {(lang === 'fr' ? pairsFr : pairs).left.map((label, i) => (
                  <li key={`${label}-${i}`}>
                    <strong>{label}</strong>
                    <select value={answer?.pairs?.[i] ?? ''} disabled={Boolean(result)}
                            onChange={(e) => {
                              const next = [...(answer.pairs ?? [])]
                              next[i] = e.target.value || null
                              setAnswer({ pairs: next })
                            }}>
                      <option value="">—</option>
                      {(lang === 'fr' ? pairsFr : pairs).right.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            )}

            {shownHints.length > 0 && (
              <ul className="lp-hints">
                {shownHints.map((hint, i) => (
                  <li key={i}>
                    <i className="mdi mdi-lightbulb-on-outline" />
                    {typeof hint === 'string' ? hint : pick(hint.text_fr, hint.text, lang)}
                  </li>
                ))}
              </ul>
            )}

            {!result && (
              <div className="lp-hint-row">
                {hintsLeft > 0 ? (
                  <button type="button" className="btn-secondary btn-ghost"
                          onClick={revealHint} disabled={revealing}>
                    <i className="mdi mdi-lightbulb-on-outline" />
                    {shownHints.length === 0 ? T('lp_hint') : T('lp_hint_more')}
                    <small>{T('lp_hints_left').replace('{n}', String(hintsLeft))}</small>
                  </button>
                ) : (
                  <small className="lp-no-hint">{T('lp_no_hint')}</small>
                )}
              </div>
            )}

            {!result && (
              <button type="button" className="btn-primary lp-check"
                      disabled={!canCheck || checking} onClick={check}>
                {checking ? T('correcting') : T('lp_check')}
              </button>
            )}

            {result && (
              <div className={`lp-feedback ${result.is_correct ? 'success' : 'fail'}`}>
                <p className="lp-verdict">
                  <i className={`mdi ${result.is_correct ? 'mdi-check-circle' : 'mdi-refresh'}`} />
                  {result.is_correct ? T('lp_correct') : T('lp_wrong')}
                  {result.is_correct && step.xp ? <em className="lp-xp-gain">+{step.xp} XP</em> : null}
                </p>
                {pick(result.explanation_fr, result.explanation, lang) && (
                  <p className="lp-explanation">
                    {pick(result.explanation_fr, result.explanation, lang)}
                  </p>
                )}
                <div className="lp-feedback-actions">
                  {!result.is_correct && (
                    <button type="button" className="btn-secondary" onClick={retry}>
                      <i className="mdi mdi-refresh" /> {T('lp_try_again')}
                    </button>
                  )}
                  {result.is_correct && locked(index + 1) && index < total - 1 && (
                    <button type="button" className="btn-primary" onClick={() => go(index + 1)}>
                      {T('next_lesson')} <i className="mdi mdi-arrow-right" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {failed && <p className="lp-error">{T('lp_error')}</p>}
          </div>
        )}
      </article>

      <p className="lp-keys">
        <kbd>1</kbd>–<kbd>9</kbd> {T('lp_keys_pick')} · <kbd>↵</kbd> {T('lp_keys_check')}
        · <kbd>H</kbd> {T('lp_keys_hint')} · <kbd>←</kbd><kbd>→</kbd> {T('lp_keys_move')}
      </p>

      <nav className="lp-nav">
        <button type="button" className="btn-secondary"
                disabled={index === 0} onClick={() => go(index - 1)}>
          <i className="mdi mdi-arrow-left" /> {T('prev_lesson')}
        </button>
        <ol className="lp-dots">
          {steps.map((s, i) => (
            <li key={s.id}>
              <button type="button"
                      className={`${s.solved ? 'is-solved' : ''} ${s.required ? 'is-required' : ''} ${
                        i === index ? 'is-current' : ''}`}
                      disabled={!locked(i)}
                      title={T((STEP_KINDS[s.kind] ?? STEP_KINDS.explain).key)}
                      aria-label={T('lp_step_of').replace('{n}', String(i + 1)).replace('{total}', String(total))}
                      onClick={() => go(i)} />
            </li>
          ))}
        </ol>
        <button type="button" className="btn-primary"
                disabled={index === total - 1 || !locked(index + 1)}
                onClick={() => go(index + 1)}>
          {T('next_lesson')} <i className="mdi mdi-arrow-right" />
        </button>
      </nav>
    </section>
  )
}
