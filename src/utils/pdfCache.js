import api from '../api/client'

const MEMORY_CACHE = new Map()

/**
 * Prefetch a paper PDF in background. Dedupes in-flight requests.
 */
export function prefetchPaperPdf(paperId) {
  if (!paperId) return Promise.resolve(null)
  const existing = MEMORY_CACHE.get(paperId)
  if (existing) {
    if (existing.objectUrl) return Promise.resolve(existing.objectUrl)
    if (existing.promise) return existing.promise
  }

  const promise = api.get(`/exams/papers/${paperId}/pdf/`, { responseType: 'blob' })
    .then(({ data }) => {
      const objectUrl = URL.createObjectURL(data)
      MEMORY_CACHE.set(paperId, { blob: data, objectUrl, promise: null })
      return objectUrl
    })
    .catch((err) => {
      MEMORY_CACHE.delete(paperId)
      throw err
    })

  MEMORY_CACHE.set(paperId, { blob: null, objectUrl: null, promise })
  return promise
}

/**
 * Returns existing cache entry for a paper { blob, objectUrl, promise } or null.
 */
export function getCachedPdf(paperId) {
  return MEMORY_CACHE.get(Number(paperId)) || MEMORY_CACHE.get(String(paperId)) || null
}

