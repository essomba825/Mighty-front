import { useEffect, useMemo, useState } from 'react'
import api from '../../api/client'
import AdminHeader from '../../components/AdminHeader'
import './AdminExams.css'

const EMPTY_PAPER = {
  subject: '',
  year: new Date().getFullYear(),
  session: 'june',
  paper_number: 1,
  paper_type: 'official',
  title: '',
  route: '',
  duration_minutes: '',
  total_marks: '',
}

const NEW_QUESTION = {
  number: '',
  statement: '',
  statement_fr: '',
  answer: '',
  explanation_fr: '',
  solution_steps: '',
  marks: '',
  kind: 'unknown',
}

function getErrorMessage(error) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
      .join(' · ')
  }
  return 'La requête a échoué. Vérifie la connexion au serveur puis réessaie.'
}

function fileName(value) {
  return value?.name || 'Aucun fichier sélectionné'
}

async function fetchExamCatalog() {
  const [papersResponse, subjectsResponse] = await Promise.all([
    api.get('/exams/papers/'),
    api.get('/education/subjects/'),
  ])
  const paperData = papersResponse.data.results ?? papersResponse.data
  const subjectData = subjectsResponse.data.results ?? subjectsResponse.data
  return {
    papers: Array.isArray(paperData) ? paperData : [],
    subjects: Array.isArray(subjectData) ? subjectData : [],
  }
}

