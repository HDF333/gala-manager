// ============================================================================
// SMS MANAGER GATEWAY — intégration GALA MANAGER (EVEN MANAGER)
// Fonction serveur Vercel : relaye l'envoi vers SMS MANAGER (protocole v1).
// La clé d'intégration (smsm_...) reste côté serveur : jamais dans le navigateur.
// Env requis : SMS_MANAGER_API_KEY (Vercel → Project Settings → Environment).
// ============================================================================

const SMS_API = 'https://tentacled-sms-flow-hub.base44.app/api/gateway/v1'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  const key = process.env.SMS_MANAGER_API_KEY
  if (!key) {
    return res.status(500).json({
      ok: false,
      error: 'sms_key_missing',
      message: 'SMS_MANAGER_API_KEY non configurée sur Vercel.',
    })
  }

  let body = {}
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ ok: false, error: 'invalid_json' })
  }

  const to = String(body.to || '').trim()
  const content = String(body.content || '').trim()
  if (!to || !content) {
    return res.status(422).json({ ok: false, error: 'invalid_payload', message: 'to et content requis' })
  }
  if (content.length > 1600) {
    return res.status(422).json({ ok: false, error: 'content_too_long' })
  }

  const reference = String(body.reference || '').slice(0, 120) || undefined
  const sendMode = ['auto', 'android', 'ios', 'modem'].includes(body.send_mode)
    ? body.send_mode
    : 'auto'

  try {
    const resp = await fetch(`${SMS_API}/submitMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': key,
        // Cloudflare bloque les User-Agent non-navigateur.
        'User-Agent': 'Mozilla/5.0 (Linux; Android 15) EvenManager/1.0 (protocole v1)',
      },
      body: JSON.stringify({ to, content, reference, send_mode: sendMode }),
    })

    const data = await resp.json().catch(() => ({}))
    if (resp.ok) {
      return res.status(200).json({
        ok: true,
        message_id: data.message_id || null,
        status: data.status || 'pending',
        duplicate: !!data.duplicate,
      })
    }
    const err = data?.error || {}
    return res.status(resp.status).json({
      ok: false,
      error: err.code || 'http_error',
      message: err.message || '',
    })
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'network', message: String(e) })
  }
}
