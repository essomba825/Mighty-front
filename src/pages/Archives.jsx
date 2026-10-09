import { useEffect, useState } from 'react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import { useLang } from '../context/LangContext'

const TYPES = [
  { value: '', key: 'all', icon: 'mdi-image-multiple' },
  { value: 'photo', key: 'photos', icon: 'mdi-camera' },
  { value: 'video', key: 'videos', icon: 'mdi-play-circle' },
  { value: 'pdf', key: 'documents', icon: 'mdi-file-pdf-box' },
]

function Skeleton() {
  return (
    <div className="skeleton-wrap" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="skeleton-card"><div className="skeleton-img" /></div>
      ))}
    </div>
  )
}

export default function Archives() {
  const { t } = useLang()
  const [docs, setDocs] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null) // index dans la liste filtrée

  useEffect(() => {
    setLoading(true)
    api.get('/archives/', { params: filter ? { type: filter } : {} })
      .then(({ data }) => setDocs(data.results ?? data))
      .finally(() => setLoading(false))
  }, [filter])

  const photos = docs // navigation dans le lightbox sur la liste courante
  const closeLightbox = () => setLightbox(null)
  const navLightbox = (dir) =>
    setLightbox((i) => (i + dir + photos.length) % photos.length)

  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight') navLightbox(1)
      if (e.key === 'ArrowLeft') navLightbox(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, photos.length])

  const current = lightbox !== null ? photos[lightbox] : null

  return (
    <div>
      <PageHeader
        eyebrow={t('archives.eyebrow')}
        title={t('archives.title')}
        sub={t('archives.sub')}
        breadcrumb={t('archives.title')}
      />

      <div className="page">
        <div className="tabs">
          {TYPES.map((ty) => (
            <button key={ty.value} className={filter === ty.value ? 'active' : ''}
                    onClick={() => { setFilter(ty.value); setLightbox(null) }}>
              <i className={`mdi ${ty.icon}`} /> {t(`archives.tab.${ty.key}`)}
            </button>
          ))}
        </div>

        {loading ? <Skeleton /> : docs.length === 0 ? (
          <div className="empty-state">
            <i className="mdi mdi-archive-outline empty-icon" />
            <h2>{t('archives.empty')}</h2>
            <p>{t('archives.emptyHint')}</p>
          </div>
        ) : (
          <div className="gallery-grid">
            {docs.map((d, i) => (
              <article key={d.id} className="gallery-item"
                       onClick={() => d.doc_type === 'photo' && setLightbox(i)}
                       style={{ cursor: d.doc_type === 'photo' ? 'zoom-in' : 'pointer' }}>
                {d.doc_type === 'photo' ? (
                  <>
                    <img src={d.file} alt={d.title} loading="lazy" />
                    <div className="gallery-overlay">
                      <i className="mdi mdi-magnify-plus-outline" />
                      <div className="gallery-caption">
                        <h4>{d.title}</h4>
                        {d.year && <span>{d.year}</span>}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="gallery-doc" onClick={(e) => { e.stopPropagation(); window.open(d.file, '_blank') }}>
                    <i className={`mdi ${d.doc_type === 'pdf' ? 'mdi-file-pdf-box' : 'mdi-play-circle'}`} />
                    <h4>{d.title}</h4>
                    {d.year && <span className="gallery-year">{d.year}</span>}
                    <small>{d.doc_type === 'pdf' ? t('archives.openDoc') : t('archives.watchVideo')}</small>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Visionneuse plein écran */}
      {current && (
        <div className="lightbox" onClick={closeLightbox}>
          <button className="lightbox-close" onClick={closeLightbox} aria-label={t('common.close')}>
            <i className="fa-solid fa-xmark" />
          </button>
          <button className="lightbox-nav lightbox-prev" aria-label={t('common.previous')}
                  onClick={(e) => { e.stopPropagation(); navLightbox(-1) }}>
            <i className="fa-solid fa-chevron-left" />
          </button>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={current.file} alt={current.title} />
            <figcaption>
              <strong>{current.title}</strong>
              {current.year && <span className="gallery-year"> · {current.year}</span>}
              {current.description && <p>{current.description}</p>}
              <span className="lightbox-counter">{lightbox + 1} / {photos.length}</span>
            </figcaption>
          </figure>
          <button className="lightbox-nav lightbox-next" aria-label={t('common.next')}
                  onClick={(e) => { e.stopPropagation(); navLightbox(1) }}>
            <i className="fa-solid fa-chevron-right" />
          </button>
        </div>
      )}
    </div>
  )
}
