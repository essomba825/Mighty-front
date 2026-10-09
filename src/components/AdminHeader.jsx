import { Link } from 'react-router-dom'
import { useLang } from '../context/LangContext'

/**
 * Standardized, luxury header and breadcrumb navigation for all admin subpages.
 * Supports English-first defaults and i18n localization.
 */
export default function AdminHeader({
  title,
  subtitle,
  icon,
  badgeText,
  badgeType = 'urgent',
  children,
}) {
  const { t } = useLang()

  return (
    <div className="admin-page-topbar">
      {/* Breadcrumbs */}
      <nav className="admin-breadcrumbs" aria-label="Breadcrumb navigation">
        <Link to="/admin" className="breadcrumb-link">
          <i className="mdi mdi-view-dashboard-outline" />
          <span>{t('admin.nav.dashboard', 'Dashboard')}</span>
        </Link>
        <i className="mdi mdi-chevron-right breadcrumb-separator" />
        <span className="breadcrumb-section">{t('admin.platform.title', 'Platform Management')}</span>
        <i className="mdi mdi-chevron-right breadcrumb-separator" />
        <span className="breadcrumb-current">{title}</span>
      </nav>

      {/* Main title and actions row */}
      <div className="admin-header-row">
        <div className="admin-header-main">
          <div className="admin-header-icon-wrap" aria-hidden="true">
            <i className={`mdi ${icon}`} />
          </div>
          <div>
            <div className="admin-title-badge-group">
              <h1 className="admin-header-title">{title}</h1>
              {badgeText && (
                <span className={`admin-header-badge ${badgeType}`}>
                  {badgeText}
                </span>
              )}
            </div>
            {subtitle && <p className="admin-header-subtitle">{subtitle}</p>}
          </div>
        </div>

        {children && <div className="admin-header-actions">{children}</div>}
      </div>
    </div>
  )
}
