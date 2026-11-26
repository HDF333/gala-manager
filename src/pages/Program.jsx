import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useSupabase } from '../hooks/useSupabase'
import { getCurrentEvent } from '../lib/currentEvent'
import { sendSms, logSms, normalizePhone } from '../lib/sms'
import { downloadCSV } from '../utils/export'
import { parseCSVFile, triggerFileInput } from '../utils/import'

export default function Program() {
  const { data: items = [], insert: addItem, update: updateItem, del: deleteItem } = useSupabase('program_items')
  const { data: guests = [] } = useSupabase('guests')
  const { data: events = [] } = useSupabase('events')
  const eventId = getCurrentEvent()
  const activeEvent = events.find(e => e.id === eventId)
  const [form, setForm] = useState({ title: '', start_time: '', description: '' })
  const [editing, setEditing] = useState(null)
  const [message, setMessage] = useState('')

  // Partage du programme (QR + SMS)
  const [qrUrl, setQrUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [audience, setAudience] = useState('confirmed')
  const [share, setShare] = useState({ running: false, done: 0, total: 0, ok: 0, failed: 0 })
  const [shareMsg, setShareMsg] = useState('')

  const publicLink = typeof window !== 'undefined' && eventId
    ? window.location.origin + '/programme?event=' + eventId
    : ''

  useEffect(() => {
    if (!publicLink) return
    QRCode.toDataURL(publicLink, { width: 360, margin: 1 }).then(setQrUrl).catch(() => setQrUrl(''))
  }, [publicLink])

  const recipients = () => {
    const withPhone = guests.filter(g => g.phone && g.status !== 'rejected')
    return audience === 'confirmed' ? withPhone.filter(g => g.status === 'confirmed') : withPhone
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      setShareMsg('Lien : ' + publicLink)
    }
  }

  const sendBySms = async () => {
    const targets = recipients()
    if (targets.length === 0) {
      setShareMsg('Aucun destinataire avec numéro pour cette sélection.')
      return
    }
    if (!window.confirm(`Envoyer le programme par SMS à ${targets.length} participant(s) ?`)) return
    setShare({ running: true, done: 0, total: targets.length, ok: 0, failed: 0 })
    let ok = 0
    let failed = 0
    for (let i = 0; i < targets.length; i++) {
      const g = targets[i]
      const content = `Bonjour ${g.first_name || ''}, voici le programme de ${activeEvent?.name || 'notre événement'} : ${publicLink}`
      const reference = `programme-${eventId}-${g.id}-${new Date().toISOString().slice(0, 10)}`
      const result = await sendSms({ to: g.phone, content, reference })
      if (result.ok) ok++
      else failed++
      await logSms({
        eventId,
        type: 'programme',
        guestId: g.id,
        phone: normalizePhone(g.phone),
        content,
        reference,
        status: result.ok ? (result.duplicate ? 'duplicate' : 'queued') : 'failed',
        error: result.ok ? null : (result.error || result.message || 'error')
      })
      setShare({ running: true, done: i + 1, total: targets.length, ok, failed })
      await new Promise(r => setTimeout(r, 450))
    }
    setShare({ running: false, done: targets.length, total: targets.length, ok, failed })
    setShareMsg(`Programme envoyé : ${ok} SMS, ${failed} échec(s).`)
  }

  const sorted = [...items].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      if (editing) {
        await updateItem(editing, form)
        setMessage('Élément du programme modifié')
      } else {
        await addItem(form)
        setMessage('Élément du programme ajouté')
      }
      setEditing(null)
      setForm({ title: '', start_time: '', description: '' })
    } catch (err) {
      setMessage('Erreur : ' + (err.message || 'Opération impossible'))
    }
  }

  const exportCSV = () => {
    downloadCSV('programme.csv', sorted.map(it => ({ Heure: it.start_time, Titre: it.title, Description: it.description })))
  }

  const importCSV = () => {
    triggerFileInput(async (file) => {
      setMessage('')
      try {
        const rows = await parseCSVFile(file)
        let ok = 0
        for (const r of rows) {
          if (!r.titre) continue
          await addItem({ title: r.titre, start_time: r.heure || null, description: r.description || null })
          ok++
        }
        setMessage(ok + ' élément(s) importé(s)')
      } catch (err) {
        setMessage('Erreur : ' + (err.message || 'Import impossible'))
      }
    })
  }

  const remove = async (id) => {
    if (confirm('Supprimer cet élément du programme ?')) {
      try { await deleteItem(id) } catch (err) { setMessage('Erreur : ' + err.message) }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Programme</div>
      <div className="page-subtitle">Programme de l'événement actif</div>

      {message && (
        <div style={{ padding: '1rem', borderRadius: '8px', background: message.includes('Erreur') ? 'rgba(184,26,26,0.1)' : 'rgba(26,122,58,0.1)', color: message.includes('Erreur') ? '#b81a1a' : '#1a7a3a' }}>
          {message}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{editing ? 'Modifier' : 'Ajouter un élément'}</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '0.75rem', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Titre *</label>
              <input className="form-input" placeholder="Ex : Discours d'ouverture" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Heure</label>
              <input className="form-input" placeholder="Ex : 19:00" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Description</label>
              <input className="form-input" placeholder="Détails..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary">{editing ? 'Mettre à jour' : 'Ajouter'}</button>
          </form>
          {editing && (
            <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => { setEditing(null); setForm({ title: '', start_time: '', description: '' }) }}>Annuler</button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Partager le programme</h2>
          <span className="badge badge-gold">QR + SMS</span>
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {qrUrl && (
            <div style={{ textAlign: 'center' }}>
              <img src={qrUrl} alt="QR programme" style={{ width: 148, height: 148, borderRadius: 10, border: '1px solid var(--border)' }} />
              <a className="btn btn-secondary btn-sm" href={qrUrl} download={'programme-' + (eventId || '') + '.png'} style={{ marginTop: '0.4rem', display: 'inline-block' }}>
                ⬇️ Télécharger
              </a>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '0.88rem' }}>
              Le participant scanne ce QR code pour consulter le programme sur son téléphone. Vous pouvez aussi l'envoyer par SMS au moment de votre choix.
            </p>
            <code style={{ background: '#F6F8FE', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.7rem', fontSize: '0.8rem', wordBreak: 'break-all', color: 'var(--navy)' }}>
              {publicLink || '—'}
            </code>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={copyLink} disabled={!publicLink}>
                🔗 {copied ? 'Lien copié !' : 'Copier le lien'}
              </button>
              <select className="form-select" value={audience} onChange={(e) => setAudience(e.target.value)} style={{ width: 210 }}>
                <option value="confirmed">Participants confirmés</option>
                <option value="all">Tous les participants</option>
              </select>
              <span className="badge badge-muted">{recipients().length} destinataire(s)</span>
              <button className="btn btn-gold btn-sm" onClick={sendBySms} disabled={!publicLink || share.running || recipients().length === 0}>
                {share.running ? `Envoi ${share.done}/${share.total}` : '📨 Envoyer par SMS'}
              </button>
            </div>
            {shareMsg && <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>{shareMsg}</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Déroulé de la soirée</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>⬇️ Exporter</button>
            <button className="btn btn-secondary btn-sm" onClick={importCSV}>⬆️ Importer CSV</button>
          </div>
        </div>
        <div className="card-body">
          {sorted.length === 0 && <p style={{ color: '#6a6a6a' }}>Aucun élément. Ajoutez le programme ci-dessus.</p>}
          {sorted.map((it) => (
            <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a', marginBottom: '0.5rem' }}>
              <div>
                <strong style={{ color: '#ffffff' }}>{it.start_time ? '🕐 ' + it.start_time + ' — ' : ''}{it.title}</strong>
                {it.description && <p style={{ color: '#a0a0a0', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>{it.description}</p>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(it.id); setForm({ title: it.title, start_time: it.start_time || '', description: it.description || '' }) }}>✏️</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(it.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
