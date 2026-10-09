import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import { useLang } from '../context/LangContext'

/* §4, §8 — Galerie publique de photos et vidéos.
   Distincte des archives institutionnelles (§6) : cette galerie est conçue
   pour le grand public, avec un affichage soigné, un lightbox fluide et un
   lien vers les archives complètes pour les membres. */

const TABS = [
  { value: '', key: 'all', icon: 'mdi-image-multiple-outline' },
  { value: 'photo', key: 'photos', icon: 'mdi-camera-outline' },
  { value: 'video', key: 'videos', icon: 'mdi-play-circle-outline' },
]

function SkeletonGrid() {
  return (
    <div className="gallery-grid">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="gallery-item skeleton-card">
          <div className="skeleton-img" />
        </div>
      ))}
    </div>
  )
}

export default function Gallery() {
  const { t } = useLang()
  const [docs, setDocs] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    setLoading(true)
    /* On ne charge que les documents publics depuis l'API archives.
       Le filtre doc_type correspond aux valeurs acceptées par le modèle
       ArchiveDocument (photo, video, pdf, other). */
    api
      .get('/archives/', { params: { ...(filter ? { type: filter } : {}), is_public: true } })
      .then(({ data }) => setDocs(data.results ?? data))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }, [filter])

  const photos = docs.filter((d) => d.doc_type === 'photo')
  const photoIndex = (docId) => photos.findIndex((p) => p.id === docId)

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
        eyebrow={t('gallery.eyebrow')}
        title={t('gallery.title')}
        sub={t('gallery.sub')}
        breadcrumb={t('nav.gallery')}
      />

      <div className="page">
        {/* Onglets de filtre */}
        <div className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              className={filter === tab.value ? 'active' : ''}
              onClick={() => {
                setFilter(tab.value)
                setLightbox(null)
              }}
            >
              <i className={`mdi ${tab.icon}`} /> {t(`gallery.tab.${tab.key}`)}
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonGrid />
        ) : docs.length === 0 ? (
          <div className="empty-state">
            <i className="mdi mdi-image-multiple-outline empty-icon" />
            <h2>{t('gallery.empty')}</h2>
            <p>{t('gallery.emptyHint')}</p>
          </div>
        ) : (
          <div className="gallery-grid gallery-public">
            {docs.map((d, i) =>
              d.doc_type === 'photo' ? (
                /* Vignette photo — ouvre le lightbox */
                <article
                  key={d.id}
                  className="gallery-item"
                  style={{ cursor: 'zoom-in' }}
                  onClick={() => setLightbox(photoIndex(d.id))}
                >
                  <img src={d.file} alt={d.title} loading="lazy" />
                  <div className="gallery-overlay">
                    <i className="mdi mdi-magnify-plus-outline" />
                    <div className="gallery-caption">
                      <h4>{d.title}</h4>
                      {d.year && <span>{d.year}</span>}
                    </div>
                  </div>
                </article>
              ) : d.doc_type === 'video' ? (
                /* Vignette vidéo — ouvre dans un nouvel onglet */
                <article
                  key={d.id}
                  className="gallery-item gallery-video-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => window.open(d.file || d.url, '_blank')}
                >
                  <div className="gallery-video-thumb">
                    <i className="mdi mdi-play-circle gallery-play-icon" />
                    <div className="gallery-caption">
                      <h4>{d.title}</h4>
                      {d.year && <span>{d.year}</span>}
                    </div>
                  </div>
                  <small className="gallery-video-label">
                    <i className="mdi mdi-play-circle-outline" /> {t('gallery.openVideo')}
                  </small>
                </article>
              ) : null
            )}
          </div>
        )}

        {/* Lien vers les archives complètes */}
        <p style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <Link to="/archives" className="btn-secondary">
            <i className="mdi mdi-archive-outline" /> {t('gallery.viewArchives')}
          </Link>
        </p>
      </div>

      {/* Lightbox plein écran */}
      {current && (
        <div className="lightbox" onClick={closeLightbox}>
          <button
            className="lightbox-close"
            onClick={closeLightbox}
            aria-label={t('common.close') || 'Fermer'}
          >
            <i className="mdi mdi-close" />
          </button>
          <button
            className="lightbox-nav lightbox-prev"
            aria-label={t('common.previous') || 'Précédent'}
            onClick={(e) => { e.stopPropagation(); navLightbox(-1) }}
          >
            <i className="mdi mdi-chevron-left" />
          </button>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={current.file} alt={current.title} />
            <figcaption>
              <strong>{current.title}</strong>
              {current.year && <span className="gallery-year"> · {current.year}</span>}
              {current.description && <p>{current.description}</p>}
              <span className="lightbox-counter">
                {lightbox + 1} / {photos.length}
              </span>
            </figcaption>
          </figure>
          <button
            className="lightbox-nav lightbox-next"
            aria-label={t('common.next') || 'Suivant'}
            onClick={(e) => { e.stopPropagation(); navLightbox(1) }}
          >
            <i className="mdi mdi-chevron-right" />
          </button>
        </div>
      )}
    </div>
  )
}
