import { useEffect, useState } from 'react'

const DEFAULT_AVATAR = '/profile-avatar-default.svg'

export default function ProfileAvatar({ src, name = '', className = '' }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [src])

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

  if (failed) return <span className={`${className} profile-avatar-fallback`}>{initials || '?'}</span>

  return (
    <img
      className={className}
      src={src || DEFAULT_AVATAR}
      alt=""
      onError={(event) => {
        if (event.currentTarget.src.endsWith(DEFAULT_AVATAR)) setFailed(true)
        else event.currentTarget.src = DEFAULT_AVATAR
      }}
    />
  )
}