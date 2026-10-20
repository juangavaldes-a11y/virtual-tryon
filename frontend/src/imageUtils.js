import { useEffect, useState } from 'react'

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = src
  })
}

export function useImage(src) {
  const [img, setImg] = useState(null)
  useEffect(() => {
    let alive = true
    loadImage(src).then((i) => alive && setImg(i)).catch(() => alive && setImg(null))
    return () => { alive = false }
  }, [src])
  return img
}

export async function fetchBlob(src) {
  const res = await fetch(src)
  if (!res.ok) throw new Error('Could not load image')
  return res.blob()
}

// The try-on model expects a flat garment photo on a white background.
export async function flattenOnWhite(src) {
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0)
  return new Promise((res) => canvas.toBlob(res, 'image/png'))
}

// Turns near-white pixels transparent so a product photo can be layered on a model.
export async function removeWhiteBackground(file, threshold = 235) {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const px = data.data
    for (let i = 0; i < px.length; i += 4) {
      const min = Math.min(px[i], px[i + 1], px[i + 2])
      if (min >= threshold) px[i + 3] = 0
      else if (min >= threshold - 25) px[i + 3] = Math.round(px[i + 3] * (threshold - min) / 25)
    }
    ctx.putImageData(data, 0, 0)
    return await new Promise((res) => canvas.toBlob(res, 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}
