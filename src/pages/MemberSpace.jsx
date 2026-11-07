import { Link } from 'react-router-dom'
import { mediaUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../context/ProfileContext'
import { useLang } from '../context/LangContext'
import ProfileAvatar from '../components/ProfileAvatar'

const LEARNER_ROLES = ['student', 'teacher', 'admin']
const ADMIN_ROLES = ['admin']

const completionOf = (profile) => {
  if (!profile) return 0
  const filled = [profile.photo, profile.graduation_year, profile.profession,
    profile.company, profile.city, profile.bio].filter(Boolean).length
  return Math.round((filled / 6) * 100)
}

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

export default function MemberSpace() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { t } = useLang()
  const isLearner = LEARNER_ROLES.includes(user.role)
  const isAdmin = ADMIN_ROLES.includes(user.role)

  const fullName = `${user.first_name} ${user.last_name}`.trim() || user.username
  const firstName = user.first_name || user.username
  const roleLabel = t(`auth.role.${user.role}`) || user.role
  const completion = completionOf(profile)
  const completed = completion >= 100

  return (
    <div className="ms-page">
      <div className="page">
        <nav className="ms-crumbs" aria-label="Fil d'Ariane">
          <Link to="/"><i className="mdi mdi-home-outline" aria-hidden="true" />{t('nav.home')}</Link>
          <span className="ms-crumbs-sep" aria-hidden="true">›</span>
          <span className="ms-crumbs-current">{t('member.breadcrumb')}</span>
        </nav>

        {/* En-tête tableau de bord : identité, rôle et complétion du profil */}
        <section className="ms-topcard">
          <div className="ms-topcard-main">
            <span className="ms-topcard-avatar">
              <ProfileAvatar src={mediaUrl(profile?.photo)} name={fullName} />
              <span className="ms-topcard-status" aria-hidden="true" />
            </span>
            <div className="ms-topcard-id">
              <span className="ms-role-pill">
                <i className="mdi mdi-shield-check-outline" aria-hidden="true" />
                {roleLabel}
              </span>
              <h1 className="ms-topcard-title">
                {t('member.hello')}, <span className="ms-topcard-name">{firstName}</span>
              </h1>
              <p className="ms-topcard-sub">{t('member.sub')}</p>
              <div className="ms-chips">
                <span className="ms-chip">
                  <i className="mdi mdi-email-outline" aria-hidden="true" />{user.email}
                </span>
                {profile?.graduation_year && (
                  <span className="ms-chip">
                    <i className="mdi mdi-school-outline" aria-hidden="true" />{t('memberSpace.classOf')} {profile.graduation_year}
                  </span>
                )}
                {profile?.profession && (
                  <span className="ms-chip">
                    <i className="mdi mdi-briefcase-outline" aria-hidden="true" />{profile.profession}
                  </span>
                )}
                {profile?.city && (
                  <span className="ms-chip">
                    <i className="mdi mdi-map-marker-outline" aria-hidden="true" />{profile.city}
                  </span>
                )}
              </div>
            </div>
          </div>

          <aside className="ms-score" aria-label={t('member.profileMeter')}>
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
      </div>
    </div>
  )
}