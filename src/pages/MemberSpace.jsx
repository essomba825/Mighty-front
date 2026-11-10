import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { mediaUrl } from '../api/client'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../context/ProfileContext'
import { useLang } from '../context/LangContext'
import ProfileAvatar from '../components/ProfileAvatar'
import ResourceSubmitForm from '../components/ResourceSubmitForm'

const LEARNER_ROLES = ['student', 'teacher', 'admin']
const ADMIN_ROLES = ['admin']

/* Champs qui comptent pour la complétion : sert à la fois au pourcentage et
   au calcul de ce qu'il reste à renseigner. */
const PROFILE_FIELDS = ['photo', 'graduation_year', 'profession', 'company', 'city', 'bio']

const completionOf = (profile) => {
  if (!profile) return 0
  const filled = PROFILE_FIELDS.filter((field) => profile[field]).length
  return Math.round((filled / PROFILE_FIELDS.length) * 100)
}

/* Nombre de champs déjà renseignés (0 quand il n'y a pas encore de profil). */
const filledCountOf = (profile) =>
  profile ? PROFILE_FIELDS.filter((field) => profile[field]).length : 0

function QuickCard({ to, accent = 'gold', icon, title, sub, badge }) {
  return (
    <Link to={to} className={`quick-card qc-${accent}`}>
      <span className="quick-icon"><i className={`mdi ${icon}`} /></span>
      <span className="quick-text">
        <strong>{title}</strong>
        <small>{sub}</small>
      </span>
      {badge && <span className="quick-badge">{badge}</span>}
      <i className="mdi mdi-arrow-top-right quick-go" aria-hidden="true" />
    </Link>
  )
}

/* ── Status pill for submissions ── */
const STATUS_META = {
  pending:  { label: 'En attente',  color: '#f29408', icon: 'mdi-clock-outline' },
  approved: { label: 'Approuvé',    color: '#22c55e', icon: 'mdi-check-circle-outline' },
  rejected: { label: 'Refusé',      color: '#f04f4f', icon: 'mdi-close-circle-outline' },
}

function SubmissionRow({ sub }) {
  const meta = STATUS_META[sub.status] || STATUS_META.pending
  const typeLabels = {
    past_paper: 'Épreuve',
    correction: 'Corrigé',
    notes: 'Notes',
    textbook: 'Manuel',
    other: 'Autre',
  }
  return (
    <div className="ms-sub-row">
      <div className="ms-sub-info">
        <span className="ms-sub-type">{typeLabels[sub.resource_type] || sub.resource_type}</span>
        <span className="ms-sub-title">{sub.title}</span>
        <span className="ms-sub-meta">
          {sub.level?.toUpperCase()} {sub.year && `· ${sub.year}`}
          {sub.subject_name && ` · ${sub.subject_name}`}
        </span>
      </div>
      <span className="ms-sub-status" style={{ '--sc': meta.color }}>
        <i className={`mdi ${meta.icon}`} />
        {meta.label}
      </span>
    </div>
  )
}

