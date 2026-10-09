import { useEffect, useState } from 'react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import { useLang } from '../context/LangContext'

const ROLE_ICONS = { alumni: 'mdi-account-tie-outline', student: 'mdi-school-outline',
                     teacher: 'mdi-human-male-board', partner: 'mdi-handshake-outline',
                     admin: 'mdi-shield-crown-outline' }

export default function Stats() {
  const { t, lang } = useLang()
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB'
  const [stats, setStats] = useState(null)
  const [forbidden, setForbidden] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/stats/')
      .then(({ data }) => setStats(data))
      .catch((e) => e.response?.status === 403 && setForbidden(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div>
      <PageHeader eyebrow={t('stats.eyebrow')} title={t('stats.title')} breadcrumb={t('stats.title')} />
      <div className="page"><div className="skeleton-wrap">{[0, 1, 2].map((i) => <div key={i} className="skeleton-card"><div className="skeleton-line w60" /><div className="skeleton-line w40" /></div>)}</div></div>
    </div>
  )
  if (forbidden) return (
    <div>
      <PageHeader eyebrow={t('stats.eyebrow')} title={t('stats.title')} breadcrumb={t('stats.title')} />
      <div className="page empty-state">
        <i className="mdi mdi-lock-outline empty-icon" />
        <h2>{t('stats.restricted')}</h2>
        <p>{t('stats.restrictedHint')}</p>
      </div>
    </div>
  )
  if (!stats) return <p className="page">{t('common.error')}</p>

  const blocks = [
    { title: t('stats.activeMembers'), icon: 'mdi-account-group-outline', value: stats.members.total,
      sub: `${stats.members.pending_validation} en attente de validation` },
    { title: t('stats.collected'), icon: 'mdi-cash-multiple', value: `${Number(stats.contributions.total_amount).toLocaleString(locale)} FCFA`,
      sub: `${stats.contributions.confirmed_count} confirmées · ${stats.contributions.pending_count} en attente` },
    { title: t('home.stat.projects'), icon: 'mdi-rocket-launch-outline', value: stats.projects.active,
      sub: `${t('stats.budgetTotal')} ${Number(stats.projects.budget_total).toLocaleString(locale)} FCFA` },
    { title: t('stats.partnerships'), icon: 'mdi-handshake-outline', value: stats.partnerships.total,
      sub: `${stats.partnerships.new} nouvelle(s) demande(s)` },
    { title: t('stats.coursesPublished'), icon: 'mdi-book-open-outline', value: stats.education.courses_published,
      sub: `${stats.education.courses_pending} en attente de validation` },
    { title: t('stats.quizAttempts'), icon: 'mdi-clipboard-check-outline', value: stats.education.quiz_attempts,
      sub: `Moyenne générale : ${stats.education.quiz_average}%` },
    { title: t('events.title'), icon: 'mdi-calendar-month-outline', value: stats.events.total, sub: '' },
  ]

  return (
    <div>
      <PageHeader
        eyebrow={t('stats.eyebrow')}
        title={t('stats.platform')}
        sub={t('stats.sub')}
        breadcrumb={t('stats.title')}
      />

      <div className="page">
        <div className="stat-grid">
          {blocks.map((b) => (
            <article key={b.title} className="card stat-card">
              <span className="stat-icon"><i className={`mdi ${b.icon}`} /></span>
              <h3>{b.title}</h3>
              <p className="stat-value">{b.value}</p>
              {b.sub && <small>{b.sub}</small>}
            </article>
          ))}
        </div>

        <p className="donate-step-title" style={{ marginTop: 34 }}><i className="mdi mdi-account-group-outline" /> {t('stats.byRole')}</p>
        <div className="stat-grid roles">
          {Object.entries(stats.members.by_role).map(([role, n]) => (
            <article key={role} className="card stat-card">
              <span className="stat-icon"><i className={`mdi ${ROLE_ICONS[role] || 'mdi-account-outline'}`} /></span>
              <h3>{t(`stats.role.${role}`) || role}</h3>
              <p className="stat-value">{n}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
