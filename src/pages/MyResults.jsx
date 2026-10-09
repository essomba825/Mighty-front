import { useEffect, useState } from 'react'
import api from '../api/client'
import { useLang } from '../context/LangContext'

export default function MyResults() {
  const { t, lang } = useLang()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/education/results/')
      .then(({ data }) => setResults(data.results ?? data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="page">{t('app.loading')}</p>

  const avg = results.length
    ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
    : 0

  return (
    <div className="page" style={{ maxWidth: 800 }}>
      <h1>{t('results.title')}</h1>
      <p className="page-lead">{t('results.sub')}</p>

      {results.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <p><strong>{results.length}</strong> quiz — {t('edu.score').toLowerCase()} average: <strong>{avg}%</strong></p>
          <div className="progress"><div className="progress-bar" style={{ width: `${avg}%` }} /></div>
        </div>
      )}

      {results.length === 0 && (
        <p>{t('results.empty')} {t('results.empty.hint')}</p>
      )}

      {results.map((r) => (
        <article key={r.id} className="card" style={{ marginBottom: 12 }}>
          <h3>{r.quiz_title} <small>({r.lesson_title} — {r.subject_name})</small></h3>
          <p>
            {t('edu.score')}: <strong>{r.score}/{r.total}</strong> ({r.percentage}%) —{' '}
            <span className={r.passed ? 'badge badge-funded' : 'badge badge-completed'}>
              {r.passed ? `✅ ${t('edu.passed')}` : t('results.weak')}
            </span>
          </p>
          <small>{new Date(r.submitted_at).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')}</small>
        </article>
      ))}
    </div>
  )
}
