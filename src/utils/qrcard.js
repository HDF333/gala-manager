function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function fmtDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return d
  }
}

export async function buildQRCard({ eventName, eventDate, eventVenue, guestName, category, tableNumber, qrDataUrl }) {
  const W = 640
  const H = 900
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Fond
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // Bandeau haut : nom de l'événement + invité
  ctx.fillStyle = '#011A43'
  ctx.fillRect(0, 0, W, 150)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#d4af37'
  ctx.font = 'bold 32px Segoe UI, Arial, sans-serif'
  ctx.fillText(String(eventName || 'ÉVÉNEMENT').toUpperCase(), W / 2, 68, W - 40)
  ctx.fillStyle = '#B9C7E6'
  ctx.font = '22px Segoe UI, Arial, sans-serif'
  ctx.fillText(guestName || '', W / 2, 112, W - 40)

  // QR code
  try {
    const img = await loadImage(qrDataUrl)
    const size = 400
    ctx.drawImage(img, (W - size) / 2, 190, size, size)
  } catch {
    /* QR indisponible */
  }

  // Bandeau bas : date, lieu, place
  ctx.fillStyle = '#010B26'
  ctx.fillRect(0, H - 200, W, 200)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 24px Segoe UI, Arial, sans-serif'
  ctx.fillText(fmtDate(eventDate) || 'Date à venir', W / 2, H - 140, W - 40)
  ctx.fillStyle = '#B9C7E6'
  ctx.font = '22px Segoe UI, Arial, sans-serif'
  ctx.fillText(eventVenue || '', W / 2, H - 100, W - 40)
  ctx.fillStyle = '#d4af37'
  ctx.font = 'bold 26px Segoe UI, Arial, sans-serif'
  const table = tableNumber ? String(tableNumber).padStart(3, '0') : '—'
  ctx.fillText((category ? category + ' · ' : '') + 'TABLE n°' + table, W / 2, H - 45, W - 40)

  return canvas.toDataURL('image/png')
}
