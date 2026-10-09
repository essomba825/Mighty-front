import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import AdminHeader from '../components/AdminHeader'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

const STATUS_COLOR = {
  pending: 'requests-chip-pending',
  published: 'requests-chip-validated',
  draft: 'requests-chip-cancelled',
}

export default function TutorValidation() {
  const { user } = useAuth()
  const { t } = useLang()

  // Authorized if staff, superuser, admin, or teacher
  const isAuthorized = Boolean(
    user && (user.is_staff || user.is_superuser || user.role === 'admin' || user.role === 'teacher')
  )

  const [lessons, setLessons] = useState([])
  const [subjects, setSubjects] = useState([])
  const [quality, setQuality] = useState({})
  const [loading, setLoading] = useState(true)
  const [isChanging, setIsChanging] = useState(false)
  const [toast, setToast] = useState(null)

  // Filters (Requests.vue pattern)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedRequestFilter, setSelectedRequestFilter] = useState('Pending')
  const [selectedStartDate, setSelectedStartDate] = useState('')
  const [selectedEndDate, setSelectedEndDate] = useState('')
  const [search, setSearch] = useState('')

  // Dialog State (Requests.vue pattern)
  const [setDialog, setSetDialog] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [validatedState, setValidatedState] = useState(false)
  const [cancelledState, setCancelledState] = useState(false)
  const [pendingState, setPendingState] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4500)
  }

  // Load pending lessons and subjects
  const loadData = async () => {
    if (!isAuthorized) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [lessonsRes, subjectsRes] = await Promise.all([
        api.get('/education/lessons/pending/'),
        api.get('/education/subjects/').catch(() => ({ data: [] })),
      ])

      const list = lessonsRes.data.results ?? lessonsRes.data ?? []
      const subList = subjectsRes.data.results ?? subjectsRes.data ?? []

      setLessons(list)
      setSubjects(subList)

      // Preload quality checks for all pending lessons
      list.forEach((l) => loadQuality(l.id))
    } catch (err) {
      showToast(t('requests.loadError', 'Could not load lessons queue.'), 'error')
      setLessons([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [isAuthorized]) // eslint-disable-line

  const loadQuality = async (id) => {
    try {
      const { data } = await api.get(`/education/lessons/${id}/quality_check/`)
      setQuality((q) => ({ ...q, [id]: data }))
    } catch {
      /* non-blocking */
    }
  }

  // Dialog Switch handler (Matching Requests.vue)
  const changeSwitch = (lesson) => {
    setSelectedLesson(lesson)
    setValidatedState(lesson.status === 'published')
    setCancelledState(lesson.status === 'draft')
    setPendingState(lesson.status === 'pending' || !lesson.status)
    setSetDialog(true)
    loadQuality(lesson.id)
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

    if (!selectedLesson) return

    setIsChanging(true)
    const id = selectedLesson.id

    try {
      if (validatedState) {
        // Validate / Publish
        const res = await api.post(`/education/lessons/${id}/validate/`)
        setQuality((q) => ({ ...q, [id]: res.data }))
        setLessons((prev) => prev.map((l) => (l.id === id ? { ...l, status: 'published' } : l)))
        showToast(`« ${selectedLesson.title} » ${t('requests.validated', 'Validated & Published')}!`)
      } else if (cancelledState) {
        // Reject / Send Back to draft
        await api.post(`/education/lessons/${id}/reject/`)
        setLessons((prev) => prev.map((l) => (l.id === id ? { ...l, status: 'draft' } : l)))
        showToast(`« ${selectedLesson.title} » ${t('requests.cancelled', 'Sent back for revision')}.`, 'info')
      } else {
        showToast(t('requests.statusUpdated', 'Status updated successfully.'))
      }

      setSetDialog(false)
      loadData()
    } catch (err) {
      const data = err?.response?.data
      if (data?.errors) {
        setQuality((q) => ({ ...q, [id]: data }))
        showToast(data.errors.join(' | '), 'error')
      } else {
        showToast(data?.detail || t('requests.updateError', 'Failed to update lesson state.'), 'error')
      }
    } finally {
      setIsChanging(false)
    }
  }

  // Filter lessons based on Category, Status dropdown, Date range, and Instant Search
  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      // Category (Subject) filter
      if (selectedCategory && l.subject_slug !== selectedCategory && l.subject !== selectedCategory) {
        return false
      }

      // Status filter
      if (selectedRequestFilter === 'Pending' && l.status !== 'pending' && l.status) return false
      if (selectedRequestFilter === 'Validated' && l.status !== 'published') return false
      if (selectedRequestFilter === 'Cancelled' && l.status !== 'draft') return false

      // Date range filter
      if (selectedStartDate) {
        const itemDate = new Date(l.created_at || l.updated_at)
        const start = new Date(selectedStartDate)
        if (itemDate < start) return false
      }
      if (selectedEndDate) {
        const itemDate = new Date(l.created_at || l.updated_at)
        const end = new Date(selectedEndDate)
        end.setHours(23, 59, 59, 999)
        if (itemDate > end) return false
      }

      // Search filter
      if (search) {
        const q = search.toLowerCase()
        const matchTitle = l.title?.toLowerCase().includes(q)
        const matchAuthor = l.author_name?.toLowerCase().includes(q) || l.teacher_name?.toLowerCase().includes(q)
        const matchSubject = l.subject_slug?.toLowerCase().includes(q) || l.chapter_title?.toLowerCase().includes(q)
        if (!matchTitle && !matchAuthor && !matchSubject) return false
      }

      return true
    })
  }, [lessons, selectedCategory, selectedRequestFilter, selectedStartDate, selectedEndDate, search])

  if (!isAuthorized) {
    return (
      <div className="requests-view-container">
        <AdminHeader
          title={t('education.pedagogyValider', 'Pedagogy & Lesson Validation')}
          subtitle={t('education.pedagogySub', 'Review submitted lessons, inspect quality criteria and publish.')}
          icon="mdi-school-outline"
        />
        <div className="requests-data-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div className="empty-icon-wrap" style={{ fontSize: '3rem', color: 'var(--gold)', marginBottom: '1rem' }}>
            <i className="mdi mdi-shield-lock-outline" />
          </div>
          <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--navy)', marginBottom: '0.5rem' }}>
            {t('auth.unauthorized', 'Access Restricted')}
          </h3>
          <p style={{ color: 'var(--text-soft)', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
            {t('auth.staffOnly', 'This review workstation is reserved for administrators, staff and teachers.')}
          </p>
          <div>
            <Link to="/login" className="btn-requests-action btn-requests-primary">
              <i className="mdi mdi-login" /> {t('nav.login', 'Log in')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="requests-view-container">
      {/* ── BREADCRUMB & HEADER ── */}
      <AdminHeader
        title={t('education.pedagogyValider', 'Pedagogy & Lesson Validation')}
        subtitle={t('education.pedagogySub', 'Review submitted lessons, inspect quality criteria and publish live.')}
        icon="mdi-check-decagram-outline"
        badgeText={lessons.length > 0 ? `${lessons.length} ${t('requests.pending', 'Pending')}` : null}
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
        <Link to="/education" className="btn-requests-action btn-requests-secondary">
          <i className="mdi mdi-eye" />
          <span>{t('requests.viewCurriculum', 'View Curriculum')}</span>
        </Link>
        <Link to="/education/contribuer" className="btn-requests-action btn-requests-primary">
          <i className="mdi mdi-plus" />
          <span>{t('requests.proposeLesson', 'Propose a Lesson')}</span>
        </Link>
      </div>

      {/* ── TOP FILTER CARD (Requests.vue pattern) ── */}
      <div className="requests-filter-card">
        <div className="requests-filter-grid">
          {/* Select Category (Subject) */}
          <div className="requests-filter-col">
            <label className="requests-field-label">
              <i className="mdi mdi-book-outline" /> {t('requests.selectSubject', 'Select Subject')}
            </label>
            <select
              className="requests-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">{t('education.allSubjects', 'All Subjects')}</option>
              {subjects.map((sub) => (
                <option key={sub.id || sub.slug} value={sub.slug || sub.title}>
                  {sub.title || sub.name || sub.slug}
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
              <option value="Pending">{t('requests.pending', 'Pending Review')}</option>
              <option value="Validated">{t('requests.validated', 'Validated / Live')}</option>
              <option value="Cancelled">{t('requests.cancelled', 'Revision Required / Draft')}</option>
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
            <span className="requests-count-badge">({filteredLessons.length})</span>
            <span>{t('requests.requestedLessons', 'Requested Lessons for Review')}</span>
          </h2>

          <div className="requests-instant-search-box">
            <i className="mdi mdi-magnify search-icon" />
            <input
              type="search"
              className="requests-instant-search-input"
              placeholder={t('requests.searchLesson', 'Search by title, subject or author...')}
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
              {t('app.loading', 'Loading lesson review queue...')}
            </p>
          </div>
        ) : filteredLessons.length === 0 ? (
          <div className="admin-empty-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <div className="empty-icon-wrap" style={{ fontSize: '2.5rem', color: 'var(--gold)', marginBottom: '0.85rem' }}>
              <i className="mdi mdi-check-all" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--navy)' }}>
              {t('tv_empty', 'No lessons awaiting review matching this filter.')}
            </h3>
            <p style={{ color: 'var(--text-soft)' }}>
              {t('tv_sub', 'All submitted educational lessons have been processed.')}
            </p>
          </div>
        ) : (
          <div className="vp-list vp-list--lessons">
            {filteredLessons.map((l) => {
              const q = quality[l.id]
              const errCount = q?.errors?.length ?? 0
              const warnCount = q?.warnings?.length ?? 0
              const statusKey = l.status || 'pending'
              const statusChipClass = STATUS_COLOR[statusKey] || 'requests-chip-pending'
              const statusLabel =
                statusKey === 'published'
                  ? t('requests.validated', 'Validated')
                  : statusKey === 'draft'
                  ? t('requests.cancelled', 'Revision Needed')
                  : t('requests.pending', 'Pending')

              const authorName = l.author_name || l.teacher_name || 'Contributor'
              const initial = (l.title?.[0] || 'L').toUpperCase()

              return (
                <article key={l.id} className={`vp-row${statusKey === 'pending' ? ' is-pending' : ''}`}>
                  {/* Titre + auteur */}
                  <div className="vp-cell vp-identity">
                    <span className="vp-avatar">{initial}</span>
                    <span className="vp-ident-text">
                      <strong className="vp-title" title={l.title}>{l.title}</strong>
                      <span className="vp-sub">
                        <i className="mdi mdi-account-circle-outline" /> {authorName}
                        {l.duration_minutes ? ` • ${l.duration_minutes} min` : ''}
                      </span>
                    </span>
                  </div>

                  {/* Matière */}
                  <div className="vp-cell">
                    <span className="tag-pill-neutral">
                      <i className="mdi mdi-book-open-outline" /> {l.subject_slug || l.subject_title || 'General'}
                    </span>
                  </div>

                  {/* Qualité + statut */}
                  <div className="vp-cell vp-chips">
                    {errCount > 0 ? (
                      <span className="requests-chip requests-chip-cancelled" title={q?.errors?.join('; ')}>
                        <i className="mdi mdi-alert-circle requests-chip-icon" />
                        <span>{errCount} error(s)</span>
                      </span>
                    ) : (
                      <span className="requests-chip requests-chip-validated">
                        <i className="mdi mdi-check-circle requests-chip-icon" />
                        <span>{warnCount > 0 ? `${warnCount} warning(s)` : 'Clean quality gate'}</span>
                      </span>
                    )}
                    <span
                      className={`requests-chip ${statusChipClass}`}
                      onClick={() => changeSwitch(l)}
                      title="Click to change status"
                    >
                      <i className="mdi mdi-pencil-outline requests-chip-icon" />
                      <span>{statusLabel}</span>
                    </span>
                  </div>

                  {/* Date */}
                  <div className="vp-cell vp-date">
                    {l.created_at
                      ? new Date(l.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </div>

                  {/* Actions */}
                  <div className="vp-cell vp-actions">
                    <Link
                      to={`/cours/${l.id}`}
                      className="btn-requests-action btn-requests-secondary"
                      title="Preview lesson content"
                    >
                      <i className="mdi mdi-eye-outline" />
                      <span>{t('video_main', 'Preview')}</span>
                    </Link>
                    <button
                      type="button"
                      className="btn-requests-action btn-requests-primary"
                      onClick={() => changeSwitch(l)}
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

      {/* ── INTERACTIVE DECISION MODAL DIALOG (Requests.vue pattern) ── */}
      {setDialog && selectedLesson && (
        <div className="requests-modal-overlay" onClick={() => setSetDialog(false)}>
          <div className="requests-modal-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="requests-modal-header">
              <div className="requests-modal-title-box">
                <i className="mdi mdi-shield-check-outline requests-modal-icon" />
                <h3 className="requests-modal-title">
                  {t('requests.dialogTitleLesson', 'Set Status For Lesson')}
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
              {/* Summary Description Box (Requests.vue pattern) */}
              <div className="requests-summary-box">
                Change the state of the lesson <strong>« {selectedLesson.title} »</strong> proposed by{' '}
                <strong>{selectedLesson.author_name || selectedLesson.teacher_name || 'Contributor'}</strong> in subject{' '}
                <strong>{selectedLesson.subject_slug || 'General'}</strong>.
              </div>

              {/* Quality diagnostics */}
              {quality[selectedLesson.id] && (
                <div
                  className={`quality-diag-box ${
                    (quality[selectedLesson.id].errors?.length || 0) > 0 ? 'has-errors' : 'is-clean'
                  }`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                    <i
                      className={`mdi ${
                        (quality[selectedLesson.id].errors?.length || 0) > 0
                          ? 'mdi-alert-octagon'
                          : 'mdi-check-decagram'
                      }`}
                    />
                    <span>
                      {(quality[selectedLesson.id].errors?.length || 0) > 0
                        ? `${quality[selectedLesson.id].errors.length} Blocking Issue(s) Detected:`
                        : 'Quality verification passed: Ready to publish.'}
                    </span>
                  </div>
                  {quality[selectedLesson.id].errors?.map((err, idx) => (
                    <div key={idx} style={{ paddingLeft: '1.4rem', fontSize: '0.82rem' }}>
                      • {err}
                    </div>
                  ))}
                </div>
              )}

              {/* Mutually exclusive switch toggles (Requests.vue pattern) */}
              <div className="requests-switches-card">
                {/* Validated Switch */}
                <div
                  className={`requests-switch-item ${validatedState ? 'is-active-validated' : ''}`}
                  onClick={changeValidateState}
                >
                  <div className="requests-switch-label-wrap">
                    <i className="mdi mdi-check-circle" style={{ color: '#10b981' }} />
                    <span>{t('requests.validated', 'Validated (Publish Live)')}</span>
                  </div>
                  <div className="requests-toggle-pill" />
                </div>

                {/* Cancelled / Rejected Switch */}
                <div
                  className={`requests-switch-item ${cancelledState ? 'is-active-cancelled' : ''}`}
                  onClick={changeCancelledState}
                >
                  <div className="requests-switch-label-wrap">
                    <i className="mdi mdi-close-circle" style={{ color: '#ef4444' }} />
                    <span>{t('requests.cancelled', 'Revision Required (Send Back to Draft)')}</span>
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
                    <span>{t('requests.pending', 'Pending Review')}</span>
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
