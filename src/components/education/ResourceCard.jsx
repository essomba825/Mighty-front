import { mediaUrl } from '../../api/client'
import { pick, useLang } from '../../context/LangContext'
import { tr } from '../../i18n/education'

const RESOURCE_META = {
  video: { icon: 'mdi-play-circle-outline', labelKey: 'video' },
  pdf: { icon: 'mdi-file-pdf-box', labelKey: 'pdf' },
  link: { icon: 'mdi-open-in-new', labelKey: 'link' },
  exam_paper: { icon: 'mdi-file-certificate-outline', labelKey: 'examPaper' },
}

const youtubeId = (url) => {
  const m = (url || '').match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/)
  return m?.[1] ?? null
}

/* Carte de recommandation visuelle, identique quel que soit le type :
   vignette reelle pour une video, tuile coloree pour un document. La carte
   decide toute seule de sa forme d'apres resource.kind et les URL reelles —
   jamais d'apres le nom d'une matiere. */
export default function ResourceCard({ resource, onOpen }) {
  const { lang } = useLang()
  const T = (k) => tr(k, lang)
  const meta = RESOURCE_META[resource.kind] || RESOURCE_META.link
  const ytId = youtubeId(resource.url)
  const fileUrl = resource.file_url ? mediaUrl(resource.file_url) : null
  const href = resource.url || fileUrl
  const opensViewer = Boolean(onOpen) && (ytId || fileUrl)

  const visual = ytId ? (
    <span className="resource-thumb" aria-hidden="true">
      <img loading="lazy" alt=""
           src={`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`}
           onError={(e) => { e.currentTarget.style.display = 'none' }} />
      <i className="mdi mdi-play-circle" />
    </span>
  ) : (
    <span className={`resource-tile resource-tile-${resource.kind}`} aria-hidden="true">
      <i className={`mdi ${meta.icon}`} />
    </span>
  )

  const body = (
    <span className="resource-body">
      <span className="resource-kind">
        {opensViewer ? T(ytId ? 'rv_watch' : 'rv_open') : T(`lesson_resource_${meta.labelKey}`)}
      </span>
      <strong>{pick(resource.title_fr, resource.title, lang)}</strong>
      {resource.source_name && <small>{resource.source_name}</small>}
      {resource.license_note && <small className="resource-license">{resource.license_note}</small>}
    </span>
  )

  const className = `resource-card card resource-glass resource-${resource.kind}`

  if (opensViewer) {
    return (
      <button type="button" className={className} onClick={() => onOpen(resource)}>
        {visual}
        {body}
      </button>
    )
  }
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {visual}
      {body}
    </a>
  )
}
