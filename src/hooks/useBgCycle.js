import { useEffect, useState } from 'react'

/* Cycle d'ambiances PARTAGÉ : un seul minuteur global pour toute la page.
   Toutes les sections (hero, chiffres, CTA) changent en même temps. */
const DURATION = 9000
const DELAY = 4000
const COUNT = 3

let index = 0
let started = false
const listeners = new Set()

function start() {
  if (started) return
  started = true
  setTimeout(() => {
    index = 1
    listeners.forEach((fn) => fn(index))
    setInterval(() => {
      index = (index + 1) % COUNT
      listeners.forEach((fn) => fn(index))
    }, DURATION)
  }, DELAY)
}

export function useBgCycle() {
  const [active, setActive] = useState(index)
  useEffect(() => {
    listeners.add(setActive)
    start()
    return () => listeners.delete(setActive)
  }, [])
  return active
}
