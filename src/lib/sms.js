// ============================================================================
// SMS MANAGER — catalogue des messages, modèles et envoi
// La clé d'intégration reste côté serveur (Edge Function Supabase « sms »,
// ou fonction Vercel /api/sms en secours).
// ============================================================================
import { supabase } from './supabase'

/** Normalise un numéro ivoirien en E.164 (+225…). */
export function normalizePhone(raw) {
  if (!raw) return ''
  const p = String(raw).replace(/[^\d+]/g, '')
  if (p.startsWith('+225')) {
    const nat = p.slice(4)
    // Un numéro ivoirien garde son 0 : +225 07 78 18 68 19.
    // On répare un 0 manquant (+225 7x… → +225 07x…) sans toucher au reste.
    return nat.length === 9 ? '+2250' + nat : p
  }
  if (p.startsWith('+')) return p
  if (p.startsWith('00')) return normalizePhone('+' + p.slice(2))
  if (p.startsWith('0')) return '+225' + p // on NE supprime surtout PAS le 0
  return '+2250' + p
}

/** Destinataires possibles pour un message. */
export const SMS_AUDIENCES = [
  { key: 'all', label: 'Tous les participants' },
  { key: 'confirmed', label: 'Participants confirmés' },
  { key: 'pending', label: 'Inscriptions en attente' },
  { key: 'paid', label: 'Paiements reçus' },
  { key: 'unpaid', label: 'Paiements en attente' },
  { key: 'attended', label: 'Participants présents (scannés)' },
  { key: 'manual', label: 'Numéros saisis manuellement' }
]

/** Les 10 types de message. */
export const SMS_TYPES = [
  {
    key: 'invitation_event',
    label: "Invitation à l'événement",
    icon: '✉️',
    audience: 'all',
    hint: 'Convie officiellement les personnes déjà enregistrées.',
    template:
      "Bonjour {{prenom}}, l'équipe de {{evenement}} a le plaisir de vous convier le {{date}} à {{lieu}}. Votre table : n°{{table}}. Nous comptons sur votre présence !"
  },
  {
    key: 'invitation_signup',
    label: "Invitation à s'inscrire",
    icon: '📝',
    audience: 'manual',
    hint: 'Aux prospects : contient le lien d’inscription publique.',
    template:
      "Bonjour, {{evenement}} approche à grands pas ! Inscrivez-vous dès maintenant : {{lien}}. Places limitées, réservez la vôtre."
  },
  {
    key: 'signup_confirmation',
    label: "Confirmation d'inscription",
    icon: '✅',
    audience: 'pending',
    hint: 'Part automatiquement à chaque nouvelle inscription (si activé).',
    auto: true,
    template:
      'Bonjour {{prenom}}, votre inscription à {{evenement}} est bien enregistrée. Catégorie : {{categorie}} · Table n°{{table}} · Billet : {{billet}}. À très bientôt !'
  },
  {
    key: 'payment_reminder',
    label: 'Rappel de paiement',
    icon: '💳',
    audience: 'unpaid',
    hint: 'Relance les participants dont le paiement est en attente.',
    template:
      "Bonjour {{prenom}}, nous n'avons pas encore reçu votre paiement de {{montant}} FCFA pour {{evenement}}. Merci de régulariser avant le {{date}}. À bientôt !"
  },
  {
    key: 'payment_confirmation',
    label: 'Confirmation de paiement',
    icon: '🧾',
    audience: 'paid',
    hint: 'Confirme la réception du règlement.',
    template:
      'Bonjour {{prenom}}, nous confirmons la réception de votre paiement de {{montant}} FCFA pour {{evenement}}. Merci et à très bientôt !'
  },
  {
    key: 'participation_confirmation',
    label: 'Confirmation de participation',
    icon: '🎫',
    audience: 'confirmed',
    hint: 'Part automatiquement quand une inscription est validée (si activé).',
    auto: true,
    template:
      'Bonjour {{prenom}}, votre participation à {{evenement}} le {{date}} à {{lieu}} est confirmée. Table n°{{table}}. Présentez votre billet à l’entrée.'
  },
  {
    key: 'reminder_d7',
    label: 'Rappel à J-7',
    icon: '🗓️',
    audience: 'confirmed',
    hint: 'Une semaine avant l’événement.',
    template:
      "Plus qu'une semaine ! {{evenement}}, c'est le {{date}} à {{lieu}}. Votre table : n°{{table}}. Nous vous attendons."
  },
  {
    key: 'reminder_d1',
    label: 'Rappel à J-1',
    icon: '⏰',
    audience: 'confirmed',
    hint: 'La veille de l’événement.',
    template:
      "C'est demain ! {{evenement}} — {{date}} à {{lieu}}. Table n°{{table}}. Pensez à votre billet. À demain !"
  },
  {
    key: 'day_of',
    label: "Message le jour de l'événement",
    icon: '🎉',
    audience: 'confirmed',
    hint: 'Le jour J : mot d’accueil et rappel du lieu.',
    template:
      "Bonjour {{prenom}}, c'est le grand jour ! {{evenement}} vous accueille ce soir à {{lieu}}. Table n°{{table}}. Bienvenue !"
  },
  {
    key: 'thank_you',
    label: "Remerciement après l'événement",
    icon: '🙏',
    audience: 'attended',
    hint: 'Après la soirée, aux participants présents.',
    template:
      'Merci {{prenom}} d’avoir participé à {{evenement}} ! Votre présence a fait la différence. À très bientôt.'
  }
]

