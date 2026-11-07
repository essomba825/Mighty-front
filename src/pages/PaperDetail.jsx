import { useState, useMemo } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import EducationLayout from '../components/education/EducationLayout'
import './PaperDetail.css'

/* Données démo enrichies pour les épreuves */
const PAPERS_DATABASE = [
  {
    id: 101,
    slug: 'math-ol-2024-p1',
    subject: 'Mathématiques',
    subjectSlug: 'mathematics',
    level: 'GCE O/L',
    year: 2024,
    session: '1',
    type: 'Paper 1 (Structured Questions)',
    totalPages: 12,
    hasCorrection: true,
    fileUrl: 'http://127.0.0.1:8000/media/exams/papers/physics_al_2025_p1_1e80bf5a.pdf',
    questions: [
      { num: '1', title: 'Algebra & Number Systems', text: 'Given that f(x) = 2x³ - 5x² + ax + b has (x - 2) as a factor and leaves a remainder of 15 when divided by (x + 1), find the values of constants a and b.', solution: 'By Factor Theorem, f(2) = 0 => 2(8) - 5(4) + 2a + b = 0 => 2a + b = 4.\nBy Remainder Theorem, f(-1) = 15 => -2 - 5 - a + b = 15 => -a + b = 22.\nSolving simultaneously: 3a = -18 => a = -6, and b = 16.' },
      { num: '2', title: 'Coordinate Geometry & Vectors', text: 'Points A and B have coordinates (3, -2) and (-1, 6) respectively. Find the equation of the perpendicular bisector of segment AB in the form px + qy + r = 0.', solution: 'Midpoint M = ((3-1)/2, (-2+6)/2) = (1, 2).\nGradient of AB = (6 - (-2)) / (-1 - 3) = 8 / -4 = -2.\nPerpendicular gradient m_perp = 1/2.\nEquation: y - 2 = 1/2(x - 1) => 2y - 4 = x - 1 => x - 2y + 3 = 0.' },
      { num: '3', title: 'Calculus (Differentiation & Applications)', text: 'A curve has equation y = x³ - 3x² - 9x + 5. Determine the coordinates of stationary points and determine their nature.', solution: 'dy/dx = 3x² - 6x - 9 = 0 => x² - 2x - 3 = 0 => (x - 3)(x + 1) = 0.\nFor x = 3: y = 27 - 27 - 27 + 5 = -22 => Point (3, -22).\nFor x = -1: y = -1 - 3 + 9 + 5 = 10 => Point (-1, 10).\nd²y/dx² = 6x - 6. At x = 3, d²y/dx² = 12 > 0 (Local Minimum). At x = -1, d²y/dx² = -12 < 0 (Local Maximum).' },
      { num: '4', title: 'Probability & Statistics', text: 'In a class of 30 students, 18 study Pure Mathematics, 14 study Further Mathematics, and 6 study neither. A student is selected at random. Find the probability that the student studies both subjects.', solution: 'Total = 30, Neither = 6 => Studied at least one = 24.\nn(P U F) = n(P) + n(F) - n(P ∩ F) => 24 = 18 + 14 - n(Both) => n(Both) = 8.\nProbability P(Both) = 8 / 30 = 4 / 15.' },
    ]
  },
  {
    id: 102,
    slug: 'math-ol-2024-p2',
    subject: 'Mathématiques',
    subjectSlug: 'mathematics',
    level: 'GCE O/L',
    year: 2024,
    session: '2',
    type: 'Paper 2 (Calculus & Trigonometry)',
    totalPages: 10,
    hasCorrection: true,
    fileUrl: '#',
    questions: [
      { num: '1', title: 'Trigonometric Identities', text: 'Prove that (sin 3θ + sin θ) / (cos 3θ + cos θ) = tan 2θ for all admissible values of θ.', solution: 'Using sum-to-product formulas: sin 3θ + sin θ = 2 sin(2θ) cos(θ), and cos 3θ + cos θ = 2 cos(2θ) cos(θ).\nNumerator/Denominator = [2 sin(2θ) cos(θ)] / [2 cos(2θ) cos(θ)] = sin(2θ)/cos(2θ) = tan(2θ). Q.E.D.' }
    ]
  },
  {
    id: 201,
    slug: 'physics-al-2024-p1',
    subject: 'Physique',
    subjectSlug: 'physics',
    level: 'GCE A/L',
    year: 2024,
    session: '1',
    type: 'Paper 1 (Mechanics & Waves)',
    totalPages: 14,
    hasCorrection: true,
    fileUrl: '#',
    questions: [
      { num: '1', title: 'Classical Mechanics & Motion', text: 'A projectile is launched with velocity v at angle θ to the horizontal. Derive an expression for its maximum range on a horizontal plane.', solution: 'R = (v² sin 2θ) / g. Range is maximal when sin 2θ = 1 => θ = 45°.' }
    ]
  }
]

