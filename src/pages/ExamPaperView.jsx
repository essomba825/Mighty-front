import { Fragment, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import lottie from 'lottie-web'
import api from '../api/client'
import { getCachedPdf, prefetchPaperPdf } from '../utils/pdfCache'
import lottieData from '../assets/loading-pdf.json'
import './ExamPaperView.css'

function LottieLoader({ text = 'Loading document…' }) {
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
  return (
    <div className="epv-loader-wrapper">
      <div ref={ref} className="epv-lottie-loader" />
      {text && <p className="epv-loader-text">{text}</p>}
    </div>
  )
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
    title: item.title || fallback?.title || 'Exam paper',
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
        <strong>Partial marking scheme</strong>
        <span>{coverage.note_en || coverage.note_fr || 'Some questions for this paper are still being marked.'}</span>
      </aside>
    )}
    {questions.map((item, index) => {
      const answer = item.answer
      const answerText = typeof answer === 'string' ? answer : (answer?.final || (answer ? JSON.stringify(answer) : ''))
      return (
        <Fragment key={item.question?.id || index}>
          <article className="epv-correction-item">
            <h3>Question {item.question?.number || index + 1}{item.question?.marks ? ` · ${item.question.marks} pt(s)` : ''}</h3>
            {(item.question?.statement_en || item.question?.statement_fr || item.question?.statement) && (
              <p>{item.question.statement_en || item.question.statement_fr || item.question.statement}</p>
            )}
            {answerText && (
              <p><strong>Answer: </strong>
                {answer?.option_label ? `${answer.option_label}. ` : ''}{answerText}
              </p>
            )}
            {(item.explanation_en || item.explanation_fr) && (
              <p>{item.explanation_en || item.explanation_fr}</p>
            )}
            {Array.isArray(item.criteria) && item.criteria.length > 0 && (
              <ul className="epv-mark-criteria">
                {item.criteria.map((criterion, criterionIndex) => (
                  <li key={`${criterion.key || 'criterion'}-${criterionIndex}`}>
                    <span>{criterion.description_en || criterion.description_fr}</span>
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
  const cachedInitial = getCachedPdf(id)
  const [pdfError, setPdfError] = useState('')
  const [pdfLoadError, setPdfLoadError] = useState('')
  const [pdfLoading, setPdfLoading] = useState(!cachedInitial?.objectUrl)
  const [pdfDocumentUrl, setPdfDocumentUrl] = useState(cachedInitial?.objectUrl || '')
  const [correctionMode, setCorrectionMode] = useState(isCorrectionRequested)
  const [correctionData, setCorrectionData] = useState(null)
  const [correctionLoading, setCorrectionLoading] = useState(isCorrectionRequested)
  const [correctionError, setCorrectionError] = useState('')
  const [correctionPdfUrl, setCorrectionPdfUrl] = useState('')
  const [correctionPdfLoading, setCorrectionPdfLoading] = useState(false)
  const [correctionPdfError, setCorrectionPdfError] = useState('')

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
    let objectUrl
    setCorrectionPdfLoading(true)
    setCorrectionPdfError('')

    api.get(`/exams/papers/${id}/correction-pdf/`, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(data)
        setCorrectionPdfUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setCorrectionPdfError('Unable to load the marking scheme PDF.')
      })
      .finally(() => {
        if (!cancelled) setCorrectionPdfLoading(false)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [correctionData, correctionMode, id])

  useEffect(() => {
    if (correctionMode) {
      setPdfDocumentUrl('')
      setPdfLoading(false)
      return undefined
    }

    const cached = getCachedPdf(id)
    if (cached?.objectUrl) {
      setPdfDocumentUrl(cached.objectUrl)
      setPdfLoading(false)
      return undefined
    }

    let cancelled = false
    setPdfLoading(true)
    setPdfLoadError('')

    prefetchPaperPdf(id)
      .then((url) => {
        if (!cancelled && url) {
          setPdfDocumentUrl(url)
          setPdfLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPdfLoadError('Unable to load the PDF file. Please try again later.')
          setPdfLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [correctionMode, id])

  const openCorrection = () => {
    setCorrectionError('')
    if (!correctionData) setCorrectionLoading(true)
    setCorrectionMode(true)
  }

  const downloadPaper = async () => {
    if (paper && (!paper.fileUrl || paper.fileUrl === '#')) {
      setPdfError('The PDF file for this paper is not available yet.')
      return
    }

    try {
      const cached = getCachedPdf(id)
      let objectUrl = cached?.objectUrl

      if (!objectUrl) {
        if (cached?.blob) {
          objectUrl = URL.createObjectURL(cached.blob)
        } else {
          objectUrl = await prefetchPaperPdf(id)
        }
      }

      const anchor = document.createElement('a')
      const filename = (paper?.sourceName || `${paper?.title || 'paper'}.pdf`).replace(/[<>:"/\\|?*]+/g, '_')
      anchor.href = objectUrl
      anchor.download = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setPdfError('')
    } catch {
      setPdfError('The file download failed. Please try again later.')
    }
  }

  return (
    <main className="epv-page">
      <header className="epv-toolbar">
        <span className="epv-filename" title={paper?.sourceName || paper?.title || 'Paper'}>
          {paperLoading ? 'Loading paper…' : paperError ? 'Paper unavailable' : (paper.sourceName || paper.title)}
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
          <div className="epv-document-state" role="status"><LottieLoader text="Loading paper…" /></div>
        ) : paperError ? (
          <div className="epv-document-state epv-error" role="alert">{paperError}</div>
        ) : correctionMode ? (
          <div className="epv-correction-content">
            {correctionLoading ? <div className="epv-document-state" role="status"><LottieLoader text="Loading marking scheme…" /></div>
              : correctionError ? <p className="epv-inline-error" role="alert">{correctionError}</p>
                : <>
                  {correctionData?.correction_pdf && (
                    correctionPdfLoading
                      ? <div className="epv-document-state" role="status"><LottieLoader text="Loading marking scheme PDF…" /></div>
                      : correctionPdfError
                        ? <p className="epv-inline-error" role="alert">{correctionPdfError}</p>
                        : correctionPdfUrl && (
                          <iframe
                            className="epv-pdf"
                            src={correctionPdfUrl}
                            title={`Marking scheme PDF: ${paper.title}`}
                          />
                        )
                  )}
                  {correctionData?.questions?.length > 0 && <CorrectionContent data={correctionData} />}
                </>}
          </div>
        ) : pdfLoading ? (
          <div className="epv-document-state" role="status"><LottieLoader text="Loading PDF…" /></div>
        ) : pdfLoadError ? (
          <div className="epv-document-state epv-error" role="alert">{pdfLoadError}</div>
        ) : paper.fileUrl && paper.fileUrl !== '#' ? (
          pdfDocumentUrl
            ? <iframe className="epv-pdf" src={pdfDocumentUrl} title={`Exam paper PDF: ${paper.title}`} />
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
