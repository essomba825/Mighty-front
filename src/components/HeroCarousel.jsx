import { lazy, Suspense } from 'react'
import { useBgCycle } from '../hooks/useBgCycle'

const Hero3D = lazy(() => import('./Hero3D'))

/* Carrousel de fonds synchronisé : toutes les sections changent d'ambiance
   en même temps. Le contenu reste au-dessus, inchangé. */
export default function HeroCarousel() {
  const active = useBgCycle()

  return (
    <div className="hero-bg-carousel" aria-hidden="true">
      {/* Ambiance 0 — aurora 3D */}
      <div className={`hero-bg-layer hero-bg-aurora ${active === 0 ? 'active' : ''}`}>
        <Suspense fallback={<div className="hero-bg-fallback" />}>
          <Hero3D />
        </Suspense>
      </div>

      {/* Ambiance 1 — soie dorée */}
      <div className={`hero-bg-layer hero-bg-silk ${active === 1 ? 'active' : ''}`} />

      {/* Ambiance 2 — poussière d'or */}
      <div className={`hero-bg-layer hero-bg-dust ${active === 2 ? 'active' : ''}`} />
    </div>
  )
}
