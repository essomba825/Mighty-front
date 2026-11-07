import { useState } from 'react'
import { Link } from 'react-router-dom'
import EducationLayout from '../components/education/EducationLayout'
import './ContributionValidation.css'

/* Données initiales issues de la maquette Écran 5 */
const INITIAL_CONTRIBUTIONS = [
  {
    id: 1,
    type: 'Épreuve',
    subject: 'Physique',
    subjectColor: '#7546e7',
    title: 'Physics Paper 2 (A/L) - 2021',
    author: 'M. Nguema',
    date: '12/04/2025',
    status: 'pending',
    level: 'GCE A/L',
    details: 'Épreuve complète scannée haute définition avec 5 problèmes de mécanique et ondes électromagnétiques.'
  },
  {
    id: 2,
    type: 'Corrigé',
    subject: 'Chimie',
    subjectColor: '#f29408',
    title: 'Corrigé - Chemistry Paper 1 (O/L) - 2020',
    author: 'A. Tchinda',
    date: '10/04/2025',
    status: 'pending',
    level: 'GCE O/L',
    details: 'Corrigé officiel détaillé question par question avec barème de notation et explications pédagogiques.'
  },
  {
    id: 3,
    type: 'Épreuve',
    subject: 'Biologie',
    subjectColor: '#08a665',
    title: 'Biology Paper 2 (A/L) - 2022',
    author: 'L. Kamdem',
    date: '08/04/2025',
    status: 'pending',
    level: 'GCE A/L',
    details: 'Épreuve officielle comprenant la section physiologie cellulaire et génétique mendélienne.'
  },
  {
    id: 4,
    type: 'Corrigé',
    subject: 'Mathématiques',
    subjectColor: '#1971f6',
    title: 'Corrigé - Mathematics Paper 1 (O/L) - 2023',
    author: 'S. Mbarga',
    date: '05/04/2025',
    status: 'pending',
    level: 'GCE O/L',
    details: 'Solutions complètes avec méthodes alternatives pour le calcul d\'intégrales et résolutions trigonométriques.'
  },
  {
    id: 5,
    type: 'Épreuve',
    subject: 'Chimie',
    subjectColor: '#f29408',
    title: 'Chemistry Paper 2 (O/L) - 2021',
    author: 'E. Mbe',
    date: '02/04/2025',
    status: 'pending',
    level: 'GCE O/L',
    details: 'Document PDF officiel contenant les exercices de thermochimie et équilibres acido-basiques.'
  },
  {
    id: 6,
    type: 'Épreuve',
    subject: 'Mathématiques',
    subjectColor: '#1971f6',
    title: 'Mathematics Paper 2 (A/L) - 2024',
    author: 'Dr. F. Tchuente',
    date: '28/03/2025',
    status: 'validated',
    level: 'GCE A/L',
    details: 'Validée par le comité académique et déjà intégrée au catalogue.'
  },
  {
    id: 7,
    type: 'Corrigé',
    subject: 'Physique',
    subjectColor: '#7546e7',
    title: 'Corrigé partiel - Physics Paper 1 (O/L)',
    author: 'Inconnu',
    date: '20/03/2025',
    status: 'rejected',
    level: 'GCE O/L',
    details: 'Refusée : document illisible et réponses incomplètes.'
  }
]

