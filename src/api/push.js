/* Abonnement aux poussées web (Push API + VAPID).

   Parcours : permission du navigateur -> abonnement pushManager -> enregistrement
   aupres du backend (POST /notifications/push_subscribe/). Le service worker
   (public/sw.js) affiche ensuite les notifications recues.

   Toutes les fonctions degradent en silence : sans service worker, sans
   permission ou sans backend, elles retournent false au lieu de lever. */

import api from './client'

export function pushDispo() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/* Désactivation explicite depuis l'application (distinct du blocage navigateur :
   la permission peut rester accordée). Tant que ce drapeau est levé, aucune
   resynchronisation silencieuse ne réabonne le navigateur. */
const CLE_PUSH_OFF = 'push_disabled'

function pushDesactive() {
  try {
    return localStorage.getItem(CLE_PUSH_OFF) === '1'
  } catch {
    return false
  }
}

/* La cle publique VAPID arrive en base64url : Push API attend un Uint8Array. */
function versUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64url = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(base64url)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/* Abonnement du navigateur, cree s'il n'existe pas encore. */
async function abonnement(registration, publicKey) {
  let sub = await registration.pushManager.getSubscription()
  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: versUint8Array(publicKey),
    })
  }
  return sub
}

/* Synchronise l'abonnement courant avec le backend. True si actif. */
export async function synchroniserPush() {
  if (!pushDispo() || Notification.permission !== 'granted' || pushDesactive()) {
    return false
  }
  try {
    const { data } = await api.get('/notifications/push_config/')
    if (!data.enabled || !data.public_key) return false
    const registration = await navigator.serviceWorker.ready
    const sub = await abonnement(registration, data.public_key)
    await api.post('/notifications/push_subscribe/', sub.toJSON())
    return true
  } catch {
    return false
  }
}

/* Demande la permission puis synchronise. Retourne l'etat final. */
export async function activerPush() {
  if (!pushDispo()) return 'unsupported'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission
  try {
    localStorage.removeItem(CLE_PUSH_OFF)
  } catch { /* stockage indisponible : on tente quand meme */ }
  await synchroniserPush()
  return 'granted'
}

/* Retire l'abonnement cote backend puis cote navigateur. */
export async function desactiverPush() {
  if (!pushDispo()) return
  try {
    localStorage.setItem(CLE_PUSH_OFF, '1')
    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.getSubscription()
    if (sub) {
      await api.post('/notifications/push_unsubscribe/', { endpoint: sub.endpoint })
      await sub.unsubscribe()
    }
  } catch {
    /* Rien a signaler : le prochain envoi purgera l'abonnement perime. */
  }
}

/* Etat courant pour l'interface : 'on' | 'off' | 'unsupported'. */
export function etatPush() {
  if (!pushDispo()) return 'unsupported'
  if (Notification.permission === 'granted' && !pushDesactive()) return 'on'
  return 'off'
}
