import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import EducationSidebar from '../components/education/EducationSidebar'
import { useApi } from '../api/cache'
import { prefetchPaperPdf } from '../utils/pdfCache'
import api, { mediaUrl } from '../api/client'
import '../education-hub.css'
import './SubjectPapers.css'

/* ─────────────────────────────────────────────
   MATIÈRES DISPONIBLES
   ───────────────────────────────────────────── */
const TEST_SUBJECTS = [
  {
    id: 1,
    slug: 'mathematics',
    name: 'Mathematics',
    color: 'blue',
    hex: '#0966e8',
    levels: ['O/L', 'A/L'],
    description: 'GCE O/L & GCE A/L Past Papers, Question Papers & Marking Guides',
  },
  {
    id: 2,
    slug: 'physics',
    name: 'Physics',
    color: 'purple',
    hex: '#7546e7',
    levels: ['O/L', 'A/L'],
    description: 'GCE O/L & GCE A/L Physics Mechanics, Electricity, Waves & Solutions',
  },
  {
    id: 3,
    slug: 'chemistry',
    name: 'Chemistry',
    color: 'orange',
    hex: '#f29408',
    levels: ['O/L', 'A/L'],
    description: 'GCE O/L & GCE A/L Organic, Inorganic, Physical Chemistry Papers',
  },
  {
    id: 4,
    slug: 'biology',
    name: 'Biology',
    color: 'green',
    hex: '#08a665',
    levels: ['O/L', 'A/L'],
    description: 'GCE O/L & GCE A/L Cell Biology, Physiology, Genetics Papers',
  },
]

/* ─────────────────────────────────────────────
   HELPERS & BADGES
   ───────────────────────────────────────────── */
const BADGE = {
  available: { label: 'Marking Guide', cls: 'sp-badge--available', icon: 'mdi-check-circle-outline' },
  partial: { label: 'Partial Guide', cls: 'sp-badge--partial', icon: 'mdi-progress-check' },
  pending: { label: 'Guide Pending', cls: 'sp-badge--pending', icon: 'mdi-clock-outline' },
  none: { label: 'Paper Only', cls: 'sp-badge--none', icon: 'mdi-minus-circle-outline' },
}

const ICON_CLS = {
  available: 'sp-paper-icon--blue',
  pending: 'sp-paper-icon--orange',
  none: 'sp-paper-icon--gray',
}

/* ── Icône fichier : variante selon le statut du corrigé ──
   bleu = tableur (corrigé dispo), orange = lignes (en attente), gris = grille (aucun). */
const FILE_PALETTES = {
  blue: { body: ['#2c75f6', '#1a5bd8'], fold: ['#9cc5fd', '#76abfa'] },
  orange: { body: ['#e8862e', '#d97706'], fold: ['#f3b57e', '#e89a5a'] },
  gray: { body: ['#94a3b8', '#64748b'], fold: ['#cbd5e1', '#b0bec5'] },
}

function FileIcon({ variant = 'blue' }) {
  const pal = FILE_PALETTES[variant] || FILE_PALETTES.blue
  const gradId = `spDocGrad-${variant}`
  const foldId = `spFoldGrad-${variant}`
  return (
    <span className="sp-file-frame" aria-hidden="true">
      <svg width="22" height="25" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={gradId} x1="2" y1="2" x2="22" y2="26" gradientUnits="userSpaceOnUse">
            <stop stopColor={pal.body[0]} />
            <stop offset="1" stopColor={pal.body[1]} />
          </linearGradient>
          <linearGradient id={foldId} x1="15" y1="2" x2="22" y2="9" gradientUnits="userSpaceOnUse">
            <stop stopColor={pal.fold[0]} />
            <stop offset="1" stopColor={pal.fold[1]} />
          </linearGradient>
        </defs>
        {/* Document principal */}
        <path d="M4 2C2.89543 2 2 2.89543 2 4V24C2 25.1046 2.89543 26 4 26H20C21.1046 26 22 25.1046 22 24V9L15 2H4Z" fill={`url(#${gradId})`} />
        {/* Pliure d'angle supérieure droite */}
        <path d="M15 2V7C15 8.10457 15.8954 9 17 9H22L15 2Z" fill={`url(#${foldId})`} />

        {variant === 'blue' && (
          <>
            <rect x="7" y="12" width="10" height="9" rx="1.5" stroke="#ffffff" strokeWidth="1.4" fill="rgba(255,255,255,0.08)" />
            <path d="M10 12V21M7 16.5H17" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" opacity="0.85" />
          </>
        )}
        {variant === 'orange' && (
          <g stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.9">
            <line x1="7" y1="13" x2="17" y2="13" />
            <line x1="7" y1="16" x2="17" y2="16" />
            <line x1="7" y1="19" x2="17" y2="19" />
            <line x1="7" y1="22" x2="14" y2="22" />
          </g>
        )}
        {variant === 'gray' && (
          <g stroke="#ffffff" strokeWidth="1.1" strokeLinejoin="round" opacity="0.85">
            <rect x="7" y="12" width="10" height="10" rx="1" />
            <line x1="10.3" y1="12" x2="10.3" y2="22" />
            <line x1="13.7" y1="12" x2="13.7" y2="22" />
            <line x1="7" y1="15.3" x2="17" y2="15.3" />
            <line x1="7" y1="18.7" x2="17" y2="18.7" />
          </g>
        )}
      </svg>
    </span>
  )
}

