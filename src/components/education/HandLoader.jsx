import Lottie from 'lottie-react'

import handLoading from '../../assets/hand-loading.json'

/* Animation fournie pour les etats de chargement (main avec ses briques). */
export default function HandLoader() {
  return (
    <div className="hand-loader" aria-hidden="true">
      <Lottie animationData={handLoading} loop autoplay />
    </div>
  )
}
