import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
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
  const { t, lang } = useLang()
  const isLearner = LEARNER_ROLES.includes(user.role)
  const isAdmin = ADMIN_ROLES.includes(user.role)

  const fullName = `${user.first_name} ${user.last_name}`.trim() || user.username
  const roleLabel = t(`auth.role.${user.role}`) || user.role
  const completion = completionOf(profile)

  return (
    <div>
      <PageHeader
        eyebrow={roleLabel}
        title={`${t('member.hello')} ${user.first_name || user.username}`}
        sub={t('member.sub')}
        breadcrumb={t('member.breadcrumb')}
      />

      <div className="page">
        {/* Member hero */}
        <div className="ms-hero ms-hero-member">
          <span className="ms-avatar">
            <ProfileAvatar name={fullName} />
          </span>
          <div className="ms-hero-info">
            <h2>{fullName}</h2>
            <p className="ms-member-email">{user.email} · {roleLabel}</p>
            {profile && (
              <p className="ms-member-meta">
                {profile.graduation_year && <span>{t('memberSpace.classOf')} {profile.graduation_year}</span>}
                {profile.profession && <span> · {profile.profession}</span>}
                {profile.city && <span> · {profile.city}</span>}
              </p>
            )}
          </div>
          {profile && (
            <div className="ms-meter">
              <div className="ms-meter-heading">
                <p className="ms-meter-label">{t('member.profileMeter')}</p>
                <p className="ms-meter-value">{completion}%</p>
              </div>
              <div className="ms-meter-track" role="progressbar" aria-valuemin="0" aria-valuemax="100"
                   aria-valuenow={completion} aria-label={t('member.profileMeter')}>
                <span className="ms-meter-fill" style={{ width: `${completion}%` }} />
              </div>
              {completion < 100 && (
                <Link to="/profil" className="ms-meter-cta">
                  <i className="mdi mdi-pencil-outline" /> Compléter mon profil
                </Link>
              )}
            </div>
          )}
        </div>

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