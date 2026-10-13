import { useEffect, useRef, useState } from 'react'

import handLoading from '../../assets/hand-loading.json'

/* Joue l'animation Lottie fournie. Le moteur `lottie-web` est charge en differe
   (chunk separe) et seulement quand le lecteur s'affiche, donc l'appli reste
   legere a l'ouverture. On pilote lottie-web directement : pas de dependance
   enveloppe a maintenir. */
export default function HandLoader() {
  const holder = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let anim = null
    let cancelled = false
    import('lottie-web')
      .then((mod) => {
        if (cancelled || !holder.current) return
        anim = mod.default.loadAnimation({
          container: holder.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: handLoading,
        })
      })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true; anim?.destroy() }
  }, [])

  if (failed) return null
  return <div className="hand-loader" ref={holder} aria-hidden="true" />
}
