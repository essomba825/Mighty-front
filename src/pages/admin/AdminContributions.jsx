import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../api/client'
import AdminHeader from '../../components/AdminHeader'
import { useLang } from '../../context/LangContext'

const STATUS_COLOR = {
  pending: 'requests-chip-pending',
  confirmed: 'requests-chip-validated',
  rejected: 'requests-chip-cancelled',
}

export default function AdminContributions() {
  const { t } = useLang()
  const [searchParams] = useSearchParams()

  const [items, setItems] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [isChanging, setIsChanging] = useState(false)
  const [toast, setToast] = useState(null)

  // Filter Card States (Inspired by Requests.vue)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedRequestFilter, setSelectedRequestFilter] = useState(searchParams.get('status') || 'All')
  const [selectedStartDate, setSelectedStartDate] = useState('')
  const [selectedEndDate, setSelectedEndDate] = useState('')
  const [search, setSearch] = useState('')

  // Interactive Decision Modal State (Inspired by Requests.vue)
  const [setDialog, setSetDialog] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [validatedState, setValidatedState] = useState(false)
  const [cancelledState, setCancelledState] = useState(false)
  const [pendingState, setPendingState] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [contribRes, projectsRes] = await Promise.all([
        api.get('/donations/contributions/'),
        api.get('/projects/').catch(() => ({ data: [] })),
      ])

      const list = contribRes.data.results ?? contribRes.data ?? []
      const projList = projectsRes.data.results ?? projectsRes.data ?? []

      setItems(list)
      setProjects(projList)
    } catch {
      showToast(t('requests.loadError', 'Could not load contributions ledger.'), 'error')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line

  // Dialog Switch handler (Exact UX from Requests.vue)
  const changeSwitch = (item) => {
    setSelectedTransaction(item)
    setValidatedState(item.status === 'confirmed')
    setCancelledState(item.status === 'rejected')
    setPendingState(item.status === 'pending' || !item.status)
    setSetDialog(true)
  }

  const changeValidateState = () => {
    setValidatedState(true)
    setCancelledState(false)
    setPendingState(false)
  }

  const changeCancelledState = () => {
    setCancelledState(true)
    setValidatedState(false)
    setPendingState(false)
  }

  const changePendingState = () => {
    setPendingState(true)
    setValidatedState(false)
    setCancelledState(false)
  }

  const changeTransactionState = async () => {
    if (!validatedState && !cancelledState && !pendingState) {
      showToast(t('requests.selectStateError', 'Error: Please select a state'), 'error')
      return
    }

    if (!selectedTransaction) return

    setIsChanging(true)
    const id = selectedTransaction.id
    const donorName = selectedTransaction.donor_name || 'Donor'

    try {
      if (validatedState) {
        const { data } = await api.post(`/donations/contributions/${id}/confirm/`)
        setItems((prev) => prev.map((c) => (c.id === id ? { ...c, status: data.status || 'confirmed' } : c)))
        showToast(`Contribution from ${donorName} confirmed successfully!`)
      } else if (cancelledState) {
        const { data } = await api.post(`/donations/contributions/${id}/reject/`)
        setItems((prev) => prev.map((c) => (c.id === id ? { ...c, status: data.status || 'rejected' } : c)))
        showToast(`Contribution from ${donorName} rejected.`, 'info')
      } else {
        showToast(t('requests.statusUpdated', 'Status updated successfully.'))
      }

      setSetDialog(false)
    } catch {
      showToast(t('requests.updateError', 'Failed to update transaction status.'), 'error')
    } finally {
      setIsChanging(false)
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    if (items.length === 0) {
      showToast('No records to export.', 'info')
      return
    }

    const headers = ['ID', 'Donor Name', 'Donor Email', 'Phone', 'Project', 'Amount (FCFA)', 'Method', 'Status', 'Date']
    const rows = filteredItems.map((c) => [
      c.id,
      `"${(c.donor_name || 'Anonymous').replace(/"/g, '""')}"`,
      c.donor_email || '',
      c.donor_phone || '',
      `"${(c.project_title || 'General Fund').replace(/"/g, '""')}"`,
      c.amount,
      c.method || 'Mobile Money',
      c.status,
      c.created_at || '',
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `contributions_export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Financial ledger exported to CSV.')
  }

  // Filtering Logic
  const filteredItems = useMemo(() => {
    return items.filter((c) => {
      // Category (Project) filter
      if (selectedCategory) {
        if (selectedCategory === 'general' && c.project_title) return false
        if (selectedCategory !== 'general' && c.project !== Number(selectedCategory) && c.project_title !== selectedCategory) return false
      }

      // Status filter
      if (selectedRequestFilter === 'Pending' && c.status !== 'pending' && c.status) return false
      if (selectedRequestFilter === 'Validated' && c.status !== 'confirmed') return false
      if (selectedRequestFilter === 'Cancelled' && c.status !== 'rejected') return false

      // Date range filter
      if (selectedStartDate) {
        const itemDate = new Date(c.created_at)
        const start = new Date(selectedStartDate)
        if (itemDate < start) return false
      }
      if (selectedEndDate) {
        const itemDate = new Date(c.created_at)
        const end = new Date(selectedEndDate)
        end.setHours(23, 59, 59, 999)
        if (itemDate > end) return false
      }

      // Search filter
      if (search) {
        const q = search.toLowerCase()
        const matchDonor = c.donor_name?.toLowerCase().includes(q) || c.donor_email?.toLowerCase().includes(q)
        const matchProject = c.project_title?.toLowerCase().includes(q)
        const matchCode = c.transaction_code?.toLowerCase().includes(q)
        if (!matchDonor && !matchProject && !matchCode) return false
      }

      return true
    })
  }, [items, selectedCategory, selectedRequestFilter, selectedStartDate, selectedEndDate, search])

  const pendingCount = useMemo(() => items.filter((c) => c.status === 'pending').length, [items])
  const totalConfirmed = useMemo(() => {
    return items
      .filter((c) => c.status === 'confirmed')
      .reduce((sum, c) => sum + Number(c.amount || 0), 0)
  }, [items])

  const fmt = (n) => Number(n ?? 0).toLocaleString('fr-FR')

  const getMethodIcon = (method) => {
    const m = (method || '').toLowerCase()
    if (m.includes('momo') || m.includes('mtn')) return 'mdi-cellphone-wireless'
    if (m.includes('orange')) return 'mdi-cellphone-cog'
    if (m.includes('card') || m.includes('carte')) return 'mdi-credit-card-outline'
    return 'mdi-bank-transfer'
  }

  return (
    <div className="requests-view-container">
      {/* ── BREADCRUMB & HEADER ── */}
      <AdminHeader
        title={t('admin.nav.contributions', 'Finances & Donations')}
        subtitle="Review incoming donations, validate payments, and reconcile the solidarity fund efficiently."
        icon="mdi-cash-check"
        badgeText={pendingCount > 0 ? `${pendingCount} ${t('admin.role.pending', 'Pending')}` : null}
        badgeType="urgent"
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`admin-toast-banner ${toast.type}`}>
          <i className={`mdi ${toast.type === 'error' ? 'mdi-alert-circle' : 'mdi-check-circle'}`} />
          <span>{toast.msg}</span>
          <button type="button" onClick={() => setToast(null)} className="toast-close">
            <i className="mdi mdi-close" />
          </button>
        </div>
      )}

      {/* ── TOP ACTION BAR (Requests.vue pattern) ── */}
      <div className="requests-top-actions-row">
        <Link to="/projets" className="btn-requests-action btn-requests-secondary">
          <i className="mdi mdi-eye" />
          <span>{t('requests.viewTransactions', 'View Campaigns')}</span>
        </Link>

        <button type="button" className="btn-requests-action btn-requests-primary" onClick={exportToCSV}>
          <i className="mdi mdi-download" />
          <span>{t('requests.exportReport', 'Export Report (CSV)')}</span>
        </button>
      </div>

      {/* ── TOP FILTER CARD (Requests.vue pattern) ── */}
      <div className="requests-filter-card">
        <div className="requests-filter-grid">
          {/* Select Category (Project / Campaign) */}
          <div className="requests-filter-col">
            <label className="requests-field-label">
              <i className="mdi mdi-folder-outline" /> {t('requests.selectCategory', 'Campaign')}
            </label>
            <select
              className="requests-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">{t('admin.role.allCampaigns', 'All campaigns')}</option>
              <option value="general">General association fund</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Request By (Status) */}
          <div className="requests-filter-col">
            <label className="requests-field-label">
              <i className="mdi mdi-filter-variant" /> {t('requests.filterRequestBy', 'Status filter')}
            </label>
            <select
              className="requests-select"
              value={selectedRequestFilter}
              onChange={(e) => setSelectedRequestFilter(e.target.value)}
            >
              <option value="All">{t('admin.role.all', 'All')}</option>
              <option value="Pending">{t('requests.pending', 'Pending')}</option>
              <option value="Validated">{t('requests.validated', 'Validated')}</option>
              <option value="Cancelled">{t('requests.cancelled', 'Cancelled')}</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="requests-filter-col">
            <label className="requests-field-label">
              <i className="mdi mdi-calendar-start" /> {t('requests.startDate', 'Start Date')}
            </label>
            <input
              type="date"
              className="requests-date-input"
              value={selectedStartDate}
              onChange={(e) => setSelectedStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div className="requests-filter-col">
            <label className="requests-field-label">
              <i className="mdi mdi-calendar-end" /> {t('requests.endDate', 'End Date')}
            </label>
            <input
              type="date"
              className="requests-date-input"
              value={selectedEndDate}
              onChange={(e) => setSelectedEndDate(e.target.value)}
            />
          </div>

          {/* Search Action Button */}
          <div className="requests-filter-col">
            <button
              type="button"
              className="requests-search-btn"
              onClick={loadData}
              disabled={loading}
              title={t('requests.searchBtn', 'Search')}
            >
              {loading ? (
                <i className="mdi mdi-loading mdi-spin" />
              ) : (
                <>
                  <i className="mdi mdi-magnify" />
                  <span>{t('requests.searchBtn', 'Search')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI HIGHLIGHT ROW ── */}
      <div className="admin-finance-summary-grid">
        <div className="finance-kpi-card">
          <div className="finance-kpi-icon-wrap gold">
            <i className="mdi mdi-cash-check" />
          </div>
          <div className="finance-kpi-content">
            <span className="finance-kpi-label">Total Verified & Collected</span>
            <strong className="finance-kpi-value gold">{fmt(totalConfirmed)} FCFA</strong>
          </div>
        </div>

        <div className="finance-kpi-card">
          <div className="finance-kpi-icon-wrap warning">
            <i className="mdi mdi-cash-clock" />
          </div>
          <div className="finance-kpi-content">
            <span className="finance-kpi-label">Pending Verifications</span>
            <strong className="finance-kpi-value">{pendingCount} request(s)</strong>
          </div>
        </div>

        <div className="finance-kpi-card">
          <div className="finance-kpi-icon-wrap info">
            <i className="mdi mdi-hand-heart-outline" />
          </div>
          <div className="finance-kpi-content">
            <span className="finance-kpi-label">Total Recorded Transactions</span>
            <strong className="finance-kpi-value">{items.length} contribution(s)</strong>
          </div>
        </div>
      </div>

      {/* ── MAIN DATA CARD & TABLE (Requests.vue pattern) ── */}
      <div className="requests-data-card">
        {/* Title Bar with Count and Search */}
        <div className="requests-card-title-bar">
          <h2 className="requests-count-heading">
            <span className="requests-count-badge">({filteredItems.length})</span>
            <span>{t('requests.requestedDeposits', 'Requested Contributions & Deposits')}</span>
          </h2>

          <div className="requests-instant-search-box">
            <i className="mdi mdi-magnify search-icon" />
            <input
              type="search"
              className="requests-instant-search-input"
              placeholder={t('requests.instantSearch', 'Search by donor, email, project or keyword...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="clear-btn" onClick={() => setSearch('')}>
                <i className="mdi mdi-close" />
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="admin-loading-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <i className="mdi mdi-loading mdi-spin loading-icon" style={{ fontSize: '2rem', color: 'var(--gold)' }} />
            <p style={{ marginTop: '0.85rem', color: 'var(--text-soft)' }}>
              {t('app.loading', 'Loading financial transactions...')}
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="admin-empty-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <div className="empty-icon-wrap" style={{ fontSize: '2.5rem', color: 'var(--gold)', marginBottom: '0.85rem' }}>
              <i className="mdi mdi-cash-off" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--navy)' }}>
              {t('admin.contributions.empty', 'No contributions match this filter.')}
            </h3>
            <p style={{ color: 'var(--text-soft)' }}>
              No deposits or contributions found matching active search criteria.
            </p>
          </div>
        ) : (
          <div className="vp-list vp-list--contributions">
            {filteredItems.map((c) => {
              const statusKey = c.status || 'pending'
              const statusChipClass = STATUS_COLOR[statusKey] || 'requests-chip-pending'
              const statusLabel =
                statusKey === 'confirmed'
                  ? t('requests.validated', 'Validated')
                  : statusKey === 'rejected'
                  ? t('requests.cancelled', 'Cancelled')
                  : t('requests.pending', 'Pending')

              const donorName = c.donor_name || 'Anonymous'
              const initial = (donorName[0] || 'D').toUpperCase()

              return (
                <article key={c.id} className={`vp-row${statusKey === 'pending' ? ' is-pending' : ''}`}>
                  {/* Donateur */}
                  <div className="vp-cell vp-identity">
                    <span className="vp-avatar">{initial}</span>
                    <span className="vp-ident-text">
                      <strong className="vp-title" title={donorName}>{donorName}</strong>
                      <span className="vp-sub">
                        {c.donor_email && <span>{c.donor_email}</span>}
                        {c.donor_phone && <span>• {c.donor_phone}</span>}
                      </span>
                    </span>
                  </div>

                  {/* Campagne + moyen de paiement */}
                  <div className="vp-cell vp-stack">
                    {c.project_title ? (
                      <span className="project-tag-pill">
                        <i className="mdi mdi-briefcase-outline" /> {c.project_title}
                      </span>
                    ) : (
                      <span className="vp-sub">General Association Fund</span>
                    )}
                    <span className="method-pill">
                      <i className={`mdi ${getMethodIcon(c.method)}`} />
                      <span>{c.method_display || c.method || 'Mobile Money'}</span>
                    </span>
                  </div>

                  {/* Montant */}
                  <div className="vp-cell vp-amount">
                    <small>Montant</small>
                    {fmt(c.amount)} FCFA
                  </div>

                  {/* Statut cliquable */}
                  <div className="vp-cell vp-chips">
                    <span
                      className={`requests-chip ${statusChipClass}`}
                      onClick={() => changeSwitch(c)}
                      title="Click to change status"
                    >
                      <i className="mdi mdi-pencil-outline requests-chip-icon" />
                      <span>{statusLabel}</span>
                    </span>
                  </div>

                  {/* Date */}
                  <div className="vp-cell vp-date">
                    {c.created_at
                      ? new Date(c.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </div>

                  {/* Action */}
                  <div className="vp-cell vp-actions">
                    <button
                      type="button"
                      className="btn-requests-action btn-requests-secondary"
                      onClick={() => changeSwitch(c)}
                    >
                      <i className="mdi mdi-tune" />
                      <span>{t('requests.changeBtn', 'Status')}</span>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* ── INTERACTIVE STATUS DECISION MODAL DIALOG (Exact Requests.vue pattern) ── */}
      {setDialog && selectedTransaction && (
        <div className="requests-modal-overlay" onClick={() => setSetDialog(false)}>
          <div className="requests-modal-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="requests-modal-header">
              <div className="requests-modal-title-box">
                <i className="mdi mdi-bank-check requests-modal-icon" />
                <h3 className="requests-modal-title">
                  {t('requests.dialogTitleTransaction', 'Set Status For Transaction')}
                </h3>
              </div>
              <button
                type="button"
                className="requests-modal-close"
                onClick={() => setSetDialog(false)}
              >
                <i className="mdi mdi-close" />
              </button>
            </div>

            {/* Body */}
            <div className="requests-modal-body">
              {/* Dynamic Description Summary (Exact sentence pattern from Requests.vue) */}
              <div className="requests-summary-box">
                Change the state of this requested deposit of amount{' '}
                <strong>'{fmt(selectedTransaction.amount)} FCFA'</strong> on the campaign{' '}
                <strong>'{selectedTransaction.project_title || "General Association Fund"}'</strong> by{' '}
                <strong>'{selectedTransaction.donor_name || "Anonymous"}'</strong>
              </div>

              {/* Mutually exclusive switches (Requests.vue pattern) */}
              <div className="requests-switches-card">
                {/* Validated Switch */}
                <div
                  className={`requests-switch-item ${validatedState ? 'is-active-validated' : ''}`}
                  onClick={changeValidateState}
                >
                  <div className="requests-switch-label-wrap">
                    <i className="mdi mdi-check-circle" style={{ color: '#10b981' }} />
                    <span>{t('requests.validated', 'Validated')}</span>
                  </div>
                  <div className="requests-toggle-pill" />
                </div>

                {/* Cancelled Switch */}
                <div
                  className={`requests-switch-item ${cancelledState ? 'is-active-cancelled' : ''}`}
                  onClick={changeCancelledState}
                >
                  <div className="requests-switch-label-wrap">
                    <i className="mdi mdi-close-circle" style={{ color: '#ef4444' }} />
                    <span>{t('requests.cancelled', 'Cancelled')}</span>
                  </div>
                  <div className="requests-toggle-pill" />
                </div>

                {/* Pending Switch */}
                <div
                  className={`requests-switch-item ${pendingState ? 'is-active-pending' : ''}`}
                  onClick={changePendingState}
                >
                  <div className="requests-switch-label-wrap">
                    <i className="mdi mdi-clock-outline" style={{ color: '#f59e0b' }} />
                    <span>{t('requests.pending', 'Pending')}</span>
                  </div>
                  <div className="requests-toggle-pill" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="requests-modal-footer">
              <button
                type="button"
                className="btn-requests-change"
                onClick={changeTransactionState}
                disabled={isChanging}
              >
                {isChanging ? (
                  <>
                    <i className="mdi mdi-loading mdi-spin" />
                    <span>{t('app.loading', 'Updating...')}</span>
                  </>
                ) : (
                  <>
                    <i className="mdi mdi-check" />
                    <span>{t('requests.changeBtn', 'Change')}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn-requests-close"
                onClick={() => setSetDialog(false)}
              >
                {t('requests.closeBtn', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
