import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EducationLayout from '../components/education/EducationLayout'
import './ResourceContribute.css'

export default function ResourceContribute() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [resourceType, setResourceType] = useState('exam') // 'exam' | 'solution'
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  const [year, setYear] = useState('')
  const [session, setSession] = useState('')
  const [files, setFiles] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files)
      setFiles((prev) => [...prev, ...droppedFiles])
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...selectedFiles])
    }
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!subject || !level || !year || !session) {
      alert('Veuillez renseigner tous les champs obligatoires (matière, niveau, année, session).')
      return
    }
    if (files.length === 0) {
      alert('Veuillez ajouter au moins un fichier PDF ou image.')
      return
    }

    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
    }, 1200)
  }

  return (
    <EducationLayout activeNav="Éducation">
      <div className="rc-view-container">

        {/* ══ TITRES DE LA PAGE (Écran 4) ══ */}
        <div className="rc-header">
          <h1 className="rc-title">Proposer une nouvelle ressource</h1>
          <p className="rc-subtitle">
            Vous pouvez soumettre une épreuve ou un corrigé pour enrichir la bibliothèque de la plateforme.
            Votre proposition sera vérifiée par un administrateur avant publication.
          </p>
        </div>

        {submitted ? (
          <div className="rc-success-card">
            <div className="rc-success-icon">
              <i className="mdi mdi-check-circle" />
            </div>
            <h2>Merci pour votre contribution !</h2>
            <p>
              Votre proposition pour <strong>{subject} ({level}) – {year} Session {session}</strong> a bien été transmise à l'équipe pédagogique. Elle sera validée et mise en ligne sous peu.
            </p>
            <div className="rc-success-actions">
              <button
                type="button"
                className="rc-btn-primary"
                onClick={() => {
                  setSubmitted(false)
                  setFiles([])
                  setSubject('')
                  setLevel('')
                  setYear('')
                  setSession('')
                }}
              >
                Proposer une autre ressource
              </button>
              <Link to="/education" className="rc-btn-secondary">
                Retour au Hub Éducation
              </Link>
            </div>
          </div>
        ) : (
          /* ══ GRILLE 2 COLONNES (Écran 4) ══ */
          <div className="rc-grid">

            {/* ── COLONNE GAUCHE : FORMULAIRE ── */}
            <form className="rc-form-card" onSubmit={handleSubmit}>

              {/* Type de ressource */}
              <div className="rc-form-group">
                <label className="rc-label">Type de ressource</label>
                <div className="rc-radio-row">
                  <label className={`rc-radio-label ${resourceType === 'exam' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="resourceType"
                      value="exam"
                      checked={resourceType === 'exam'}
                      onChange={() => setResourceType('exam')}
                    />
                    <span className="rc-radio-custom" />
                    <span>Épreuve</span>
                  </label>

                  <label className={`rc-radio-label ${resourceType === 'solution' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="resourceType"
                      value="solution"
                      checked={resourceType === 'solution'}
                      onChange={() => setResourceType('solution')}
                    />
                    <span className="rc-radio-custom" />
                    <span>Corrigé</span>
                  </label>
                </div>
              </div>

              {/* Ligne 1 : Matière & Niveau */}
              <div className="rc-form-row">
                <div className="rc-form-group">
                  <label className="rc-label" htmlFor="rc-subject">Matière</label>
                  <div className="rc-select-wrap">
                    <select
                      id="rc-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    >
                      <option value="">Sélectionner une matière</option>
                      <option value="Mathématiques">Mathématiques</option>
                      <option value="Physique">Physique</option>
                      <option value="Chimie">Chimie</option>
                      <option value="Biologie">Biologie</option>
                      <option value="Informatique (Computer Science)">Informatique (Computer Science)</option>
                      <option value="Économie">Économie</option>
                    </select>
                    <i className="mdi mdi-chevron-down rc-select-arrow" />
                  </div>
                </div>

                <div className="rc-form-group">
                  <label className="rc-label" htmlFor="rc-level">Niveau</label>
                  <div className="rc-select-wrap">
                    <select
                      id="rc-level"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      required
                    >
                      <option value="">Sélectionner un niveau</option>
                      <option value="GCE Ordinary Level (O/L)">GCE Ordinary Level (O/L)</option>
                      <option value="GCE Advanced Level (A/L)">GCE Advanced Level (A/L)</option>
                    </select>
                    <i className="mdi mdi-chevron-down rc-select-arrow" />
                  </div>
                </div>
              </div>

              {/* Ligne 2 : Année & Session */}
              <div className="rc-form-row">
                <div className="rc-form-group">
                  <label className="rc-label" htmlFor="rc-year">Année</label>
                  <div className="rc-select-wrap">
                    <select
                      id="rc-year"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      required
                    >
                      <option value="">Sélectionner une année</option>
                      <option value="2025">2025</option>
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                      <option value="2022">2022</option>
                      <option value="2021">2021</option>
                      <option value="2020">2020</option>
                      <option value="2019">2019</option>
                    </select>
                    <i className="mdi mdi-chevron-down rc-select-arrow" />
                  </div>
                </div>

                <div className="rc-form-group">
                  <label className="rc-label" htmlFor="rc-session">Session</label>
                  <div className="rc-select-wrap">
                    <select
                      id="rc-session"
                      value={session}
                      onChange={(e) => setSession(e.target.value)}
                      required
                    >
                      <option value="">Sélectionner une session</option>
                      <option value="Paper 1 (MCQ / QCM)">Paper 1 (MCQ / QCM)</option>
                      <option value="Paper 2 (Theory / Théorie)">Paper 2 (Theory / Théorie)</option>
                      <option value="Paper 3 (Practical / Pratique)">Paper 3 (Practical / Pratique)</option>
                      <option value="Mock Regional Exam">Mock Régional</option>
                    </select>
                    <i className="mdi mdi-chevron-down rc-select-arrow" />
                  </div>
                </div>
              </div>

              {/* Zone Fichier(s) Drag & Drop */}
              <div className="rc-form-group">
                <label className="rc-label">Fichier(s)</label>

                <div
                  className={`rc-dropzone ${dragActive ? 'drag-active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />

                  <div className="rc-drop-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
                      <path d="M12 12v9"/>
                      <path d="m16 16-4-4-4 4"/>
                    </svg>
                  </div>

                  <p className="rc-drop-text">
                    <strong>Glissez-déposez vos fichiers ici</strong>
                    <br />
                    <span>ou cliquez pour parcourir</span>
                  </p>
                  <small className="rc-drop-hint">(PDF, images, etc.)</small>
                </div>

                {/* Liste des fichiers téléversés */}
                {files.length > 0 && (
                  <div className="rc-files-list">
                    {files.map((file, idx) => (
                      <div key={idx} className="rc-file-item">
                        <i className="mdi mdi-file-pdf-box rc-file-pdf-icon" />
                        <div className="rc-file-info">
                          <strong>{file.name}</strong>
                          <small>{(file.size / 1024 / 1024).toFixed(2)} Mo</small>
                        </div>
                        <button
                          type="button"
                          className="rc-file-remove"
                          onClick={() => removeFile(idx)}
                          aria-label="Supprimer ce fichier"
                        >
                          <i className="mdi mdi-close" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bouton de soumission */}
              <div className="rc-submit-row">
                <button
                  type="submit"
                  className="rc-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Envoi en cours...' : 'Soumettre la ressource'}
                </button>
              </div>

            </form>

            {/* ── COLONNE DROITE : CONSEILS (Écran 4) ── */}
            <div className="rc-tips-panel">
              <div className="rc-tips-card">
                <h3 className="rc-tips-title">Conseils</h3>

                <ul className="rc-tips-list">
                  <li>
                    <span className="rc-check-icon">
                      <i className="mdi mdi-check" />
                    </span>
                    <p>Assurez-vous que le fichier est clair et lisible.</p>
                  </li>

                  <li>
                    <span className="rc-check-icon">
                      <i className="mdi mdi-check" />
                    </span>
                    <p>Si vous proposez un corrigé, il doit être bien détaillé.</p>
                  </li>

                  <li>
                    <span className="rc-check-icon">
                      <i className="mdi mdi-check" />
                    </span>
                    <p>Évitez les doublons (vérifiez d'abord si la ressource n'existe pas déjà).</p>
                  </li>
                </ul>
              </div>
            </div>

          </div>
        )}

      </div>
    </EducationLayout>
  )
}
