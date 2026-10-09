import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import { useLang } from '../context/LangContext'

/* Estimation du temps de lecture (~200 mots/min) */
const readingTime = (text) => {
  const words = (text || '').split(/\s+/).length
  return Math.max(1, Math.round(words / 200))
}

const fullDate = (iso, locale) => iso
  ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  : ''
const shortDate = (iso, locale) => iso
  ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  : ''

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

export default function News() {
  const { t, lang } = useLang()
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB'
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/news/')
      .then(({ data }) => setArticles(data.results ?? data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = articles.filter((a) =>
    `${a.title} ${a.content}`.toLowerCase().includes(search.toLowerCase()))
  const [featured, ...rest] = filtered

  return (
    <div>
      {/* En-tête de page */}
      <PageHeader
        eyebrow={t('app.tagline')}
        title={t('news.title')}
        sub={t('news.sub')}
        breadcrumb={t('news.title')}
      >
        <div className="header-search">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input placeholder={t('news.search.ph')}
                 value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </PageHeader>

      <div className="page">
        {loading ? <Skeleton /> : filtered.length === 0 ? (
          <div className="empty-state">
            <span>📰</span>
            <h2>{t('news.empty')}</h2>
            <p>{search ? t('news.searchEmpty') : t('news.emptyHint')}</p>
            {search && <button className="btn-secondary" onClick={() => setSearch('')}>{t('news.reset')}</button>}
          </div>
        ) : (
          <>
            {search && (
              <p className="results-count">{t('news.resultsCount', { n: filtered.length, q: search })}</p>
            )}

            {/* Article à la une */}
            {featured && (
              <Link to={`/actualites/${featured.id}`} className="news-featured">
                {featured.image && (
                  <div className="news-featured-media">
                    <img src={featured.image} alt={featured.title} />
                    <span className="date-pill">{shortDate(featured.published_at, locale)}</span>
                  </div>
                )}
                <div className="news-featured-body">
                  <span className="badge badge-gold">{t('news.featured')}</span>
                  <h2>{featured.title}</h2>
                  <p className="news-excerpt">
                    {featured.content.slice(0, 240)}{featured.content.length > 240 ? '…' : ''}
                  </p>
                  <div className="news-meta">
                    <span>✍️ {featured.author_name || t('news.authorFallback')}</span>
                    <span>⏱ {t('news.readTime', { n: readingTime(featured.content) })}</span>
                  </div>
                  <span className="read-more">{t('news.read')} <span className="arrow">→</span></span>
                </div>
              </Link>
            )}

            {/* Grille des autres articles */}
            {rest.length > 0 && (
              <div className="news-grid">
                {rest.map((a) => (
                  <Link key={a.id} to={`/actualites/${a.id}`} className="news-card">
                    {a.image && (
                      <div className="news-card-media">
                        <img src={a.image} alt={a.title} loading="lazy" />
                        <span className="date-pill">{shortDate(a.published_at, locale)}</span>
                      </div>
                    )}
                    <div className="news-card-body">
                      <h3>{a.title}</h3>
                      <p>{a.content.slice(0, 130)}{a.content.length > 130 ? '…' : ''}</p>
                      <div className="news-meta">
                        <span>{a.author_name || t('news.authorFallback')}</span>
                        <span>⏱ {t('news.readTime', { n: readingTime(a.content) })}</span>
                      </div>
                      <span className="read-more">{t('common.readMore')} <span className="arrow">→</span></span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
