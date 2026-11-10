import { useState, useRef } from 'react'
import api from '../api/client'
import './ResourceSubmitForm.css'

const RESOURCE_TYPES = [
  { value: 'past_paper', label: 'Past Paper / Épreuve' },
  { value: 'correction', label: 'Correction / Corrigé' },
  { value: 'notes', label: 'Notes de cours' },
  { value: 'textbook', label: 'Livre / Manuel' },
  { value: 'other', label: 'Autre ressource' },
]

const LEVELS = [
  { value: 'ol', label: 'GCE O/L' },
  { value: 'al', label: 'GCE A/L' },
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 35 }, (_, i) => CURRENT_YEAR - i)

export default function ResourceSubmitForm({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    resource_type: 'past_paper',
    level: 'al',
    year: CURRENT_YEAR,
    title: '',
    description: '',
  })
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFile = (f) => {
    if (!f) return
    if (f.type !== 'application/pdf') {
      setError('Seuls les fichiers PDF sont acceptés.')
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('Le fichier ne doit pas dépasser 50 Mo.')
      return
    }
    setError(null)
    setFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { setError('Veuillez joindre un fichier PDF.'); return }
    if (!form.title.trim()) { setError('Le titre est obligatoire.'); return }

    setSubmitting(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('pdf_file', file)
      fd.append('resource_type', form.resource_type)
      fd.append('level', form.level)
      fd.append('year', form.year)
      fd.append('title', form.title.trim())
      fd.append('description', form.description.trim())
      await api.post('/exams/submissions/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onSuccess?.()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const msgs = Object.values(data).flat().join(' ')
        setError(msgs || 'Une erreur est survenue.')
      } else {
        setError('Une erreur est survenue. Réessayez.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rsf-backdrop" onClick={onClose}>
      <div className="rsf-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rsf-header">
          <div className="rsf-header-icon">
            <i className="mdi mdi-upload-outline" />
          </div>
          <div>
            <h2 className="rsf-title">Soumettre une ressource</h2>
            <p className="rsf-subtitle">
              Partagez vos épreuves, corrigés ou notes avec la communauté
            </p>
          </div>
          <button className="rsf-close" onClick={onClose} type="button" aria-label="Fermer">
            <i className="mdi mdi-close" />
          </button>
        </div>

        <form className="rsf-form" onSubmit={handleSubmit}>
          {/* Type + Level */}
          <div className="rsf-row">
            <label className="rsf-field">
              <span>Type de ressource</span>
              <select name="resource_type" value={form.resource_type} onChange={handleChange}>
                {RESOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="rsf-field">
              <span>Niveau</span>
              <select name="level" value={form.level} onChange={handleChange}>
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </label>
            <label className="rsf-field rsf-field-sm">
              <span>Année</span>
              <select name="year" value={form.year} onChange={handleChange}>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Title */}
          <label className="rsf-field">
            <span>Titre <span className="rsf-req">*</span></span>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Ex. Physics Paper 1 (A/L) – 2023"
              maxLength={255}
              required
            />
          </label>

          {/* Description */}
          <label className="rsf-field">
            <span>Description / notes <span className="rsf-opt">(facultatif)</span></span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Décrivez le contenu, la source, l'état du document…"
            />
          </label>

          {/* File drop zone */}
          <div
            className={`rsf-dropzone${dragOver ? ' rsf-dz-over' : ''}${file ? ' rsf-dz-ok' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="rsf-file-input"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {file ? (
              <>
                <i className="mdi mdi-file-pdf-box rsf-dz-icon rsf-dz-icon-ok" />
                <span className="rsf-dz-name">{file.name}</span>
                <span className="rsf-dz-size">{(file.size / 1024 / 1024).toFixed(1)} Mo</span>
              </>
            ) : (
              <>
                <i className="mdi mdi-cloud-upload-outline rsf-dz-icon" />
                <span className="rsf-dz-hint">
                  Glissez votre PDF ici ou <u>cliquez pour parcourir</u>
                </span>
                <span className="rsf-dz-limit">PDF uniquement · max 50 Mo</span>
              </>
            )}
          </div>

          {error && (
            <div className="rsf-error">
              <i className="mdi mdi-alert-circle-outline" /> {error}
            </div>
          )}

          <div className="rsf-footer">
            <button type="button" className="rsf-btn-cancel" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="rsf-btn-submit" disabled={submitting}>
              {submitting
                ? <><i className="mdi mdi-loading mdi-spin" /> Envoi en cours…</>
                : <><i className="mdi mdi-send-outline" /> Soumettre</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
