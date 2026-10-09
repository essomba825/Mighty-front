import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

/* ── STRUCTURED NAVIGATION GROUPS ── */
const NAV_GROUPS = [
  {
    groupTitleKey: 'admin.nav.group.overview',
    defaultGroupTitle: 'Control & Overview',
    links: [
      {
        to: '/admin',
        icon: 'mdi-view-dashboard-outline',
        key: 'dashboard',
        label: 'Dashboard',
        end: true,
      },
    ],
  },
  {
    groupTitleKey: 'admin.nav.group.community',
    defaultGroupTitle: 'Community & Content',
    links: [
      {
        to: '/admin/membres',
        icon: 'mdi-account-group-outline',
        key: 'users',
        label: 'Members & Roles',
        badgeKey: 'membersPending',
      },
      {
        to: '/admin/actualites',
        icon: 'mdi-newspaper-variant-outline',
        key: 'news',
        label: 'News & Publications',
      },
      {
        to: '/admin/evenements',
        icon: 'mdi-calendar-month-outline',
        key: 'events',
        label: 'Events & Schedule',
      },
      {
        to: '/admin/projets',
        icon: 'mdi-briefcase-outline',
        key: 'projects',
        label: 'Community Projects',
      },
    ],
  },
  {
    groupTitleKey: 'admin.nav.group.finance_edu',
    defaultGroupTitle: 'Finances & Education',
    links: [
      {
        to: '/admin/contributions',
        icon: 'mdi-cash-multiple',
        key: 'contributions',
        label: 'Finances & Donations',
        badgeKey: 'contributionsPending',
      },
      {
        to: '/admin/partenariats',
        icon: 'mdi-handshake-outline',
        key: 'partnerships',
        label: 'Partnerships & Sponsors',
        badgeKey: 'partnershipsPending',
      },
      {
        to: '/education/valider',
        icon: 'mdi-school-outline',
        key: 'education',
        label: 'Pedagogic Validation',
        badgeKey: 'coursesPending',
      },
    ],
  },
]

export default function AdminLayout() {
  const { user, loading } = useAuth()
  const { t } = useLang()
  const location = useLocation()
  const [stats, setStats] = useState(null)

  /* Fetch live alert counters for badges */
  useEffect(() => {
    api.get('/stats/')
      .then(({ data }) => setStats(data))
      .catch(() => {})
  }, [location.pathname])

  if (loading) return null

  /* Access control: reserved for staff & admin users */
  if (!user || (!user.is_staff && user.role !== 'admin')) {
    return <Navigate to="/" replace />
  }

  /* Resolve pending alert badges */
  const getBadgeCount = (badgeKey) => {
    if (!stats || !badgeKey) return 0
    switch (badgeKey) {
      case 'membersPending':
        return stats?.members?.pending_validation || 0
      case 'contributionsPending':
        return stats?.contributions?.pending_count || 0
      case 'partnershipsPending':
        return stats?.partnerships?.new || 0
      case 'coursesPending':
        return stats?.education?.courses_pending || 0
      default:
        return 0
    }
  }

  const userInitial = (user.first_name?.[0] || user.username?.[0] || 'A').toUpperCase()
  const userDisplayName = user.first_name || user.username
  const userRoleText = user.role === 'admin' ? t('admin.role.admin', 'Administrator') : t('admin.role.staff', 'Staff')

  return (
    <div className="admin-layout-container">
      {/* ── SIDEBAR NAVIGATION ── */}
      <aside className="admin-nav-sidebar" aria-label="Admin Navigation">
        {/* Sidebar Header */}
        <div className="admin-sidebar-head">
          <div className="admin-badge-icon" aria-hidden="true">
            <i className="mdi mdi-shield-crown-outline" />
          </div>
          <div className="admin-head-text">
            <span className="admin-head-title">{t('admin.title', 'Administration')}</span>
            <span className="admin-head-subtitle">Mighty Pulse Back-Office</span>
          </div>
        </div>

        {/* Thematic Navigation Groups */}
        <nav className="admin-sidebar-menu">
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="admin-menu-group">
              <div className="admin-menu-group-title">
                {t(group.groupTitleKey, group.defaultGroupTitle)}
              </div>

              <div className="admin-menu-links-list">
                {group.links.map(({ to, icon, key, label, end, badgeKey }) => {
                  const badgeCount = getBadgeCount(badgeKey)

                  return (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        `admin-menu-link${isActive ? ' active' : ''}`
                      }
                    >
                      <div className="menu-link-main">
                        <i className={`mdi ${icon} menu-link-icon`} aria-hidden="true" />
                        <span className="menu-link-label">{t(`admin.nav.${key}`, label)}</span>
                      </div>

                      {badgeCount > 0 && (
                        <span className="menu-link-badge" title={`${badgeCount} action(s) required`}>
                          {badgeCount}
                        </span>
                      )}

                      <i className="mdi mdi-chevron-right menu-link-arrow" aria-hidden="true" />
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer with Profile & Back Link */}
        <div className="admin-sidebar-bottom">
          <div className="admin-user-mini-card">
            <div className="user-mini-avatar">
              {userInitial}
            </div>
            <div className="user-mini-details">
              <span className="user-mini-name">{userDisplayName}</span>
              <span className="user-mini-role">
                <i className="mdi mdi-check-circle" /> {userRoleText}
              </span>
            </div>
          </div>

          <NavLink to="/" className="admin-link-back">
            <i className="mdi mdi-arrow-left" />
            <span>{t('admin.backSite', 'Back to public site')}</span>
          </NavLink>
        </div>
      </aside>

      {/* ── MAIN CONTENT VIEWPORT ── */}
      <main className="admin-main-viewport">
        <Outlet />
      </main>
    </div>
  )
}
