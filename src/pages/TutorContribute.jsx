import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { tr } from '../i18n/education'

const emptyForm = () => ({
  subject: '',
  chapter: '',
  new_chapter_title: '',
  new_chapter_title_fr: '',
  title: '', title_fr: '',
  summary: '', summary_fr: '',
  content: '', content_fr: '',
  video_url: '',
  estimated_minutes: 20,
  kind: 'lesson',
  questions_text: '',
})

export default function TutorContribute() {
  const { user } = useAuth()
  const { lang } = useLang()
  const tr_ = (k) => tr(k, lang)

  const [subjects, setSubjects] = useState([])
  const [chapters, setChapters] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    api.get('/education/subjects/')
      .then(({ data }) => setSubjects(data.results ?? data))
      .catch(() => setSubjects([]))
  }, [])

  useEffect(() => {
    if (!form.subject) { setChapters([]); return }
    api.get(`/education/subjects/${form.subject}/curriculum/`)
      .then(({ data }) => setChapters(data))
      .catch(() => setChapters([]))
  }, [form.subject])

  const setField = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const canSubmit =
    form.title.trim()
    && form.title_fr.trim()
    && form.summary.trim()
    && form.content.trim()
    && form.subject
    && (form.chapter || form.new_chapter_title.trim())

  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit || saving) return
    setSaving(true)
    setError('')
    setFieldErrors({})
    try {
      const payload = {
        kind: form.kind,
        title: form.title.trim(),
        title_fr: form.title_fr.trim(),
        summary: form.summary.trim(),
        summary_fr: form.summary_fr.trim(),
        content: form.content,
        content_fr: form.content_fr,
        video_url: form.video_url.trim() || '',
        estimated_minutes: Math.max(1, parseInt(form.estimated_minutes, 10) || 20),
        objectives: [], objectives_fr: [],
      }
      if (form.chapter) payload.chapter = parseInt(form.chapter, 10)
      else {
        payload.subject_id_write = parseInt(form.subject, 10)
        payload.new_chapter_title = form.new_chapter_title.trim()
        payload.new_chapter_title_fr = form.new_chapter_title_fr.trim()
      }

      const { data: lesson } = await api.post('/education/lessons/', payload)

      if (form.questions_text.trim()) {
        try {
          await api.post(`/education/lessons/${lesson.id}/add_quiz/`, {
            questions_text: form.questions_text,
          })
        } catch {
          // le quiz est une option, on ne doit pas bloquer si ca rate
        }
      }

      setSuccess(true)
      setForm(emptyForm())
    } catch (err) {
      const fields = err?.response?.data && typeof err.response.data === 'object'
        ? err.response.data : {}
      setFieldErrors(fields)
      setError(tr_('tc_error'))
    } finally {
      setSaving(false)
    }
  }

  if (user?.role !== 'teacher' && user?.role !== 'admin' && !user?.is_staff) {
    return (
      <div className="page">
        <PageHeader title={tr_('tc_permission_title')} subtitle={tr_('tc_role_hint')} />
        <p className="rv-empty card">
          <Link to="/education">{tr_('learn_breadcrumb')}</Link>
        </p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="page">
        <PageHeader title={tr_('tc_submit_title')} />
        <div className="rv-empty card">
          <i className="mdi mdi-check-circle-outline" />
          <h2>{tr_('tc_success')}</h2>
          <p>
            <Link to="/education">{tr_('continue')}</Link>
          </p>
          <button type="button" className="btn-secondary" onClick={() => setSuccess(false)}>
            {tr_('tc_add_title')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader title={tr_('tc_add_title')} subtitle={tr_('tc_add_sub')} />

      <form className="card tc-form" onSubmit={submit} noValidate>
        <div className="tc-grid">
          <label>
            {tr_('tc_subject')} *
            <select value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value, chapter: '' }))} required>
              <option value="">—</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.level_display})</option>
              ))}
            </select>
          </label>

          <label>
            {tr_('tc_kind')} *
            <select value={form.kind} onChange={setField('kind')}>
              <option value="lesson">{tr_('tc_kind_lesson')}</option>
              <option value="exam_paper">{tr_('tc_kind_exam')}</option>
            </select>
          </label>
        </div>

        <label>
          {tr_('tc_chapter')}
          <select value={form.chapter} onChange={setField('chapter')}>
            <option value="">{tr_('tc_no_chapters')}</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>{c.title_fr || c.title}</option>
            ))}
          </select>
        </label>

        {!form.chapter && (
          <div className="tc-grid">
            <label>
              New chapter title (EN)
              <input value={form.new_chapter_title} onChange={setField('new_chapter_title')} />
            </label>
            <label>
              {tr_('tc_title_fr')}
              <input value={form.new_chapter_title_fr} onChange={setField('new_chapter_title_fr')} />
            </label>
          </div>
        )}

        <div className="tc-grid">
          <label>
            {tr_('tc_title_en')} *
            <input value={form.title} onChange={setField('title')} />
          </label>
          <label>
            {tr_('tc_title_fr')} *
            <input value={form.title_fr} onChange={setField('title_fr')} />
          </label>
        </div>

        <div className="tc-grid">
          <label>
            {tr_('tc_summary_en')} *
            <textarea value={form.summary} onChange={setField('summary')} rows={2} />
          </label>
          <label>
            {tr_('tc_summary_fr')}
            <textarea value={form.summary_fr} onChange={setField('summary_fr')} rows={2} />
          </label>
        </div>

        <div className="tc-grid">
          <label>
            {tr_('tc_content_en')} *
            <textarea value={form.content} onChange={setField('content')} rows={8} />
          </label>
          <label>
            {tr_('tc_content_fr')}
            <textarea value={form.content_fr} onChange={setField('content_fr')} rows={8} />
          </label>
        </div>

        <div className="tc-grid">
          <label>
            {tr_('tc_video')}
            <input type="url" value={form.video_url} onChange={setField('video_url')} placeholder="https://www.youtube.com/watch?v=…" />
          </label>
          <label>
            {tr_('tc_minutes')} *
            <input type="number" min={1} max={120} value={form.estimated_minutes} onChange={setField('estimated_minutes')} />
          </label>
        </div>

        <label>
          {tr_('tc_quiz_title')}
          <textarea value={form.questions_text} onChange={setField('questions_text')} rows={4}
                    placeholder={tr_('tc_quiz_format')} />
          <small>{tr_('tc_quiz_hint')}</small>
        </label>

        {Object.keys(fieldErrors).length > 0 && (
          <pre className="form-errors">{JSON.stringify(fieldErrors, null, 2)}</pre>
        )}
        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={!canSubmit || saving}>
          {saving ? tr_('tc_submitting') : tr_('tc_submit')}
        </button>
      </form>
    </div>
  )
}
