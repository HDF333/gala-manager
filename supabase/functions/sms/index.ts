// ============================================================================
// SMS MANAGER — proxy serveur (Supabase Edge Function)
// La clé d'intégration reste ici, en secret : jamais dans le navigateur.
// Secret requis : SMS_MANAGER_API_KEY (smsm_...)
// ============================================================================

const SMS_API = 'https://tentacled-sms-flow-hub.base44.app/api/gateway/v1'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405)

  const key = Deno.env.get('SMS_MANAGER_API_KEY')
  if (!key) return json({ ok: false, error: 'sms_key_missing', message: 'SMS_MANAGER_API_KEY non configurée.' }, 500)

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400)
  }

  const to = String(body.to || '').trim()
  const content = String(body.content || '').trim()
  if (!to || !content) return json({ ok: false, error: 'invalid_payload', message: 'to et content requis' }, 422)
  if (content.length > 1600) return json({ ok: false, error: 'content_too_long' }, 422)

  const reference = String(body.reference || '').slice(0, 120) || undefined
  const sendMode = ['auto', 'android', 'ios', 'modem'].includes(String(body.send_mode))
    ? String(body.send_mode)
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
      return json({
        ok: true,
        message_id: (data as any).message_id || null,
        status: (data as any).status || 'pending',
        duplicate: !!(data as any).duplicate,
      })
    }
    const err = ((data as any).error || {}) as Record<string, string>
    return json({ ok: false, error: err.code || 'http_error', message: err.message || '' }, resp.status)
  } catch (e) {
    return json({ ok: false, error: 'network', message: String(e) }, 502)
  }
})
