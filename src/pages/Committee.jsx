import React, { useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { downloadCSV } from '../utils/export'
import { parseCSVFile, triggerFileInput } from '../utils/import'

export default function Committee() {
  const { data: members = [], insert: addMember, update: updateMember, del: deleteMember } = useSupabase('committee_members')
  const [form, setForm] = useState({ full_name: '', role: '', email: '', phone: '' })
  const [editing, setEditing] = useState(null)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      if (editing) {
        await updateMember(editing, form)
        setMessage('Membre modifié')
      } else {
        await addMember(form)
        setMessage('Membre ajouté')
      }
      setEditing(null)
      setForm({ full_name: '', role: '', email: '', phone: '' })
    } catch (err) {
      setMessage('Erreur : ' + (err.message || 'Opération impossible'))
    }
  }

  const exportCSV = () => {
    downloadCSV('comite.csv', members.map(m => ({ Nom: m.full_name, Role: m.role, Email: m.email, Telephone: m.phone })))
  }

  const importCSV = () => {
    triggerFileInput(async (file) => {
      setMessage('')
      try {
        const rows = await parseCSVFile(file)
        let ok = 0
        for (const r of rows) {
          if (!r.nom) continue
          await addMember({ full_name: r.nom, role: r.role || null, email: r.email || null, phone: r.telephone || null })
          ok++
        }
        setMessage(ok + ' membre(s) importé(s)')
      } catch (err) {
        setMessage('Erreur : ' + (err.message || 'Import impossible'))
      }
    })
  }

  const remove = async (id) => {
    if (confirm('Supprimer ce membre ?')) {
      try { await deleteMember(id) } catch (err) { setMessage('Erreur : ' + err.message) }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Comité</div>
      <div className="page-subtitle">Membres du comité de l'événement actif</div>

      {message && (
        <div style={{ padding: '1rem', borderRadius: '8px', background: message.includes('Erreur') ? 'rgba(184,26,26,0.1)' : 'rgba(26,122,58,0.1)', color: message.includes('Erreur') ? '#b81a1a' : '#1a7a3a' }}>
          {message}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{editing ? 'Modifier un membre' : 'Ajouter un membre'}</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Nom complet *</label>
              <input className="form-input" placeholder="Prénom et Nom" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Rôle</label>
              <input className="form-input" placeholder="Ex : Chef d'orchestre, Budget..." value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Email</label>
              <input className="form-input" type="email" placeholder="email@exemple.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Téléphone</label>
              <input className="form-input" placeholder="06 12 34 56 78" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary">{editing ? 'Mettre à jour' : 'Ajouter'}</button>
          </form>
          {editing && (
            <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => { setEditing(null); setForm({ full_name: '', role: '', email: '', phone: '' }) }}>Annuler</button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Membres du comité</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>⬇️ Exporter</button>
            <button className="btn btn-secondary btn-sm" onClick={importCSV}>⬆️ Importer CSV</button>
          </div>
        </div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.75rem' }}>Nom</th>
                <th style={{ padding: '0.75rem' }}>Rôle</th>
                <th style={{ padding: '0.75rem' }}>Email</th>
                <th style={{ padding: '0.75rem' }}>Téléphone</th>
                <th style={{ padding: '0.75rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '600' }}>{m.full_name}</td>
                  <td style={{ padding: '0.75rem' }}>{m.role || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{m.email || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{m.phone || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button className="btn btn-secondary btn-sm" style={{ marginRight: '0.5rem' }} onClick={() => { setEditing(m.id); setForm({ full_name: m.full_name, role: m.role || '', email: m.email || '', phone: m.phone || '' }) }}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(m.id)}>🗑️</button>
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
