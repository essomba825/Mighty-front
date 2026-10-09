import { useEffect, useState } from 'react'
import { activerPush, pushDispo, synchroniserPush } from '../api/push'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

/* Bannière d'opt-in aux notifications web push.

   - membre connecté et compte actif uniquement ;
   - si la permission est déjà accordée : resynchronisation silencieuse
     de l'abonnement (un abonnement peut être perdu après un nettoyage
     de navigateur) ;
   - si elle est encore « default » : proposition, une seule fois
     (« Plus tard » mémorisé dans localStorage). */

const CLE_REPROUVE = 'push_prompt_dismissed'

export default function PushPrompt() {
  const { user } = useAuth()
  const { t } = useLang()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!user || user.status !== 'active' || !pushDispo()) {
      setVisible(false)
      return
    }
    if (Notification.permission === 'granted') {
      synchroniserPush()
      setVisible(false)
      return
    }
    setVisible(
      Notification.permission === 'default' &&
      !localStorage.getItem(CLE_REPROUVE),
    )
  }, [user])

  if (!visible) return null

  const activer = async () => {
    const etat = await activerPush()
    if (etat === 'default' || etat === 'denied') {
      localStorage.setItem(CLE_REPROUVE, '1')
    }
    setVisible(false)
  }

  const plusTard = () => {
    localStorage.setItem(CLE_REPROUVE, '1')
    setVisible(false)
  }

  return (
    <aside className="push-prompt" role="region" aria-label={t('push.title')}>
      <div className="push-prompt-content">
        <i className="mdi mdi-bell-ring-outline push-prompt-icon" aria-hidden="true" />
        <div className="push-prompt-text">
          <strong>{t('push.title')}</strong>
          <p>{t('push.body')}</p>
        </div>
      </div>
      <div className="push-prompt-actions">
        <button type="button" className="btn-primary" onClick={activer}>
          {t('push.allow')}
        </button>
        <button type="button" className="btn-link" onClick={plusTard}>
          {t('push.later')}
        </button>
      </div>
    </aside>
  )
}
