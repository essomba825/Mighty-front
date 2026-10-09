import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/client'
import AdminHeader from '../../components/AdminHeader'
import { useLang } from '../../context/LangContext'

const EMPTY = { title: '', description: '', date: '', location: '', is_public: true }

export default function AdminEvents() {
  const { t } = useLang()
  const [searchParams, setSearchParams] = useSearchParams()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [panel, setPanel] = useState(false)
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState('all') // 'all', 'upcoming', 'past', 'public', 'private'
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const load = () => {
    setLoading(true)
    api.get('/events/')
      .then(({ data }) => setItems(data.results ?? data))
      .catch(() => showToast('Erreur lors du chargement des événements', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    if (searchParams.get('action') === 'new') {
      openCreate()
    }
  }, []) // eslint-disable-line

  const openCreate = () => { setEditing(null); setForm(EMPTY); setPanel(true) }

  const openEdit = (e) => {
    setEditing(e.id)
    setForm({
      title: e.title,
      description: e.description || '',
      date: e.date ? e.date.slice(0, 16) : '',
      location: e.location || '',
      is_public: e.is_public ?? true,
    })
    setPanel(true)
  }

  const closePanel = () => {
    setPanel(false)
    setEditing(null)
    setForm(EMPTY)
    if (searchParams.get('action')) {
      setSearchParams({})
    }
  }

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const { data } = await api.patch(`/events/${editing}/`, form)
        setItems((prev) => prev.map((x) => x.id === editing ? data : x))
        showToast('Événement mis à jour avec succès !')
      } else {
        const { data } = await api.post('/events/', form)
        setItems((prev) => [data, ...prev])
        showToast('Nouvel événement créé avec succès !')
      }
      closePanel()
    } catch {
      showToast('Erreur lors de l\'enregistrement', 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id, title) => {
    if (!window.confirm(`Confirmez-vous la suppression de l'événement "${title}" ?`)) return
    try {
      await api.delete(`/events/${id}/`)
      setItems((prev) => prev.filter((x) => x.id !== id))
      showToast('Événement supprimé avec succès.')
    } catch {
      showToast('Erreur lors de la suppression', 'error')
    }
  }

  const filteredEvents = useMemo(() => {
    const now = new Date()
    return items.filter((ev) => {
      const matchSearch = !search ||
        ev.title?.toLowerCase().includes(search.toLowerCase()) ||
        ev.location?.toLowerCase().includes(search.toLowerCase()) ||
        ev.description?.toLowerCase().includes(search.toLowerCase())

      if (!matchSearch) return false

      const evDate = ev.date ? new Date(ev.date) : null
      if (filterTab === 'upcoming') return evDate && evDate >= now
      if (filterTab === 'past') return evDate && evDate < now
      if (filterTab === 'public') return ev.is_public
      if (filterTab === 'private') return !ev.is_public
      return true
    })
  }, [items, search, filterTab])

  return (
    <div className="admin-page-container">
      {/* ── EN-TÊTE ── */}
      <AdminHeader
        title={t('admin.nav.events', 'Événements & Rencontres')}
        subtitle="Planification des assemblées générales, galas, ateliers et rencontres de batch."
        icon="mdi-calendar-month-outline"
        badgeText={`${items.length} événement(s)`}
        badgeType="info"
      >
        <button type="button" className="btn-admin-primary" onClick={openCreate}>
          <i className="mdi mdi-calendar-plus" />
          <span>{t('admin.events.create', 'Planifier un événement')}</span>
        </button>
      </AdminHeader>

      {/* Toast */}
      {toast && (
        <div className={`admin-toast-banner ${toast.type}`}>
          <i className={`mdi ${toast.type === 'error' ? 'mdi-alert-circle' : 'mdi-check-circle'}`} />
          <span>{toast.msg}</span>
          <button type="button" onClick={() => setToast(null)} className="toast-close">
            <i className="mdi mdi-close" />
          </button>
        </div>
      )}

      {/* ── TOOLBAR ET FILTRES ── */}
      <div className="admin-toolbar-card">
        <div className="admin-toolbar-row">
          <div className="admin-search-input-wrap">
            <i className="mdi mdi-magnify search-icon" />
            <input
              type="search"
              className="admin-search-input"
              placeholder="Rechercher par titre, lieu ou mot-clé..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="search-clear-btn" onClick={() => setSearch('')}>
                <i className="mdi mdi-close" />
              </button>
            )}
          </div>

          <div className="admin-status-tabs">
            <button
              type="button"
              className={`admin-tab-btn${filterTab === 'all' ? ' active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              <span>Tous</span>
              <span className="tab-badge-count neutral">{items.length}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn${filterTab === 'upcoming' ? ' active' : ''}`}
              onClick={() => setFilterTab('upcoming')}
            >
              <span>À venir</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn${filterTab === 'past' ? ' active' : ''}`}
              onClick={() => setFilterTab('past')}
            >
              <span>Passés</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn${filterTab === 'public' ? ' active' : ''}`}
              onClick={() => setFilterTab('public')}
            >
              <span>Publics</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── TABLEAU DES ÉVÉNEMENTS ── */}
      {loading ? (
        <div className="admin-loading-card">
          <i className="mdi mdi-loading mdi-spin loading-icon" />
          <span>Chargement des événements...</span>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="admin-empty-card">
          <div className="empty-icon-wrap">
            <i className="mdi mdi-calendar-remove-outline" />
          </div>
          <h3>Aucun événement trouvé</h3>
          <p>Planifiez une première rencontre ou modifiez vos critères de filtrage.</p>
          <button type="button" className="btn-admin-primary" onClick={openCreate}>
            <i className="mdi mdi-calendar-plus" /> Planifier un événement
          </button>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-modern-table">
            <thead>
              <tr>
                <th>Événement & Description</th>
                <th>Date & Heure</th>
                <th>Lieu</th>
                <th>Audience</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((e) => {
                const dateObj = e.date ? new Date(e.date) : null
                const isUpcoming = dateObj && dateObj >= new Date()

                return (
                  <tr key={e.id}>
                    <td className="cell-event-main">
                      <div className="event-title-block">
                        <strong className="event-title-text">{e.title}</strong>
                        {e.description && (
                          <p className="event-desc-text">
                            {e.description.length > 90 ? `${e.description.slice(0, 90)}…` : e.description}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="cell-date-highlight">
                      {dateObj ? (
                        <div className="date-time-chip">
                          <span className="date-day">
                            {dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="date-time">
                            {dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : '—'}
                    </td>

                    <td className="cell-location">
                      {e.location ? (
                        <span className="location-pill">
                          <i className="mdi mdi-map-marker-outline" />
                          <span>{e.location}</span>
                        </span>
                      ) : (
                        <span className="text-muted">— En ligne / Non précisé</span>
                      )}
                    </td>

                    <td className="cell-status">
                      <span className={`admin-status-pill ${e.is_public ? 'badge-success' : 'badge-neutral'}`}>
                        <i className={`mdi ${e.is_public ? 'mdi-earth' : 'mdi-lock-outline'}`} />
                        <span>{e.is_public ? 'Public' : 'Privé'}</span>
                      </span>
                    </td>

                    <td className="cell-actions-right">
                      <div className="action-buttons-group">
                        <button
                          type="button"
                          className="btn-action-icon edit"
                          onClick={() => openEdit(e)}
                          title="Modifier l'événement"
                        >
                          <i className="mdi mdi-pencil-outline" />
                        </button>
                        <button
                          type="button"
                          className="btn-action-icon delete"
                          onClick={() => remove(e.id, e.title)}
                          title="Supprimer l'événement"
                        >
                          <i className="mdi mdi-delete-outline" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL DE CRÉATION / ÉDITION ── */}
      {panel && (
        <div className="admin-modal-overlay" onClick={closePanel}>
          <form className="admin-modal-container" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="admin-modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge">
                  <i className="mdi mdi-calendar-star" />
                </div>
                <div>
                  <h2 className="modal-title">
                    {editing ? 'Modifier l\'événement' : 'Planifier un nouvel événement'}
                  </h2>
                  <span className="modal-subtitle">
                    {editing ? 'Mise à jour des coordonnées et horaires' : 'Création d\'un rendez-vous sur l\'agenda officiel'}
                  </span>
                </div>
              </div>
              <button type="button" className="modal-close-btn" onClick={closePanel}>
                <i className="mdi mdi-close" />
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label className="form-label required">Titre de l'événement</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="Ex : Assemblée Générale Annuelle 2026..."
                  value={form.title}
                  onChange={set('title')}
                  required
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group flex-1">
                  <label className="form-label required">Date et heure</label>
                  <input
                    type="datetime-local"
                    className="admin-form-input"
                    value={form.date}
                    onChange={set('date')}
                    required
                  />
                </div>
                <div className="admin-form-group flex-1">
                  <label className="form-label">Lieu / Salle / Lien visio</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="Ex : Hôtel Hilton Yaoundé / Zoom"
                    value={form.location}
                    onChange={set('location')}
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label className="form-label">Description détaillée & Ordre du jour</label>
                <textarea
                  rows={6}
                  className="admin-form-textarea"
                  placeholder="Détails du programme, intervenants, modalités d'accès..."
                  value={form.description}
                  onChange={set('description')}
                />
              </div>

              <div className="admin-switch-row">
                <label className="admin-switch-label">
                  <input
                    type="checkbox"
                    checked={form.is_public}
                    onChange={set('is_public')}
                    className="admin-switch-checkbox"
                  />
                  <span className="admin-switch-slider" />
                  <span className="switch-text-label">
                    <strong>Visible du grand public</strong>
                    <small>Si désactivé, l'événement ne sera visible que par les membres connectés.</small>
                  </span>
                </label>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button type="button" className="btn-admin-ghost" onClick={closePanel}>
                Annuler
              </button>
              <button type="submit" className="btn-admin-primary" disabled={saving}>
                {saving ? (
                  <>
                    <i className="mdi mdi-loading mdi-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <i className="mdi mdi-content-save-outline" />
                    <span>{editing ? 'Mettre à jour' : 'Enregistrer l\'événement'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
