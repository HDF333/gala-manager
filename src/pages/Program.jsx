import React, { useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { downloadCSV } from '../utils/export'
import { parseCSVFile, triggerFileInput } from '../utils/import'

export default function Program() {
  const { data: items = [], insert: addItem, update: updateItem, del: deleteItem } = useSupabase('program_items')
  const [form, setForm] = useState({ title: '', start_time: '', description: '' })
  const [editing, setEditing] = useState(null)
  const [message, setMessage] = useState('')

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