export default function PaperDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState('exam') // 'exam' | 'correction'
  const [currentPage, setCurrentPage] = useState(1)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [showThumbnails, setShowThumbnails] = useState(true)

  /* Récupérer l'épreuve par ID ou slug */
  const paper = useMemo(() => {
    const found = PAPERS_DATABASE.find(p => String(p.id) === String(id) || p.slug === id)
    return found || PAPERS_DATABASE[0]
  }, [id])

  const handleDownloadAll = () => {
    alert(`Téléchargement du dossier complet : ${paper.subject} ${paper.year} (Épreuve + Corrigé officiel)`)
  }

  const handleDownloadCorrection = () => {
    alert(`Téléchargement du corrigé officiel de ${paper.subject} ${paper.year} Session ${paper.session}`)
  }

  return (
    <EducationLayout activeNav="Éducation">
      <div className="paper-detail-view">

        {/* ══ HEADER DE L'ÉPREUVE (Écran 3) ══ */}
        <div className="pd-header">
          <div className="pd-header-left">
            <button
              type="button"
              className="pd-back-btn"
              onClick={() => navigate(-1)}
            >
              <i className="mdi mdi-arrow-left" /> Retour
            </button>

            <div className="pd-title-group">
              {/* Petit cadre transparent stylisé */}
              <div className="pd-file-frame">
                <svg width="22" height="25" viewBox="0 0 24 28" fill="none">
                  <path d="M4 2C2.89543 2 2 2.89543 2 4V24C2 25.1046 2.89543 26 4 26H20C21.1046 26 22 25.1046 22 24V9L15 2H4Z" fill="#2563EB"/>
                  <path d="M15 2V7C15 8.10457 15.8954 9 17 9H22L15 2Z" fill="#93C5FD"/>
                  <rect x="7" y="12" width="10" height="9" rx="1.5" stroke="#ffffff" strokeWidth="1.4" fill="none"/>
                  <path d="M10 12V21M7 16.5H17" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round"/>
                </svg>
              </div>

              <div>
                <h1 className="pd-title">{paper.subject} – Paper {paper.session} ({paper.level.includes('O/L') ? 'O/L' : 'A/L'})</h1>
                <div className="pd-meta-row">
                  <span>{paper.year} · Session {paper.session} · {paper.level} · {paper.subject}</span>
                  {paper.hasCorrection && (
                    <span className="pd-badge-available">
                      <i className="mdi mdi-check-circle" /> Corrigé disponible
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pd-header-right">
            <button
              type="button"
              className="pd-btn-download-all"
              onClick={handleDownloadAll}
            >
              <i className="mdi mdi-download" /> Télécharger tout
            </button>
          </div>
        </div>

        {/* ══ ZONE PRINCIPALE SPLIT-SCREEN (Écran 3) ══ */}
        <div className="pd-split-container">

          {/* ── COLONNE GAUCHE : VISUALISEUR PDF INTERACTIF ── */}
          <div className="pd-viewer-panel">
            {/* Barre d'outils du visualiseur PDF */}
            <div className="pd-viewer-toolbar">
              <div className="pd-tool-left">
                <button
                  type="button"
                  className={`pd-tool-btn ${showThumbnails ? 'active' : ''}`}
                  onClick={() => setShowThumbnails(!showThumbnails)}
                  title="Afficher les miniatures"
                >
                  <i className="mdi mdi-view-headline" />
                </button>
                <div className="pd-pagination">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    <i className="mdi mdi-chevron-left" />
                  </button>
                  <span>{currentPage} / {paper.totalPages}</span>
                  <button
                    type="button"
                    disabled={currentPage >= paper.totalPages}
                    onClick={() => setCurrentPage(p => Math.min(paper.totalPages, p + 1))}
                  >
                    <i className="mdi mdi-chevron-right" />
                  </button>
                </div>
              </div>

              <div className="pd-tool-center">
                <button
                  type="button"
                  className={`pd-mode-tab ${activeTab === 'exam' ? 'active' : ''}`}
                  onClick={() => setActiveTab('exam')}
                >
                  <i className="mdi mdi-file-document-outline" /> Épreuve
                </button>
                <button
                  type="button"
                  className={`pd-mode-tab ${activeTab === 'correction' ? 'active' : ''}`}
                  onClick={() => setActiveTab('correction')}
                >
                  <i className="mdi mdi-file-check-outline" /> Corrigé officiel
                </button>
              </div>

              <div className="pd-tool-right">
                <button
                  type="button"
                  className="pd-tool-btn"
                  onClick={() => setZoomLevel(z => Math.max(70, z - 10))}
                  title="Zoom arrière"
                >
                  -
                </button>
                <span className="pd-zoom-label">{zoomLevel}%</span>
                <button
                  type="button"
                  className="pd-tool-btn"
                  onClick={() => setZoomLevel(z => Math.min(150, z + 10))}
                  title="Zoom avant"
                >
                  +
                </button>
                <button
                  type="button"
                  className="pd-tool-btn"
                  onClick={() => setZoomLevel(100)}
                  title="Plein cadre"
                >
                  <i className="mdi mdi-fullscreen" />
                </button>
              </div>
            </div>

            {/* Corps du visualiseur : Miniatures + Document */}
            <div className="pd-viewer-canvas">
              {showThumbnails && (
                <div className="pd-thumbnails-sidebar">
                  {[...Array(paper.totalPages)].map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`pd-thumb-item ${currentPage === i + 1 ? 'selected' : ''}`}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      <div className="pd-thumb-preview">
                        <div className="pd-thumb-sheet">
                          <div className="pd-thumb-lines" />
                          <div className="pd-thumb-lines" />
                          <div className="pd-thumb-lines short" />
                        </div>
                      </div>
                      <span>{i + 1}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Page affichée du document */}
              <div className="pd-page-viewport" style={{ zoom: `${zoomLevel}%` }}>
                <div className="pd-pdf-sheet">

                  {activeTab === 'exam' ? (
                    /* ── CONTENU OFFICIEL DE L'ÉPREUVE ── */
                    <div className="pd-doc-body">
                      <div className="pd-doc-head-stamp">
                        <span>GCE O/L</span>
                        <span>{paper.year}</span>
                      </div>

                      <div className="pd-doc-titles">
                        <p className="pd-doc-republic">CAMEROON GENERAL CERTIFICATE OF EDUCATION BOARD</p>
                        <h2 className="pd-doc-institution">ORDINARY LEVEL EXAMINATION</h2>
                        <div className="pd-doc-sep-line" />
                        <h3 className="pd-doc-subject">{paper.subject.toUpperCase()}</h3>
                        <p className="pd-doc-paper-num">Paper {paper.session} (Structured Questions)</p>
                        <p className="pd-doc-duration">Time Allowed: Two and a half hours (2 hrs 30 mins)</p>
                      </div>

                      <div className="pd-doc-instructions">
                        <strong>INSTRUCTIONS TO CANDIDATES:</strong>
                        <p>Answer ALL questions in Section A and ANY FOUR questions from Section B. All working must be clearly shown. Mathematical tables and silent electronic calculators are permitted.</p>
                      </div>

                      <div className="pd-doc-questions-list">
                        {paper.questions.map((q) => (
                          <div key={q.num} className="pd-doc-question-item">
                            <div className="pd-doc-q-head">
                              <strong>Question {q.num}</strong>
                              <em>[{q.title}]</em>
                            </div>
                            <p className="pd-doc-q-text">{q.text}</p>
                            <div className="pd-doc-q-space" />
                          </div>
                        ))}
                      </div>

                      <div className="pd-doc-footer-stamp">
                        <span>GCE BOARD / MM-SIXERS ARCHIVE</span>
                        <span>Page {currentPage} of {paper.totalPages}</span>
                      </div>
                    </div>
                  ) : (
                    /* ── CONTENU OFFICIEL DU CORRIGÉ ── */
                    <div className="pd-doc-body pd-doc-correction">
                      <div className="pd-doc-head-stamp">
                        <span className="pd-guide-badge">MARKING GUIDE</span>
                        <span>{paper.year}</span>
                      </div>

                      <div className="pd-doc-titles">
                        <p className="pd-doc-republic">CAMEROON GENERAL CERTIFICATE OF EDUCATION BOARD</p>
                        <h2 className="pd-doc-institution">OFFICIAL MARKING SCHEME &amp; MODEL ANSWERS</h2>
                        <div className="pd-doc-sep-line" />
                        <h3 className="pd-doc-subject">{paper.subject.toUpperCase()} – Paper {paper.session}</h3>
                      </div>

                      <div className="pd-doc-questions-list">
                        {paper.questions.map((q) => (
                          <div key={q.num} className="pd-doc-question-item pd-corr-item">
                            <div className="pd-doc-q-head">
                              <strong>Solution {q.num}</strong>
                              <span className="pd-corr-points">10 Marks</span>
                            </div>
                            <div className="pd-corr-solution">
                              <pre>{q.solution}</pre>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pd-doc-footer-stamp">
                        <span>OFFICIAL GCE CORRECTION SCHEME</span>
                        <span>Verified by Alumni Academic Committee</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>

          {/* ── COLONNE DROITE : INFORMATIONS & ACTIONS (Écran 3) ── */}
          <div className="pd-sidebar-panel">

            {/* Bloc Informations */}
            <div className="pd-card-box">
              <h3 className="pd-box-title">Informations</h3>
              <div className="pd-info-list">
                <div className="pd-info-row">
                  <span className="pd-info-label">Matière</span>
                  <strong className="pd-info-value">{paper.subject}</strong>
                </div>
                <div className="pd-info-row">
                  <span className="pd-info-label">Niveau</span>
                  <strong className="pd-info-value">{paper.level}</strong>
                </div>
                <div className="pd-info-row">
                  <span className="pd-info-label">Année</span>
                  <strong className="pd-info-value">{paper.year}</strong>
                </div>
                <div className="pd-info-row">
                  <span className="pd-info-label">Session</span>
                  <strong className="pd-info-value">{paper.session}</strong>
                </div>
                <div className="pd-info-row">
                  <span className="pd-info-label">Type</span>
                  <strong className="pd-info-value">{paper.type}</strong>
                </div>
              </div>
            </div>

            {/* Bloc Corrigé */}
            <div className="pd-card-box">
              <div className="pd-corr-box-header">
                <h3 className="pd-box-title">Corrigé</h3>
                <span className="pd-pill-available">Disponible</span>
              </div>

              <div className="pd-corr-actions">
                <button
                  type="button"
                  className={`pd-btn-view-corr ${activeTab === 'correction' ? 'active' : ''}`}
                  onClick={() => setActiveTab(activeTab === 'correction' ? 'exam' : 'correction')}
                >
                  <i className={`mdi ${activeTab === 'correction' ? 'mdi-file-document-outline' : 'mdi-eye-outline'}`} />
                  {activeTab === 'correction' ? 'Revenir à l\'épreuve' : 'Voir le corrigé'}
                </button>

                <button
                  type="button"
                  className="pd-btn-download-corr"
                  onClick={handleDownloadCorrection}
                >
                  <i className="mdi mdi-download" /> Télécharger le corrigé
                </button>
              </div>
            </div>

            {/* Raccourci vers les épreuves de la même matière */}
            <div className="pd-related-box">
              <Link
                to={`/education/matieres/${paper.subjectSlug}/epreuves`}
                className="pd-related-link"
              >
                <i className="mdi mdi-arrow-left" /> Voir toutes les épreuves de {paper.subject}
              </Link>
            </div>

          </div>

        </div>

      </div>
    </EducationLayout>
  )
}
