export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'))
    reader.onload = () => {
      try {
        const text = String(reader.result).replace(/^\ufeff/, '')
        const sep = text.includes(';') ? ';' : ','
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
        if (lines.length < 2) { resolve([]); return }
        const headers = lines[0].split(sep).map(h => h.trim().toLowerCase())
        const rows = lines.slice(1).map(line => {
          const cells = line.split(sep)
          const row = {}
          headers.forEach((h, i) => { row[h] = (cells[i] || '').trim() })
          return row
        })
        resolve(rows)
      } catch (e) {
        reject(e)
      }
    }
    reader.readAsText(file)
  })
}

export function triggerFileInput(onFile) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.csv'
  input.onchange = async () => {
    const file = input.files && input.files[0]
    if (!file) return
    try {
      await onFile(file)
    } finally {
      input.remove()
    }
  }
  document.body.appendChild(input)
  input.click()
}
