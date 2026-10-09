import { useCallback, useEffect, useRef, useState } from 'react'
import { useLang } from '../context/LangContext'

/* La plateforme ne depend que du navigateur : on la lit une fois, a
   l'initialisation, plutot que dans un effet. Un effet declencherait un rendu
   supplementaire inutile au demarrage. */
function detecterPlateforme() {
  if (typeof window === 'undefined') return 'inconnu'
  /* Lancee depuis l'ecran d'accueil : l'application est deja installee, il n'y a
     donc rien a proposer. */
  const autonome = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  if (autonome) return 'autonome'
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'autre'
}

function lireChoix() {
  try {
    return JSON.parse(localStorage.getItem('pwa-etat') || '{}') || {}
  } catch {
    /* Stockage indisponible (navigation privee) : l'invite peut revenir,
       ce qui est preferable a une invite qui n'apparait jamais. */
    return {}
  }
}

function lireVusIos() {
  try {
    return sessionStorage.getItem('pwa-ios-vu') === '1'
  } catch {
    /* Rien a memoriser : l'invite iOS sera proposee a nouveau. */
    return false
  }
}

/* §1/§9 : rendre l'application installable et signaler les mises a jour.

   Deux contraintes reelles :
   - iOS ne fournit pas `beforeinstallprompt`. L'invite y serait donc invisible
     pour une part importante des membres (qui sont sur telephone). On affiche
     alors la marche a suivre etape par etape, avec le vrai nom du bouton iOS
     (« Partager » puis « Sur l'ecran d'accueil »).
   - L'evenement `beforeinstallprompt` ne se declenche qu'une fois par version.
     Si on l'ignore, il ne revient pas : il faut le mettre en attente.

   Le component ne s'affiche qu'a la demande : une brique de plus dans l'arbre,
   qui n'apparait ni dans la navigation ni dans le test de rendu. */
