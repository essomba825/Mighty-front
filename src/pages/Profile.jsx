import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../context/ProfileContext'
import { useLang } from '../context/LangContext'
import { mediaUrl } from '../api/client'
import ProfileAvatar from '../components/ProfileAvatar'

export default function Profile() {
  const { user } = useAuth()
  const { profile, loading, save } = useProfile()
  const { t } = useLang()
  const [form, setForm] = useState({
    graduation_year: '', profession: '', company: '', city: '', bio: '',
  })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        graduation_year: profile.graduation_year ?? '',
        profession: profile.profession ?? '',
        company: profile.company ?? '',
        city: profile.city ?? '',
        bio: profile.bio ?? '',
      })
      setPhotoPreview(null)
    }
  }, [profile])

  const avatar = photoPreview || mediaUrl(profile?.photo)
  const fullName = `${user.first_name} ${user.last_name}`.trim() || user.username

  const completion = (() => {
    if (!profile) return 0
    const filled = [
      profile.photo, form.graduation_year, form.profession,
      form.company, form.city, form.bio,
    ].filter((v) => String(v ?? '').trim() !== '').length
    return Math.round((filled / 6) * 100)
  })()

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const pickPhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await save(form, photo)
      setMessage(profile ? t('profile.updated') : t('profile.created'))
      setPhoto(null)
      setPhotoPreview(null)
    } catch {
      setMessage(t('profile.error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="page">{t('app.loading')}</p>

  return (
    <div>
      <PageHeader
        eyebrow={t(`auth.role.${user.role}`)}
        title={t('profile.title')}
        sub={t('profile.sub')}
        breadcrumb={t('profile.breadcrumb')}
      />

      <div className="page">
        {/* Passeport membre */}
        <div className="ms-hero profile-hero">
          <span className="ms-avatar profile-avatar-ring">
            <ProfileAvatar src={avatar} name={fullName} />
            <label className="profile-photo-edit" title="Changer la photo">
              <i className="mdi mdi-camera" />
              <input type="file" accept="image/*" onChange={pickPhoto} />
            </label>
          </span>
          <div className="ms-hero-info">
            <h2>{fullName}</h2>
            <p className="profile-email">{user.email}</p>
            <p className="profile-role">
              <i className="mdi mdi-shield-account-outline" /> {t(`auth.role.${user.role}`)}
            </p>
            {profile?.city && (
              <p className="profile-location">
                <i className="mdi mdi-map-marker-outline" /> {profile.city}{profile.country ? `, ${profile.country}` : ''}
              </p>
            )}
          </div>
          <div className="profile-completion">
            <div className="profile-completion-ring">
              <svg viewBox="0 0 80 80" className="profile-ring-svg">
                <circle cx="40" cy="40" r="34" className="profile-ring-track" />
                <circle cx="40" cy="40" r="34" className="profile-ring-fill"
                        style={{ strokeDasharray: `${2 * Math.PI * 34}`, strokeDashoffset: `${2 * Math.PI * 34 * (1 - completion / 100)}` }} />
              </svg>
              <div className="profile-ring-label">
                <strong>{completion}%</strong>
                <small>complété</small>
              </div>
            </div>
            {completion < 100 && (
              <a href="#profile-form" className="profile-complete-cta">
                <i className="mdi mdi-pencil-outline" /> Compléter
              </a>
            )}
          </div>
        </div>

        <p className="breadcrumb-back">
          <Link to="/espace-membre"><i className="mdi mdi-arrow-left" /> {t('profile.back')}</Link>
        </p>

        {/* Formulaire */}
        <section id="profile-form" className="card profile-card">
          <div className="profile-head">
            <div>
              <h2>{profile ? t('profile.edit') : t('profile.create')}</h2>
              <p className="profile-sub">{t('profile.formSub')}</p>
            </div>
            {profile && (
              <Link to="/ma-carte" className="btn-secondary profile-card-btn">
                <i className="mdi mdi-card-account-details-outline" /> {t('profile.viewCard')}
              </Link>
            )}
          </div>

          {message && (
            <p className={`form-flash ${message.startsWith('Erreur') ? 'ko' : 'ok'}`}>
              <i className={`fa-solid ${message.startsWith('Erreur') ? 'fa-circle-exclamation' : 'fa-circle-check'}`} /> {message}
            </p>
          )}

          <form onSubmit={handleSubmit} className="form profile-form">
            <div className="profile-photo-row">
              <span className="photo-picker-preview profile-photo-preview">
                {avatar ? <img src={avatar} alt="" /> : <i className="mdi mdi-account-circle-outline" />}
              </span>
              <label className="photo-picker-label profile-photo-label">
                <span className="photo-picker-title">Photo de profil</span>
                <span className="optional">{t('profile.photo.hint')}</span>
                <input type="file" accept="image/*" onChange={pickPhoto} />
              </label>
            </div>

            <div className="form-row">
              <label>{t('profile.year')} <span className="required-star">*</span>
                <input name="graduation_year" type="number" value={form.graduation_year}
                       onChange={update} required placeholder={t('profile.year.ph')} />
              </label>
              <label>{t('profile.city')}
                <input name="city" value={form.city} onChange={update} placeholder={t('profile.city.ph')} />
              </label>
            </div>
            <label>{t('profile.profession')}
              <input name="profession" value={form.profession} onChange={update}
                     placeholder={t('profile.profession.ph')} />
            </label>
            <label>{t('profile.company')} <span className="optional">{t('profile.optional')}</span>
              <input name="company" value={form.company} onChange={update}
                     placeholder={t('profile.company.ph')} />
            </label>
            <label>{t('profile.bio')} <span className="optional">{t('profile.optional')}</span>
              <textarea name="bio" value={form.bio} onChange={update} rows={4}
                        placeholder={t('profile.bio.ph')} />
            </label>

            <div className="profile-actions">
              <button className="btn-primary" disabled={saving}>
                {saving
                  ? <><i className="fa-solid fa-circle-notch fa-spin" /> {t('profile.saving')}</>
                  : <><i className="fa-solid fa-floppy-disk" /> {t('profile.save')}</>}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}