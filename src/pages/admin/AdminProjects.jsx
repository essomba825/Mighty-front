import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/client'
import AdminHeader from '../../components/AdminHeader'
import { useLang } from '../../context/LangContext'

const STATUS_OPTS = [
  { value: 'draft', label: 'Brouillon', cls: 'badge-neutral', icon: 'mdi-pencil-outline' },
  { value: 'active', label: 'Actif en cours', cls: 'badge-success', icon: 'mdi-play-circle-outline' },
  { value: 'completed', label: 'Terminé', cls: 'badge-info', icon: 'mdi-check-all' },
  { value: 'cancelled', label: 'Annulé', cls: 'badge-danger', icon: 'mdi-cancel' },
]

const STATUS_MAP = Object.fromEntries(STATUS_OPTS.map((s) => [s.value, s]))
const EMPTY = { title: '', description: '', budget: '', status: 'draft' }

export default function AdminProjects() {
  const { t } = useLang()
  const [searchParams, setSearchParams] = useSearchParams()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [panel, setPanel] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const load = () => {
    setLoading(true)
    api.get('/projects/')
      .then(({ data }) => setItems(data.results ?? data))
      .catch(() => showToast('Erreur lors du chargement des projets', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    if (searchParams.get('action') === 'new') {
      openCreate()
    }
  }, []) // eslint-disable-line

  const openCreate = () => { setEditing(null); setForm(EMPTY); setPanel(true) }

  const openEdit = (p) => {
    setEditing(p.id)
    setForm({
      title: p.title,
      description: p.description || '',
      budget: p.budget || '',
      status: p.status || 'draft',
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

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const { data } = await api.patch(`/projects/${editing}/`, form)
        setItems((prev) => prev.map((x) => x.id === editing ? data : x))
        showToast('Projet mis à jour avec succès !')
      } else {
        const { data } = await api.post('/projects/', form)
        setItems((prev) => [data, ...prev])
        showToast('Nouveau projet créé avec succès !')
      }
      closePanel()
    } catch {
      showToast('Erreur lors de l\'enregistrement', 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id, title) => {
    if (!window.confirm(`Confirmez-vous la suppression définitive du projet "${title}" ?`)) return
    try {
      await api.delete(`/projects/${id}/`)
      setItems((prev) => prev.filter((x) => x.id !== id))
      showToast('Projet supprimé avec succès.')
    } catch {
      showToast('Erreur lors de la suppression', 'error')
    }
  }

  const fmt = (n) => Number(n ?? 0).toLocaleString('fr-FR')

  const filteredProjects = useMemo(() => {
    return items.filter((p) => {
      const matchSearch = !search ||
        p.title?.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())

      if (!matchSearch) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      return true
    })
  }, [items, search, statusFilter])

  return (
    <div className="admin-page-container">
      {/* ── EN-TÊTE ── */}
      <AdminHeader
        title={t('admin.nav.projects', 'Projets Communautaires')}
        subtitle="Création de projets solidaires, suivi des cagnottes, budgets et statut des réalisations."
        icon="mdi-briefcase-outline"
        badgeText={`${items.length} projet(s)`}
        badgeType="info"
      >
        <button type="button" className="btn-admin-primary" onClick={openCreate}>
          <i className="mdi mdi-plus-circle" />
          <span>{t('admin.projects.create', 'Nouveau projet')}</span>
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
              placeholder="Rechercher par titre de projet..."
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
              className={`admin-tab-btn${statusFilter === 'all' ? ' active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              <span>Tous</span>
              <span className="tab-badge-count neutral">{items.length}</span>
            </button>
            {STATUS_OPTS.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`admin-tab-btn${statusFilter === s.value ? ' active' : ''}`}
                onClick={() => setStatusFilter(s.value)}
              >
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TABLEAU DES PROJETS ── */}
      {loading ? (
        <div className="admin-loading-card">
          <i className="mdi mdi-loading mdi-spin loading-icon" />
          <span>Chargement des chantiers solidaires...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="admin-empty-card">
          <div className="empty-icon-wrap">
            <i className="mdi mdi-briefcase-remove-outline" />
          </div>
          <h3>Aucun projet trouvé</h3>
          <p>Créez un premier chantier solidaire ou adaptez vos filtres de recherche.</p>
          <button type="button" className="btn-admin-primary" onClick={openCreate}>
            <i className="mdi mdi-plus-circle" /> Nouveau projet
          </button>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-modern-table">
            <thead>
              <tr>
                <th>Projet & Objectif</th>
                <th>Budget Cible</th>
                <th>Collecte & Avancement</th>
                <th>Statut</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p) => {
                const badge = STATUS_MAP[p.status] || STATUS_MAP.draft
                const percent = p.budget > 0
                  ? Math.min(Math.round((p.amount_collected / p.budget) * 100), 100)
                  : 0

                return (
                  <tr key={p.id}>
                    <td className="cell-project-main">
                      <strong className="project-title-text">{p.title}</strong>
                      {p.description && (
                        <p className="project-desc-text">
                          {p.description.length > 95 ? `${p.description.slice(0, 95)}…` : p.description}
                        </p>
                      )}
                    </td>

                    <td className="cell-amount-target">
                      <strong className="budget-number">{fmt(p.budget)} FCFA</strong>
                    </td>

                    <td className="cell-progress">
                      <div className="admin-progress-block">
                        <div className="admin-progress-bar-wrap">
                          <div
                            className={`admin-progress-bar-fill ${percent >= 100 ? 'complete' : ''}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="admin-progress-labels">
                          <span className="collected-text">{fmt(p.amount_collected)} FCFA</span>
                          <span className="percent-text">{percent}%</span>
                        </div>
                      </div>
                    </td>

                    <td className="cell-status">
                      <span className={`admin-status-pill ${badge.cls}`}>
                        <i className={`mdi ${badge.icon}`} />
                        <span>{badge.label}</span>
                      </span>
                    </td>

                    <td className="cell-actions-right">
                      <div className="action-buttons-group">
                        <button
                          type="button"
                          className="btn-action-icon edit"
                          onClick={() => openEdit(p)}
                          title="Modifier le projet"
                        >
                          <i className="mdi mdi-pencil-outline" />
                        </button>
                        <button
                          type="button"
                          className="btn-action-icon delete"
                          onClick={() => remove(p.id, p.title)}
                          title="Supprimer le projet"
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
                  <i className="mdi mdi-briefcase-check-outline" />
                </div>
                <div>
                  <h2 className="modal-title">
                    {editing ? 'Modifier le projet' : 'Lancer un nouveau projet communautaire'}
                  </h2>
                  <span className="modal-subtitle">
                    {editing ? 'Mise à jour du budget et du statut d\'exécution' : 'Création d\'un chantier de développement pour la communauté'}
                  </span>
                </div>
              </div>
              <button type="button" className="modal-close-btn" onClick={closePanel}>
                <i className="mdi mdi-close" />
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label className="form-label required">Titre du projet</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="Ex : Réhabilitation de la bibliothèque du lycée..."
                  value={form.title}
                  onChange={set('title')}
                  required
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group flex-1">
                  <label className="form-label required">Budget cible (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    className="admin-form-input"
                    placeholder="Ex : 2500000"
                    value={form.budget}
                    onChange={set('budget')}
                    required
                  />
                </div>

                <div className="admin-form-group flex-1">
                  <label className="form-label required">Statut d'avancement</label>
                  <select
                    className="admin-select-input"
                    value={form.status}
                    onChange={set('status')}
                  >
                    {STATUS_OPTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="admin-form-group">
                <label className="form-label">Description & Objectifs du projet</label>
                <textarea
                  rows={6}
                  className="admin-form-textarea"
                  placeholder="Expliquez la finalité du chantier, les étapes, les bénéficiaires et l'impact escompté..."
                  value={form.description}
                  onChange={set('description')}
                />
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
                    <span>{editing ? 'Mettre à jour' : 'Enregistrer le projet'}</span>
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
