import { afterEach, describe, expect, it, vi } from 'vitest'

import { mediaUrl } from './client'

const rendre = (valeur) => vi.stubEnv('VITE_API_URL', valeur)

describe('mediaUrl', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('ancre un media absolu sans port sur le backend configure', () => {
    rendre('https://pelou.isroot.in:8443')
    expect(mediaUrl('https://pelou.isroot.in/media/projects/mms-project-3.jpg'))
      .toBe('https://pelou.isroot.in:8443/media/projects/mms-project-3.jpg')
  })

  it('ancre un chemin relatif sur le backend configure', () => {
    rendre('https://pelou.isroot.in:8443')
    expect(mediaUrl('/media/projects/mms-project-3.jpg'))
      .toBe('https://pelou.isroot.in:8443/media/projects/mms-project-3.jpg')
  })

  it('laisse une ressource externe intacte', () => {
    rendre('https://pelou.isroot.in:8443')
    expect(mediaUrl('https://img.youtube.com/vi/abc/hq.jpg'))
      .toBe('https://img.youtube.com/vi/abc/hq.jpg')
  })

  it('retire la barre oblique finale de l origine configuree', () => {
    rendre('https://pelou.isroot.in:8443/')
    expect(mediaUrl('/media/x.jpg')).toBe('https://pelou.isroot.in:8443/media/x.jpg')
  })

  it('renvoie null sans url', () => {
    expect(mediaUrl(null)).toBeNull()
    expect(mediaUrl('')).toBeNull()
  })
})