export default function ContributionValidation() {
  const [contributions, setContributions] = useState(INITIAL_CONTRIBUTIONS)
  const [activeFilter, setActiveFilter] = useState('pending') // 'pending' | 'validated' | 'rejected'
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 3500)
  }

  const handleValidate = (id) => {
    setContributions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'validated' } : c))
    )
    showToast('La contribution a été validée avec succès et publiée.')
    setSelectedItem(null)
  }

  const handleReject = (id) => {
    setContributions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'rejected' } : c))
    )
    showToast('La contribution a été refusée.')
    setSelectedItem(null)
  }

  const pendingCount = contributions.filter((c) => c.status === 'pending').length
  const validatedCount = contributions.filter((c) => c.status === 'validated').length
  const rejectedCount = contributions.filter((c) => c.status === 'rejected').length

  const filtered = contributions.filter((c) => {
    if (c.status !== activeFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        c.title.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <EducationLayout activeNav="Archives">
      <div className="cv-view-container">

        {/* ══ HEADER (Écran 5) ══ */}
        <div className="cv-header">
          <div>
            <h1 className="cv-title">Gestion des contributions</h1>
            <p className="cv-subtitle">
              Validez ou rejetez les propositions d'épreuves et de corrigés soumises par les membres alumni.
            </p>
          </div>
        </div>

        {/* Toast notification */}
        {toast && (
          <div className="cv-toast">
            <i className="mdi mdi-check-circle" /> {toast}
          </div>
        )}

        {/* ══ TABS DE FILTRAGE (Écran 5) ══ */}
        <div className="cv-tabs-bar">
          <div className="cv-tabs">
            <button
              type="button"
              className={`cv-tab-pill ${activeFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveFilter('pending')}
            >
              En attente ({pendingCount})
            </button>
            <button
              type="button"
              className={`cv-tab-pill ${activeFilter === 'validated' ? 'active' : ''}`}
              onClick={() => setActiveFilter('validated')}
            >
              Validées ({validatedCount})
            </button>
            <button
              type="button"
              className={`cv-tab-pill ${activeFilter === 'rejected' ? 'active' : ''}`}
              onClick={() => setActiveFilter('rejected')}
            >
              Refusées ({rejectedCount})
            </button>
          </div>

          <div className="cv-search-wrap">
            <i className="mdi mdi-magnify" />
            <input
              type="search"
              placeholder="Filtrer les contributions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ══ TABLEAU DES CONTRIBUTIONS (Écran 5) ══ */}
        <div className="cv-table-card">
          <table className="cv-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Matière</th>
                <th>Titre</th>
                <th>Proposé par</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="cv-empty-td">
                    <i className="mdi mdi-file-document-check-outline" />
                    <p>Aucune contribution dans cette catégorie.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="cv-tr">
                    {/* Colonne Type */}
                    <td>
                      <span className={`cv-type-badge ${item.type === 'Épreuve' ? 'exam' : 'corr'}`}>
                        <i className={`mdi ${item.type === 'Épreuve' ? 'mdi-file-document-outline' : 'mdi-file-check-outline'}`} />
                        <span>{item.type}</span>
                      </span>
                    </td>

                    {/* Colonne Matière */}
                    <td>
                      <div className="cv-subject-cell">
                        <span
                          className="cv-subject-dot"
                          style={{ background: item.subjectColor }}
                        />
                        <span>{item.subject}</span>
                      </div>
                    </td>

                    {/* Colonne Titre */}
                    <td>
                      <strong className="cv-paper-title">{item.title}</strong>
                    </td>

                    {/* Colonne Proposé par */}
                    <td>
                      <span className="cv-author">{item.author}</span>
                    </td>

                    {/* Colonne Date */}
                    <td>
                      <span className="cv-date">{item.date}</span>
                    </td>

                    {/* Colonne Actions */}
                    <td>
                      <div className="cv-actions-group">
                        <button
                          type="button"
                          className="cv-btn-view"
                          onClick={() => setSelectedItem(item)}
                          title="Voir les détails"
                        >
                          Voir
                        </button>

                        {item.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              className="cv-btn-validate"
                              onClick={() => handleValidate(item.id)}
                              title="Valider la ressource"
                            >
                              Valider
                            </button>
                            <button
                              type="button"
                              className="cv-btn-reject"
                              onClick={() => handleReject(item.id)}
                              title="Refuser la ressource"
                            >
                              Refuser
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ══ MODAL DE DÉTAIL / APERÇU ══ */}
        {selectedItem && (
          <div className="cv-modal-backdrop" onClick={() => setSelectedItem(null)}>
            <div className="cv-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="cv-modal-header">
                <div>
                  <span className={`cv-type-badge ${selectedItem.type === 'Épreuve' ? 'exam' : 'corr'}`}>
                    {selectedItem.type}
                  </span>
                  <h3 className="cv-modal-title">{selectedItem.title}</h3>
                </div>
                <button
                  type="button"
                  className="cv-modal-close"
                  onClick={() => setSelectedItem(null)}
                >
                  ✕
                </button>
              </div>

              <div className="cv-modal-body">
                <div className="cv-modal-meta-grid">
                  <div>
                    <span>Matière :</span> <strong>{selectedItem.subject}</strong>
                  </div>
                  <div>
                    <span>Niveau :</span> <strong>{selectedItem.level}</strong>
                  </div>
                  <div>
                    <span>Proposé par :</span> <strong>{selectedItem.author}</strong>
                  </div>
                  <div>
                    <span>Date :</span> <strong>{selectedItem.date}</strong>
                  </div>
                </div>

                <div className="cv-modal-desc">
                  <strong>Description &amp; Notes du contributeur :</strong>
                  <p>{selectedItem.details}</p>
                </div>

                {/* Simulation de visionneuse PDF miniature */}
                <div className="cv-modal-doc-preview">
                  <div className="cv-doc-mini-header">
                    <span>Aperçu du document joint (PDF)</span>
                    <a
                      href="http://127.0.0.1:8000/media/exams/papers/physics_al_2025_p1_1e80bf5a.pdf"
                      target="_blank"
                      rel="noreferrer"
                      className="cv-doc-mini-link"
                    >
                      <i className="mdi mdi-open-in-new" /> Ouvrir en plein écran
                    </a>
                  </div>
                  <div className="cv-doc-mini-sheet">
                    <h4>CAMEROON GENERAL CERTIFICATE OF EDUCATION BOARD</h4>
                    <p>Official Examination Document – {selectedItem.title}</p>
                    <div className="cv-doc-dummy-lines" />
                    <div className="cv-doc-dummy-lines" />
                    <div className="cv-doc-dummy-lines short" />
                  </div>
                </div>
              </div>

              <div className="cv-modal-footer">
                {selectedItem.status === 'pending' ? (
                  <>
                    <button
                      type="button"
                      className="cv-btn-reject-modal"
                      onClick={() => handleReject(selectedItem.id)}
                    >
                      <i className="mdi mdi-close" /> Refuser
                    </button>
                    <button
                      type="button"
                      className="cv-btn-validate-modal"
                      onClick={() => handleValidate(selectedItem.id)}
                    >
                      <i className="mdi mdi-check" /> Valider et publier
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="cv-btn-close-modal"
                    onClick={() => setSelectedItem(null)}
                  >
                    Fermer
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </EducationLayout>
  )
}
