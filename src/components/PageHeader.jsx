import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

/* En-tête des pages internes : fond animé sobre, breadcrumb, titre orné.
   L'option photo (image libre de droits) ajoute de l'immersion.
   Parallaxe discrète : orbes et photo suivent doucement le pointeur. */
export default function PageHeader({ eyebrow, title, sub, breadcrumb, image, children }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    /* Uniquement pointeur fin (pas le tactile) et si le mouvement est accepté */
    if (!window.matchMedia('(hover: hover)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const tilt = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        el.style.setProperty('--ph-px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
        el.style.setProperty('--ph-py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
      })
    }
    const reset = () => {
      cancelAnimationFrame(raf)
      el.style.setProperty('--ph-px', '0')
      el.style.setProperty('--ph-py', '0')
    }
    el.addEventListener('pointermove', tilt)
    el.addEventListener('pointerleave', reset)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', tilt)
      el.removeEventListener('pointerleave', reset)
    }
  }, [])

  return (
    <section className="page-header" ref={ref}>
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
