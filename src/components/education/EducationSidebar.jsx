import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { label: 'Home', icon: 'home', path: '/' },
  { label: 'My profile', icon: 'user', path: '/profil' },
  { label: 'Alumni', icon: 'users', path: '/annuaire' },
  { label: 'Events', icon: 'calendar', path: '/evenements' },
  { label: 'Projects', icon: 'folder', path: '/projets' },
  { label: 'Education', icon: 'book', path: '/education' },
  { label: 'Archives', icon: 'archive', path: '/archives' },
  { label: 'Settings', icon: 'settings', path: '/espace-membre' },
]

const ICONS = {
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4.2 3.5-6 8-6s7.2 1.8 8 6" /></>,
  users: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M3 20c.6-3.8 2.7-6 6-6s5.4 2.2 6 6M15 15c3.2-.4 5.2 1.3 6 4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4m8-4v4M3 10h18" /></>,
  folder: <path d="M3 6h7l2 3h9v10H3z" />,
  book: <><path d="M4 5c4-1 6 .2 8 2v14c-2-2-4-3-8-2zM20 5c-4-1-6 .2-8 2v14c2-2 4-3 8-2z" /></>,
  archive: <><rect x="4" y="6" width="16" height="15" rx="2" /><path d="M3 3h18v4H3zm6 8h6" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 15 6l-.3-2.6h-4L10.4 6A8 8 0 0 0 9 7L6.5 6l-2 3.4L6.6 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1A8 8 0 0 0 10.5 18l.3 2.6h4L15 18a8 8 0 0 0 1.5-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" /></>,
  cap: <><path d="m2 9 10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v7" /></>,
}

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 20, height: 20 }}>
      {ICONS[name]}
    </svg>
  )
}

export default function EducationSidebar({ mobileOpen, setMobileOpen }) {
  const location = useLocation()
  return (
    <>
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">×</button>
        <Link to="/" className="brand" onClick={() => setMobileOpen(false)}>
          <img src="/mega-mighty-logo.png" alt="Logo Mega Mighty Sixers" />
          <div><strong>Mega Mighty</strong><span>Sixers</span></div>
        </Link>
        <nav>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/education' && location.pathname.startsWith('/education'))
            return (
              <Link
                key={item.label}
                to={item.path}
                className={isActive ? 'active' : ''}
                onClick={() => setMobileOpen(false)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.label === 'Events' && <i>3</i>}
              </Link>
            )
          })}
        </nav>
        <div className="sidebar-quote">
          <Icon name="cap" />
          <p>Together for<br /><b>a brighter future</b></p>
        </div>
      </aside>
      {mobileOpen && <button className="backdrop" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
    </>
  )
}