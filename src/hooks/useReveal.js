import { useEffect, useRef } from 'react'

/* Révèle les éléments .reveal au scroll (IntersectionObserver) */
export function useReveal() {
  const ref = useRef(null)

  useEffect(() => {
    const root = ref.current ?? document
    const els = root.querySelectorAll('.reveal')
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed')
          observer.unobserve(e.target)
        }
      }),
      { threshold: 0.15 }
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return ref
}