function groupByYear(papers) {
  const map = new Map()
  papers.forEach((p) => {
    if (!map.has(p.year)) map.set(p.year, [])
    map.get(p.year).push(p)
  })
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, items]) => ({ year, items }))
}

function normalizeSubject(val) {
  if (!val) return ''
  const s = String(val)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/-(ol|al)$/, '')
    .trim()
  if (s.startsWith('math')) return 'mathematics'
  if (s.startsWith('phys')) return 'physics'
  if (s.startsWith('chem') || s.startsWith('chim')) return 'chemistry'
  if (s.startsWith('bio')) return 'biology'
  return s
}

function getSubjectColor(val) {
  const norm = normalizeSubject(val)
  if (norm === 'mathematics') return 'blue'
  if (norm === 'physics') return 'purple'
  if (norm === 'chemistry') return 'orange'
  if (norm === 'biology') return 'green'
  return 'blue'
}

const COLOR_HEX = {
  blue: '#0966e8',
  purple: '#7546e7',
  orange: '#f29408',
  green: '#08a665',
}

/* ── Icône de matière (fidèle à 100% à l'Education Hub) ── */
export function HubSubjectIcon({ color = 'blue', size = 'default' }) {
  const isSm = size === 'sm'
  return (
    <span className={`sp-hub-icon ${color} ${isSm ? 'sp-hub-icon--sm' : ''}`} aria-hidden="true">
      {color === 'blue' && <span className="sp-hub-pi">π</span>}
      {color === 'purple' && (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <ellipse cx="12" cy="12" rx="9" ry="3.6" />
          <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
          <circle cx="12" cy="12" r="1.7" />
        </svg>
      )}
      {color === 'orange' && (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 3h6M10 3v6l-5 9.2A1.8 1.8 0 0 0 6.6 21h10.8a1.8 1.8 0 0 0 1.6-2.8L14 9V3" />
          <path d="M7.5 16h9" />
        </svg>
      )}
      {color === 'green' && (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19.7 4.3C11 4.8 5.6 8.8 6.2 15.1c.3 3.4 3.5 4.5 6.2 2.6 4-2.8 5.7-7.6 7.3-13.4Z" />
          <path d="M4 20c3.1-4.5 6.2-7.2 11.2-10.1" />
        </svg>
      )}
    </span>
  )
}

/* ─────────────────────────────────────────────
   COMPOSANT PRINCIPAL
   ───────────────────────────────────────────── */
/* ── Navigation items (même liste que EducationHub) ── */
const NAV_ITEMS = [
  { label: 'Home',      icon: 'home',     path: '/' },
  { label: 'My profile',icon: 'user',     path: '/profil' },
  { label: 'Alumni',    icon: 'users',    path: '/annuaire' },
  { label: 'Events',    icon: 'calendar', path: '/evenements' },
  { label: 'Projects',  icon: 'folder',   path: '/projets' },
  { label: 'Education', icon: 'book',     path: '/education' },
  { label: 'Archives',  icon: 'archive',  path: '/archives' },
  { label: 'Settings',  icon: 'settings', path: '/espace-membre' },
]