export default function AdminExams() {
  const [papers, setPapers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('paper')
  const [paperForm, setPaperForm] = useState(EMPTY_PAPER)
  const [paperFile, setPaperFile] = useState(null)
  const [correctionPaperId, setCorrectionPaperId] = useState('')
  const [correctionFile, setCorrectionFile] = useState(null)
  const [questions, setQuestions] = useState([{ ...NEW_QUESTION }])
  const [publishCorrection, setPublishCorrection] = useState(false)
  const [coverageComplete, setCoverageComplete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const loadCatalog = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true)
      setLoadError('')
    }
    try {
      const { papers: paperData, subjects: subjectData } = await fetchExamCatalog()
      setPapers(paperData)
      setSubjects(subjectData)
    } catch (error) {
      setLoadError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    fetchExamCatalog()
      .then(({ papers: paperData, subjects: subjectData }) => {
        if (!active) return
        setPapers(paperData)
        setSubjects(subjectData)
      })
      .catch((error) => {
        if (active) setLoadError(getErrorMessage(error))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const visiblePapers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return papers
    return papers.filter((paper) =>
      [paper.title, paper.subject_name, paper.source_name, paper.year]
        .some((value) => String(value || '').toLowerCase().includes(query))
    )
  }, [papers, search])

  const updatePaper = (field) => (event) => {
    setPaperForm((form) => ({ ...form, [field]: event.target.value }))
  }

  const savePaper = async (event) => {
    event.preventDefault()
    const formElement = event.currentTarget
    if (!paperFile) {
      setNotice({ type: 'error', text: 'Sélectionne le PDF de l’épreuve avant de continuer.' })
      return
    }

    const data = new FormData()
    Object.entries(paperForm).forEach(([key, value]) => {
      if (value !== '' && value !== null) data.append(key, value)
    })
    data.append('source_pdf', paperFile)
    setSaving(true)
    setNotice(null)
    try {
      const response = await api.post('/exams/papers/create/', data)
      setPapers((current) => [response.data, ...current])
      setPaperForm(EMPTY_PAPER)
      setPaperFile(null)
      formElement.reset()
      setNotice({ type: 'success', text: 'Épreuve ajoutée au catalogue.' })
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const updateQuestion = (index, field, value) => {
    setQuestions((current) => current.map((question, itemIndex) =>
      itemIndex === index ? { ...question, [field]: value } : question
    ))
  }

  const saveCorrection = async (event) => {
    event.preventDefault()
    const formElement = event.currentTarget
    if (!correctionPaperId) {
      setNotice({ type: 'error', text: 'Sélectionne l’épreuve à corriger.' })
      return
    }
    const readyQuestions = questions.filter((question) =>
      question.number.trim() || question.statement.trim() || question.answer.trim() ||
      question.explanation_fr.trim()
    )
    if (!correctionFile && !readyQuestions.length) {
      setNotice({ type: 'error', text: 'Ajoute un PDF de corrigé ou au moins une question corrigée.' })
      return
    }

    const data = new FormData()
    if (correctionFile) data.append('correction_pdf', correctionFile)
    data.append('questions', JSON.stringify(readyQuestions))
    data.append('publish', String(publishCorrection))
    data.append('coverage_complete', String(coverageComplete))
    setSaving(true)
    setNotice(null)
    try {
      await api.post(`/exams/papers/${correctionPaperId}/correction/`, data)
      setCorrectionFile(null)
      setQuestions([{ ...NEW_QUESTION }])
      setPublishCorrection(false)
      setCoverageComplete(false)
      formElement.reset()
      await loadCatalog(true)
      setNotice({
        type: 'success',
        text: publishCorrection
          ? 'Corrigé enregistré et publié.'
          : 'Corrigé enregistré comme brouillon.',
      })
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page-container admin-exams-page">
      <AdminHeader
        title="Épreuves & corrigés"
        subtitle="Ajoute des sujets PDF et prépare leurs corrigés, en PDF ou question par question."
        icon="mdi-file-document-edit-outline"
        badgeText={`${papers.length} épreuve(s)`}
        badgeType="info"
      />

      {notice && (
        <div className={`admin-exams-notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          <i className={`mdi ${notice.type === 'error' ? 'mdi-alert-circle-outline' : 'mdi-check-circle-outline'}`} />
          <span>{notice.text}</span>
          <button type="button" aria-label="Fermer" onClick={() => setNotice(null)}>
            <i className="mdi mdi-close" />
          </button>
        </div>
      )}

      <div className="admin-exams-workspace">
        <section className="admin-exams-panel">
          <div className="admin-exams-panel-heading">
            <div>
              <span className="admin-exams-kicker">GESTION DU CATALOGUE</span>
              <h2>{tab === 'paper' ? 'Ajouter une épreuve' : 'Ajouter un corrigé'}</h2>
              <p>{tab === 'paper'
                ? 'Les champs obligatoires sont marqués d’un astérisque.'
                : 'Tu peux joindre un PDF, saisir des réponses, ou combiner les deux.'}</p>
            </div>
            <div className="admin-exams-tabs" role="tablist" aria-label="Type de contenu">
              <button type="button" role="tab" aria-selected={tab === 'paper'} className={tab === 'paper' ? 'active' : ''} onClick={() => setTab('paper')}>
                <i className="mdi mdi-file-upload-outline" /> Épreuve
              </button>
              <button type="button" role="tab" aria-selected={tab === 'correction'} className={tab === 'correction' ? 'active' : ''} onClick={() => setTab('correction')}>
                <i className="mdi mdi-check-decagram-outline" /> Corrigé
              </button>
            </div>
          </div>

          {tab === 'paper' ? (
            <form className="admin-exams-form" onSubmit={savePaper}>
              <div className="admin-exams-field admin-exams-field-wide">
                <label htmlFor="exam-subject">Matière et niveau *</label>
                <select id="exam-subject" value={paperForm.subject} onChange={updatePaper('subject')} required>
                  <option value="">Choisir une matière</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name} · {subject.level_display || subject.level}</option>
                  ))}
                </select>
              </div>

              <div className="admin-exams-field admin-exams-field-wide">
                <label htmlFor="exam-title">Titre de l’épreuve *</label>
                <input id="exam-title" value={paperForm.title} onChange={updatePaper('title')} placeholder="Ex. GCE A/L Mathematics — Mechanics Paper 1" required maxLength={240} />
              </div>

              <div className="admin-exams-field">
                <label htmlFor="exam-year">Année *</label>
                <input id="exam-year" type="number" min="1900" max="2200" value={paperForm.year} onChange={updatePaper('year')} required />
              </div>
              <div className="admin-exams-field">
                <label htmlFor="exam-number">Numéro du papier *</label>
                <input id="exam-number" type="number" min="1" value={paperForm.paper_number} onChange={updatePaper('paper_number')} required />
              </div>
              <div className="admin-exams-field">
                <label htmlFor="exam-session">Session</label>
                <select id="exam-session" value={paperForm.session} onChange={updatePaper('session')}>
                  <option value="june">Session officielle (juin)</option>
                  <option value="mock">Examen blanc / régional</option>
                  <option value="other">Autre / inconnue</option>
                </select>
              </div>
              <div className="admin-exams-field">
                <label htmlFor="exam-type">Type d’épreuve</label>
                <select id="exam-type" value={paperForm.paper_type} onChange={updatePaper('paper_type')}>
                  <option value="official">GCE officiel</option>
                  <option value="mock">Examen blanc</option>
                </select>
              </div>
              <div className="admin-exams-field">
                <label htmlFor="exam-route">Parcours / option</label>
                <input id="exam-route" value={paperForm.route} onChange={updatePaper('route')} placeholder="Ex. Mechanics, Statistics" maxLength={40} />
              </div>
              <div className="admin-exams-field">
                <label htmlFor="exam-duration">Durée (minutes)</label>
                <input id="exam-duration" type="number" min="1" value={paperForm.duration_minutes} onChange={updatePaper('duration_minutes')} placeholder="Ex. 180" />
              </div>
              <div className="admin-exams-field">
                <label htmlFor="exam-marks">Note totale</label>
                <input id="exam-marks" type="number" min="0" step="0.5" value={paperForm.total_marks} onChange={updatePaper('total_marks')} placeholder="Ex. 100" />
              </div>

              <label className="admin-exams-upload admin-exams-field-wide" htmlFor="exam-pdf">
                <input id="exam-pdf" type="file" accept=".pdf,application/pdf" onChange={(event) => setPaperFile(event.target.files?.[0] || null)} required />
                <span className="admin-exams-upload-icon"><i className="mdi mdi-file-pdf-box" /></span>
                <span><strong>PDF de l’épreuve *</strong><small>{fileName(paperFile)} · PDF uniquement</small></span>
                <i className="mdi mdi-tray-arrow-up admin-exams-upload-action" />
              </label>

              <div className="admin-exams-form-footer admin-exams-field-wide">
                <span><i className="mdi mdi-shield-check-outline" /> Réservé au personnel d’administration.</span>
                <button type="submit" className="btn-admin-primary" disabled={saving || loading}>
                  <i className={`mdi ${saving ? 'mdi-loading mdi-spin' : 'mdi-plus'}`} />
                  {saving ? 'Enregistrement…' : 'Enregistrer l’épreuve'}
                </button>
              </div>
            </form>
          ) : (
            <form className="admin-exams-form admin-correction-form" onSubmit={saveCorrection}>
              <div className="admin-exams-field admin-exams-field-wide">
                <label htmlFor="correction-paper">Épreuve concernée *</label>
                <select id="correction-paper" value={correctionPaperId} onChange={(event) => setCorrectionPaperId(event.target.value)} required>
                  <option value="">Choisir une épreuve</option>
                  {papers.map((paper) => (
                    <option key={paper.id} value={paper.id}>
                      {paper.subject_name} · {paper.level} · {paper.year} · {paper.title}
                    </option>
                  ))}
                </select>
              </div>

              <label className="admin-exams-upload admin-exams-field-wide" htmlFor="correction-pdf">
                <input id="correction-pdf" type="file" accept=".pdf,application/pdf" onChange={(event) => setCorrectionFile(event.target.files?.[0] || null)} />
                <span className="admin-exams-upload-icon correction"><i className="mdi mdi-file-pdf-box" /></span>
                <span><strong>PDF du corrigé (facultatif)</strong><small>{fileName(correctionFile)} · Tu peux aussi saisir les réponses ci-dessous.</small></span>
                <i className="mdi mdi-tray-arrow-up admin-exams-upload-action" />
              </label>

              <div className="admin-exams-question-heading admin-exams-field-wide">
                <div><h3>Corrigé structuré</h3><p>Ajoute une réponse et son explication pour chaque question.</p></div>
                <button type="button" className="admin-exams-add-question" onClick={() => setQuestions((current) => [...current, { ...NEW_QUESTION }])}>
                  <i className="mdi mdi-plus" /> Ajouter une question
                </button>
              </div>

              {questions.map((question, index) => (
                <fieldset className="admin-exams-question admin-exams-field-wide" key={index}>
                  <legend>Question {index + 1}</legend>
                  <div className="admin-exams-question-grid">
                    <div className="admin-exams-field">
                      <label htmlFor={`question-number-${index}`}>Numéro *</label>
                      <input id={`question-number-${index}`} value={question.number} onChange={(event) => updateQuestion(index, 'number', event.target.value)} placeholder="Ex. 1(a)" />
                    </div>
                    <div className="admin-exams-field">
                      <label htmlFor={`question-kind-${index}`}>Type</label>
                      <select id={`question-kind-${index}`} value={question.kind} onChange={(event) => updateQuestion(index, 'kind', event.target.value)}>
                        <option value="unknown">À classer</option>
                        <option value="mcq">Choix multiple</option>
                        <option value="numeric">Numérique</option>
                        <option value="short">Réponse courte</option>
                        <option value="structured">Développement structuré</option>
                        <option value="essay">Rédaction</option>
                        <option value="diagram">Schéma</option>
                        <option value="data">Analyse de données</option>
                      </select>
                    </div>
                    <div className="admin-exams-field">
                      <label htmlFor={`question-marks-${index}`}>Points</label>
                      <input id={`question-marks-${index}`} type="number" min="0" step="0.5" value={question.marks} onChange={(event) => updateQuestion(index, 'marks', event.target.value)} />
                    </div>
                    <div className="admin-exams-field admin-exams-field-wide">
                      <label htmlFor={`question-statement-${index}`}>Énoncé de la question *</label>
                      <textarea id={`question-statement-${index}`} rows="2" value={question.statement} onChange={(event) => updateQuestion(index, 'statement', event.target.value)} />
                    </div>
                    <div className="admin-exams-field admin-exams-field-wide">
                      <label htmlFor={`question-statement-fr-${index}`}>Énoncé français (si différent)</label>
                      <textarea id={`question-statement-fr-${index}`} rows="2" value={question.statement_fr} onChange={(event) => updateQuestion(index, 'statement_fr', event.target.value)} />
                    </div>
                    <div className="admin-exams-field admin-exams-field-wide">
                      <label htmlFor={`question-answer-${index}`}>Réponse attendue *</label>
                      <textarea id={`question-answer-${index}`} rows="2" value={question.answer} onChange={(event) => updateQuestion(index, 'answer', event.target.value)} placeholder="Réponse finale ou choix correct" />
                    </div>
                    <div className="admin-exams-field admin-exams-field-wide">
                      <label htmlFor={`question-explanation-${index}`}>Explication / étapes</label>
                      <textarea id={`question-explanation-${index}`} rows="3" value={question.explanation_fr} onChange={(event) => updateQuestion(index, 'explanation_fr', event.target.value)} placeholder="Démarche détaillée et barème indicatif" />
                    </div>
                  </div>
                  {questions.length > 1 && (
                    <button type="button" className="admin-exams-remove-question" onClick={() => setQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                      <i className="mdi mdi-delete-outline" /> Retirer cette question
                    </button>
                  )}
                </fieldset>
              ))}

              <label className="admin-exams-check admin-exams-field-wide">
                <input type="checkbox" checked={publishCorrection} onChange={(event) => setPublishCorrection(event.target.checked)} />
                <span><strong>Publier ce corrigé immédiatement</strong><small>Sinon, il est sauvegardé en brouillon et reste invisible aux élèves.</small></span>
              </label>
              <label className="admin-exams-check admin-exams-field-wide">
                <input type="checkbox" checked={coverageComplete} onChange={(event) => setCoverageComplete(event.target.checked)} />
                <span><strong>Le corrigé couvre toutes les questions</strong><small>À cocher seulement après avoir vérifié l’épreuve entière.</small></span>
              </label>

              <div className="admin-exams-form-footer admin-exams-field-wide">
                <span><i className="mdi mdi-shield-check-outline" /> Le corrigé publié remplacera la version publiée précédente.</span>
                <button type="submit" className="btn-admin-primary" disabled={saving || loading}>
                  <i className={`mdi ${saving ? 'mdi-loading mdi-spin' : 'mdi-content-save-outline'}`} />
                  {saving ? 'Enregistrement…' : publishCorrection ? 'Enregistrer et publier' : 'Enregistrer le brouillon'}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="admin-exams-catalog">
          <div className="admin-exams-catalog-heading">
            <div><span className="admin-exams-kicker">CONTENU EXISTANT</span><h2>Catalogue des épreuves</h2></div>
            <strong>{papers.length}</strong>
          </div>
          <label className="admin-exams-search">
            <i className="mdi mdi-magnify" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Chercher matière, titre, année…" />
          </label>

          {loadError ? (
            <div className="admin-exams-load-error" role="alert">
              <i className="mdi mdi-alert-circle-outline" /><span>{loadError}</span>
              <button type="button" onClick={() => loadCatalog(true)}>Réessayer</button>
            </div>
          ) : loading ? (
            <div className="admin-exams-empty"><i className="mdi mdi-loading mdi-spin" /> Chargement du catalogue…</div>
          ) : visiblePapers.length ? (
            <div className="admin-exams-table-wrap">
              <table className="admin-exams-table">
                <thead><tr><th>Épreuve</th><th>Niveau · année</th><th>Corrigé</th><th /></tr></thead>
                <tbody>
                  {visiblePapers.map((paper) => (
                    <tr key={paper.id}>
                      <td><strong>{paper.title}</strong><small>{paper.subject_name} · {paper.source_name}</small></td>
                      <td>{paper.level} · {paper.year}</td>
                      <td><span className={`admin-exams-status ${paper.correction_available ? 'available' : ''}`}>
                        <i className={`mdi ${paper.correction_available ? 'mdi-check-circle' : 'mdi-minus-circle-outline'}`} />
                        {paper.correction_available ? 'Publié' : 'Absent'}
                      </span></td>
                      <td><button type="button" className="admin-exams-row-action" onClick={() => { setTab('correction'); setCorrectionPaperId(String(paper.id)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                        <i className="mdi mdi-plus" /> Corrigé
                      </button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-exams-empty"><i className="mdi mdi-file-search-outline" /> Aucune épreuve ne correspond à la recherche.</div>
          )}
        </section>
      </div>
    </div>
  )
}
