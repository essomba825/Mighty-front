import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/client'
import AdminHeader from '../../components/AdminHeader'
import { useLang } from '../../context/LangContext'

const ROLES = [
  { value: '', labelKey: 'admin.users.role.all', defaultLabel: 'Tous les rôles' },
  { value: 'alumni', labelKey: 'admin.users.role.alumni', defaultLabel: 'Ancien élève (Alumni)' },
  { value: 'student', labelKey: 'admin.users.role.student', defaultLabel: 'Élève (Student)' },
  { value: 'teacher', labelKey: 'admin.users.role.teacher', defaultLabel: 'Enseignant / Tuteur' },
  { value: 'partner', labelKey: 'admin.users.role.partner', defaultLabel: 'Partenaire' },
  { value: 'admin', labelKey: 'admin.users.role.admin', defaultLabel: 'Administrateur' },
]

const STATUSES = [
  { key: '', label: 'Tous les statuts' },
  { key: 'pending', label: 'En attente' },
  { key: 'active', label: 'Actifs' },
  { key: 'rejected', label: 'Rejetés / Suspendus' },
]

const STATUS_BADGE = {
  pending:  { cls: 'badge-warning',  icon: 'mdi-clock-outline', label: 'En attente' },
  active:   { cls: 'badge-success',  icon: 'mdi-check-circle-outline', label: 'Actif' },
  rejected: { cls: 'badge-danger',   icon: 'mdi-close-circle-outline', label: 'Rejeté' },
}

