import { useEffect, useState } from 'react'
import api, { mediaUrl } from '../api/client'
import PageHeader from '../components/PageHeader'
import { useLang } from '../context/LangContext'



const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

export default function Directory() {
  const { t } = useLang()
  const [profiles, setProfiles] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/alumni/profiles/')
      .then(({ data }) => setProfiles(data.results ?? data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = profiles.filter((p) =>
    `${p.full_name} ${p.profession || ''} ${p.city || ''} ${p.graduation_year}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        eyebrow={t('app.tagline')}
        title={t('dir.title')}
        sub={t('dir.sub')}
        breadcrumb={t('nav.directory')}
      />

      <div className="page">
        <div className="edu-search directory-search">
          <i className="mdi mdi-magnify" />
          <input placeholder={t('dir.search')}
                 value={search} onChange={(e) => setSearch(e.target.value)}
                 aria-label={t('dir.search')} />
        </div>

        {loading ? (
          <div className="skeleton-wrap">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-line w40" />
                <div className="skeleton-line w90" />
                <div className="skeleton-line w60" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <i className="mdi mdi-account-search-outline empty-icon" />
            <h2>{t('dir.empty')}</h2>
            <p>{t('dir.sub')}</p>
          </div>
        ) : (
          <>
            <p className="results-count">{filtered.length} {t('dir.count')}</p>
            <div className="member-grid">
              {filtered.map((p) => (
                <article key={p.id} className="member-tile card">
                  <div className="member-tile-top">
                    <span className="member-tile-avatar">
                      {p.photo
                        ? <img src={mediaUrl(p.photo)} alt="" />
                        : initials(p.full_name)}
                    </span>
                    <span className="badge badge-active">
                      <i className="mdi mdi-school-outline" /> {t('dir.promotion')} {p.graduation_year}
                    </span>
                  </div>
                  <h3>{p.full_name}</h3>
                  {p.profession && (
                    <p className="member-tile-job">
                      <i className="mdi mdi-briefcase-outline" /> {p.profession}{p.company ? ` · ${p.company}` : ''}
                    </p>
                  )}
                  {p.city && (
                    <p className="member-tile-city">
                      <i className="mdi mdi-map-marker-outline" /> {p.city}{p.country ? `, ${p.country}` : ''}
                    </p>
                  )}
                  {p.bio && <p className="member-tile-bio">« {p.bio} »</p>}
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