const NAV_PATHS = {
  home:     <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
  user:     <><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4.2 3.5-6 8-6s7.2 1.8 8 6" /></>,
  users:    <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M3 20c.6-3.8 2.7-6 6-6s5.4 2.2 6 6M15 15c3.2-.4 5.2 1.3 6 4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4m8-4v4M3 10h18" /></>,
  folder:   <path d="M3 6h7l2 3h9v10H3z" />,
  book:     <><path d="M4 5c4-1 6 .2 8 2v14c-2-2-4-3-8-2zM20 5c-4-1-6 .2-8 2v14c2-2 4-3 8-2z" /></>,
  archive:  <><rect x="4" y="6" width="16" height="15" rx="2" /><path d="M3 3h18v4H3zm6 8h6" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 15 6l-.3-2.6h-4L10.4 6A8 8 0 0 0 9 7L6.5 6l-2 3.4L6.6 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1A8 8 0 0 0 10.5 18l.3 2.6h4L15 18a8 8 0 0 0 1.5-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" /></>,
  bell:     <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  menu:     <path d="M4 7h16M4 12h16M4 17h16" />,
  search:   <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  cap:      <><path d="m2 9 10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v7" /></>,
}

function SideIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {NAV_PATHS[name]}
    </svg>
  )
}

function PapersSkeleton() {
  return (
    <div className="sp-skeleton-wrap" aria-label="Loading exam papers" role="status">
      {[2025, 2024, 2023].map((group) => (
        <section key={group} className="sp-year-section sp-skeleton-group">
          <div className="sp-year-head" style={{ pointerEvents: 'none' }}>
            <span className="sp-skeleton-pill" style={{ width: 100, height: 26, borderRadius: 6 }} />
            <span className="sp-skeleton-pill" style={{ width: 60, height: 18, borderRadius: 10 }} />
          </div>
          <div className="sp-papers sp-papers--open">
            {[1, 2].map((i) => (
              <div key={i} className="sp-paper-row sp-skeleton-row" style={{ pointerEvents: 'none' }}>
                <span className="sp-skeleton-pill" style={{ width: 28, height: 32, borderRadius: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span className="sp-skeleton-pill" style={{ width: '65%', height: 18, borderRadius: 4 }} />
                  <span className="sp-skeleton-pill" style={{ width: '35%', height: 13, borderRadius: 4 }} />
                </div>
                <span className="sp-skeleton-pill" style={{ width: 95, height: 26, borderRadius: 13, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default function SubjectPapers() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()

  // Résolution de la matière actuelle via le slug
  const currentSubject = useMemo(() => {
    if (!slug) return TEST_SUBJECTS[0]
    const norm = normalizeSubject(slug)
    const found = TEST_SUBJECTS.find(
      (s) =>
        normalizeSubject(s.slug) === norm ||
        normalizeSubject(s.name) === norm
    )
    const color = getSubjectColor(norm)
    return (
      found || {
        id: 99,
        slug: norm,
        name: norm.charAt(0).toUpperCase() + norm.slice(1),
        color,
        hex: COLOR_HEX[color] || '#0966e8',
        levels: ['O/L', 'A/L'],
        description: `GCE O/L & A/L ${norm} past papers`,
      }
    )
  }, [slug])

  // Résolution du niveau initial via query param (priorité au query param)
  const queryLevel = searchParams.get('level')?.toUpperCase()
  const defaultLevel =
    queryLevel === 'A/L' || queryLevel === 'AL'
      ? 'A/L'
      : queryLevel === 'O/L' || queryLevel === 'OL'
        ? 'O/L'
        : slug?.toLowerCase().endsWith('-al')
          ? 'A/L'
          : 'O/L'

  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeLevel, setActiveLevel] = useState(defaultLevel)
  const [selectedYear, setSelectedYear] = useState('all')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const search = searchParams.get('search') || ''
  const [notification, setNotification] = useState(null)

  // Gestion des favoris avec persistance
  const onlyFavs = searchParams.get('filter') === 'favourites'
  const isAllFavorites = !slug && onlyFavs
  const pageSubjectName = isAllFavorites ? 'My favourites' : currentSubject.name
  const pageSubjectDescription = isAllFavorites
    ? 'Your saved papers across all subjects.'
    : currentSubject.description
  const [favIds, setFavIds] = useState(() => {
    try {
      const raw = localStorage.getItem('mms_fav_papers')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const toggleFav = (id) => {
    setFavIds((prev) => {
      const isFav = prev.includes(id)
      const next = isFav ? prev.filter((x) => x !== id) : [...prev, id]
      try {
        localStorage.setItem('mms_fav_papers', JSON.stringify(next))
      } catch {}
      setNotification(isFav ? 'Retiré de vos favoris' : 'Ajouté à vos favoris')
      setTimeout(() => setNotification(null), 2500)
      return next
    })
  }

  useEffect(() => {
    if (queryLevel === 'A/L' || queryLevel === 'AL') {
      setActiveLevel('A/L')
    } else if (queryLevel === 'O/L' || queryLevel === 'OL') {
      setActiveLevel('O/L')
    }
  }, [queryLevel])

  const handleSearchChange = (value) => {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set('search', value)
    } else {
      next.delete('search')
    }
    setSearchParams(next, { replace: true })
  }

  const handleLevelChange = (lvl) => {
    setActiveLevel(lvl)
    setSelectedYear('all')
    const next = new URLSearchParams(searchParams)
    next.set('level', lvl)
    next.delete('filter')
    setSearchParams(next, { replace: true })
  }

  const handleFavoritesToggle = () => {
    const next = new URLSearchParams(searchParams)
    if (onlyFavs) {
      next.delete('filter')
    } else {
      next.set('filter', 'favourites')
    }
    setSelectedYear('all')
    setSearchParams(next, { replace: true })
  }

  const subjectPath = (subjectSlug) => {
    const params = new URLSearchParams(searchParams)
    params.set('level', activeLevel)
    return `/education/matieres/${subjectSlug}/epreuves?${params.toString()}`
  }

  // Préchargement depuis sessionStorage pour affichage immédiat en 0ms
  const [cachedRaw] = useState(() => {
    try {
      const raw = sessionStorage.getItem('mms_cached_papers')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  /* ── Récupération des épreuves réelles depuis la Base de Données ── */
  const { data: dbPapers, loading: loadingDbPapers } = useApi('/exams/papers/', { ttlMs: 120000 })

  useEffect(() => {
    if (dbPapers && Array.isArray(Array.isArray(dbPapers) ? dbPapers : dbPapers?.results)) {
      try {
        sessionStorage.setItem('mms_cached_papers', JSON.stringify(dbPapers))
      } catch {}
    }
  }, [dbPapers])

  const allAvailablePapers = useMemo(() => {
    const source = dbPapers || cachedRaw
    const list = Array.isArray(source) ? source : (source?.results || [])
    if (list.length > 0) {
      return list.map((item) => {
        const itemLevel = (item.level || '').toLowerCase()
        return {
          id: item.id,
          subjectSlug: item.subject_slug || '',
          subjectName: item.subject_name || '',
          year: item.year,
          level: itemLevel === 'al' ? 'A/L' : 'O/L',
          session: item.session === 'june' ? 'June' : (item.session === 'mock' ? 'Mock' : item.paper_number),
          title: item.title,
          type: item.paper_type === 'mock' ? 'Mock Exam' : 'Past Paper',
          correction: item.correction_available
            ? (item.correction_complete === false ? 'partial' : 'available')
            : 'none',
          correctionComplete: item.correction_complete !== false,
          fileUrl: item.source_pdf ? mediaUrl(item.source_pdf) : '#',
          sourceName: item.source_name,
        }
      })
    }
    return []
  }, [dbPapers, cachedRaw])

  /* ── Filtrage des épreuves de la matière actuelle ── */
  const subjectPapers = useMemo(() => {
    const curNorm = normalizeSubject(currentSubject.slug || currentSubject.name)
    return allAvailablePapers.filter((p) => {
      if (isAllFavorites) return favIds.includes(p.id)
      const pNorm = normalizeSubject(p.subjectSlug || p.subjectName)
      return pNorm === curNorm
    })
  }, [allAvailablePapers, currentSubject, favIds, isAllFavorites])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return subjectPapers.filter((p) => {
      if (onlyFavs && !favIds.includes(p.id)) return false
      if (!onlyFavs && p.level !== activeLevel) return false
      if (selectedYear !== 'all' && p.year !== Number(selectedYear)) return false
      if (q && !p.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [subjectPapers, activeLevel, selectedYear, search, onlyFavs, favIds])

  const grouped = useMemo(() => groupByYear(filtered), [filtered])

  const allYears = useMemo(() => {
    return [
      ...new Set(
        subjectPapers
          .filter((p) => (onlyFavs ? true : p.level === activeLevel))
          .map((p) => p.year)
      ),
    ].sort((a, b) => b - a)
  }, [subjectPapers, activeLevel, onlyFavs])

  const toggleYear = (year) =>
    setCollapsed((prev) => ({ ...prev, [year]: !prev[year] }))

  const toggleMenu = (id) =>
    setOpenMenuId((prev) => (prev === id ? null : id))

  const handlePageClick = (e) => {
    if (!e.target.closest('.sp-paper-menu-wrap') && !e.target.closest('.sp-paper-row')) {
      setOpenMenuId(null)
    }
  }

  const openPaperPage = (paper, view = 'paper') => {
    setOpenMenuId(null)
    const level = encodeURIComponent(paper.level || activeLevel)
    const correctionQuery = view === 'correction' ? '&view=correction' : ''
    navigate(`/education/epreuves/${paper.id}?subject=${encodeURIComponent(paper.subjectSlug || currentSubject.slug)}&level=${level}${correctionQuery}`, {
      state: { paper },
    })
  }

  const triggerDownload = async (paper) => {
    if (!paper.fileUrl || paper.fileUrl === '#') {
      setNotification('Le fichier PDF de cette épreuve n’est pas encore disponible.')
      setTimeout(() => setNotification(null), 3500)
      setOpenMenuId(null)
      return
    }

    try {
      const { data } = await api.get(paper.fileUrl, { responseType: 'blob' })
      const objectUrl = URL.createObjectURL(data)
      const anchor = document.createElement('a')
      const filename = (paper.sourceName || `${paper.title}.pdf`).replace(/[<>:"/\\|?*]+/g, '_')
      anchor.href = objectUrl
      anchor.download = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      setNotification(`Téléchargement de "${paper.title}" démarré.`)
    } catch {
      setNotification('Le téléchargement du fichier a échoué. Réessayez plus tard.')
    }
    setTimeout(() => setNotification(null), 3500)
    setOpenMenuId(null)
  }

  const displayName = user?.full_name || 'Dieudonné'
  const displayInitials = displayName
    ? displayName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : '?'
  const displayRole = user?.role === 'alumni' ? 'Alumni Member' : (user?.role || 'Alumni Member')

  return (
    <div id="education-dashboard">
      <div className="app-shell">

        {/* ══ SIDEBAR (identique à EducationHub) ══ */}
        <EducationSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

        {/* ══ MAIN ══ */}
        <main>
          {/* Topbar (Education Hub style) */}
          <header className="topbar">
            <button className="menu-button" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <SideIcon name="menu" />
            </button>
            <div className="search">
              <SideIcon name="search" />
              <input
                aria-label="Search papers"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={`Search ${currentSubject.name} papers…`}
              />
              {search && (
                <button type="button" onClick={() => handleSearchChange('')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#8898aa', fontSize: 14 }}
                  aria-label="Clear search">✕</button>
              )}
            </div>
            <div className="top-actions">
              <Link to="/notifications" className="notification" aria-label="Notifications">
                <SideIcon name="bell" />
                <span />
              </Link>
              <Link to="/profil" className="profile" style={{ textDecoration: 'none' }}>
                <div className="avatar">
                  {user?.avatar_url
                    ? <img src={user.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : displayInitials}
                </div>
                <div><strong>{displayName}</strong><span>{displayRole}</span></div>
                <span className="dots">⋮</span>
              </Link>
            </div>
          </header>

        <div className="sp-page" onClick={handlePageClick}>
      {/* ══ HEADER ══════════════════════════════════════════ */}
      <header className="sp-header">
        <div className="sp-header-inner">
          {/* Breadcrumb / Back */}
          <div className="sp-breadcrumb">
            <Link to="/education" className="sp-breadcrumb-link">
              <i className="mdi mdi-arrow-left" /> Education Hub
            </Link>
            <span className="sp-breadcrumb-sep">/</span>
            <span className="sp-breadcrumb-current">{pageSubjectName}</span>
            <span className="sp-breadcrumb-badge">{activeLevel}</span>
          </div>

          {/* Sélecteur de matière en pastilles */}
          <div className="sp-subject-switcher">
            {TEST_SUBJECTS.map((sub) => {
              const isSelected = !isAllFavorites && normalizeSubject(sub.slug) === normalizeSubject(currentSubject.slug)
              return (
                <Link
                  key={sub.slug}
                  to={subjectPath(sub.slug)}
                  className={`sp-sub-pill ${isSelected ? 'sp-sub-pill--active' : ''}`}
                  style={{ '--pill-c': sub.hex || sub.color }}
                >
                  <HubSubjectIcon color={sub.color} size="sm" />
                  <span>{sub.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Identité de la matière */}
          <div className="sp-identity">
            {isAllFavorites
              ? <span className="sp-hub-icon" style={{ background: 'linear-gradient(145deg, #fb7185, #e11d48)' }}><i className="mdi mdi-heart" /></span>
              : <HubSubjectIcon color={currentSubject.color || getSubjectColor(currentSubject.slug)} />}
            <div>
              <h1 className="sp-subject-name">{pageSubjectName}</h1>
              <p className="sp-subject-desc">{pageSubjectDescription}</p>
            </div>
          </div>

          {/* Onglets niveau + sélecteur année */}
            <div className="sp-controls">
              <div className="sp-tabs" role="tablist">
                {currentSubject.levels.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    role="tab"
                    id={`sp-tab-${lvl.replace('/', '')}`}
                    aria-selected={!onlyFavs && activeLevel === lvl}
                    className={`sp-tab ${!onlyFavs && activeLevel === lvl ? 'sp-tab--active' : ''}`}
                    onClick={() => handleLevelChange(lvl)}
                  >
                    {lvl}
                  </button>
                ))}
                <button
                  type="button"
                  role="tab"
                  className={`sp-tab ${onlyFavs ? 'sp-tab--active' : ''}`}
                  onClick={handleFavoritesToggle}
                >
                  <i className="mdi mdi-heart" style={{ marginRight: '4px', color: onlyFavs ? '#fff' : '#f43f5e' }} />
                  Favorites ({favIds.length})
                </button>
              </div>

            <div className="sp-year-wrap">
              <select
                id="sp-year-filter"
                className="sp-year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                aria-label="Filter by year"
              >
                <option value="all">All years ({filtered.length})</option>
                {allYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <i className="mdi mdi-chevron-down sp-year-arrow" aria-hidden="true" />
            </div>
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className="sp-toast">
          <i className="mdi mdi-check-circle" /> {notification}
        </div>
      )}

      {/* ══ CONTENU PRINCIPAL ═══════════════════════════════ */}
      <main className="sp-main">
        {loadingDbPapers && allAvailablePapers.length === 0 ? (
          <PapersSkeleton />
        ) : grouped.length === 0 ? (
          <div className="sp-empty">
            <i className="mdi mdi-file-search-outline sp-empty-icon" />
            <p>No papers found for these filters.</p>
            <button
              type="button"
              className="sp-reset-btn"
              onClick={() => {
                handleSearchChange('')
                setSelectedYear('all')
              }}
            >
              <i className="mdi mdi-filter-remove-outline" /> Reset filters
            </button>
          </div>
        ) : (
          grouped.map(({ year, items }) => {
            const isOpen = !collapsed[year]
            return (
              <section
                key={year}
                className={`sp-year-section ${items.some((paper) => paper.id === openMenuId) ? 'sp-year-section--menu-open' : ''}`}
              >
                {/* Accordion header for year */}
                <button
                  type="button"
                  className="sp-year-head"
                  onClick={() => toggleYear(year)}
                  aria-expanded={isOpen}
                  aria-controls={`sp-year-body-${year}`}
                >
                  <span className="sp-year-info">
                    <strong className="sp-year-num">{year}</strong>
                    <span className="sp-year-count">
                      {items.length} paper{items.length > 1 ? 's' : ''}
                    </span>
                  </span>
                  <i
                    className={`mdi mdi-chevron-down sp-year-chevron ${
                      isOpen ? 'sp-year-chevron--open' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {/* Papers list */}
                <div
                  id={`sp-year-body-${year}`}
                  className={`sp-papers ${isOpen ? 'sp-papers--open' : ''}`}
                >
                  {items.map((paper) => {
                    const badge = BADGE[paper.correction] || BADGE.none
                    const menuOpen = openMenuId === paper.id

                    return (
                      <div
                        key={paper.id}
                        className="sp-paper-row"
                        onMouseEnter={() => prefetchPaperPdf(paper.id)}
                        onTouchStart={() => prefetchPaperPdf(paper.id)}
                        onClick={() => toggleMenu(paper.id)}
                        onKeyDown={(event) => {
                          if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                            event.preventDefault()
                            toggleMenu(paper.id)
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* File icon: transparent frame with blue document */}
                        <FileIcon
                          variant={
                            paper.correction === 'available'
                              ? 'blue'
                              : paper.correction === 'pending' || paper.correction === 'partial'
                              ? 'orange'
                              : 'gray'
                          }
                        />

                        {/* Title & metadata */}
                        <div className="sp-paper-info">
                          <strong className="sp-paper-title">{paper.title}</strong>
                          <small className="sp-paper-sub">
                            {paper.type} · {paper.year} · Paper {paper.session} · {paper.level}
                          </small>
                        </div>

                        {/* Marking guide badge */}
                        <span className={`sp-badge ${badge.cls}`}>
                          <i className={`mdi ${badge.icon}`} aria-hidden="true" />
                          <span className="sp-badge-label">{badge.label}</span>
                        </span>

                        {/* Favorite button */}
                        <button
                          type="button"
                          className={`sp-fav-star ${favIds.includes(paper.id) ? 'sp-fav-star--active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFav(paper.id)
                          }}
                          aria-label={favIds.includes(paper.id) ? 'Remove from favorites' : 'Add to favorites'}
                          title={favIds.includes(paper.id) ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <i className={`mdi ${favIds.includes(paper.id) ? 'mdi-heart' : 'mdi-heart-outline'}`} />
                        </button>

                        {/* Context menu ⋮ */}
                        <div
                          className="sp-paper-menu-wrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            id={`sp-menu-btn-${paper.id}`}
                            className="sp-menu-btn"
                            aria-label="Options for this paper"
                            aria-expanded={menuOpen}
                            aria-haspopup="menu"
                            onClick={() => toggleMenu(paper.id)}
                          >
                            <i className="mdi mdi-dots-vertical" />
                          </button>

                          {menuOpen && (
                            <>
                              <button
                                type="button"
                                className="sp-process-backdrop"
                                aria-label="Close action menu"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div
                                className="sp-dropdown sp-dropdown-process"
                                role="menu"
                                aria-labelledby={`sp-menu-btn-${paper.id}`}
                              >
                                <span className="sp-process-heading">Choose an action</span>
                                <button
                                  type="button"
                                  className="sp-dropdown-item sp-process-action"
                                  role="menuitem"
                                  onClick={() => triggerDownload(paper)}
                                >
                                  <span className="sp-process-illustration">
                                    <img src="/education-process-pdf.png" alt="" aria-hidden="true" />
                                  </span>
                                  <strong>Download PDF</strong>
                                  <small>Save a copy</small>
                                </button>
                                <button
                                  type="button"
                                  className="sp-dropdown-item sp-process-action"
                                  role="menuitem"
                                  onClick={() => openPaperPage(paper)}
                                >
                                  <span className="sp-process-illustration">
                                    <img src="/education-process-online.png" alt="" aria-hidden="true" />
                                  </span>
                                  <strong>Open online</strong>
                                  <small>Open PDF viewer</small>
                                </button>
                                {(paper.correction === 'available' || paper.correction === 'partial') && (
                                  <button
                                    type="button"
                                    className="sp-dropdown-item sp-process-action sp-process-action--correction"
                                    role="menuitem"
                                    onClick={() => openPaperPage(paper, 'correction')}
                                  >
                                    <span className="sp-correction-illustration" aria-hidden="true">
                                      <i className="mdi mdi-check-decagram-outline" />
                                    </span>
                                    <span className="sp-correction-copy">
                                      <strong>View marking scheme</strong>
                                      <small>{paper.correction === 'partial' ? 'Some questions are still missing' : 'Open the available correction'}</small>
                                    </span>
                                    <i className="mdi mdi-chevron-right sp-correction-arrow" aria-hidden="true" />
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })
        )}
      </main>

      {/* Floating return button */}
      <Link to="/education" className="sp-back-fab" aria-label="Back to Education Hub" title="Back to Education Hub">
        <i className="mdi mdi-arrow-left" />
      </Link>
    </div>{/* end sp-page */}
        </main>
      </div>{/* end app-shell */}
    </div>
  )
}
