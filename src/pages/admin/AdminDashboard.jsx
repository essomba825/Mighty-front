import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useLang } from '../../context/LangContext'

/* ── PLATFORM MANAGEMENT MODULE CONFIGURATION ── */
const ADMIN_MODULES = [
  {
    id: 'members',
    categoryKey: 'admin.nav.group.community',
    defaultCategory: 'Community',
    titleKey: 'admin.nav.users',
    defaultTitle: 'Members & Roles',
    descKey: 'admin.module.members.desc',
    defaultDesc: 'Member validation, account statuses (Active / Pending / Rejected) and administrative role assignments.',
    icon: 'mdi-account-group-outline',
    link: '/admin/membres',
    actionKey: 'admin.module.members.action',
    defaultAction: 'Manage members',
    quickLinks: [
      { labelKey: 'admin.users.status.pending', defaultLabel: 'Pending', link: '/admin/membres?status=pending', countKey: 'membersPending' },
      { labelKey: 'admin.users.status.all', defaultLabel: 'All members', link: '/admin/membres' },
    ],
  },
  {
    id: 'news',
    categoryKey: 'admin.nav.group.community',
    defaultCategory: 'Communication',
    titleKey: 'admin.nav.news',
    defaultTitle: 'News & Publications',
    descKey: 'admin.module.news.desc',
    defaultDesc: 'Authoring, drafts, publishing and removal of official articles and batch meeting minutes.',
    icon: 'mdi-newspaper-variant-outline',
    link: '/admin/actualites',
    actionKey: 'admin.module.news.action',
    defaultAction: 'Manage news',
    quickLinks: [
      { labelKey: 'admin.news.create', defaultLabel: '+ New article', link: '/admin/actualites?action=new' },
      { labelKey: 'admin.nav.news', defaultLabel: 'All articles', link: '/admin/actualites' },
    ],
  },
  {
    id: 'events',
    categoryKey: 'admin.nav.events',
    defaultCategory: 'Events & Calendar',
    titleKey: 'admin.nav.events',
    defaultTitle: 'Events & Gatherings',
    descKey: 'admin.module.events.desc',
    defaultDesc: 'Scheduling annual galas, general assemblies, batch reunions and webinars with venues and dates.',
    icon: 'mdi-calendar-month-outline',
    link: '/admin/evenements',
    actionKey: 'admin.module.events.action',
    defaultAction: 'Manage events',
    quickLinks: [
      { labelKey: 'admin.events.create', defaultLabel: '+ Schedule event', link: '/admin/evenements?action=new' },
      { labelKey: 'admin.nav.events', defaultLabel: 'View calendar', link: '/admin/evenements' },
    ],
  },
  {
    id: 'projects',
    categoryKey: 'admin.nav.projects',
    defaultCategory: 'Solidarity & Impact',
    titleKey: 'admin.nav.projects',
    defaultTitle: 'Community Projects',
    descKey: 'admin.module.projects.desc',
    defaultDesc: 'Creation of solidarity initiatives, budget tracking, milestone updates and project completion status.',
    icon: 'mdi-briefcase-outline',
    link: '/admin/projets',
    actionKey: 'admin.module.projects.action',
    defaultAction: 'Manage projects',
    quickLinks: [
      { labelKey: 'admin.projects.create', defaultLabel: '+ New project', link: '/admin/projets?action=new' },
      { labelKey: 'admin.nav.projects', defaultLabel: 'All projects', link: '/admin/projets' },
    ],
  },
  {
    id: 'contributions',
    categoryKey: 'admin.nav.group.finance_edu',
    defaultCategory: 'Treasury & Donations',
    titleKey: 'admin.nav.contributions',
    defaultTitle: 'Finances & Donations',
    descKey: 'admin.module.contributions.desc',
    defaultDesc: 'Fundraising tracking, manual verification of declared donations (MoMo, Orange, Card) and accounting validation.',
    icon: 'mdi-cash-multiple',
    link: '/admin/contributions',
    actionKey: 'admin.module.contributions.action',
    defaultAction: 'Manage finances',
    quickLinks: [
      { labelKey: 'admin.contributions.status.pending', defaultLabel: 'To confirm', link: '/admin/contributions?status=pending', countKey: 'contributionsPending' },
      { labelKey: 'admin.nav.contributions', defaultLabel: 'Donation history', link: '/admin/contributions' },
    ],
  },
  {
    id: 'partnerships',
    categoryKey: 'admin.nav.partnerships',
    defaultCategory: 'Partnerships',
    titleKey: 'admin.nav.partnerships',
    defaultTitle: 'Partnerships & Sponsors',
    descKey: 'admin.module.partnerships.desc',
    defaultDesc: 'Reviewing institutional partnership proposals, corporate sponsorship offers and signed agreements.',
    icon: 'mdi-handshake-outline',
    link: '/admin/partenariats',
    actionKey: 'admin.module.partnerships.action',
    defaultAction: 'Manage partnerships',
    quickLinks: [
      { labelKey: 'admin.partnerships.status.new', defaultLabel: 'New requests', link: '/admin/partenariats?status=new', countKey: 'partnershipsPending' },
      { labelKey: 'admin.nav.partnerships', defaultLabel: 'All requests', link: '/admin/partenariats' },
    ],
  },
  {
    id: 'education',
    categoryKey: 'admin.nav.education',
    defaultCategory: 'GCE Learning Hub',
    titleKey: 'admin.nav.education',
    defaultTitle: 'Pedagogic Validation',
    descKey: 'admin.module.education.desc',
    defaultDesc: 'Quality assurance on volunteer tutor lesson submissions, GCE O/A Levels compliance and publishing.',
    icon: 'mdi-school-outline',
    link: '/education/valider',
    actionKey: 'admin.module.education.action',
    defaultAction: 'Validate courses',
    quickLinks: [
      { labelKey: 'admin.alerts.educationAction', defaultLabel: 'Review queue', link: '/education/valider', countKey: 'coursesPending' },
      { labelKey: 'nav.education', defaultLabel: 'Education area', link: '/education' },
    ],
  },
  {
    id: 'django_admin',
    categoryKey: 'admin.nav.group.system',
    defaultCategory: 'System & Database',
    titleKey: 'admin.nav.system',
    defaultTitle: 'Django Admin (34 Models)',
    descKey: 'admin.module.django.desc',
    defaultDesc: 'Superuser database console: direct access to SQLite/PostgreSQL tables, audit logs, tokens and backups.',
    icon: 'mdi-database-cog-outline',
    link: 'http://127.0.0.1:8000/admin/',
    isExternal: true,
    actionKey: 'admin.module.django.action',
    defaultAction: 'Open Django Admin',
    quickLinks: [
      { labelKey: 'admin.module.django.action', defaultLabel: 'Django Console ↗', link: 'http://127.0.0.1:8000/admin/', isExternal: true },
    ],
  },
]

