import { useEffect } from 'react'
import { mediaUrl } from '../../api/client'
import { pick, useLang } from '../../context/LangContext'
import { tr } from '../../i18n/education'

const youtubeId = (url) => {
  const m = (url || '').match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/)
  return m?.[1] ?? null
}

/* Lecteur commun des ressources d'une lecon : modale ouverte a la demande.
   Rien n'est charge tant qu'aucune ressource n'est ouverte (pas de lecteur
   video ni de PDF pre-charge), conforme a la contrainte "connexions limitees". */
export default function ResourceViewer({ resource, onClose }) {
  const { lang } = useLang()
  const T = (k) => tr(k, lang)

  useEffect(() => {
    if (!resource) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [resource, onClose])

  if (!resource) return null

  const ytId = youtubeId(resource.url)
  const fileUrl = resource.file_url ? mediaUrl(resource.file_url) : null
  const href = resource.url || fileUrl
  const title = pick(resource.title_fr, resource.title, lang) || ''
  const isDoc = !ytId && Boolean(fileUrl)

  return (
    <div className="rv-backdrop" onClick={onClose} role="presentation">
      <div className="rv-dialog" role="dialog" aria-modal="true" aria-label={title}
           onClick={(e) => e.stopPropagation()}>
        <header className="rv-head">
          <h2>{title}</h2>
          <button type="button" className="rv-close" onClick={onClose} aria-label={T('rv_close')}>
            <i className="mdi mdi-close" />
          </button>
        </header>

        <div className="rv-body">
          {ytId ? (
            <iframe className="rv-frame" title={title} loading="lazy"
                    src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                    allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                    allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          ) : isDoc ? (
            <object className="rv-frame rv-doc" data={fileUrl} type="application/pdf">
              {/* Navigateurs sans visionneuse integree (vieux mobiles) : on ne
                  laisse jamais un trou, on propose l ouverture directe. */}
              <div className="rv-fallback">
                <i className="mdi mdi-file-alert-outline" />
                <p>{T('rv_media_unavailable')}</p>
              </div>
            </object>
          ) : (
            <div className="rv-fallback">
              <i className="mdi mdi-link-variant-off" />
              <p>{T('rv_media_unavailable')}</p>
            </div>
          )}
        </div>

        <footer className="rv-actions">
          <a href={href} target="_blank" rel="noreferrer" className="btn-secondary">
            <i className="mdi mdi-open-in-new" /> {isDoc || ytId ? T('rv_open') : T('rv_open')}
          </a>
          {fileUrl && (
            <a href={fileUrl} download className="btn-primary btn-ghost">
              <i className="mdi mdi-download-outline" /> {T('rv_download')}
            </a>
          )}
        </footer>
      </div>
    </div>
  )
}
