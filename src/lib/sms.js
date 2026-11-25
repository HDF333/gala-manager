// ============================================================================
// Client SMS MANAGER (GALA MANAGER) — appels vers la fonction Vercel /api/sms
// ============================================================================

/** Normalise un numéro ivoirien en E.164 (+225…). */
export function normalizePhone(raw) {
  if (!raw) return ''
  let p = String(raw).replace(/[^\d+]/g, '')
  if (p.startsWith('+')) return p
  if (p.startsWith('00')) return '+' + p.slice(2)
  if (p.startsWith('0')) return '+225' + p.slice(1)
  return '+225' + p
}

/** Soumet un SMS à SMS MANAGER (idempotent grâce à `reference`). */
export async function sendSms({ to, content, reference, send_mode = 'auto' }) {
  const cleanTo = normalizePhone(to)
  if (!cleanTo || !content) {
    return { ok: false, error: 'invalid_payload', message: 'Numéro ou contenu manquant' }
  }
  try {
    const resp = await fetch('/api/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: cleanTo, content, reference, send_mode }),
    })
    return await resp.json()
  } catch (e) {
    return { ok: false, error: 'network', message: String(e) }
  }
}

/** SMS de bienvenue après une inscription (référence idempotente). */
export async function sendWelcomeSms({ first_name, phone, ticket_code, event_name }) {
  const content =
    `Bonjour ${first_name || ''}, votre inscription${event_name ? ` à « ${event_name} »` : ''} est confirmée. ` +
    `Votre code billet : ${ticket_code || '—'}. Présentez ce SMS à l'entrée. À très bientôt !`
  return sendSms({
    to: phone,
    content,
    reference: ticket_code ? `welcome-${ticket_code}` : undefined,
  })
}

/** Envoie un rappel à un invité (référence idempotente par invité). */
export async function sendReminderSms({ guest, message, event_name, event_date, event_venue }) {
  const defaultMsg =
    `Rappel : ${event_name || 'Notre événement'}` +
    (event_date ? ` le ${event_date}` : '') +
    (event_venue ? ` à ${event_venue}` : '') +
    `. Nous vous attendons. Merci !`
  return sendSms({
    to: guest.phone,
    content: message && message.trim() ? message.trim() : defaultMsg,
    reference: `reminder-${guest.id}`,
  })
}