export default function AdminUsers() {
  const { t } = useLang()
  const [searchParams, setSearchParams] = useSearchParams()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({}) // { [id]: true }
  const [toast, setToast] = useState(null)
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const statusFilter = searchParams.get('status') || ''

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const load = () => {
    setLoading(true)
    const params = {}
    if (statusFilter) params.status = statusFilter
    if (search) params.search = search
    api.get('/auth/admin/users/', { params })
      .then(({ data }) => setUsers(data.results ?? data))
      .catch(() => showToast('Erreur lors du chargement des membres', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [statusFilter, search]) // eslint-disable-line

  const patch = async (id, payload, successMsg) => {
    setSaving((s) => ({ ...s, [id]: true }))
    try {
      const { data } = await api.patch(`/auth/admin/users/${id}/`, payload)
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...data } : u))
      if (successMsg) showToast(successMsg)
    } catch {
      showToast('Erreur lors de la mise à jour', 'error')
    } finally {
      setSaving((s) => ({ ...s, [id]: false }))
    }
  }

  const validate = (id, name) => patch(id, { status: 'active' }, `Compte de ${name} validé avec succès !`)
  const reject = (id, name) => patch(id, { status: 'rejected' }, `Compte de ${name} suspendu / rejeté.`)
  const changeRole = (id, role, name) => patch(id, { role }, `Rôle de ${name} modifié en ${role}.`)

  const pendingUsers = useMemo(() => users.filter((u) => u.status === 'pending'), [users])
  
  const filteredUsers = useMemo(() => {
    if (!roleFilter) return users
    return users.filter((u) => u.role === roleFilter)
  }, [users, roleFilter])

  return (
    <div className="admin-page-container">
      {/* ── EN-TÊTE ET FIL D'ARIANE ── */}
      <AdminHeader
        title={t('admin.nav.users', 'Membres & Rôles')}
        subtitle="Validation des inscriptions, gestion des statuts de compte et attribution des privilèges."
        icon="mdi-account-group-outline"
        badgeText={pendingUsers.length > 0 ? `${pendingUsers.length} en attente` : null}
        badgeType="urgent"
      />

      {/* Toast de notification */}
      {toast && (
        <div className={`admin-toast-banner ${toast.type}`}>
          <i className={`mdi ${toast.type === 'error' ? 'mdi-alert-circle' : 'mdi-check-circle'}`} />
          <span>{toast.msg}</span>
          <button type="button" onClick={() => setToast(null)} className="toast-close">
            <i className="mdi mdi-close" />
          </button>
        </div>
      )}

      {/* ── BARRE D'OUTILS ET FILTRES ── */}
      <div className="admin-toolbar-card">
        <div className="admin-toolbar-row">
          <div className="admin-search-input-wrap">
            <i className="mdi mdi-magnify search-icon" />
            <input
              type="search"
              className="admin-search-input"
              placeholder={t('admin.users.search', 'Rechercher par nom, email ou identifiant…')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="search-clear-btn" onClick={() => setSearch('')}>
                <i className="mdi mdi-close" />
              </button>
            )}
          </div>

          <div className="admin-role-filter-wrap">
            <label htmlFor="role-filter-select" className="filter-label">Rôle :</label>
            <select
              id="role-filter-select"
              className="admin-select-input"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {t(r.labelKey, r.defaultLabel)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-filter-tabs-row">
          <div className="admin-status-tabs">
            {STATUSES.map(({ key, label }) => {
              const isActive = statusFilter === key
              return (
                <button
                  key={key}
                  type="button"
                  className={`admin-tab-btn${isActive ? ' active' : ''}`}
                  onClick={() => setSearchParams(key ? { status: key } : {})}
                >
                  <span>{label}</span>
                  {key === 'pending' && pendingUsers.length > 0 && (
                    <span className="tab-badge-count">{pendingUsers.length}</span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="admin-table-count-summary">
            <span>{filteredUsers.length} membre(s) listé(s)</span>
          </div>
        </div>
      </div>

      {/* ── TABLEAU DES MEMBRES ── */}
      {loading ? (
        <div className="admin-loading-card">
          <i className="mdi mdi-loading mdi-spin loading-icon" />
          <span>Chargement des données membres...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="admin-empty-card">
          <div className="empty-icon-wrap">
            <i className="mdi mdi-account-off-outline" />
          </div>
          <h3>{t('admin.users.empty', 'Aucun membre ne correspond à vos critères')}</h3>
          <p>Modifiez votre recherche ou réinitialisez les filtres pour afficher l'ensemble des inscrits.</p>
          <button
            type="button"
            className="btn-admin-secondary"
            onClick={() => {
              setSearch('')
              setRoleFilter('')
              setSearchParams({})
            }}
          >
            <i className="mdi mdi-refresh" /> Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="vp-list vp-list--users">
          {filteredUsers.map((u) => {
            const badge = STATUS_BADGE[u.status] || STATUS_BADGE.pending
            const busy = saving[u.id]
            const displayName = u.full_name || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username
            const initial = (u.first_name?.[0] || u.username?.[0] || 'M').toUpperCase()

            return (
              <article key={u.id} className={`vp-row${u.status === 'pending' ? ' is-pending' : ''}`}>
                {/* Identité */}
                <div className="vp-cell vp-identity">
                  <span className="vp-avatar">{initial}</span>
                  <span className="vp-ident-text">
                    <strong className="vp-title" title={displayName}>{displayName}</strong>
                    <span className="vp-sub">@{u.username}</span>
                  </span>
                </div>

                {/* Email */}
                <div className="vp-cell">
                  <a href={`mailto:${u.email}`} className="vp-email" title={u.email}>
                    <i className="mdi mdi-email-outline" /> <span>{u.email}</span>
                  </a>
                </div>

                {/* Rôle */}
                <div className="vp-cell">
                  <select
                    className="admin-role-select"
                    value={u.role || 'alumni'}
                    disabled={busy}
                    onChange={(e) => changeRole(u.id, e.target.value, displayName)}
                    title="Modifier le rôle de ce compte"
                  >
                    {ROLES.filter((r) => r.value).map((r) => (
                      <option key={r.value} value={r.value}>
                        {t(r.labelKey, r.defaultLabel)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Statut */}
                <div className="vp-cell vp-chips">
                  <span className={`admin-status-pill ${badge.cls}`}>
                    <i className={`mdi ${badge.icon}`} />
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Date d'inscription */}
                <div className="vp-cell vp-date">
                  {u.date_joined ? new Date(u.date_joined).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  }) : '—'}
                </div>

                {/* Actions */}
                <div className="vp-cell vp-actions">
                  {u.status === 'pending' && (
                    <div className="action-buttons-group">
                      <button
                        type="button"
                        className="btn-action-validate"
                        onClick={() => validate(u.id, displayName)}
                        disabled={busy}
                        title="Valider ce membre"
                      >
                        {busy ? (
                          <i className="mdi mdi-loading mdi-spin" />
                        ) : (
                          <>
                            <i className="mdi mdi-check-circle" />
                            <span>Valider</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn-action-reject"
                        onClick={() => reject(u.id, displayName)}
                        disabled={busy}
                        title="Rejeter la demande"
                      >
                        <i className="mdi mdi-close" />
                        <span>Rejeter</span>
                      </button>
                    </div>
                  )}

                  {u.status === 'active' && (
                    <button
                      type="button"
                      className="btn-action-outline-danger"
                      onClick={() => reject(u.id, displayName)}
                      disabled={busy}
                      title="Suspendre l'accès de ce compte"
                    >
                      <i className="mdi mdi-account-cancel-outline" />
                      <span>Suspendre</span>
                    </button>
                  )}

                  {u.status === 'rejected' && (
                    <button
                      type="button"
                      className="btn-action-outline-success"
                      onClick={() => validate(u.id, displayName)}
                      disabled={busy}
                      title="Réactiver ce compte"
                    >
                      <i className="mdi mdi-account-reactivate-outline" />
                      <span>Réactiver</span>
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
