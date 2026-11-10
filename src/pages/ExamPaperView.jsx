import { Fragment, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import lottie from 'lottie-web'
import api, { API_URL } from '../api/client'
import lottieData from '../assets/loading-pdf.json'
import './ExamPaperView.css'

function LottieLoader() {
  const ref = useRef(null)
  useEffect(() => {
    const anim = lottie.loadAnimation({
      container: ref.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: lottieData,
    })
    return () => anim.destroy()
  }, [])
  return <div ref={ref} className="epv-lottie-loader" style={{ width: 180, height: 180, margin: '0 auto' }} />
}

function normalizePaper(item, fallback) {
  const file = item.source_pdf || item.file_url || item.fileUrl || fallback?.fileUrl
  const level = item.level || fallback?.level || ''
  const session = item.session === 'june'
    ? 'June'
    : item.session === 'mock'
      ? 'Mock'
      : (item.paper_number ?? fallback?.session ?? (item.session === 'other' ? '' : item.session))
  return {
    id: item.id ?? fallback?.id,
    title: item.title || fallback?.title || 'Épreuve',
    subjectName: item.subject_name || item.subjectName || fallback?.subjectName || '',
    subjectSlug: item.subject_slug || item.subjectSlug || fallback?.subjectSlug || '',
    year: item.year || fallback?.year || '',
    level: level.toLowerCase() === 'al' ? 'A/L' : level.toLowerCase() === 'ol' ? 'O/L' : level,
    session,
    sourceName: item.source_name || fallback?.sourceName || '',
    fileUrl: file && file !== '#' ? file : '#',
    correction: Object.hasOwn(item, 'correction_available')
      ? (item.correction_available ? (item.correction_complete === false ? 'partial' : 'available') : 'none')
      : (fallback?.correction || 'none'),
  }
}

function CorrectionContent({ data }) {
  const questions = data?.questions
  if (!Array.isArray(questions) || !questions.length) {
    return <p className="epv-empty-correction">No marking scheme details are available for this paper.</p>
  }
  const metadata = data?.generation_metadata || {}
  const coverage = metadata.coverage || {}
  const isPartial = metadata.coverage_complete === false || coverage.complete === false

  return <>
    {isPartial && (
      <aside className="epv-coverage-note">
        <strong>Corrigé partiel</strong>
        <span>{coverage.note_fr || 'Certaines questions de cette épreuve restent à corriger.'}</span>
      </aside>
    )}
    {questions.map((item, index) => {
      const answer = item.answer
      const answerText = typeof answer === 'string' ? answer : (answer?.final || (answer ? JSON.stringify(answer) : ''))
      return (
        <Fragment key={item.question?.id || index}>
          <article className="epv-correction-item">
            <h3>Question {item.question?.number || index + 1}{item.question?.marks ? ` · ${item.question.marks} pt(s)` : ''}</h3>
            {(item.question?.statement_fr || item.question?.statement) && (
              <p>{item.question.statement_fr || item.question.statement}</p>
            )}
            {answerText && (
              <p><strong>Réponse : </strong>
                {answer?.option_label ? `${answer.option_label}. ` : ''}{answerText}
              </p>
            )}
            {(item.explanation_fr || item.explanation_en) && (
              <p>{item.explanation_fr || item.explanation_en}</p>
            )}
            {Array.isArray(item.criteria) && item.criteria.length > 0 && (
              <ul className="epv-mark-criteria">
                {item.criteria.map((criterion, criterionIndex) => (
                  <li key={`${criterion.key || 'criterion'}-${criterionIndex}`}>
                    <span>{criterion.description_fr || criterion.description_en}</span>
                    <strong>{criterion.marks} pt(s)</strong>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </Fragment>
      )
    })}
  </>
}

export default function ExamPaperView() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const isCorrectionRequested = new URLSearchParams(location.search).get('view') === 'correction'
  const [paperResult, setPaperResult] = useState(() => ({
    id: location.state?.paper ? id : null,
    paper: location.state?.paper ? normalizePaper(location.state.paper, location.state.paper) : null,
    error: '',
  }))
  const [pdfError, setPdfError] = useState('')
  const [pdfLoadError, setPdfLoadError] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfDocumentUrl, setPdfDocumentUrl] = useState('')
  const [correctionMode, setCorrectionMode] = useState(isCorrectionRequested)
  const [correctionData, setCorrectionData] = useState(null)
  const [correctionLoading, setCorrectionLoading] = useState(isCorrectionRequested)
  const [correctionError, setCorrectionError] = useState('')
  const [correctionPdfUrl, setCorrectionPdfUrl] = useState('')
  const [correctionPdfLoading, setCorrectionPdfLoading] = useState(false)
  const [correctionPdfError, setCorrectionPdfError] = useState('')

  /* Construit l'URL de streaming directe vers l'API (token signé, valide 5 min) */
  const buildStreamUrl = (token) => `${API_URL}/exams/papers/stream/?token=${encodeURIComponent(token)}`

  useEffect(() => {
    let cancelled = false
    const fallback = location.state?.paper

    api.get(`/exams/papers/${id}/`)
      .then(({ data }) => {
        if (!cancelled) {
          setPaperResult({ id, paper: normalizePaper(data, fallback), error: '' })
        }
      })
      .catch((error) => {
        if (cancelled) return
        if (fallback) {
          setPaperResult({ id, paper: normalizePaper(fallback, fallback), error: '' })
        } else {
          setPaperResult({
            id,
            paper: null,
            error: error.response?.data?.detail || 'Unable to load this paper.',
          })
        }
      })

    return () => { cancelled = true }
  }, [id, location.state])

  useEffect(() => {
    if (!correctionMode || correctionData) return undefined
    let cancelled = false

    api.get(`/exams/papers/${id}/correction/`)
      .then(({ data }) => {
        if (!cancelled) setCorrectionData(data)
      })
      .catch((error) => {
        if (!cancelled) {
          setCorrectionError(error.response?.data?.detail || 'Unable to load the marking scheme right now.')
        }
      })
      .finally(() => {
        if (!cancelled) setCorrectionLoading(false)
      })

    return () => { cancelled = true }
  }, [correctionMode, correctionData, id])

  const paperLoading = paperResult.id !== id
  const paper = paperLoading ? null : paperResult.paper
  const paperError = paperLoading ? '' : paperResult.error
  const subjectSlug = paper?.subjectSlug || new URLSearchParams(location.search).get('subject')
  const listUrl = subjectSlug
    ? `/education/matieres/${encodeURIComponent(subjectSlug)}/epreuves?level=${encodeURIComponent(paper?.level || '')}`
    : '/education/epreuves'

  useEffect(() => {
    if (!correctionMode || !correctionData?.correction_pdf) {
      setCorrectionPdfUrl('')
      setCorrectionPdfLoading(false)
      setCorrectionPdfError('')
      return undefined
    }

    let cancelled = false
    setCorrectionPdfLoading(true)
    setCorrectionPdfError('')

    api.get(`/exams/papers/${id}/correction-pdf-token/`)
      .then(({ data }) => {
        if (cancelled) return
        setCorrectionPdfUrl(buildStreamUrl(data.token))
      })
      .catch(() => {
        if (!cancelled) setCorrectionPdfError('Impossible de charger le PDF du corrigé.')
      })
      .finally(() => {
        if (!cancelled) setCorrectionPdfLoading(false)
      })

    return () => { cancelled = true }
  }, [correctionData, correctionMode, id])

  useEffect(() => {
    if (!paper || !paper.fileUrl || paper.fileUrl === '#' || correctionMode) {
      setPdfDocumentUrl('')
      setPdfLoading(false)
      return undefined
    }

    let cancelled = false
    setPdfDocumentUrl('')
    setPdfLoadError('')
    setPdfLoading(true)

    api.get(`/exams/papers/${id}/pdf-token/`)
      .then(({ data }) => {
        if (cancelled) return
        setPdfDocumentUrl(buildStreamUrl(data.token))
      })
      .catch(() => {
        if (!cancelled) setPdfLoadError('Unable to load the PDF file. Please try again later.')
      })
      .finally(() => {
        if (!cancelled) setPdfLoading(false)
      })

    return () => { cancelled = true }
  }, [correctionMode, id, paper])

  const openCorrection = () => {
    setCorrectionError('')
    if (!correctionData) setCorrectionLoading(true)
    setCorrectionMode(true)
  }

  const downloadPaper = async () => {
    if (!paper.fileUrl || paper.fileUrl === '#') {
      setPdfError('The PDF file for this paper is not available yet.')
      return
    }

    try {
      const { data } = await api.get(`/exams/papers/${id}/pdf/`, { responseType: 'blob' })
      const objectUrl = URL.createObjectURL(data)
      const anchor = document.createElement('a')
      const filename = (paper.sourceName || `${paper.title}.pdf`).replace(/[<>:"/\\|?*]+/g, '_')
      anchor.href = objectUrl
      anchor.download = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      setPdfError('')
    } catch {
      setPdfError('The file download failed. Please try again later.')
    }
  }

  return (
    <main className="epv-page">
      <header className="epv-toolbar">
        <span className="epv-filename" title={paper?.sourceName || paper?.title || 'Paper'}>
          {paperLoading ? 'Loading PDF…' : paperError ? 'Paper unavailable' : (paper.sourceName || paper.title)}
        </span>
        <button
          type="button"
          className="epv-close"
          onClick={() => navigate(listUrl, { replace: true })}
          aria-label="Close PDF and return to papers"
          title="Close"
        >
          <i className="mdi mdi-close" />
        </button>
      </header>

      <section className="epv-document" aria-label={correctionMode ? 'Marking scheme' : 'Exam paper'}>
        {paperLoading ? (
          <div className="epv-document-state" role="status"><LottieLoader /></div>
        ) : paperError ? (
          <div className="epv-document-state epv-error" role="alert">{paperError}</div>
        ) : correctionMode ? (
          <div className="epv-correction-content">
            {correctionLoading ? <div className="epv-document-state" role="status"><LottieLoader /></div>
              : correctionError ? <p className="epv-inline-error" role="alert">{correctionError}</p>
                : <>
                  {correctionData?.correction_pdf && (
                    correctionPdfLoading
                      ? <div className="epv-document-state" role="status"><LottieLoader /></div>
                      : correctionPdfError
                        ? <p className="epv-inline-error" role="alert">{correctionPdfError}</p>
                        : correctionPdfUrl && (
                          <iframe
                            className="epv-pdf"
                            src={correctionPdfUrl}
                            title={`PDF du corrigé : ${paper.title}`}
                          />
                        )
                  )}
                  {correctionData?.questions?.length > 0 && <CorrectionContent data={correctionData} />}
                </>}
          </div>
        ) : pdfLoading ? (
          <div className="epv-document-state" role="status"><LottieLoader /></div>
        ) : pdfLoadError ? (
          <div className="epv-document-state epv-error" role="alert">{pdfLoadError}</div>
        ) : paper.fileUrl && paper.fileUrl !== '#' ? (
          pdfDocumentUrl
            ? <iframe className="epv-pdf" src={pdfDocumentUrl} title={`Épreuve PDF : ${paper.title}`} />
            : <div className="epv-document-state">The PDF file is not available yet.</div>
        ) : (
          <div className="epv-document-state">
            The PDF file for this paper is not available yet.
          </div>
        )}
      </section>

      <footer className={`epv-actions ${paper?.correction === 'available' || paper?.correction === 'partial' ? 'epv-actions--with-correction' : ''}`}>
        {pdfError && !correctionMode && <p className="epv-action-error" role="alert">{pdfError}</p>}
        <button type="button" className="epv-action-primary" onClick={downloadPaper} disabled={!paper || paperLoading || Boolean(paperError)}>
          <i className="mdi mdi-download" /> Download
        </button>
        {(paper?.correction === 'available' || paper?.correction === 'partial') && (
          <button
            type="button"
            className={`epv-action-secondary ${correctionMode ? 'active' : ''}`}
            onClick={() => correctionMode ? setCorrectionMode(false) : openCorrection()}
          >
            <i className={`mdi ${correctionMode ? 'mdi-file-document-outline' : 'mdi-check-decagram-outline'}`} />
            {correctionMode ? 'View paper' : (paper.correction === 'partial' ? 'View partial correction' : 'View marking scheme')}
          </button>
        )}
      </footer>
    </main>
  )
}