export const SMS_TYPE_MAP = SMS_TYPES.reduce((acc, t) => ({ ...acc, [t.key]: t }), {})

/** Remplace les {{variables}} d'un modèle. */
export function renderSms(template, ctx = {}) {
  if (!template) return ''
  return String(template).replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_, key) => {
    const value = ctx[key]
    return value === null || value === undefined || value === '' ? '—' : String(value)
  })
}

/**
 * Découpe un texte en plusieurs SMS de ≤ max caractères.
 * Coupe aux espaces, ne coupe jamais un mot ni une URL (un jeton trop long
 * reste seul dans son segment). Nécessaire car la passerelle Android
 * (sendTextMessage) échoue en generic_failure au-delà d'un segment.
 */
export function splitSms(content, max = 160) {
  const text = String(content || '').replace(/\s+/g, ' ').trim()
  if (!text) return ['']
  if (text.length <= max) return [text]
  const words = text.split(' ')
  const parts = []
  let cur = ''
  const flush = () => {
    if (cur) {
      parts.push(cur)
      cur = ''
    }
  }
  for (const w of words) {
    if (w.length > max) {
      flush()
      parts.push(w)
      continue
    }
    if (!cur) {
      cur = w
      continue
    }
    if (cur.length + 1 + w.length <= max) cur += ' ' + w
    else {
      flush()
      cur = w
    }
  }
  flush()
  return parts
}

/** Contexte de fusion pour un invité + un événement. */
export function smsContext({ guest = {}, event = {}, categoryName = '', amount = '', lien = '' } = {}) {
  const date = event.date ? new Date(event.date + 'T00:00:00').toLocaleDateString('fr-FR') : ''
  return {
    prenom: guest.first_name || '',
    nom: guest.last_name || '',
    tribu: guest.company || '',
    evenement: event.name || '',
    date,
    lieu: event.venue || '',
    categorie: categoryName || '',
    table: guest.table_number ? String(guest.table_number).padStart(3, '0') : '',
    montant: amount !== '' && amount !== null && amount !== undefined ? Number(amount).toLocaleString('fr-FR') : '',
    billet: guest.ticket_code || guest.ticket || '',
    lien
  }
}

/** Réglages par événement (types actifs + modèles), complétés par les défauts. */
export async function loadSmsSettings(eventId) {
  const fallback = {
    enabled: {},
    templates: SMS_TYPES.reduce((acc, t) => ({ ...acc, [t.key]: t.template }), {})
  }
  if (!eventId) return fallback
  const { data, error } = await supabase.from('sms_settings').select('*').eq('event_id', eventId).maybeSingle()
  if (error || !data) return fallback
  return {
    enabled: { ...fallback.enabled, ...(data.enabled || {}) },
    templates: { ...fallback.templates, ...(data.templates || {}) }
  }
}

