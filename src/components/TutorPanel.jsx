import { useEffect, useRef, useState } from 'react'
import api from '../api/client'
import { useLang } from '../context/LangContext'

/* Répétiteur IA local (Ollama) — conversation sur la leçon en cours. */
export default function TutorPanel({ lessonId, lessonTitle }) {
  const { lang } = useLang()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)

  const t = (en, fr) => (lang === 'fr' ? fr : en)

  const loadHistory = async () => {
    try {
      const { data } = await api.get(`/education/lessons/${lessonId}/tutor_history/`)
      setMessages(data)
    } catch { setMessages([]) }
  }

  useEffect(() => { if (open) loadHistory() }, [open, lessonId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (e) => {
    e.preventDefault()
    const text = value.trim()
    if (!text || loading) return
    setValue('')
    setError('')
    setMessages((m) => [...m, { role: 'student', content: text, created_at: 'now' }])
    setLoading(true)
    try {
      const { data } = await api.post(`/education/lessons/${lessonId}/tutor/`, { message: text })
      setMessages((m) => [...m, { role: 'tutor', content: data.reply, created_at: 'now' }])
    } catch (err) {
      setError(err.response?.data?.detail ||
        t('The AI tutor is not responding. Try again.', 'Le tuteur IA ne répond pas. Réessaie.'))
      setMessages((m) => m.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  const startConversation = () => (
    <>
      <p className="tutor-welcome">
        <strong>{t('Hello!', 'Salut !')}</strong> {t(
          "I'm your tutor for this lesson. Ask me anything — what you don't understand, for examples, or to practice.",
          "Je suis ton répétiteur pour cette leçon. Demande-moi ce que tu ne comprends pas, des exemples, ou pour t'entraîner.")}
      </p>
      <div className="tutor-suggestions">
        {(lang === 'fr' ? [
          "Peux-tu réexpliquer cette notion simplement ?",
          'Un exemple concret, s.t.p. ?',
          "Pose-moi 3 questions pour m'entraîner",
          "Quelles sont les étapes clés à retenir ?",
        ] : [
          'Could you explain this concept simply?',
          'A concrete example, please!',
          'Ask me 3 questions to test me',
          'What are the key steps to remember?',
        ]).map((q, i) => (
          <button key={i} type="button" onClick={async () => {
            setValue(q)
            setTimeout(() => document.querySelector('.tutor-send')?.click(), 30)
          }}>{q}</button>
        ))}
      </div>
    </>
  )

  return (
    <>
      <button type="button" className="tutor-fab" onClick={() => setOpen(true)}
              title={t('Tutor IA', 'Tuteur IA')}
              aria-label={t('Tutor IA', 'Tuteur IA')}>
        <i className="mdi mdi-robot-happy" />
        {messages.length > 0 && <span className="tutor-dot" />}
      </button>

      {open && (
        <div className="tutor-overlay" onClick={() => setOpen(false)}>
          <div className="tutor-panel" onClick={(e) => e.stopPropagation()}>
            <header className="tutor-head">
              <span className="tutor-avatar"><i className="mdi mdi-school" /></span>
              <div>
                <h3>Mighty Tutor</h3>
                <p className="tutor-lesson"><i className="mdi mdi-book-outline" /> {lessonTitle}</p>
              </div>
              <button type="button" className="tutor-close" onClick={() => setOpen(false)}
                      aria-label={t('Close', 'Fermer')}>
                <i className="mdi mdi-close" />
              </button>
            </header>

            <div className="tutor-messages">
              {messages.length === 0 && startConversation()}
              {messages.map((m, i) => (
                <div key={`${m.created_at}-${i}`}
                     className={`tutor-msg ${m.role === 'student' ? 'me' : 'him'}`}>
                  {m.role === 'tutor' && <span className="tutor-msg-ic"><i className="mdi mdi-robot-happy" /></span>}
                  <div className="tutor-bubble">{m.content}</div>
                </div>
              ))}
              {loading && (
                <div className="tutor-msg him">
                  <span className="tutor-msg-ic"><i className="mdi mdi-robot-happy" /></span>
                  <div className="tutor-bubble loading">
                    <i className="fa-solid fa-circle-notch fa-spin" />{' '}
                    {t('Mighty pense...', 'Mighty réfléchit...')}
                  </div>
                </div>
              )}
              {error && <p className="tutor-error">{error}</p>}
              <span ref={endRef} />
            </div>

            <form className="tutor-form" onSubmit={send}>
              <input value={value} onChange={(e) => setValue(e.target.value)}
                     placeholder={t('Ask a question...', 'Pose ta question...')}
                     maxLength={2000} autoFocus disabled={loading} />
              <button type="submit" className="tutor-send" disabled={loading || !value.trim()}
                      aria-label={t('Send', 'Envoyer')}>
                <i className="mdi mdi-send" />
              </button>
            </form>
            <p className="tutor-note">
              <i className="mdi mdi-shield-lock-outline" />{' '}
              {t('100% local — free and unlimited.', '100% local — gratuit et illimité.')}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
