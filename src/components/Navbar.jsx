import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import LanguageSwitcher from './LanguageSwitcher'

/* Liens principaux : visibles en ligne dans la barre de bureau. */
const LIENS_PRINCIPAUX = [
  { to: '/', key: 'nav.home', icon: 'mdi-home-outline', exact: true },
  { to: '/education', key: 'nav.education', icon: 'mdi-school-outline', className: 'nav-edu' },
  { to: '/actualites', key: 'nav.news', icon: 'mdi-newspaper-variant-outline' },
  { to: '/evenements', key: 'nav.events', icon: 'mdi-calendar-month-outline' },
  { to: '/projets', key: 'nav.projects', icon: 'mdi-briefcase-outline' },
]

/* Liens secondaires : menu « Plus » sur bureau, section « Découvrir » sur mobile. */
const LIENS_SUITE = [
  { to: '/a-propos', key: 'nav.about', icon: 'mdi-book-open-page-variant-outline' },
  { to: '/partenaires', key: 'nav.partners', icon: 'mdi-handshake-outline' },
  { to: '/contact', key: 'nav.contact', icon: 'mdi-email-outline' },
  { to: '/annuaire', key: 'nav.directory', icon: 'mdi-account-group-outline' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [ouvertPlus, setOuvertPlus] = useState(false)
  const [ouvertCompte, setOuvertCompte] = useState(false)
  // Accordéon du tiroir mobile : une seule section ouverte à la fois.
  const [sectionMobile, setSectionMobile] = useState(null) // 'discover' | 'account' | null
  const [unread, setUnread] = useState(0)
  const racine = useRef(null)

  const roleKey = { alumni: 'alumni', student: 'student', teacher: 'teacher', partner: 'partner', admin: 'admin' }

  const close = () => {
    setOpen(false)
    setOuvertPlus(false)
    setOuvertCompte(false)
    setSectionMobile(null)
  }

  const basculerSection = (nom) => setSectionMobile((v) => (v === nom ? null : nom))

  // Badge des notifications non lues : au montage puis toutes les minutes.
  useEffect(() => {
    if (!user) {
      setUnread(0)
      return undefined
    }
    let vivant = true
    const charger = () => {
      api.get('/notifications/unread_count/')
        .then(({ data }) => { if (vivant) setUnread(data.unread_count) })
        .catch(() => { /* hors ligne : le badge garde sa derniere valeur */ })
    }
    charger()
    const minuteur = setInterval(charger, 60000)
    return () => { vivant = false; clearInterval(minuteur) }
  }, [user])

  // Escape ferme tous les ouverts (clavier, accessibilite)
  useEffect(() => {
    if (!open && !ouvertPlus && !ouvertCompte) return undefined
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, ouvertPlus, ouvertCompte])

  // Clic hors navbar : ferme les menus deroulants de bureau.
  useEffect(() => {
    if (!ouvertPlus && !ouvertCompte) return undefined
    const onClic = (e) => {
      if (racine.current && !racine.current.contains(e.target)) {
        setOuvertPlus(false)
        setOuvertCompte(false)
      }
    }
    document.addEventListener('mousedown', onClic)
    return () => document.removeEventListener('mousedown', onClic)
  }, [ouvertPlus, ouvertCompte])

  // Tiroir mobile : ongele le defilement du fond et on ferme si l'ecran s'elargit.
  useEffect(() => {
    if (!open) return undefined
    const precedent = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onResize = () => { if (window.innerWidth > 860) setOpen(false) }
    window.addEventListener('resize', onResize)
    return () => {
      document.body.style.overflow = precedent
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : ''

  // Survol = ouverture naturelle sur bureau ; sur écran tactile, clic seul
  // (sinon l'événement mouseenter suivrait le tap et refermerait le menu).
  const survol = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches
  const survolOuvre = (setter) => (survol ? () => setter(true) : undefined)
  const survolFerme = (survol ? () => { setOuvertPlus(false); setOuvertCompte(false) } : undefined)

  const badge = unread > 0 && (
    <span className="nav-notifs-badge" aria-label={t('notif.unread').replace('{n}', unread)}>
      {unread > 9 ? '9+' : unread}
    </span>
  )

  /* Liens du compte : partagés entre le menu bureau et le tiroir mobile. */
  const liensCompte = user && (
    <>
      <NavLink to="/notifications" className="nav-notifs" onClick={close}>
        <i className="mdi mdi-bell-outline" />
        <span>{t('nav.notifications')}</span>
        {badge}
      </NavLink>
      <NavLink to="/mentorat" onClick={close}><i className="mdi mdi-account-supervisor-outline" />{t('nav.mentorship')}</NavLink>
      <NavLink to="/espace-membre" onClick={close}><i className="mdi mdi-view-dashboard-outline" />{t('nav.memberArea')}</NavLink>
      <NavLink to="/profil" onClick={close}><i className="mdi mdi-account-edit-outline" />{t('nav.profile')}</NavLink>
      {user.role === 'admin' && (
        <NavLink to="/statistiques" onClick={close}><i className="mdi mdi-chart-box-outline" />{t('nav.stats')}</NavLink>
      )}
      {(user.is_staff || user.role === 'admin') && (
        <NavLink to="/admin" onClick={close} className="admin-nav-link">
          <i className="mdi mdi-shield-crown-outline" />{t('admin.title')}
        </NavLink>
      )}
      {(user.role === 'teacher' || user.role === 'admin') && (
        <NavLink to="/education/contribuer" onClick={close}><i className="mdi mdi-content-save-plus-outline" />Contribuer</NavLink>
      )}
      {user.is_staff && (
        <NavLink to="/education/valider" onClick={close}><i className="mdi mdi-check-decagram-outline" />Valider</NavLink>
      )}
      <button type="button" className="btn-link mm-logout" onClick={() => { logout(); close() }}>
        <i className="mdi mdi-logout" />{t('nav.logout')}
      </button>
    </>
  )

  return (
    <nav className="navbar" ref={racine}>
      <Link to="/" className="navbar-brand" onClick={close} aria-label="Mega Mighty Sixers — Home">
        <img src="/logo-mark.png" alt="" className="navbar-logo" onError={(e) => e.target.style.display = 'none'} />
        <span className="navbar-brand-text">Mega Mighty Sixers</span>
      </Link>

      {/* Hamburger: three bars that turn into a cross, with a label */}
      <button
        className={`hamburger ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label={open ? t('common.close') : t('nav.menu')}
        aria-expanded={open}
        aria-controls="mobile-menu"
      >
        <span className="hamburger-icon"><span /><span /><span /></span>
        <span className="hamburger-label">{open ? t('common.close') : t('nav.menu')}</span>
      </button>

      {/* Backdrop: close the menu by clicking outside */}
      {open && <div className="nav-backdrop" onClick={close} aria-hidden="true" />}

      {/* ---------- Barre de bureau (masquée sur mobile) ---------- */}
      <div className={`navbar-links ${open ? 'open' : ''}`}>
        {/* ---------- Liens principaux ---------- */}
        <div className="nav-group nav-main">
          {LIENS_PRINCIPAUX.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.exact}
              className={l.className}
              onClick={close}
            >
              <i className={`mdi ${l.icon}`} />
              {t(l.key)}
            </NavLink>
          ))}
        </div>

        {/* ---------- Plus : menu déroulant bureau ---------- */}
        <div
          className={`nav-group nav-more ${ouvertPlus ? 'open' : ''}`}
          onMouseEnter={survolOuvre(setOuvertPlus)}
          onMouseLeave={survol ? () => setOuvertPlus(false) : undefined}
        >
          <button
            type="button"
            className="nav-drop-trigger"
            aria-expanded={ouvertPlus}
            aria-haspopup="true"
            onClick={() => setOuvertPlus((v) => !v)}
          >
            <span className="nav-more-label">{t('nav.more')}</span>
            <i className={`mdi mdi-chevron-down ${ouvertPlus ? 'open' : ''}`} />
          </button>
          <div className="nav-more-panel">
            {LIENS_SUITE.map((l) => (
              <NavLink key={l.to} to={l.to} onClick={close}>
                <i className={`mdi ${l.icon}`} />
                {t(l.key)}
              </NavLink>
            ))}
          </div>
        </div>

        {/* ---------- Cloche (bureau) ---------- */}
        {user && (
          <NavLink to="/notifications" className="nav-bell nav-notifs" onClick={close}
                   aria-label={unread > 0 ? t('notif.unread').replace('{n}', unread) : t('nav.notifications')}>
            <i className="mdi mdi-bell-outline" />
            {badge}
          </NavLink>
        )}

        <LanguageSwitcher className="nav-lang" />

        {/* ---------- Compte (bureau) ---------- */}
        {user ? (
          <div
            className={`nav-group nav-account ${ouvertCompte ? 'open' : ''}`}
            onMouseEnter={survolOuvre(setOuvertCompte)}
            onMouseLeave={survolFerme}
          >
            <button
              type="button"
              className="nav-avatar-btn"
              aria-expanded={ouvertCompte}
              aria-haspopup="true"
              aria-label={t('nav.section.account')}
              onClick={() => setOuvertCompte((v) => !v)}
            >
              <span className="nav-user-avatar">{initials}</span>
              <span className="nav-avatar-name">{user.first_name || user.username}</span>
              <i className="mdi mdi-menu-down" />
            </button>
            <div className="nav-account-panel">{liensCompte}</div>
          </div>
        ) : (
          <div className="nav-group nav-guest">
            <NavLink to="/login" onClick={close}><i className="mdi mdi-login" />{t('nav.login')}</NavLink>
            <NavLink to="/inscription" className="btn-primary" onClick={close}>
              <i className="mdi mdi-account-plus-outline" />{t('nav.join')}
            </NavLink>
          </div>
        )}
      </div>

      {/* ---------- Tiroir mobile organisé (≤ 860px) ---------- */}
      <div id="mobile-menu" className={`mobile-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="mm-inner">
          {/* Identité + notifications */}
          {user ? (
            <div className="mm-user">
              <span className="mm-avatar">{initials}</span>
              <span className="mm-user-text">
                <strong>{user.first_name} {user.last_name}</strong>
                <small>{t(`auth.role.${roleKey[user.role] || 'alumni'}`)}</small>
              </span>
              <NavLink to="/notifications" className="mm-bell" onClick={close}
                       aria-label={unread > 0 ? t('notif.unread').replace('{n}', unread) : t('nav.notifications')}>
                <i className="mdi mdi-bell-outline" />
                {unread > 0 && <span className="mm-bell-badge">{unread > 9 ? '9+' : unread}</span>}
              </NavLink>
              <button
                type="button"
                className="mm-logout-icon"
                onClick={() => { logout(); close() }}
                aria-label={t('nav.logout')}
                title={t('nav.logout')}
              >
                <i className="mdi mdi-logout" />
              </button>
            </div>
          ) : (
            <div className="mm-user mm-user-guest">
              <span className="mm-avatar"><i className="mdi mdi-account-outline" /></span>
              <span className="mm-user-text">
                <strong>Mega Mighty Sixers</strong>
                <small>{t('app.tagline')}</small>
              </span>
            </div>
          )}

          {/* Accès compte / connexion visible dès l'ouverture, sans scroll */}
          {!user && (
            <div className="mm-guest-actions">
              <NavLink to="/login" onClick={close} className="mm-btn mm-btn-ghost">
                <i className="mdi mdi-login" />{t('nav.login')}
              </NavLink>
              <NavLink to="/inscription" onClick={close} className="mm-btn mm-btn-primary">
                <i className="mdi mdi-account-plus-outline" />{t('nav.join')}
              </NavLink>
            </div>
          )}

          {/* Navigation principale en tuiles */}
          <p className="mm-label">{t('nav.section.explore')}</p>
          <nav className="mm-grid">
            {LIENS_PRINCIPAUX.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.exact}
                className={`mm-tile${l.className ? ` ${l.className}` : ''}`}
                onClick={close}
              >
                <i className={`mdi ${l.icon}`} />
                <span>{t(l.key)}</span>
              </NavLink>
            ))}
          </nav>

          {/* Accordéon « Découvrir » */}
          <div className={`mm-acc ${sectionMobile === 'discover' ? 'open' : ''}`}>
            <button type="button" className="mm-acc-head"
                    aria-expanded={sectionMobile === 'discover'}
                    onClick={() => basculerSection('discover')}>
              <span className="mm-acc-title"><i className="mdi mdi-compass-outline" />{t('nav.section.discover')}</span>
              <i className="mdi mdi-chevron-down mm-acc-caret" />
            </button>
            <div className="mm-acc-body">
              <div className="mm-acc-links">
                {LIENS_SUITE.map((l) => (
                  <NavLink key={l.to} to={l.to} onClick={close}>
                    <i className={`mdi ${l.icon}`} />
                    {t(l.key)}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>

          {/* Accordéon « Compte » ou boutons invité */}
          {user ? (
            <div className={`mm-acc ${sectionMobile === 'account' ? 'open' : ''}`}>
              <button type="button" className="mm-acc-head"
                      aria-expanded={sectionMobile === 'account'}
                      onClick={() => basculerSection('account')}>
                <span className="mm-acc-title"><i className="mdi mdi-account-circle-outline" />{t('nav.section.account')}</span>
                <i className="mdi mdi-chevron-down mm-acc-caret" />
              </button>
              <div className="mm-acc-body">
                <div className="mm-acc-links">{liensCompte}</div>
              </div>
            </div>
          ) : null}

          {/* Langue */}
          <div className="mm-lang">
            <span className="mm-lang-label"><i className="mdi mdi-translate" />{t('nav.lang')}</span>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </nav>
  )
}