export default function AdminDashboard() {
  const { user } = useAuth()
  const { t } = useLang()

  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get('/stats/')
      .then(({ data }) => setStats(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const fmt = (n) => Number(n ?? 0).toLocaleString('fr-FR')

  const pendingCount =
    (stats?.members?.pending_validation || 0) +
    (stats?.contributions?.pending_count || 0) +
    (stats?.partnerships?.new || 0) +
    (stats?.education?.courses_pending || 0)

  const getBadgeCount = (countKey) => {
    if (!stats || !countKey) return 0
    switch (countKey) {
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

  const userName = user?.first_name || user?.username || 'Admin'

  return (
    <div className="admin-page-container">
      {/* ── HEADER BANNER (COCKPIT TOPBAR) ── */}
      <header className="admin-view-header">
        <div className="admin-view-title-wrap">
          <div className="admin-pill-tag">
            <i className="mdi mdi-shield-crown" />
            <span>{t('admin.cockpit.tag', 'Admin Central Cockpit')}</span>
          </div>
          <h1 className="admin-view-title">{t('admin.cockpit.title', 'Dashboard')}</h1>
          <p className="admin-view-desc">
            {t('admin.cockpit.welcome', { name: userName })}
          </p>
        </div>

        <div className="admin-header-quick-stats">
          {pendingCount > 0 ? (
            <div className="admin-badge-urgent">
              <i className="mdi mdi-bell-ring-outline" />
              <span>{t('admin.cockpit.actionsRequired', { n: pendingCount })}</span>
            </div>
          ) : (
            <div className="admin-badge-success-pill">
              <i className="mdi mdi-check-circle" />
              <span>{t('admin.cockpit.allUpToDate', 'All streams are up to date')}</span>
            </div>
          )}
        </div>
      </header>

      {error && (
        <div className="admin-banner-alert error">
          <i className="mdi mdi-alert-circle" />
          <span>{t('admin.cockpit.dbError', 'Unable to load real-time database metrics from the server.')}</span>
        </div>
      )}

      {/* ── PRIORITY ALERTS (FIRST CARDS DISPLAYED IF PENDING) ── */}
      {pendingCount > 0 && stats && (
        <section className="admin-card-section" aria-label="Priority Actions">
          <div className="admin-section-header">
            <div className="section-title-wrap">
              <h2 className="admin-section-heading">
                <i className="mdi mdi-alert-decagram-outline" /> {t('admin.alerts.title', 'Priority actions')}
              </h2>
              <span className="section-subtitle">
                {t('admin.alerts.sub', 'Pending items requiring an immediate administrative decision')}
              </span>
            </div>
          </div>

          <div className="admin-alerts-stack">
            {stats?.members?.pending_validation > 0 && (
              <Link to="/admin/membres?status=pending" className="admin-priority-alert">
                <div className="alert-left">
                  <div className="alert-icon-box warning">
                    <i className="mdi mdi-account-clock" />
                  </div>
                  <div className="alert-text">
                    <strong className="alert-title-text">
                      {t('admin.alerts.members', { n: stats.members.pending_validation })}
                    </strong>
                    <span className="alert-desc-text">
                      {t('admin.alerts.membersSub', 'New members are waiting for profile approval to access private areas.')}
                    </span>
                  </div>
                </div>
                <span className="alert-action-btn">
                  {t('admin.alerts.membersAction', 'Validate')} <i className="mdi mdi-arrow-right" />
                </span>
              </Link>
            )}

            {stats?.contributions?.pending_count > 0 && (
              <Link to="/admin/contributions?status=pending" className="admin-priority-alert">
                <div className="alert-left">
                  <div className="alert-icon-box info">
                    <i className="mdi mdi-cash-clock" />
                  </div>
                  <div className="alert-text">
                    <strong className="alert-title-text">
                      {t('admin.alerts.contributions', { n: stats.contributions.pending_count })}
                    </strong>
                    <span className="alert-desc-text">
                      {t('admin.alerts.contributionsSub', 'Financial contributions requiring bank or mobile money verification.')}
                    </span>
                  </div>
                </div>
                <span className="alert-action-btn">
                  {t('admin.alerts.contributionsAction', 'Verify')} <i className="mdi mdi-arrow-right" />
                </span>
              </Link>
            )}

            {stats?.partnerships?.new > 0 && (
              <Link to="/admin/partenariats?status=new" className="admin-priority-alert">
                <div className="alert-left">
                  <div className="alert-icon-box success">
                    <i className="mdi mdi-handshake" />
                  </div>
                  <div className="alert-text">
                    <strong className="alert-title-text">
                      {t('admin.alerts.partnerships', { n: stats.partnerships.new })}
                    </strong>
                    <span className="alert-desc-text">
                      {t('admin.alerts.partnershipsSub', 'Review and respond to corporate proposals and sponsor offers.')}
                    </span>
                  </div>
                </div>
                <span className="alert-action-btn">
                  {t('admin.alerts.partnershipsAction', 'Examine')} <i className="mdi mdi-arrow-right" />
                </span>
              </Link>
            )}

            {stats?.education?.courses_pending > 0 && (
              <Link to="/education/valider" className="admin-priority-alert">
                <div className="alert-left">
                  <div className="alert-icon-box info">
                    <i className="mdi mdi-school" />
                  </div>
                  <div className="alert-text">
                    <strong className="alert-title-text">
                      {t('admin.alerts.education', { n: stats.education.courses_pending })}
                    </strong>
                    <span className="alert-desc-text">
                      {t('admin.alerts.educationSub', 'Learning materials submitted by tutors awaiting quality assurance.')}
                    </span>
                  </div>
                </div>
                <span className="alert-action-btn">
                  {t('admin.alerts.educationAction', 'Review')} <i className="mdi mdi-arrow-right" />
                </span>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ── KEY PERFORMANCE INDICATORS (FIRST STAT CARDS) ── */}
      <section className="admin-card-section" aria-label="Key Performance Indicators">
        <div className="admin-section-header">
          <div className="section-title-wrap">
            <h2 className="admin-section-heading">
              <i className="mdi mdi-chart-line" /> {t('admin.kpi.title', 'Key performance indicators')}
            </h2>
            <span className="section-subtitle">
              {t('admin.kpi.sub', 'Real-time consolidated figures of the association platform')}
            </span>
          </div>
        </div>

        <div className="admin-kpi-grid">
          {/* Members KPI */}
          <div className="admin-kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">{t('admin.kpi.members', 'Registered Members')}</span>
              <div className="kpi-icon-wrap" aria-hidden="true">
                <i className="mdi mdi-account-group" />
              </div>
            </div>
            <div className="kpi-value">{loading ? '...' : fmt(stats?.members?.total)}</div>
            <div className="kpi-meta">
              <span className="kpi-sub-text">
                {stats?.members?.pending_validation ? (
                  <strong className="kpi-highlight-warning">
                    <i className="mdi mdi-clock-outline" /> {t('admin.kpi.membersPending', { n: stats.members.pending_validation })}
                  </strong>
                ) : (
                  <span className="kpi-highlight-clean">
                    <i className="mdi mdi-check-circle" /> {t('admin.kpi.membersAllActive', 'All profiles active & approved')}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Contributions KPI */}
          <div className="admin-kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">{t('admin.kpi.funds', 'Funds Collected')}</span>
              <div className="kpi-icon-wrap gold" aria-hidden="true">
                <i className="mdi mdi-cash-multiple" />
              </div>
            </div>
            <div className="kpi-value gold">
              {loading ? '...' : `${fmt(stats?.contributions?.total_amount)} FCFA`}
            </div>
            <div className="kpi-meta">
              <span className="kpi-sub-text">
                {stats?.contributions?.pending_count ? (
                  <strong className="kpi-highlight-info">
                    <i className="mdi mdi-clock-outline" /> {t('admin.kpi.fundsPending', { n: stats.contributions.pending_count })}
                  </strong>
                ) : (
                  <span className="kpi-highlight-clean">
                    <i className="mdi mdi-check-circle" /> {t('admin.kpi.fundsClean', 'Accounting is up to date')}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Projects KPI */}
          <div className="admin-kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">{t('admin.kpi.projects', 'Community Projects')}</span>
              <div className="kpi-icon-wrap" aria-hidden="true">
                <i className="mdi mdi-briefcase-check" />
              </div>
            </div>
            <div className="kpi-value">{loading ? '...' : fmt(stats?.projects?.active)}</div>
            <div className="kpi-meta">
              <span className="kpi-sub-text">
                {t('admin.kpi.projectsSub', 'Active solidarity initiatives in progress')}
              </span>
            </div>
          </div>

          {/* Education KPI */}
          <div className="admin-kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">{t('admin.kpi.lessons', 'Education Catalog')}</span>
              <div className="kpi-icon-wrap" aria-hidden="true">
                <i className="mdi mdi-school" />
              </div>
            </div>
            <div className="kpi-value">{loading ? '...' : fmt(stats?.education?.courses_published)}</div>
            <div className="kpi-meta">
              <span className="kpi-sub-text">
                {t('admin.kpi.lessonsSub', 'Published lessons & quizzes (GCE O/A Levels)')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLATFORM MANAGEMENT (HUB MODULAIRE & LIENS) ── */}
      <section className="admin-card-section" id="gestion-plateforme" aria-label="Platform Management">
        <div className="admin-section-header">
          <div className="section-title-wrap">
            <div className="admin-pill-tag small">
              <i className="mdi mdi-view-grid-plus-outline" />
              <span>{t('admin.modules.tag', 'Modular Cockpit')}</span>
            </div>
            <h2 className="admin-section-heading prominent">
              {t('admin.modules.title', 'Platform Management')}
            </h2>
            <p className="section-subtitle">
              {t('admin.modules.sub', 'Direct access to create, edit, moderate and administrate every domain of Mighty Pulse.')}
            </p>
          </div>
        </div>

        <div className="admin-modules-grid">
          {ADMIN_MODULES.map((mod) => (
            <div key={mod.id} className="admin-module-card">
              <div className="module-card-top">
                <span className="module-card-badge">
                  {t(mod.categoryKey, mod.defaultCategory)}
                </span>
                <div className="module-card-icon" aria-hidden="true">
                  <i className={`mdi ${mod.icon}`} />
                </div>
              </div>

              <div className="module-card-content">
                <h3 className="module-card-title">
                  {t(mod.titleKey, mod.defaultTitle)}
                </h3>
                <p className="module-card-desc">
                  {t(mod.descKey, mod.defaultDesc)}
                </p>
              </div>

              {mod.quickLinks && mod.quickLinks.length > 0 && (
                <div className="module-quick-links">
                  {mod.quickLinks.map((ql, idx) => {
                    const count = ql.countKey ? getBadgeCount(ql.countKey) : 0
                    const labelText = t(ql.labelKey, ql.defaultLabel)

                    if (ql.isExternal) {
                      return (
                        <a
                          key={idx}
                          href={ql.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="module-quick-link"
                        >
                          <span>{labelText}</span>
                        </a>
                      )
                    }
                    return (
                      <Link key={idx} to={ql.link} className="module-quick-link">
                        <span>{labelText}</span>
                        {count > 0 && <span className="quick-link-count">{count}</span>}
                      </Link>
                    )
                  })}
                </div>
              )}

              <div className="module-card-footer">
                {mod.isExternal ? (
                  <a
                    href={mod.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="module-card-btn"
                  >
                    <span>{t(mod.actionKey, mod.defaultAction)}</span>
                    <i className="mdi mdi-open-in-new" />
                  </a>
                ) : (
                  <Link to={mod.link} className="module-card-btn">
                    <span>{t(mod.actionKey, mod.defaultAction)}</span>
                    <i className="mdi mdi-arrow-right" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
