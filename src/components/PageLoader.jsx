import { lazy, Suspense } from 'react'

/* Le lecteur Lottie est code-splite : il ne pese rien tant qu'aucun etat de
   chargement n'est montre. Ton animation `hand-loading` tourne en boucle. */
const HandLoader = lazy(() => import('./education/HandLoader'))

export default function PageLoader({ label = '', compact = false }) {
  return (
    <div className={`page-loader ${compact ? 'is-compact' : ''}`}
         role="status" aria-live="polite" aria-busy="true">
      <Suspense fallback={<div className="page-loader-spot" aria-hidden="true" />}>
        <HandLoader />
      </Suspense>
      {label && <p>{label}</p>}
    </div>
  )
}