export default function InstallPrompt() {
  const { t } = useLang()
  const [plateforme] = useState(detecterPlateforme)
  const [choix, setChoix] = useState(lireChoix)
  /* Memoire de la session, lue UNE SEULE FOIS a l'initialisation. Les versions
     precedentes lisaient et ecrivaient `sessionStorage` dans le corps du
     rendu : sous <StrictMode>, React rend deux fois, la seconde lecture
     trouvait deja l'ecriture de la premiere, et l'invite ne s'affichait plus
     du tout sur iPhone. */
  const [iosVu] = useState(lireVusIos)
  const [invite, setInvite] = useState(null)
  /* Les gestes manuels sont demandes par le bouton, pas affiches d'emblee :
     la carte reste courte sur petit ecran, et le bouton d'installation est
     toujours la, que l'evenement natif soit arrive ou non.
     Sur iOS, les gestes sont affiches d'emblee : le cas est different (pas de
     telechargement possible) et il faut l'expliquer sans que l'utilisateur ait
     a chercher. */
  const [etapesVisibles, setEtapesVisibles] = useState(() => plateforme === 'ios')
  const [majDispo, setMajDispo] = useState(false)
  const [apparue, setApparue] = useState(false)
  const inviteRef = useRef(null)

  /* On attend d'avoir le temps de lire le haut de la page avant de proposer :
     une brique qui apparait au chargement recouvre le contenu qu'on venait de
     demander. */
  useEffect(() => {
    const minuteur = setTimeout(() => setApparue(true), 4500)
    return () => clearTimeout(minuteur)
  }, [])

  /* Les choix sont memorises dans le navigateur et pas seulement dans un etat
     React : l'invite ne doit pas revenir a chaque rechargement de page. */
  const choisir = useCallback((cle) => {
    setChoix((precedent) => {
      const suivant = { ...precedent, [cle]: true }
      try {
        localStorage.setItem('pwa-etat', JSON.stringify(suivant))
      } catch {
        /* Rien a faire : l'etat reste en memoire pour la session. */
      }
      return suivant
    })
  }, [])

  useEffect(() => {
    const surPrompt = (e) => {
      /* preventDefault() retarde l'invite native : on affiche la notre, qui
         est bilingue. Sans cet appel, Chrome ouvre sa propre boite au hasard. */
      e.preventDefault()
      inviteRef.current = e
      setInvite(e)
    }
    const surChoix = () => {
      /* L'utilisateur a installe : l'invite ne doit plus revenir. */
      choisir('installe')
      setInvite(null)
    }
    window.addEventListener('beforeinstallprompt', surPrompt)
    window.addEventListener('appinstalled', surChoix)

    let enAttente = null
    const surController = () => setMajDispo(true)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', surController)
      enAttente = navigator.serviceWorker.getRegistration()
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', surPrompt)
      window.removeEventListener('appinstalled', surChoix)
      window.removeEventListener('controllerchange', surController)
      enAttente?.then((reg) => reg?.waiting?.postMessage('skip-waiting')).catch(() => {})
    }
  }, [choisir])

  /* iOS n'emet pas d'evenement `appinstalled` dans le navigateur : on marque
     la question comme posee au montage, une fois pour toutes la session. */
  useEffect(() => {
    if (plateforme !== 'ios' || iosVu) return
    try {
      sessionStorage.setItem('pwa-ios-vu', '1')
    } catch {
      /* Rien a memoriser : l'invite sera proposee a nouveau au prochain
         chargement, ce qui est preferable a une invite qui n'apparait jamais. */
    }
  }, [plateforme, iosVu])

  const installer = async () => {
    const evenement = invite || inviteRef.current
    if (!evenement) return
    await evenement.prompt()
    /* L'utilisateur a choisi dans la boite native : plus rien a demander,
       que ce soit accepte ou refuse. */
    setInvite(null)
    choisir('vu')
  }

  /* Un seul bouton, toujours present sur mobile.
     Android : le bouton dit « Installer » quoi qu'il arrive. Avec l'evenement
     natif il ouvre la boite Chrome ; sans lui (HTTP, navigateur qui ne le
     declare pas) il deplie les gestes manuels, qui conduisent au meme resultat.
     iOS n'emet jamais d'evenement : il ouvre les gestes. */
  const surClicInstaller = () => {
    if (invite || inviteRef.current) installer()
    else setEtapesVisibles(true)
  }

  const fermer = () => {
    setInvite(null)
    choisir('refuse')
  }

  if (majDispo) {
    return (
      <div className="pwa-bloc pwa-bloc-maj" role="status">
        <span className="pwa-bloc-icone"><i className="mdi mdi-refresh" /></span>
        <div className="pwa-bloc-texte">
          <strong>{t('pwa.update')}</strong>
        </div>
        <div className="pwa-bloc-actions">
          <button type="button" className="btn-pwa-fantome" onClick={fermer}>
            {t('pwa.installLater')}
          </button>
          <button type="button" className="btn-pwa" onClick={() => window.location.reload()}>
            <i className="mdi mdi-reload" />{t('pwa.updateAction')}
          </button>
        </div>
      </div>
    )
  }

  if (!apparue) return null
  if (plateforme === 'autonome') return null
  if (choix.refuse || choix.installe) return null
  /* Sur iOS, on ne pose la question qu'une fois par session : la marche a
     suivre est connue, la repeter a chaque visite agacerait. */
  if (plateforme === 'ios' && iosVu) return null

  const points = ['rapide', 'horsligne', 'notifications']
  const ios = plateforme === 'ios'

  return (
    <aside className="pwa-bloc" aria-label={ios ? t('pwa.ios.titre') : t('pwa.android.titre')}>
      <button
        type="button"
        className="pwa-bloc-fermer"
        onClick={fermer}
        aria-label={t('pwa.installLater')}
      >
        <i className="mdi mdi-close" />
      </button>

      <div className="pwa-bloc-entete">
        <img className="pwa-bloc-logo" src="/pwa-192.png" alt="" width="52" height="52" />
        <div>
          <strong className="pwa-bloc-titre">{ios ? t('pwa.ios.titre') : t('pwa.android.titre')}</strong>
          <p className="pwa-bloc-sous-titre">{t('pwa.nomCourt')}</p>
        </div>
      </div>

      <p className="pwa-bloc-desc">{ios ? t('pwa.ios.corps') : t('pwa.installBody')}</p>

      {!ios && (
        <ul className="pwa-bloc-atouts">
          {points.map((cle) => (
            <li key={cle}>
              <span className="pwa-atout-icone"><i className={`mdi mdi-${t(`pwa.atout.${cle}.icone`)}`} /></span>
              {t(`pwa.atout.${cle}.texte`)}
            </li>
          ))}
        </ul>
      )}

{/* iPhone ne peut pas telecharger l'application : la carte explique le cas
          et donne les gestes immediatement, avec un seul bouton de fermeture.
          Sur les autres plates-formes, un bouton unique sert aux deux cas :
          avec l'evenement natif il ouvre la boite Chrome ; sans lui il deplie
          les gestes manuels, qui conduisent au meme resultat. */}
      {ios ? (
        <ol className="pwa-bloc-etapes">
          <li>
            <span className="pwa-etape-num"><i className="mdi mdi-share-variant-outline" /></span>
            {t('pwa.ios.etape1')}
          </li>
          <li>
            <span className="pwa-etape-num"><i className="mdi mdi-plus-box-outline" /></span>
            {t('pwa.ios.etape2')}
          </li>
        </ol>
      ) : (
        <>
          <div className="pwa-bloc-actions">
            <button type="button" className="btn-pwa-fantome" onClick={fermer}>
              {t('pwa.installLater')}
            </button>
<button type="button" className="btn-pwa" onClick={surClicInstaller}>
              <i className="mdi mdi-download-outline" />
              {t('pwa.install')}
            </button>
          </div>

          {etapesVisibles && (
            <ol className="pwa-bloc-etapes">
              <li>
                <span className="pwa-etape-num"><i className="mdi mdi-dots-vertical" /></span>
                {t('pwa.android.etape1')}
              </li>
              <li>
                <span className="pwa-etape-num"><i className="mdi mdi-plus-box-outline" /></span>
                {t('pwa.android.etape2')}
              </li>
            </ol>
          )}
        </>
      )}

      {ios && (
        <div className="pwa-bloc-actions">
          <p className="pwa-bloc-astuce">{t('pwa.ios.bonASavoir')}</p>
          <button type="button" className="btn-pwa" onClick={fermer}>
            <i className="mdi mdi-check" />{t('pwa.compris')}
          </button>
        </div>
      )}
    </aside>
  )
}