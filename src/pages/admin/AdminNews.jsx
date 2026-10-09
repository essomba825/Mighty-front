import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/client'
import AdminHeader from '../../components/AdminHeader'
import { useLang } from '../../context/LangContext'

const EMPTY_FORM = { title: '', content: '', published: false }

export default function AdminNews() {
  const { t } = useLang()
  const [searchParams, setSearchParams] = useSearchParams()

  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [panel, setPanel] = useState(false)
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState('all') // 'all', 'published', 'draft'
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const load = () => {
    setLoading(true)
    api.get('/news/')
      .then(({ data }) => {
        const list = data.results ?? data
        setArticles(list)
      })
      .catch(() => showToast('Erreur lors du chargement des actualités', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    if (searchParams.get('action') === 'new') {
      openCreate()
    }
  }, []) // eslint-disable-line

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setPanel(true)
  }

  const openEdit = (a) => {
    setEditing(a.id)
    setForm({ title: a.title, content: a.content || '', published: !!a.published })
    setPanel(true)
  }

  const closePanel = () => {
    setPanel(false)
    setEditing(null)
    setForm(EMPTY_FORM)
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
        const { data } = await api.patch(`/news/${editing}/`, form)
        setArticles((prev) => prev.map((a) => a.id === editing ? data : a))
        showToast('Article modifié avec succès !')
      } else {
        const { data } = await api.post('/news/', form)
        setArticles((prev) => [data, ...prev])
        showToast('Nouvel article créé avec succès !')
      }
      closePanel()
    } catch {
      showToast('Erreur lors de l\'enregistrement de l\'article', 'error')
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (a) => {
    try {
      const { data } = await api.patch(`/news/${a.id}/`, { published: !a.published })
      setArticles((prev) => prev.map((x) => x.id === a.id ? data : x))
      showToast(data.published ? 'Article publié en ligne !' : 'Article passé en brouillon.')
    } catch {
      showToast('Erreur lors du changement de statut', 'error')
    }
  }

  const remove = async (id, title) => {
    if (!window.confirm(`Confirmez-vous la suppression définitive de l'article "${title}" ?`)) return
    try {
      await api.delete(`/news/${id}/`)
      setArticles((prev) => prev.filter((a) => a.id !== id))
      showToast('Article supprimé avec succès.')
    } catch {
      showToast('Erreur lors de la suppression', 'error')
    }
  }

  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      const matchSearch = !search ||
        a.title?.toLowerCase().includes(search.toLowerCase()) ||
        a.content?.toLowerCase().includes(search.toLowerCase())

      if (!matchSearch) return false
      if (filterTab === 'published') return a.published
      if (filterTab === 'draft') return !a.published
      return true
    })
  }, [articles, search, filterTab])

  const publishedCount = useMemo(() => articles.filter((a) => a.published).length, [articles])
  const draftCount = useMemo(() => articles.filter((a) => !a.published).length, [articles])

  return (
    <div className="admin-page-container">
      {/* ── EN-TÊTE ── */}
      <AdminHeader
        title={t('admin.nav.news', 'Actualités & Publications')}
        subtitle="Rédigez, modifiez et planifiez la diffusion des articles et communiqués officiels."
        icon="mdi-newspaper-variant-outline"
        badgeText={`${articles.length} article(s)`}
        badgeType="info"
      >
        <button type="button" className="btn-admin-primary" onClick={openCreate}>
          <i className="mdi mdi-plus-circle" />
          <span>{t('admin.news.create', 'Rédiger un article')}</span>
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
              placeholder="Rechercher par titre ou mot-clé..."
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
              <span className="tab-badge-count neutral">{articles.length}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn${filterTab === 'published' ? ' active' : ''}`}
              onClick={() => setFilterTab('published')}
            >
              <span>Publiés</span>
              <span className="tab-badge-count success">{publishedCount}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn${filterTab === 'draft' ? ' active' : ''}`}
              onClick={() => setFilterTab('draft')}
            >
              <span>Brouillons</span>
              <span className="tab-badge-count warning">{draftCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── TABLEAU / LISTE DES ARTICLES ── */}
      {loading ? (
        <div className="admin-loading-card">
          <i className="mdi mdi-loading mdi-spin loading-icon" />
          <span>Chargement des articles...</span>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="admin-empty-card">
          <div className="empty-icon-wrap">
            <i className="mdi mdi-newspaper-remove" />
          </div>
          <h3>Aucun article trouvé</h3>
          <p>Commencez par rédiger un premier communiqué ou modifiez vos critères de recherche.</p>
          <button type="button" className="btn-admin-primary" onClick={openCreate}>
            <i className="mdi mdi-plus-circle" /> Rédiger un article
          </button>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-modern-table">
            <thead>
              <tr>
                <th>Titre & Aperçu</th>
                <th>Statut de Diffusion</th>
                <th>Date de Publication</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredArticles.map((a) => (
                <tr key={a.id}>
                  <td className="cell-article-main">
                    <strong className="article-title-text">{a.title}</strong>
                    {a.content && (
                      <p className="article-excerpt-text">
                        {a.content.length > 110 ? `${a.content.slice(0, 110)}…` : a.content}
                      </p>
                    )}
                  </td>

                  <td className="cell-status">
                    <button
                      type="button"
                      className={`admin-status-pill clickable ${a.published ? 'badge-success' : 'badge-neutral'}`}
                      onClick={() => togglePublish(a)}
                      title={a.published ? 'Cliquer pour basculer en brouillon' : 'Cliquer pour mettre en ligne'}
                    >
                      <i className={`mdi ${a.published ? 'mdi-check-circle' : 'mdi-pencil-outline'}`} />
                      <span>{a.published ? 'Publié en ligne' : 'Brouillon privé'}</span>
                    </button>
                  </td>

                  <td className="cell-date">
                    <i className="mdi mdi-calendar-outline" />{' '}
                    {a.published_at
                      ? new Date(a.published_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                      : new Date(a.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>

                  <td className="cell-actions-right">
                    <div className="action-buttons-group">
                      <button
                        type="button"
                        className="btn-action-icon"
                        onClick={() => togglePublish(a)}
                        title={a.published ? 'Dépublier' : 'Publier'}
                      >
                        <i className={`mdi ${a.published ? 'mdi-eye-off-outline' : 'mdi-eye-outline'}`} />
                      </button>
                      <button
                        type="button"
                        className="btn-action-icon edit"
                        onClick={() => openEdit(a)}
                        title="Modifier l'article"
                      >
                        <i className="mdi mdi-pencil-outline" />
                      </button>
                      <button
                        type="button"
                        className="btn-action-icon delete"
                        onClick={() => remove(a.id, a.title)}
                        title="Supprimer l'article"
                      >
                        <i className="mdi mdi-delete-outline" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TIROIR / MODAL DE RÉDACTION ── */}
      {panel && (
        <div className="admin-modal-overlay" onClick={closePanel}>
          <form className="admin-modal-container" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="admin-modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge">
                  <i className={`mdi ${editing ? 'mdi-pencil-box-outline' : 'mdi-plus-box-outline'}`} />
                </div>
                <div>
                  <h2 className="modal-title">
                    {editing ? 'Modifier l\'article' : 'Rédiger une nouvelle actualité'}
                  </h2>
                  <span className="modal-subtitle">
                    {editing ? 'Mise à jour des informations de publication' : 'Création d\'un nouvel article pour le fil d\'actualité'}
                  </span>
                </div>
              </div>
              <button type="button" className="modal-close-btn" onClick={closePanel}>
                <i className="mdi mdi-close" />
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label htmlFor="news-form-title" className="form-label required">
                  Titre de l'article
                </label>
                <input
                  id="news-form-title"
                  type="text"
                  className="admin-form-input"
                  placeholder="Ex : Réunion annuelle de batch à Yaoundé..."
                  value={form.title}
                  onChange={set('title')}
                  required
                />
              </div>

              <div className="admin-form-group">
                <div className="form-label-row">
                  <label htmlFor="news-form-content" className="form-label required">
                    Contenu complet de l'article
                  </label>
                  <span className="char-count">{form.content?.length || 0} caractères</span>
                </div>
                <textarea
                  id="news-form-content"
                  className="admin-form-textarea"
                  rows={9}
                  placeholder="Rédigez le corps du texte..."
                  value={form.content}
                  onChange={set('content')}
                  required
                />
              </div>

              <div className="admin-switch-row">
                <label className="admin-switch-label">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={set('published')}
                    className="admin-switch-checkbox"
                  />
                  <span className="admin-switch-slider" />
                  <span className="switch-text-label">
                    <strong>Publier immédiatement en ligne</strong>
                    <small>Si désactivé, l'article sera enregistré comme brouillon privé.</small>
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
                    <span>{editing ? 'Mettre à jour' : 'Enregistrer l\'article'}</span>
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
