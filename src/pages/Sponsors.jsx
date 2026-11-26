import React, { useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { downloadCSV } from '../utils/export'
import { parseCSVFile, triggerFileInput } from '../utils/import'

const emptyForm = { company: '', contact_person: '', contact_phone: '', contact_email: '', website: '', engagement: '', paid: '', status: 'active' }

export default function Sponsors() {
  const { data: sponsors = [], insert: addSponsor, update: updateSponsor, del: deleteSponsor } = useSupabase('sponsors')
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [message, setMessage] = useState('')

  const dueOf = (sp) => Number(sp.engagement || 0) - Number(sp.paid || 0)
  const totalEngagement = sponsors.reduce((s, sp) => s + Number(sp.engagement || 0), 0)
  const totalPaid = sponsors.reduce((s, sp) => s + Number(sp.paid || 0), 0)
  const totalDue = sponsors.reduce((s, sp) => s + dueOf(sp), 0)

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
        engagement: Number(form.engagement) || 0,
        paid: Number(form.paid) || 0,
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
      setForm(emptyForm)
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
      Email: sp.contact_email, Site: sp.website, Engagement: sp.engagement,
      Paye: sp.paid, Reste: dueOf(sp), Statut: sp.status
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
            engagement: Number(r.engagement ?? r.depot ?? r['dépôt']) || 0,
            paid: Number(r.paye ?? r['payé']) || 0,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <div className="page-title">Sponsors</div>
        <div className="page-subtitle" style={{ marginBottom: 0 }}>
          Total des engagements : ₣ {totalEngagement.toLocaleString('fr-FR')}
        </div>
      </div>

      {message && (
        <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', background: message.includes('Erreur') ? 'rgba(184,26,26,0.08)' : 'rgba(26,122,58,0.08)', color: message.includes('Erreur') ? 'var(--danger)' : 'var(--success)' }}>
          {message}
        </div>
      )}

      <div className="kpi-grid">
        <div className="card" style={{ padding: '1.25rem', marginBottom: 0 }}>
          <div className="kpi-label">Engagements</div>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>₣ {totalEngagement.toLocaleString('fr-FR')}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', marginBottom: 0 }}>
          <div className="kpi-label">Payés</div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>₣ {totalPaid.toLocaleString('fr-FR')}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', marginBottom: 0 }}>
          <div className="kpi-label">Reste à verser</div>
          <div className="kpi-value" style={{ color: 'var(--warning)' }}>₣ {totalDue.toLocaleString('fr-FR')}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', marginBottom: 0 }}>
          <div className="kpi-label">Taux de recouvrement</div>
          <div className="kpi-value">{totalEngagement > 0 ? Math.round((totalPaid / totalEngagement) * 100) : 0} %</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{editing ? 'Modifier un sponsor' : 'Ajouter un sponsor'}</h2>
        </div>
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
            <label>Engagement (₣)</label>
            <input className="form-input" type="number" min="0" value={form.engagement} onChange={(e) => setForm({ ...form, engagement: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Payé (₣)</label>
            <input className="form-input" type="number" min="0" value={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Reste à verser</label>
            <input className="form-input" readOnly value={'₣ ' + (Number(form.engagement || 0) - Number(form.paid || 0)).toLocaleString('fr-FR')} style={{ background: '#F6F8FE', fontWeight: 600 }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginBottom: '.1rem' }}>{editing ? 'Mettre à jour' : 'Ajouter'}</button>
        </form>
        {editing && (
          <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => { setEditing(null); setForm(emptyForm) }}>Annuler</button>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Liste des sponsors</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>⬇️ Exporter</button>
            <button className="btn btn-secondary btn-sm" onClick={importCSV}>⬆️ Importer CSV</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#F6F8FE', color: 'var(--text-soft)', fontWeight: 600 }}>
                <th style={{ padding: '0.7rem', textAlign: 'left' }}>Société</th>
                <th style={{ padding: '0.7rem', textAlign: 'left' }}>Contact</th>
                <th style={{ padding: '0.7rem', textAlign: 'left' }}>Téléphone</th>
                <th style={{ padding: '0.7rem', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '0.7rem', textAlign: 'right' }}>Engagement</th>
                <th style={{ padding: '0.7rem', textAlign: 'right' }}>Payé</th>
                <th style={{ padding: '0.7rem', textAlign: 'right' }}>Reste à verser</th>
                <th style={{ padding: '0.7rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sponsors.map((sp) => (
                <tr key={sp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.7rem', fontWeight: 600 }}>{sp.company}</td>
                  <td style={{ padding: '0.7rem' }}>{sp.contact_person || '—'}</td>
                  <td style={{ padding: '0.7rem' }}>{sp.contact_phone || '—'}</td>
                  <td style={{ padding: '0.7rem' }}>{sp.contact_email || '—'}</td>
                  <td style={{ padding: '0.7rem', textAlign: 'right' }}>₣ {Number(sp.engagement || 0).toLocaleString('fr-FR')}</td>
                  <td style={{ padding: '0.7rem', textAlign: 'right', color: 'var(--success)' }}>₣ {Number(sp.paid || 0).toLocaleString('fr-FR')}</td>
                  <td style={{ padding: '0.7rem', textAlign: 'right', color: dueOf(sp) > 0 ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>
                    ₣ {dueOf(sp).toLocaleString('fr-FR')}
                  </td>
                  <td style={{ padding: '0.7rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-secondary btn-sm" style={{ marginRight: '0.4rem' }} onClick={() => { setEditing(sp.id); setForm({ company: sp.company, contact_person: sp.contact_person || '', contact_phone: sp.contact_phone || '', contact_email: sp.contact_email || '', website: sp.website || '', engagement: sp.engagement ?? '', paid: sp.paid ?? '', status: sp.status || 'active' }) }}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(sp.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
              {sponsors.length === 0 && (
                <tr><td colSpan="8" style={{ padding: '0.9rem', color: 'var(--text-muted)' }}>Aucun sponsor enregistré.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
