import { useState, type FormEvent, type SVGProps } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EducationSidebar from '../components/education/EducationSidebar'
import '../education-hub.css'

type IconName =
  | 'home'
  | 'user'
  | 'users'
  | 'calendar'
  | 'folder'
  | 'book'
  | 'archive'
  | 'settings'
  | 'search'
  | 'bell'
  | 'chevron'
  | 'arrow'
  | 'heart'
  | 'cap'
  | 'chart'
  | 'menu'

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4.2 3.5-6 8-6s7.2 1.8 8 6" /></>,
  users: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M3 20c.6-3.8 2.7-6 6-6s5.4 2.2 6 6M15 15c3.2-.4 5.2 1.3 6 4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4m8-4v4M3 10h18" /></>,
  folder: <path d="M3 6h7l2 3h9v10H3z" />,
  book: <><path d="M4 5c4-1 6 .2 8 2v14c-2-2-4-3-8-2zM20 5c-4-1-6 .2-8 2v14c2-2 4-3 8-2z" /></>,
  archive: <><rect x="4" y="6" width="16" height="15" rx="2" /><path d="M3 3h18v4H3zm6 8h6" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 15 6l-.3-2.6h-4L10.4 6A8 8 0 0 0 9 7L6.5 6l-2 3.4L6.6 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1A8 8 0 0 0 10.5 18l.3 2.6h4L15 18a8 8 0 0 0 1.5-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  arrow: <><path d="M5 12h14m-5-5 5 5-5 5" /></>,
  heart: <path d="M12 21S3 16 3 9.5A4.5 4.5 0 0 1 11 6l1 1 1-1a4.5 4.5 0 0 1 8 3.5C21 16 12 21 12 21Z" />,
  cap: <><path d="m2 9 10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v7" /></>,
  chart: <><path d="M4 20V10m6 10V4m6 16v-7m5 7H2" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
}

function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  )
}

const subjects = [
  { name: 'Mathematics', slug: 'mathematics', levels: 'O/L & A/L', symbol: 'π', color: 'blue' },
  { name: 'Physics', slug: 'physics', levels: 'O/L & A/L', symbol: '⚛', color: 'purple' },
  { name: 'Chemistry', slug: 'chemistry', levels: 'O/L & A/L', symbol: '⌬', color: 'orange' },
  { name: 'Biology', slug: 'biology', levels: 'O/L & A/L', symbol: '♧', color: 'green' },
]

