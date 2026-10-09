import { Link } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import PageHeader from '../components/PageHeader'

/* §4 — « About the Batch: history, story, objectives, values and
   leadership/coordination ».
   La page manquait entierement : le menu y renvoyait nulle part. Elle est
   ecrite en dur dans le dictionnaire plutot que dans la base, parce que le
   recit du batch ne change pas d'une annee sur l'autre et qu'un administrateur
   ne doit pas pouvoir le modifier par accident depuis un formulaire de news.
   Ce qui bouge vraiment — evenements, projets, publications — reste lu dans la
   base et affiché plus bas. */
export default function About() {
  const { t } = useLang()

  const valeurs = [
    ['solidarity', 'mdi-hand-heart-outline'],
    ['transmission', 'mdi-account-supervisor-outline'],
    ['memory', 'mdi-archive-outline'],
    ['integrity', 'mdi-shield-check-outline'],
  ]

  const engagements = [
    ['connected', 'mdi-account-group-outline'],
    ['visible', 'mdi-bullhorn-outline'],
    ['support', 'mdi-school-outline'],
    ['memory', 'mdi-image-multiple-outline'],
  ]

  return (
    <>
      <PageHeader eyebrow={t('about.eyebrow')} title={t('about.title')} />

      <section className="section">
        <div className="section-inner">
          <p className="section-intro about-intro">{t('about.intro')}</p>
        </div>
      </section>

      <section className="section section-alt">
        <div className="section-inner">
          <h2 className="section-title">{t('about.story.title')}</h2>
          <p className="section-intro">{t('about.story.body')}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <p className="section-eyebrow">{t('about.values.eyebrow')}</p>
          <h2 className="section-title">{t('about.values.title')}</h2>
          <div className="about-grid">
            {valeurs.map(([cle, icone]) => (
              <article className="about-card" key={cle}>
                <span className="about-card-icon"><i className={`mdi ${icone}`} /></span>
                <h3>{t(`about.values.${cle}.title`)}</h3>
                <p>{t(`about.values.${cle}.body`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="section-inner">
          <p className="section-eyebrow">{t('about.leaders.eyebrow')}</p>
          <h2 className="section-title">{t('about.leaders.title')}</h2>
          <p className="section-intro">{t('about.leaders.body')}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <h2 className="section-title">{t('about.commitment')}</h2>
          <div className="about-grid">
            {engagements.map(([cle, icone]) => (
              <article className="about-card about-card-strong" key={cle}>
                <span className="about-card-icon"><i className={`mdi ${icone}`} /></span>
                <h3>{t(`about.commitment.${cle}.title`)}</h3>
                <p>{t(`about.commitment.${cle}.body`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-final">
        <div className="section-inner">
          <h2>{t('about.cta.title')}</h2>
          <p>{t('about.cta.body')}</p>
          <div className="cta-actions">
            <Link to="/inscription" className="btn-primary">
              <i className="mdi mdi-account-plus-outline" />{t('nav.join')}
            </Link>
            <Link to="/education" className="btn-ghost">
              <i className="mdi mdi-school-outline" />{t('nav.education')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}