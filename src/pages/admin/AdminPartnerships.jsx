import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../api/client'
import AdminHeader from '../../components/AdminHeader'
import { useLang } from '../../context/LangContext'

const STATUS_COLOR = {
  new: 'requests-chip-pending',
  contacted: 'requests-chip-contacted',
  accepted: 'requests-chip-accepted',
  refused: 'requests-chip-refused',
}

const PARTNER_TYPES = [
  { value: '', label: 'All Typologies' },
  { value: 'corporate', label: 'Corporate / Enterprise' },
  { value: 'ngo', label: 'NGO / Foundation' },
  { value: 'institution', label: 'Institutional / School' },
  { value: 'individual', label: 'Individual Sponsor / Alumnus' },
]

export default function AdminPartnerships() {
  const { t } = useLang()
  const [searchParams] = useSearchParams()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [isChanging, setIsChanging] = useState(false)
  const [toast, setToast] = useState(null)

  // Filters (Requests.vue pattern)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedRequestFilter, setSelectedRequestFilter] = useState(searchParams.get('status') || 'All')
  const [selectedStartDate, setSelectedStartDate] = useState('')
  const [selectedEndDate, setSelectedEndDate] = useState('')
  const [search, setSearch] = useState('')

  // Dialog State (Requests.vue pattern)
  const [setDialog, setSetDialog] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState(null)
  const [acceptedState, setAcceptedState] = useState(false)
  const [contactedState, setContactedState] = useState(false)
  const [refusedState, setRefusedState] = useState(false)
  const [pendingState, setPendingState] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/donations/partnerships/')
      setItems(data.results ?? data ?? [])
    } catch {
      showToast(t('requests.loadError', 'Could not load partnership inquiries.'), 'error')
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
    setSelectedPartner(item)
    setAcceptedState(item.status === 'accepted')
    setContactedState(item.status === 'contacted')
    setRefusedState(item.status === 'refused')
    setPendingState(item.status === 'new' || !item.status)
    setSetDialog(true)
  }

  const changeAcceptedState = () => {
    setAcceptedState(true)
    setContactedState(false)
    setRefusedState(false)
    setPendingState(false)
  }

  const changeContactedState = () => {
    setContactedState(true)
    setAcceptedState(false)
    setRefusedState(false)
    setPendingState(false)
  }

  const changeRefusedState = () => {
    setRefusedState(true)
    setAcceptedState(false)
    setContactedState(false)
    setPendingState(false)
  }

  const changePendingState = () => {
    setPendingState(true)
    setAcceptedState(false)
    setContactedState(false)
    setRefusedState(false)
  }

  const changeTransactionState = async () => {
    if (!acceptedState && !contactedState && !refusedState && !pendingState) {
      showToast(t('requests.selectStateError', 'Error: Please select a state'), 'error')
      return
    }

    if (!selectedPartner) return

    setIsChanging(true)
    const id = selectedPartner.id
    const targetStatus = acceptedState ? 'accepted' : contactedState ? 'contacted' : refusedState ? 'refused' : 'new'

    try {
      const { data } = await api.patch(`/donations/partnerships/${id}/`, { status: targetStatus })
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)))
      showToast(`Partnership inquiry from ${selectedPartner.contact_name} updated to ${targetStatus}!`)
      setSetDialog(false)
    } catch {
      showToast(t('requests.updateError', 'Failed to update partnership status.'), 'error')
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

    const headers = ['ID', 'Contact Name', 'Organization', 'Email', 'Phone', 'Type', 'Target Project', 'Status', 'Date']
    const rows = filteredItems.map((p) => [
      p.id,
      `"${(p.contact_name || '').replace(/"/g, '""')}"`,
      `"${(p.organization || '').replace(/"/g, '""')}"`,
      p.email || '',
      p.phone || '',
      p.partner_type || '',
      `"${(p.project_title || 'General').replace(/"/g, '""')}"`,
      p.status,
      p.created_at || '',
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `partnerships_export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Partnership inquiries exported to CSV.')
  }

  // Filtering
  const filteredItems = useMemo(() => {
    return items.filter((p) => {
      // Category (Type) filter
      if (selectedCategory && p.partner_type !== selectedCategory) {
        return false
      }

      // Status filter
      if (selectedRequestFilter === 'Pending' && p.status !== 'new' && p.status) return false
      if (selectedRequestFilter === 'Validated' && p.status !== 'accepted') return false
      if (selectedRequestFilter === 'Cancelled' && p.status !== 'refused') return false
      if (selectedRequestFilter === 'Contacted' && p.status !== 'contacted') return false

      // Date range filter
      if (selectedStartDate) {
        const itemDate = new Date(p.created_at)
        const start = new Date(selectedStartDate)
        if (itemDate < start) return false
      }
      if (selectedEndDate) {
        const itemDate = new Date(p.created_at)
        const end = new Date(selectedEndDate)
        end.setHours(23, 59, 59, 999)
        if (itemDate > end) return false
      }

      // Search filter
      if (search) {
        const q = search.toLowerCase()
        const matchName = p.contact_name?.toLowerCase().includes(q)
        const matchOrg = p.organization?.toLowerCase().includes(q)
        const matchEmail = p.email?.toLowerCase().includes(q)
        const matchProject = p.project_title?.toLowerCase().includes(q)
        if (!matchName && !matchOrg && !matchEmail && !matchProject) return false
      }

      return true
    })
  }, [items, selectedCategory, selectedRequestFilter, selectedStartDate, selectedEndDate, search])

  const newCount = useMemo(() => items.filter((p) => p.status === 'new').length, [items])

  return (
    <div className="requests-view-container">
      {/* ── BREADCRUMB & HEADER ── */}
      <AdminHeader
        title={t('admin.nav.partnerships', 'Partnerships & Sponsorships')}
        subtitle="Review institutional sponsorship offers, corporate partnerships and strategic pacts."
        icon="mdi-handshake-outline"
        badgeText={newCount > 0 ? `${newCount} ${t('requests.pending', 'New')}` : null}
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
        <Link to="/partenaires" className="btn-requests-action btn-requests-secondary">
          <i className="mdi mdi-eye" />
          <span>{t('requests.viewPartners', 'View Partner Page')}</span>
        </Link>

        <button type="button" className="btn-requests-action btn-requests-primary" onClick={exportToCSV}>
          <i className="mdi mdi-download" />
          <span>{t('requests.exportReport', 'Export Report (CSV)')}</span>
        </button>
      </div>

      {/* ── TOP FILTER CARD (Requests.vue pattern) ── */}
      <div className="requests-filter-card">
        <div className="requests-filter-grid">
          {/* Select Category (Typology) */}
          <div className="requests-filter-col">
            <label className="requests-field-label">
              <i className="mdi mdi-domain" /> {t('requests.selectCategory', 'Select Typology')}
            </label>
            <select
              className="requests-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {PARTNER_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>
                  {pt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Request By (Status) */}
          <div className="requests-filter-col">
            <label className="requests-field-label">
              <i className="mdi mdi-filter-variant" /> {t('requests.filterRequestBy', 'Filter Request By')}
            </label>
            <select
              className="requests-select"
              value={selectedRequestFilter}
              onChange={(e) => setSelectedRequestFilter(e.target.value)}
            >
              <option value="All">{t('admin.users.role.all', 'All')}</option>
              <option value="Pending">{t('requests.pending', 'Pending / New')}</option>
              <option value="Contacted">{t('requests.contacted', 'Contacted / In Negotiation')}</option>
              <option value="Validated">{t('requests.accepted', 'Validated / Accepted')}</option>
              <option value="Cancelled">{t('requests.refused', 'Cancelled / Refused')}</option>
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

          {/* Search Trigger Button */}
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

      {/* ── MAIN DATA CARD & TABLE (Requests.vue pattern) ── */}
      <div className="requests-data-card">
        {/* Title Bar with Count and Search */}
        <div className="requests-card-title-bar">
          <h2 className="requests-count-heading">
            <span className="requests-count-badge">({filteredItems.length})</span>
            <span>{t('requests.requestedPartners', 'Partnership & Sponsorship Requests')}</span>
          </h2>

          <div className="requests-instant-search-box">
            <i className="mdi mdi-magnify search-icon" />
            <input
              type="search"
              className="requests-instant-search-input"
              placeholder={t('requests.instantSearch', 'Search by organization, contact or email...')}
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
              {t('app.loading', 'Loading partnership inquiries...')}
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="admin-empty-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <div className="empty-icon-wrap" style={{ fontSize: '2.5rem', color: 'var(--gold)', marginBottom: '0.85rem' }}>
              <i className="mdi mdi-handshake-outline" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--navy)' }}>
              {t('admin.partnerships.empty', 'No partnership requests found.')}
            </h3>
            <p style={{ color: 'var(--text-soft)' }}>
              No inquiry records match the selected filter criteria.
            </p>
          </div>
        ) : (
          <div className="vp-list vp-list--partnerships">
            {filteredItems.map((p) => {
              const statusKey = p.status || 'new'
              const statusChipClass = STATUS_COLOR[statusKey] || 'requests-chip-pending'
              const statusLabel =
                statusKey === 'accepted'
                  ? t('requests.accepted', 'Accepted')
                  : statusKey === 'contacted'
                  ? t('requests.contacted', 'Contacted')
                  : statusKey === 'refused'
                  ? t('requests.refused', 'Refused')
                  : t('requests.pending', 'Pending / New')

              const initial = (p.contact_name?.[0] || p.organization?.[0] || 'P').toUpperCase()

              return (
                <article key={p.id} className={`vp-row${statusKey === 'new' ? ' is-pending' : ''}`}>
                  {/* Contact + organisation */}
                  <div className="vp-cell vp-identity">
                    <span className="vp-avatar">{initial}</span>
                    <span className="vp-ident-text">
                      <strong className="vp-title" title={p.contact_name}>{p.contact_name}</strong>
                      <span className="vp-sub">
                        {p.organization && (
                          <span className="vp-org">
                            <i className="mdi mdi-domain" /> {p.organization}
                          </span>
                        )}
                        {p.email && <span>• {p.email}</span>}
                        {p.phone && <span>• {p.phone}</span>}
                      </span>
                    </span>
                  </div>

                  {/* Typologie + projet cible */}
                  <div className="vp-cell vp-stack">
                    <span className="tag-pill-neutral">
                      {p.partner_type_display || p.partner_type || 'Corporate'}
                    </span>
                    {p.project_title ? (
                      <span className="project-tag-pill">
                        <i className="mdi mdi-briefcase-outline" /> {p.project_title}
                      </span>
                    ) : (
                      <span className="vp-sub">Global Strategic Sponsorship</span>
                    )}
                  </div>

                  {/* Statut cliquable */}
                  <div className="vp-cell vp-chips">
                    <span
                      className={`requests-chip ${statusChipClass}`}
                      onClick={() => changeSwitch(p)}
                      title="Click to change status"
                    >
                      <i className="mdi mdi-pencil-outline requests-chip-icon" />
                      <span>{statusLabel}</span>
                    </span>
                  </div>

                  {/* Date */}
                  <div className="vp-cell vp-date">
                    {p.created_at
                      ? new Date(p.created_at).toLocaleDateString('fr-FR', {
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
                      onClick={() => changeSwitch(p)}
                    >
                      <i className="mdi mdi-file-document-outline" />
                      <span>{t('requests.changeBtn', 'Examine & Status')}</span>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* ── INTERACTIVE STATUS DECISION MODAL DIALOG (Requests.vue pattern) ── */}
      {setDialog && selectedPartner && (
        <div className="requests-modal-overlay" onClick={() => setSetDialog(false)}>
          <div className="requests-modal-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="requests-modal-header">
              <div className="requests-modal-title-box">
                <i className="mdi mdi-handshake requests-modal-icon" />
                <h3 className="requests-modal-title">
                  {t('requests.dialogTitlePartner', 'Set Status For Partnership')}
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
              {/* Dynamic Description Summary (Requests.vue pattern) */}
              <div className="requests-summary-box">
                Change the state of this partnership proposal from{' '}
                <strong>'{selectedPartner.contact_name}'</strong> (
                <strong>'{selectedPartner.organization || 'Independent Sponsor'}'</strong>) on the campaign{' '}
                <strong>'{selectedPartner.project_title || 'Global Strategic Support'}'</strong>
              </div>

              {/* Proposal Message details if available */}
              {selectedPartner.message && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    fontSize: '0.86rem',
                    color: 'var(--text)',
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--navy)' }}>
                    <i className="mdi mdi-comment-text-outline" /> Submitted Partner Statement:
                  </strong>
                  <p style={{ margin: 0, fontStyle: 'italic' }}>"{selectedPartner.message}"</p>
                </div>
              )}

              {/* Mutually exclusive switches (Requests.vue pattern) */}
              <div className="requests-switches-card">
                {/* Accepted / Validated Switch */}
                <div
                  className={`requests-switch-item ${acceptedState ? 'is-active-validated' : ''}`}
                  onClick={changeAcceptedState}
                >
                  <div className="requests-switch-label-wrap">
                    <i className="mdi mdi-check-circle" style={{ color: '#10b981' }} />
                    <span>{t('requests.accepted', 'Accepted / Partnered')}</span>
                  </div>
                  <div className="requests-toggle-pill" />
                </div>

                {/* Contacted Switch */}
                <div
                  className={`requests-switch-item ${contactedState ? 'is-active-contacted' : ''}`}
                  onClick={changeContactedState}
                >
                  <div className="requests-switch-label-wrap">
                    <i className="mdi mdi-phone-outline" style={{ color: '#3b82f6' }} />
                    <span>{t('requests.contacted', 'Contacted / In Discussion')}</span>
                  </div>
                  <div className="requests-toggle-pill" />
                </div>

                {/* Refused / Cancelled Switch */}
                <div
                  className={`requests-switch-item ${refusedState ? 'is-active-cancelled' : ''}`}
                  onClick={changeRefusedState}
                >
                  <div className="requests-switch-label-wrap">
                    <i className="mdi mdi-close-circle" style={{ color: '#ef4444' }} />
                    <span>{t('requests.refused', 'Cancelled / Refused')}</span>
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
                    <span>{t('requests.pending', 'Pending / New')}</span>
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
