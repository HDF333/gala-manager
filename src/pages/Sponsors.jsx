import React, { useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { downloadCSV } from '../utils/export'
import { parseCSVFile, triggerFileInput } from '../utils/import'

export default function Sponsors() {
  const { data: sponsors = [], insert: addSponsor, update: updateSponsor, del: deleteSponsor } = useSupabase('sponsors')
  const [form, setForm] = useState({ company: '', contact_person: '', contact_phone: '', contact_email: '', website: '', deposit: '', paid: '', due: '', status: 'active' })
  const [editing, setEditing] = useState(null)
  const [message, setMessage] = useState('')

  const totalDeposits = sponsors.reduce((s, sp) => s + (sp.deposit || 0), 0)
  const totalPaid = sponsors.reduce((s, sp) => s + (sp.paid || 0), 0)
  const totalDue = sponsors.reduce((s, sp) => s + (sp.due || 0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      const payload = {
        company: form.company,
        contact_person: form.contact_person || null,
        contact_phone: form.contact_phone || null,
        contact_email: form.contact_email || null,
        website: form.website || null,
        deposit: Number(form.deposit) || 0,
        paid: Number(form.paid) || 0,
        due: Number(form.due) || 0,
        status: form.status
      }
      if (editing) {
        await updateSponsor(editing, payload)
        setMessage('Sponsor modifié')
      } else {
        await addSponsor(payload)
        setMessage('Sponsor ajouté')
      }
      setEditing(null)
      setForm({ company: '', contact_person: '', contact_phone: '', contact_email: '', website: '', deposit: '', paid: '', due: '', status: 'active' })
    } catch (err) {
      setMessage('Erreur : ' + (err.message || 'Opération impossible'))
    }
  }

  const remove = async (id) => {
    if (confirm('Supprimer ce sponsor ?')) {
      try { await deleteSponsor(id) } catch (err) { setMessage('Erreur : ' + err.message) }
    }
  }

  const exportCSV = () => {
    downloadCSV('sponsors.csv', sponsors.map(sp => ({
      Societe: sp.company, Contact: sp.contact_person, Telephone: sp.contact_phone,
      Email: sp.contact_email, Site: sp.website, Depot: sp.deposit, Paye: sp.paid,
      Restant: sp.due, Statut: sp.status
    })))
  }

  const importCSV = () => {
    triggerFileInput(async (file) => {
      setMessage('')
      try {
        const rows = await parseCSVFile(file)
        let ok = 0
        for (const r of rows) {
          if (!r.societe && !r.company) continue
          await addSponsor({
            company: r.societe || r.company,
            contact_person: r.contact || null,
            contact_phone: r.telephone || null,
            contact_email: r.email || null,
            website: r.site || null,
            deposit: Number(r.depot) || 0,
            paid: Number(r.paye) || 0,
            due: Number(r.restant) || 0,
            status: 'active'
          })
          ok++
        }
        setMessage(ok + ' sponsor(s) importé(s)')
      } catch (err) {
        setMessage('Erreur : ' + (err.message || 'Import impossible'))
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Sponsors</div>
      <div className="page-subtitle">Total engagements : ₣ {totalDeposits.toLocaleString('fr-FR')}</div>

      {message && (
        <div style={{ padding: '1rem', borderRadius: '8px', background: message.includes('Erreur') ? 'rgba(184,26,26,0.1)' : 'rgba(26,122,58,0.1)', color: message.includes('Erreur') ? '#b81a1a' : '#1a7a3a' }}>
          {message}
        </div>
      )}

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#d4af37', fontSize: '1.5rem' }}>₣ {totalDeposits.toLocaleString('fr-FR')}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Engagements</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#1a7a3a', fontSize: '1.5rem' }}>₣ {totalPaid.toLocaleString('fr-FR')}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Payés</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#c99700', fontSize: '1.5rem' }}>₣ {totalDue.toLocaleString('fr-FR')}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Restant à verser</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{editing ? 'Modifier un sponsor' : 'Ajouter un sponsor'}</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Société *</label>
              <input className="form-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Contact</label>
              <input className="form-input" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Téléphone</label>
              <input className="form-input" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Email</label>
              <input className="form-input" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Dépôt (₣)</label>
              <input className="form-input" type="number" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Payé (₣)</label>
              <input className="form-input" type="number" value={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary">{editing ? 'Mettre à jour' : 'Ajouter'}</button>
          </form>
          {editing && (
            <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => { setEditing(null); setForm({ company: '', contact_person: '', contact_phone: '', contact_email: '', website: '', deposit: '', paid: '', due: '', status: 'active' }) }}>Annuler</button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Liste des sponsors</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>⬇️ Exporter</button>
            <button className="btn btn-secondary btn-sm" onClick={importCSV}>⬆️ Importer CSV</button>
          </div>
        </div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.75rem' }}>Société</th>
                <th style={{ padding: '0.75rem' }}>Contact</th>
                <th style={{ padding: '0.75rem' }}>Téléphone</th>
                <th style={{ padding: '0.75rem' }}>Email</th>
                <th style={{ padding: '0.75rem' }}>Dépôt</th>
                <th style={{ padding: '0.75rem' }}>Payé</th>
                <th style={{ padding: '0.75rem' }}>Restant</th>
                <th style={{ padding: '0.75rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sponsors.map((sp) => (
                <tr key={sp.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '600' }}>{sp.company}</td>
                  <td style={{ padding: '0.75rem' }}>{sp.contact_person || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{sp.contact_phone || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{sp.contact_email || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>₣ {Number(sp.deposit || 0).toLocaleString('fr-FR')}</td>
                  <td style={{ padding: '0.75rem' }}>₣ {Number(sp.paid || 0).toLocaleString('fr-FR')}</td>
                  <td style={{ padding: '0.75rem' }}>₣ {Number(sp.due || 0).toLocaleString('fr-FR')}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button className="btn btn-secondary btn-sm" style={{ marginRight: '0.5rem' }} onClick={() => { setEditing(sp.id); setForm({ company: sp.company, contact_person: sp.contact_person || '', contact_phone: sp.contact_phone || '', contact_email: sp.contact_email || '', website: sp.website || '', deposit: sp.deposit, paid: sp.paid, due: sp.due, status: sp.status }) }}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(sp.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
