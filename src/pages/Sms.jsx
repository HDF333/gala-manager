import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../hooks/useSupabase'
import { getCurrentEvent } from '../lib/currentEvent'
import { hasPerm } from '../lib/permissions'
import {
  SMS_TYPES, SMS_AUDIENCES, normalizePhone, splitSms,
  loadSmsSettings, saveSmsSettings, sendSms, logSms, renderSms, smsContext
} from '../lib/sms'

const STATUS_LABEL = {
  queued: { label: 'En file', className: 'badge-warning' },
  sent: { label: 'Envoyé', className: 'badge-success' },
  duplicate: { label: 'Déjà envoyé', className: 'badge-info' },
  failed: { label: 'Échec', className: 'badge-danger' },
  skipped: { label: 'Ignoré', className: 'badge-muted' }
}

// Clé réservée dans le jsonb `templates` pour mémoriser les types personnalisés.
const CUSTOM_TYPES_KEY = '__custom__'

function loadCustomTypes(settings) {
  const arr = settings?.templates?.[CUSTOM_TYPES_KEY]
  return Array.isArray(arr) ? arr : []
}

export default function Sms() {
  const { profile } = useAuth()
  const eventId = getCurrentEvent()
  const { data: events = [] } = useSupabase('events')
  const { data: guests = [] } = useSupabase('guests')
  const { data: categories = [] } = useSupabase('categories')
  const { data: finances = [] } = useSupabase('finances')
  const { data: accessLogs = [] } = useSupabase('access_logs')
  const { data: logs = [], refetch: refetchLogs } = useSupabase('sms_log')

  const event = events.find(e => e.id === eventId) || null
  const allowed = hasPerm(profile, 'gerer_sms')

  const [settings, setSettings] = useState(null)
  const [draft, setDraft] = useState({})
  const [audiences, setAudiences] = useState({})
  const [manual, setManual] = useState({})
  const [openType, setOpenType] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [run, setRun] = useState({ type: null, done: 0, total: 0, ok: 0, failed: 0, errors: [] })
  const [customTypes, setCustomTypes] = useState([])

  useEffect(() => {
    let alive = true
    if (!eventId) return
    loadSmsSettings(eventId).then(s => { if (alive) { setSettings(s); setDraft(s.templates); setCustomTypes(loadCustomTypes(s)) } })
    return () => { alive = false }
  }, [eventId])

  const catName = (id) => categories.find(c => c.id === id)?.name || ''

  const allTypes = useMemo(
    () => [
      ...SMS_TYPES,
      ...customTypes.map(c => ({ ...c, template: settings?.templates?.[c.key] ?? '' }))
    ],
    [customTypes, settings]
  )
  const typeMap = useMemo(() => allTypes.reduce((acc, t) => ({ ...acc, [t.key]: t }), {}), [allTypes])

  const publicLink = typeof window !== 'undefined' && eventId
    ? window.location.origin + '/inscription-publique?event=' + eventId
    : ''

  const paidGuestIds = useMemo(() => {
    const ids = new Set()
    for (const f of finances) {
      if (f.guest_id && f.status === 'paid') ids.add(f.guest_id)
    }
    return ids
  }, [finances])

  const unpaidGuestIds = useMemo(() => {
    const ids = new Set()
    for (const f of finances) {
      if (f.guest_id && f.status === 'pending') ids.add(f.guest_id)
    }
    return ids
  }, [finances])

  const attendedGuestIds = useMemo(() => {
    const names = new Set(
      accessLogs.filter(l => l.result === 'ok' && l.guest_name).map(l => l.guest_name.trim().toLowerCase())
    )
    const ids = new Set()
    for (const g of guests) {
      const full = `${g.first_name || ''} ${g.last_name || ''}`.trim().toLowerCase()
      if (names.has(full)) ids.add(g.id)
    }
    return ids
  }, [accessLogs, guests])

  const recipientsFor = (audience, typeKey) => {
    if (audience === 'manual') {
      return (manual[typeKey] || '')
        .split(/[\s,;]+/)
        .map(t => t.trim())
        .filter(Boolean)
        .map((phone, i) => ({ id: 'manual-' + i, first_name: 'Cher invité', last_name: '', phone, manual: true }))
    }
    const withPhone = guests.filter(g => g.phone && g.status !== 'rejected')
    switch (audience) {
      case 'confirmed': return withPhone.filter(g => g.status === 'confirmed')
      case 'pending': return withPhone.filter(g => g.status === 'pending')
      case 'paid': return withPhone.filter(g => paidGuestIds.has(g.id))
      case 'unpaid': return withPhone.filter(g => g.status === 'pending' || unpaidGuestIds.has(g.id))
      case 'attended': return withPhone.filter(g => attendedGuestIds.has(g.id))
      default: return withPhone
    }
  }

  const enabledFor = (key) => (settings?.enabled?.[key] !== false)

  const toggleType = async (key) => {
    if (!settings || !eventId) return
    const enabled = { ...settings.enabled, [key]: !enabledFor(key) }
    const templates = { ...settings.templates, ...draft, [CUSTOM_TYPES_KEY]: customTypes }
    setSettings({ enabled, templates })
    setSaving(true)
    try {
      await saveSmsSettings(eventId, { enabled, templates })
      setMessage(`« ${typeMap[key]?.label || key} » ${enabled[key] ? 'activé' : 'désactivé'} pour cet événement.`)
    } catch (err) {
      setMessage('Erreur : ' + (err.message || 'Enregistrement impossible'))
    } finally {
      setSaving(false)
    }
  }

  const saveTemplates = async () => {
    if (!settings || !eventId) return
    setSaving(true)
    try {
      const templates = { ...settings.templates, ...draft, [CUSTOM_TYPES_KEY]: customTypes }
      await saveSmsSettings(eventId, { enabled: settings.enabled, templates })
      setSettings({ ...settings, templates })
      setMessage('Modèles enregistrés pour cet événement.')
    } catch (err) {
      setMessage('Erreur : ' + (err.message || 'Enregistrement impossible'))
    } finally {
      setSaving(false)
    }
  }

  const addCustomType = async () => {
    if (!settings || !eventId) return
    const label = window.prompt('Nom du nouveau type de SMS :', 'Message libre')
    if (!label || !label.trim()) return
    const key = 'custom_' + Date.now().toString(36)
    const type = {
      key,
      label: label.trim(),
      icon: '✉️',
      audience: 'manual',
      hint: 'Type personnalisé — choisissez les numéros ou une audience.',
      custom: true
    }
    const template = 'Bonjour {{prenom}}, votre message ici. {{evenement}} — {{date}}.'
    setCustomTypes([...customTypes, type])
    setDraft({ ...draft, [key]: template })
    setSettings({ ...settings, enabled: { ...settings.enabled, [key]: true } })
    setOpenType(key)
    setMessage(`Type « ${type.label} » ajouté. Modifiez le modèle puis « Enregistrer les modèles ».`)
  }

  const removeCustomType = (key) => {
    if (!window.confirm('Supprimer ce type personnalisé ?')) return
    setCustomTypes(customTypes.filter(c => c.key !== key))
    const nextDraft = { ...draft }
    delete nextDraft[key]
    setDraft(nextDraft)
    setMessage('Type supprimé. Cliquez sur « Enregistrer les modèles » pour confirmer.')
  }

  const preview = (key) => {
    const sample = recipientsFor(audiences[key] || typeMap[key]?.audience, key)[0] ||
      guests.find(g => g.phone) || { first_name: 'Awa', last_name: 'Koné', table_number: 1, company: 'Tribu' }
    const cat = catName(sample.category_id)
    const finance = finances.find(f => f.guest_id === sample.id)
    return renderSms(draft[key] || typeMap[key]?.template || '', smsContext({
      guest: sample, event, categoryName: cat, amount: finance?.amount || 0, lien: publicLink
    }))
  }

  const sendForType = async (key) => {
    const def = typeMap[key]
    if (!def) return
    const audience = audiences[key] || def.audience
    const targets = recipientsFor(audience, key)
    if (targets.length === 0) {
      setMessage('Aucun destinataire pour ce message.')
      return
    }
    const template = draft[key] || def.template
    if (!window.confirm(`Envoyer « ${def.label} » à ${targets.length} destinataire(s) ?`)) return

    // runId unique par clic : chaque nouvel envoi n'est plus bloqué comme
    // « doublon » (l'idempotence protège seulement les reprises réseau).
    const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    setRun({ type: key, done: 0, total: targets.length, ok: 0, failed: 0, errors: [] })
    let ok = 0
    let failed = 0
    const errors = []

    for (let i = 0; i < targets.length; i++) {
      const guest = targets[i]
      const finance = finances.find(f => f.guest_id === guest.id)
      const content = renderSms(template, smsContext({
        guest, event, categoryName: catName(guest.category_id),
        amount: finance?.amount || 0, lien: publicLink
      }))
      const baseRef = guest.manual
        ? `${key}-${eventId}-${normalizePhone(guest.phone)}-${runId}`
        : `${key}-${eventId}-${guest.id}-${runId}`
      // Fractionnement : la passerelle Android n'envoie qu'un seul segment.
      const parts = splitSms(content, 160)

      for (let p = 0; p < parts.length; p++) {
        const reference = parts.length > 1 ? `${baseRef}-p${p + 1}` : baseRef
        const result = await sendSms({ to: guest.phone, content: parts[p], reference })
        if (result.ok) {
          ok++
        } else {
          failed++
          errors.push(`${guest.first_name || ''} ${guest.phone} : ${result.message || result.error || 'échec'}`)
        }
        await logSms({
          eventId,
          type: key,
          guestId: guest.manual ? null : guest.id,
          phone: normalizePhone(guest.phone),
          content: parts[p],
          reference,
          status: result.ok ? (result.duplicate ? 'duplicate' : 'queued') : 'failed',
          error: result.ok ? null : (result.error || result.message || 'error')
        })
        await new Promise(r => setTimeout(r, 450))
      }
      setRun({ type: key, done: i + 1, total: targets.length, ok, failed, errors: [...errors] })
    }

    setRun({ type: null, done: targets.length, total: targets.length, ok, failed, errors })
    setMessage(`« ${def.label} » : ${ok} SMS envoyé(s), ${failed} échec(s).`)
    refetchLogs()
  }

  if (!eventId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-title">SMS</div>
        <div className="alert alert-danger">Choisissez d'abord un événement dans le menu Événements.</div>
      </div>
    )
  }

  if (!allowed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-title">SMS</div>
        <div className="alert alert-danger">
          L'envoi de SMS est réservé à l'administrateur et aux gestionnaires de l'événement.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <div className="page-title">Messages SMS</div>
        <div className="page-subtitle" style={{ marginBottom: 0 }}>
          Choisissez, événement par événement, les messages à envoyer via SMS MANAGER.
        </div>
      </div>

      {message && (
        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: 0, background: 'rgba(26,122,58,0.06)', borderColor: 'rgba(26,122,58,0.35)' }}>
          <strong style={{ color: 'var(--success)', fontWeight: 600 }}>{message}</strong>
        </div>
      )}

      <div className="card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="kpi-label">Événement actif</div>
            <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '1rem' }}>{event?.name || '—'}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {guests.filter(g => g.phone).length} participant(s) avec numéro · {logs.length} SMS journalisé(s)
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <a className="btn btn-secondary btn-sm" href="/events">⚙️ Événements</a>
            <button className="btn btn-secondary btn-sm" onClick={() => refetchLogs()}>↻ Rafraîchir le journal</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Types de message</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="badge badge-gold">
              {allTypes.filter(t => enabledFor(t.key)).length} / {allTypes.length} actifs
            </span>
            <button className="btn btn-secondary btn-sm" onClick={addCustomType}>➕ Nouveau type</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {allTypes.map(t => {
            const audience = audiences[t.key] || t.audience
            const count = recipientsFor(audience, t.key).length
            const running = run.type === t.key
            const open = openType === t.key
            return (
              <div key={t.key} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '0.75rem 0.9rem', background: enabledFor(t.key) ? '#fff' : '#FAFBFE' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', minWidth: 250, flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={enabledFor(t.key)}
                      onChange={() => toggleType(t.key)}
                      disabled={saving || !settings}
                      style={{ width: 18, height: 18, accentColor: '#d4af37' }}
                    />
                    <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{t.icon} {t.label}</span>
                    {t.auto && <span className="badge badge-info">auto</span>}
                  </label>

                  <select
                    className="form-select"
                    value={audience}
                    onChange={e => setAudiences({ ...audiences, [t.key]: e.target.value })}
                    style={{ width: 230 }}
                  >
                    {SMS_AUDIENCES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
                  </select>

                  <span className="badge badge-muted">{count} destinataire(s)</span>

                  <button className="btn btn-secondary btn-sm" onClick={() => setOpenType(open ? null : t.key)}>
                    {open ? 'Fermer' : '✏️ Modèle'}
                  </button>
                  <button className="btn btn-gold btn-sm" onClick={() => sendForType(t.key)} disabled={count === 0 || !!run.type}>
                    {running ? `${run.done}/${run.total}` : '📨 Envoyer'}
                  </button>
                  {t.custom && (
                    <button className="btn btn-secondary btn-sm" title="Supprimer ce type" onClick={() => removeCustomType(t.key)}>✕</button>
                  )}
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{t.hint}</div>

                {audience === 'manual' && (
                  <textarea
                    className="form-textarea"
                    style={{ minHeight: 60, marginTop: '0.6rem' }}
                    placeholder="Numéros séparés par des virgules, ex. 0700000001, +225 07 00 00 00 02"
                    value={manual[t.key] || ''}
                    onChange={e => setManual({ ...manual, [t.key]: e.target.value })}
                  />
                )}

                {open && (
                  <div style={{ marginTop: '0.75rem', borderTop: '1px dashed var(--border)', paddingTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-soft)' }}>
                      Modèle — variables : {'{{prenom}} {{nom}} {{tribu}} {{evenement}} {{date}} {{lieu}} {{categorie}} {{table}} {{montant}} {{billet}} {{lien}}'}
                    </label>
                    <textarea
                      className="form-textarea"
                      style={{ minHeight: 88, marginTop: '0.35rem' }}
                      value={draft[t.key] ?? t.template}
                      onChange={e => setDraft({ ...draft, [t.key]: e.target.value })}
                    />
                    <div style={{ background: '#F6F8FE', border: '1px solid var(--border)', borderRadius: 8, padding: '0.6rem 0.75rem', fontSize: '0.85rem', color: 'var(--text)', marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Aperçu</div>
                      {preview(t.key)}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={saveTemplates} disabled={saving}>💾 Enregistrer les modèles</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setDraft({ ...draft, [t.key]: t.template })}>↺ Modèle par défaut</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {run.errors.length > 0 && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 8, background: 'rgba(184,26,26,0.08)', color: 'var(--danger)', fontSize: '0.82rem', maxHeight: 160, overflow: 'auto' }}>
            {run.errors.map((e, i) => <div key={i}>• {e}</div>)}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-header">
          <h2 className="card-title">Journal des envois</h2>
          <span className="badge badge-muted">{logs.length}</span>
        </div>
        {logs.length === 0 && <p style={{ color: 'var(--text-muted)', margin: 0 }}>Aucun SMS envoyé pour cet événement.</p>}
        {logs.slice(0, 25).map(l => {
          const st = STATUS_LABEL[l.status] || STATUS_LABEL.queued
          return (
            <div key={l.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
              <span style={{ minWidth: 130, fontWeight: 600, color: 'var(--navy)' }}>
                {typeMap[l.type]?.icon} {typeMap[l.type]?.label || l.type}
              </span>
              <span style={{ minWidth: 130, color: 'var(--text-soft)' }}>{l.phone}</span>
              <span className={`badge ${st.className}`}>{st.label}</span>
              {l.error && <span style={{ color: 'var(--danger)', fontSize: '0.78rem' }}>{l.error}</span>}
              <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                {new Date(l.created_at).toLocaleString('fr-FR')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