export default function MemberSpace() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { t } = useLang()
  const isLearner = LEARNER_ROLES.includes(user.role)
  const isAdmin = ADMIN_ROLES.includes(user.role)

  const fullName = `${user.first_name} ${user.last_name}`.trim() || user.username
  const firstName = user.first_name || user.username
  const roleLabel = t(`auth.role.${user.role}`) || user.role
  const statusLabel = user.status ? t(`admin.users.status.${user.status}`) : null
  const completion = completionOf(profile)
  const filledCount = filledCountOf(profile)
  const completed = completion >= 100

  /* Message du bandeau : on décrit la situation réelle du membre plutôt qu'un
     slogan, et on n'affiche jamais deux fois la même information. */
  const subtitleKey = {
    pending: 'member.sub.pending',
    rejected: 'member.sub.rejected',
  }[user.status]
    || (completed
      ? 'member.sub.complete'
      : (filledCount > 0 ? 'member.sub.partial' : 'member.sub.empty'))
  const subtitle = t(subtitleKey, { n: PROFILE_FIELDS.length - filledCount })

  /* ── Resource submissions state ── */
  const [showForm, setShowForm] = useState(false)
  const [submissions, setSubmissions] = useState([])
  const [subsLoading, setSubsLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchSubmissions = useCallback(async () => {
    setSubsLoading(true)
    try {
      const { data } = await api.get('/exams/submissions/')
      setSubmissions(Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []))
    } catch {
      /* silently fail – not critical */
    } finally {
      setSubsLoading(false)
    }
  }, [])

  useEffect(() => { fetchSubmissions() }, [fetchSubmissions])

  const handleSuccess = () => {
    setShowForm(false)
    showToast('Votre ressource a été soumise avec succès ! Elle sera examinée par notre équipe.')
    fetchSubmissions()
  }

  return (
    <div className="ms-page">
      <div className="page">
        <nav className="ms-crumbs" aria-label="Fil d'Ariane">
          <Link to="/"><i className="mdi mdi-home-outline" aria-hidden="true" />{t('nav.home')}</Link>
          <span className="ms-crumbs-sep" aria-hidden="true">›</span>
          <span className="ms-crumbs-current">{t('member.breadcrumb')}</span>
        </nav>

        {/* Bannière profil : identité, statut du compte et progression du profil */}
        <section className="ms-banner">
          <div className="ms-banner-art" aria-hidden="true">
            <span className="ms-banner-ring ms-banner-ring-1" />
            <span className="ms-banner-ring ms-banner-ring-2" />
            <span className="ms-banner-dots" />
          </div>

          <div className="ms-banner-main">
            <span className="ms-banner-avatar">
              <ProfileAvatar src={mediaUrl(profile?.photo)} name={fullName} />
              {user.status === 'active' && <span className="ms-banner-dot" aria-hidden="true" />}
            </span>

            <div className="ms-banner-id">
              <div className="ms-banner-tags">
                <span className="ms-role-pill">
                  <i className="mdi mdi-shield-check-outline" aria-hidden="true" />
                  {roleLabel}
                </span>
                {statusLabel && (
                  <span className={`ms-state-pill is-${user.status}`}>
                    <i className="mdi mdi-check-decagram-outline" aria-hidden="true" />
                    {statusLabel}
                  </span>
                )}
              </div>
              <h1 className="ms-banner-title">
                {t('member.hello')}, <span className="ms-banner-name">{firstName}</span>
              </h1>
              <p className="ms-banner-sub">{subtitle}</p>
            </div>

            <aside className="ms-banner-score" aria-label={t('member.profileMeter')}>
              <div className="ms-score-ring" style={{ '--score': `${completion}%` }}>
                <span>{completion}%</span>
              </div>
              <div className="ms-score-text">
                <p>{t('member.profileMeter')}</p>
                {completed ? (
                  <span className="ms-score-done"><i className="mdi mdi-check-decagram" aria-hidden="true" />{t('member.profileComplete')}</span>
                ) : (
                  <Link to="/profil" className="ms-score-cta">
                    {t('member.profileCta')}
                    <i className="mdi mdi-arrow-right" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </aside>
          </div>
        </section>

        {/* Quick access */}
        <div className="quick-head">
          <div>
            <h2>{t('member.quickAccess')}</h2>
            <p>{t('member.quickSub')}</p>
          </div>
        </div>

        <div className="quick-grid">
          <QuickCard to="/profil" accent="gold" icon="mdi-account-edit-outline"
                     title={t('member.card.profil')}
                     sub={profile
                       ? `${t('member.card.profil.edit')} (${completion}%)`
                       : t('member.card.profil.new')} />
          <QuickCard to="/ma-carte" accent="navy" icon="mdi-card-account-details-outline"
                     title={t('member.card.card')}
                     sub={profile?.member_card?.card_number
                       ? `No. ${profile.member_card.card_number}`
                       : t('member.card.card.sub')} />
          {isLearner && (
            <QuickCard to="/education" accent="blue" icon="mdi-school-outline"
                       title={t('member.card.courses')}
                       sub={t('member.card.courses.sub')} />
          )}
          <QuickCard to="/mentorat" accent="green" icon="mdi-account-supervisor-outline"
                     title={t('member.card.mentorship')}
                     sub={t('member.card.mentorship.sub')} />
          <QuickCard to="/annuaire" accent="amber" icon="mdi-account-group-outline"
                     title={t('member.card.directory')}
                     sub={t('member.card.directory.sub')} />
          <QuickCard to="/evenements" accent="violet" icon="mdi-calendar-month-outline"
                     title={t('member.card.events')}
                     sub={t('member.card.events.sub')} />
          {isAdmin && (
            <QuickCard to="/admin" accent="violet" icon="mdi-shield-crown-outline"
                       title="Tableau de bord admin"
                       sub="Gérer membres, contenus et statistiques"
                       badge="Admin" />
          )}
        </div>

        {/* ── Ressources académiques ── */}
        <section className="ms-resources">
          <div className="ms-res-header">
            <div className="ms-res-title-wrap">
              <div className="ms-res-icon">
                <i className="mdi mdi-book-upload-outline" />
              </div>
              <div>
                <h2 className="ms-res-title">Ressources académiques</h2>
                <p className="ms-res-sub">
                  Partagez vos épreuves, corrigés et notes avec la communauté
                </p>
              </div>
            </div>
            <button className="ms-res-cta" onClick={() => setShowForm(true)} type="button">
              <i className="mdi mdi-plus" />
              Soumettre une ressource
            </button>
          </div>

          {/* Submissions list */}
          <div className="ms-sub-list">
            {subsLoading ? (
              <div className="ms-sub-empty">
                <i className="mdi mdi-loading mdi-spin" style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }} />
                <span>Chargement…</span>
              </div>
            ) : submissions.length === 0 ? (
              <div className="ms-sub-empty">
                <i className="mdi mdi-inbox-outline ms-sub-empty-icon" />
                <span>Vous n'avez pas encore soumis de ressource.</span>
                <button className="ms-sub-empty-btn" onClick={() => setShowForm(true)} type="button">
                  <i className="mdi mdi-upload-outline" /> Soumettre ma première ressource
                </button>
              </div>
            ) : (
              submissions.map((s) => <SubmissionRow key={s.id} sub={s} />)
            )}
          </div>
        </section>

      </div>

      {/* Modal form */}
      {showForm && (
        <ResourceSubmitForm
          onClose={() => setShowForm(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`ms-toast ${toast.ok ? 'ms-toast-ok' : 'ms-toast-err'}`}>
          <i className={`mdi ${toast.ok ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline'}`} />
          {toast.msg}
        </div>
      )}
    </div>
  )
}