export async function saveSmsSettings(eventId, { enabled, templates }) {
  const payload = {
    event_id: eventId,
    enabled: enabled || {},
    templates: templates || {},
    updated_at: new Date().toISOString()
  }
  const { error } = await supabase.from('sms_settings').upsert(payload, { onConflict: 'event_id' })
  if (error) throw error
}

/** Appelle le proxy serveur (Edge Function Supabase, sinon fonction Vercel). */
async function invokeProxy(payload) {
  try {
    const { data, error } = await supabase.functions.invoke('sms', { body: payload })
    if (!error && data) return data
  } catch {
    /* Edge Function indisponible : on tente le proxy Vercel */
  }
  try {
    const resp = await fetch('/api/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return await resp.json()
  } catch (e) {
    return { ok: false, error: 'network', message: String(e) }
  }
}

/** Soumet un SMS à SMS MANAGER (idempotent grâce à `reference`). */
export async function sendSms({ to, content, reference, send_mode = 'auto' }) {
  const cleanTo = normalizePhone(to)
  if (!cleanTo || !content) {
    return { ok: false, error: 'invalid_payload', message: 'Numéro ou contenu manquant' }
  }
  return invokeProxy({ to: cleanTo, content, reference, send_mode })
}

/** Journalise un envoi (visible dans l'écran SMS). */
export async function logSms({ eventId, type, guestId, phone, content, reference, status, error }) {
  try {
    await supabase.rpc('log_sms', {
      p_event: eventId,
      p_type: type,
      p_phone: phone,
      p_content: content,
      p_reference: reference || null,
      p_status: status || 'queued',
      p_error: error || null,
      p_guest: guestId || null
    })
  } catch {
    /* le journal ne doit jamais bloquer l'envoi */
  }
}

/** Envoie un message typé en respectant les réglages de l'événement. */
export async function sendTypedSms({ type, event, guest, settings, categoryName, amount, lien, reference }) {
  const def = SMS_TYPE_MAP[type]
  if (!def) return { ok: false, error: 'unknown_type' }
  if (settings && settings.enabled && settings.enabled[type] === false) {
    return { ok: false, skipped: true }
  }
  if (!guest?.phone) return { ok: false, skipped: true, error: 'no_phone' }

  const template = settings?.templates?.[type] || def.template
  const content = renderSms(template, smsContext({ guest, event, categoryName, amount, lien }))
  const ref = reference || `${type}-${event?.id}-${guest.id}-${new Date().toISOString().slice(0, 10)}`

  const result = await sendSms({ to: guest.phone, content, reference: ref })
  await logSms({
    eventId: event?.id,
    type,
    guestId: guest.id,
    phone: normalizePhone(guest.phone),
    content,
    reference: ref,
    status: result.ok ? (result.duplicate ? 'duplicate' : 'queued') : 'failed',
    error: result.ok ? null : result.error || result.message || 'error'
  })
  return { ...result, content }
}

/** Compatibilité : SMS de bienvenue (inscription publique). */
export async function sendWelcomeSms({ first_name, phone, ticket_code, event_name }) {
  const content =
    `Bonjour ${first_name || ''}, votre inscription${event_name ? ` à « ${event_name} »` : ''} est confirmée. ` +
    `Votre code billet : ${ticket_code || '—'}. Présentez ce SMS à l'entrée. À très bientôt !`
  return sendSms({ to: phone, content, reference: ticket_code ? `welcome-${ticket_code}` : undefined })
}

/** Compatibilité : rappel libre (ancien écran Événements). */
export async function sendReminderSms({ guest, message, event_name, event_date, event_venue }) {
  const defaultMsg =
    `Rappel : ${event_name || 'Notre événement'}` +
    (event_date ? ` le ${event_date}` : '') +
    (event_venue ? ` à ${event_venue}` : '') +
    `. Nous vous attendons. Merci !`
  return sendSms({
    to: guest.phone,
    content: message && message.trim() ? message.trim() : defaultMsg,
    reference: `reminder-${guest.id}`
  })
}
