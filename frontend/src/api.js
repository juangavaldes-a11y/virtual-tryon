async function request(path, options) {
  const res = await fetch(path, options)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message || body?.error || `Request failed (${res.status})`)
  }
  return res.status === 204 ? null : res.json()
}

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const api = {
  mannequins: () => request('/api/mannequin?limit=100'),
  garments: () => request('/api/garment?limit=500&sort=createdAt DESC'),
  createGarment: (g) => request('/api/garment', json('POST', g)),
  designs: () => request('/api/design?limit=50&sort=createdAt DESC'),
  createDesign: (d) => request('/api/design', json('POST', d)),
  deleteDesign: (id) => request(`/api/design/${id}`, { method: 'DELETE' }),
  async tryOn({ category, person, garment }) {
    const form = new FormData() // text field first: Skipper needs it before the files
    form.append('category', category)
    form.append('person', person, 'person.png')
    form.append('garment', garment, 'garment.png')
    const res = await fetch('/api/tryon', { method: 'POST', body: form })
    if (!res.ok) {
      throw new Error(res.status === 503 ? 'The try-on service is unavailable. Is the GPU server running?' : 'Try-on failed.')
    }
    return res.blob()
  },
  async uploadImage(blobOrFile) {
    const form = new FormData()
    form.append('image', blobOrFile)
    return (await request('/api/upload/image', { method: 'POST', body: form })).url
  },
}
