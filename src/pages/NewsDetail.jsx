import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import { useLang } from '../context/LangContext'

export default function NewsDetail() {
  const { t, lang } = useLang()
  const { id } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/news/${id}/`)
      .then(({ data }) => setArticle(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="page">{t('app.loading')}</p>
  if (!article) return (
    <div className="page empty-state">
      <span>📰</span>
      <h2>{t('news.notFound')}</h2>
      <Link to="/actualites" className="btn-primary">← {t('news.back')}</Link>
    </div>
  )

  return (
    <div>
      <PageHeader
        eyebrow={article.published_at
          ? new Date(article.published_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : t('news.title')}
        title={article.title}
        sub={`${t('news.by')} ${article.author_name || t('app.associationShort')}`}
        breadcrumb={article.title.slice(0, 40) + (article.title.length > 40 ? '…' : '')}
      />
      <div className="page" style={{ maxWidth: 760 }}>
        {article.image && <img src={article.image} alt={article.title} className="article-cover" />}
        <div className="article-content card">
          <p style={{ whiteSpace: 'pre-line' }}>{article.content}</p>
        </div>
        <p style={{ marginTop: 24 }}>
          <Link to="/actualites" className="btn-secondary">← {t('news.all')}</Link>
        </p>
      </div>
    </div>
  )
}
