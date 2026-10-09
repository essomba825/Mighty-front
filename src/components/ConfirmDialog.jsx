/* Mini boîte de dialogue de confirmation (modale). */
import { useLang } from '../context/LangContext'

export default function ConfirmDialog({ open, icon, title, message,
                                         confirmLabel, cancelLabel,
                                         danger = false, loading = false,
                                         onConfirm, onCancel }) {
  const { t } = useLang()
  if (!open) return null

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        {icon && <div className={`dialog-icon ${danger ? 'dialog-icon-danger' : ''}`}>{icon}</div>}
        <h3 className="dialog-title">{title}</h3>
        {message && <p className="dialog-message">{message}</p>}
        <div className="dialog-actions">
          <button className="btn-dialog-cancel" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button className={danger ? 'btn-dialog-danger' : 'btn-dialog-confirm'}
                  onClick={onConfirm} disabled={loading}>
            {loading ? t('common.inProgress') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
