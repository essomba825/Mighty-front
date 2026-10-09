import { Link } from 'react-router-dom'

/* En-tête des pages internes : fond animé sobre, breadcrumb, titre orné.
   L'option photo (image libre de droits) ajoute de l'immersion. */
export default function PageHeader({ eyebrow, title, sub, breadcrumb, image, children }) {
  return (
    <section className="page-header">
      {image && (
        <img className="ph-photo" src={image} alt="" onError={(e) => e.currentTarget.remove()} />
      )}
      <div className="ph-orbs" aria-hidden="true">
        <span className="ph-orb ph-orb-1" />
        <span className="ph-orb ph-orb-2" />
        <span className="ph-orb ph-orb-3" />
      </div>
      <div className="ph-guilloche" aria-hidden="true" />

      <div className="page-header-inner">
        <nav className="breadcrumb" aria-label="Fil d'Ariane">
          <Link to="/">Accueil</Link>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">{breadcrumb || title}</span>
        </nav>

        <p className="ph-eyebrow">
          <span className="ph-line" />
          {eyebrow}
          <span className="ph-line" />
        </p>

        <h1>{title}</h1>
        <div className="ph-flourish" aria-hidden="true" />
        {sub && <p className="page-header-sub">{sub}</p>}
        {children}
      </div>
    </section>
  )
}
