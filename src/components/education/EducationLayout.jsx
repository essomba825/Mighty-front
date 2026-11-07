import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './EducationLayout.css'

export const EDU_NAV_ITEMS = [
  { label: 'Accueil', path: '/', icon: 'home' },
  { label: 'Mon profil', path: '/profil', icon: 'account' },
  { label: 'Alumni', path: '/annuaire', icon: 'account-group' },
  { label: 'Événements', path: '/evenements', icon: 'calendar', badge: 3 },
  { label: 'Projets', path: '/projets', icon: 'briefcase' },
  { label: 'Éducation', path: '/education', icon: 'school' },
  { label: 'Archives', path: '/archives', icon: 'archive' },
  { label: 'Paramètres', path: '/espace-membre', icon: 'cog' },
]

export function EduIcon({ name }) {
  if (name === 'home') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    )
  }
  if (name === 'account') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    )
  }
  if (name === 'account-group') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    )
  }
  if (name === 'calendar') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
        <line x1="16" x2="16" y1="2" y2="6"/>
        <line x1="8" x2="8" y1="2" y2="6"/>
        <line x1="3" x2="21" y1="10" y2="10"/>
      </svg>
    )
  }
  if (name === 'briefcase') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    )
  }
  if (name === 'school') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    )
  }
  if (name === 'archive') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8"/>
        <rect width="22" height="5" x="1" y="3" rx="1"/>
        <line x1="10" x2="14" y1="12" y2="12"/>
      </svg>
    )
  }
  if (name === 'cog') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    )
  }
  if (name === 'cap') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    )
  }
  if (name === 'bell') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
      </svg>
    )
  }
  if (name === 'search') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.3-4.3"/>
      </svg>
    )
  }
  if (name === 'menu') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" x2="20" y1="12" y2="12"/>
        <line x1="4" x2="20" y1="6" y2="6"/>
        <line x1="4" x2="20" y1="18" y2="18"/>
      </svg>
    )
  }
  return null
}

export default function EducationLayout({
  children,
  searchQuery = '',
  onSearchChange = null,
  searchPlaceholder = 'Rechercher...',
  activeNav = 'Éducation',
}) {
  const location = useLocation()
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const displayName = user?.full_name || 'Dieudonné'
  const displayRole = user?.role === 'alumni' ? 'Membre Alumni' : (user?.role || 'Membre Alumni')
  const displayInitials = displayName
    ? displayName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : 'DN'

  return (
    <div id="education-dashboard" className="edu-layout-root">
      <div className="app-shell">
        {/* ══ SIDEBAR (Écrans 1, 2, 4, 5) ══ */}
        <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
          <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu">
            ×
          </button>

          <Link to="/" className="brand" onClick={() => setMobileOpen(false)}>
            <img src="/mega-mighty-logo.png" alt="Logo Mega Mighty Sixers" />
            <div>
              <strong>Mega Mighty</strong>
              <span>Sixers</span>
            </div>
          </Link>

          <nav>
            {EDU_NAV_ITEMS.map((item) => {
              const isActive =
                item.label === activeNav ||
                (item.path === '/education' && location.pathname.startsWith('/education'))
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={isActive ? 'active' : ''}
                  onClick={() => setMobileOpen(false)}
                >
                  <EduIcon name={item.icon} />
                  <span>{item.label}</span>
                  {item.badge && <i>{item.badge}</i>}
                </Link>
              )
            })}
          </nav>

          <div className="sidebar-quote">
            <EduIcon name="cap" />
            <p>
              Ensemble pour
              <br />
              <b>un meilleur avenir</b>
            </p>
          </div>
        </aside>

        {mobileOpen && (
          <button
            className="backdrop"
            aria-label="Fermer"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* ══ ZONE PRINCIPALE AVEC TOPBAR ══ */}
        <main className="edu-main-content">
          <header className="topbar">
            <button
              className="menu-button"
              onClick={() => setMobileOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <EduIcon name="menu" />
            </button>

            <div className="search">
              <EduIcon name="search" />
              <input
                aria-label="Recherche"
                value={searchQuery}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
              />
              {searchQuery && onSearchChange && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#8898aa',
                    fontSize: '14px',
                  }}
                  aria-label="Effacer la recherche"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="top-actions">
              <Link to="/notifications" className="notification" aria-label="Notifications">
                <EduIcon name="bell" />
                <span />
              </Link>
              <Link to="/profil" className="profile" style={{ textDecoration: 'none' }}>
                <div className="avatar">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={displayName}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    displayInitials
                  )}
                </div>
                <div>
                  <strong>{displayName}</strong>
                  <span>{displayRole}</span>
                </div>
                <span className="dots">⋮</span>
              </Link>
            </div>
          </header>

          {/* Contenu spécifique à chaque écran */}
          <div className="edu-page-container">
            {children}
          </div>
        </main>
      </div>

      {/* ══ ÉCRAN 6 : BOTTOM NAVIGATION MOBILE (PWA) ══ */}
      <nav className="edu-bottom-nav" aria-label="Navigation mobile">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          <EduIcon name="home" />
          <span>Accueil</span>
        </Link>
        <Link to="/education" className={location.pathname.startsWith('/education') ? 'active' : ''}>
          <EduIcon name="school" />
          <span>Éducation</span>
        </Link>
        <Link to="/annuaire" className={location.pathname.startsWith('/annuaire') ? 'active' : ''}>
          <EduIcon name="account-group" />
          <span>Alumni</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className={mobileOpen ? 'active' : ''}
        >
          <EduIcon name="menu" />
          <span>Plus</span>
        </button>
      </nav>
    </div>
  )
}
