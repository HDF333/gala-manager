const KEY = 'even_manager_current_event'
const listeners = new Set()

export function getCurrentEvent() {
  try {
    const v = localStorage.getItem(KEY)
    return v ? Number(v) : null
  } catch {
    return null
  }
}

export function setCurrentEvent(id) {
  try {
    if (id === null || id === undefined) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, String(id))
  } catch {}
  listeners.forEach(l => l(getCurrentEvent()))
}

export function subscribeCurrentEvent(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