export default function App() {
  const level: 'O/L' | 'A/L' = 'O/L'
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!search.trim()) return
    const matchingSubject = subjects.find((subject) =>
      search.trim().toLowerCase().includes(subject.name.toLowerCase())
    )
    const paperSearch = matchingSubject
      ? search.trim().replace(new RegExp(matchingSubject.name, 'i'), '').trim()
      : search.trim()
    const subjectPath = matchingSubject
      ? `/education/matieres/${matchingSubject.slug}/epreuves`
      : '/education/matieres'
    const searchParam = paperSearch ? `&search=${encodeURIComponent(paperSearch)}` : ''
    navigate(`${subjectPath}?level=${encodeURIComponent(level)}${searchParam}`)
  }

  return (
    <div id="education-dashboard" className="app-shell">
      <EducationSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <main>
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <form className="search" onSubmit={submitSearch}><Icon name="search" /><input aria-label="Search papers and subjects" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search papers, subjects..." /></form>
          <div className="top-actions">
            <button className="notification" aria-label="Notifications"><Icon name="bell" /><span /></button>
            <div className="profile">
              <div className="avatar">DN</div>
              <div><strong>Dieudonné</strong><span>Alumni Member</span></div>
              <span className="dots">⋮</span>
            </div>
          </div>
        </header>

        <div className="page">
          <section className="hero">
            <div className="hero-content">
              <span className="eyebrow">EDUCATION HUB</span>
              <h1>Learn. Progress.<br />Succeed.</h1>
              <p>Prepare for your future with GCE past papers and resources from the Mega Mighty Sixers community.</p>
              <div className="hero-actions">
                <Link className="hero-link-btn" to={`/education/matieres?level=${encodeURIComponent(level)}`}><Icon name="book" /> Official papers</Link>
              </div>
            </div>
            <div className="hero-stat"><strong>120+</strong><span>resources available</span></div>
          </section>

          <div className="content-grid">
            <div className="main-column">
              <section className="section-block">
                <div className="section-heading"><div><h2>Quick access</h2></div></div>
                <div className="quick-grid">
                  <Link className="quick-card" to="/education/matieres?level=O%2FL">
                    <span className="quick-icon blue-soft">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3.3 5.1c3.2-.8 5.8-.1 7.7 1.7v12.1c-2-1.5-4.5-2.1-7.7-1.3V5.1Zm17.4 0c-3.2-.8-5.8-.1-7.7 1.7v12.1c2-1.5 4.5-2.1 7.7-1.3V5.1Z" />
                        <path d="M12 7v12.5" className="icon-detail" />
                      </svg>
                    </span>
                    <span><strong>GCE O/L</strong><small>Ordinary Level</small></span>
                    <Icon name="chevron" className="card-arrow" />
                  </Link>
                  <Link className="quick-card" to="/education/matieres?level=A%2FL">
                    <span className="quick-icon blue-soft">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 3 1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3m6.82 6L12 12.72 5.18 9 12 5.28 18.82 9M17 16l-5 2.72L7 16v-3.73L12 15l5-2.73V16Z" />
                      </svg>
                    </span>
                    <span><strong>GCE A/L</strong><small>Advanced Level</small></span>
                    <Icon name="chevron" className="card-arrow" />
                  </Link>
                  <Link className="quick-card" to="/education/matieres?filter=favourites">
                    <span className="quick-icon red-soft">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 20.7S3.2 16 3.2 9.6A4.6 4.6 0 0 1 11 6.2l1 1.1 1-1.1a4.6 4.6 0 0 1 7.8 3.4c0 6.4-8.8 11.1-8.8 11.1Z" />
                      </svg>
                    </span>
                    <span><strong>My favourites</strong><small>Your saved papers</small></span>
                    <Icon name="chevron" className="card-arrow" />
                  </Link>
                </div>
              </section>

              <section className="section-block subjects-section">
                <div className="section-heading">
                  <div><h2>Available subjects</h2></div>
                  <Link className="text-link" to={`/education/matieres?level=${encodeURIComponent(level)}`}>View all subjects <Icon name="arrow" /></Link>
                </div>
                <div className="subject-grid">
                  {subjects.map((subject) => (
                    <Link className="subject-card" key={subject.name} to={`/education/matieres/${subject.slug}/epreuves?level=${encodeURIComponent(level)}`}>
                      <span className={`subject-icon ${subject.color}`}>
                        {subject.color === 'blue' && <span className="pi-glyph">π</span>}
                        {subject.color === 'purple' && (
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <ellipse cx="12" cy="12" rx="9" ry="3.6" />
                            <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
                            <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
                            <circle cx="12" cy="12" r="1.7" />
                          </svg>
                        )}
                        {subject.color === 'orange' && (
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M9 3h6M10 3v6l-5 9.2A1.8 1.8 0 0 0 6.6 21h10.8a1.8 1.8 0 0 0 1.6-2.8L14 9V3" />
                            <path d="M7.5 16h9" />
                          </svg>
                        )}
                        {subject.color === 'green' && (
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M19.7 4.3C11 4.8 5.6 8.8 6.2 15.1c.3 3.4 3.5 4.5 6.2 2.6 4-2.8 5.7-7.6 7.3-13.4Z" />
                            <path d="M4 20c3.1-4.5 6.2-7.2 11.2-10.1" />
                          </svg>
                        )}
                      </span>
                      <span><strong>{subject.name}</strong><small>{level} &amp; A/L</small></span>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </div>
          <footer><span>© 2025 Mega Mighty Sixers</span><span>United by the past, committed to the future.</span></footer>
        </div>
      </main>
    </div>
  )
}
