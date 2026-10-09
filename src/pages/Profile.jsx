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
  const fullName = `${user.first_name} ${user.last_name}`.trim()

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
          <span className="ms-avatar">
            <ProfileAvatar src={avatar} name={fullName} />
          </span>
          <div className="ms-hero-info">
            <h2>{user.first_name} {user.last_name}</h2>
            <p>{user.email} · {t(`auth.role.${user.role}`)}</p>
            {profile?.city && <p>{profile.city}{profile.country ? `, ${profile.country}` : ''}</p>}
          </div>
          <div className="ms-meter">
            <p className="ms-meter-label">{t('member.profileMeter')}</p>
            <div className="ms-meter-track">
              <span className="ms-meter-fill" style={{ width: `${completion}%` }} />
            </div>
            <p className="ms-meter-value">{completion}%</p>
          </div>
        </div>

        <p className="breadcrumb-back">
          <Link to="/espace-membre"><i className="mdi mdi-arrow-left" /> {t('profile.back')}</Link>
        </p>

        {/* Formulaire */}
        <section className="card profile-card" style={{ maxWidth: 720 }}>
          <div className="profile-head">
            <div>
              <h2>{profile ? t('profile.edit') : t('profile.create')}</h2>
              <p className="profile-sub">
                {t('profile.formSub')}
              </p>
            </div>
          </div>

          {message && (
            <p className={`form-flash ${message.startsWith('Erreur') ? 'ko' : 'ok'}`}>
              <i className={`fa-solid ${message.startsWith('Erreur') ? 'fa-circle-exclamation' : 'fa-circle-check'}`} /> {message}
            </p>
          )}

          <form onSubmit={handleSubmit} className="form">
            <div className="photo-picker">
              <span className="photo-picker-preview">
                {avatar ? <img src={avatar} alt="" /> : <i className="mdi mdi-camera-plus-outline" />}
              </span>
              <label className="photo-picker-label">
                Photo de profil <span className="optional">{t('profile.photo.hint')}</span>
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
              <textarea name="bio" value={form.bio} onChange={update} rows={3}
                        placeholder={t('profile.bio.ph')} />
            </label>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn-primary" disabled={saving}>
                {saving
                  ? <><i className="fa-solid fa-circle-notch fa-spin" /> {t('profile.saving')}</>
                  : <><i className="fa-solid fa-floppy-disk" /> {t('profile.save')}</>}
              </button>
              <Link to="/ma-carte" className="btn-secondary">
                <i className="mdi mdi-card-account-details-outline" /> {t('profile.viewCard')}
              </Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
