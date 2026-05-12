/** Resize an image file to 128×128 JPEG data URL (~8–15 KB). Safe for localStorage. */
export async function resizeIconToDataUrl(file: File): Promise<string> {
  const SIZE = 128
  const img = await createImageBitmap(file)
  const canvas = new OffscreenCanvas(SIZE, SIZE)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('OffscreenCanvas 2d context unavailable')

  // Crop + scale: cover the square (preserve aspect ratio, center crop)
  const scale = Math.max(SIZE / img.width, SIZE / img.height)
  const sw = SIZE / scale
  const sh = SIZE / scale
  const sx = (img.width - sw) / 2
  const sy = (img.height - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, SIZE, SIZE)

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 })
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/** Validate + resize. Returns data URL or throws with a user-facing message. */
export async function processIconFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('File must be an image')
  if (file.size > 10 * 1024 * 1024) throw new Error('Image too large (max 10 MB)')
  return resizeIconToDataUrl(file)
}
