export function downloadCSV(filename, rows) {
  if (!rows || rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const csv = [headers.join(';')]
    .concat(rows.map(r => headers.map(h => escape(r[h])).join(';')))
    .join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
