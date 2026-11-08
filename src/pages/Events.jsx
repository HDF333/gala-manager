import React, { useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { supabase } from '../lib/supabase'
import { getCurrentEvent, setCurrentEvent } from '../lib/currentEvent'

export default function Events() {
  const { data: events = [], update: updateEvent, del: deleteEvent, refetch } = useSupabase('events')
  const [form, setForm] = useState({ name: '', date: '', venue: '', tables_count: 100, seats_per_table: 10, budget_recettes: '', budget_depenses: '' })
  const [editing, setEditing] = useState(null)
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const current = getCurrentEvent()

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setMessage('')
    try {
      const { data: newId, error } = await supabase.rpc('create_event', {
        p_name: form.name,
        p_date: form.date || null,
        p_venue: form.venue || null,
        p_tables_count: Number(form.tables_count) || 100,
        p_seats_per_table: Number(form.seats_per_table) || 10,
        p_budget_recettes: form.budget_recettes ? Number(form.budget_recettes) : null,
        p_budget_depenses: form.budget_depenses ? Number(form.budget_depenses) : null
      })
      if (error) throw error
      setCurrentEvent(newId)
      setForm({ name: '', date: '', venue: '', tables_count: 100, seats_per_table: 10, budget_recettes: '', budget_depenses: '' })
      setMessage('Événement créé : catégories et 100 tables prêtes. Il est maintenant actif.')
      refetch()
    } catch (err) {
      setMessage('Erreur : ' + (err.message || 'Création impossible'))
    } finally {
      setCreating(false)
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      await updateEvent(editing, {
        name: form.name,
        date: form.date || null,
        venue: form.venue || null,
        tables_count: Number(form.tables_count) || 100,
        seats_per_table: Number(form.seats_per_table) || 10,
        budget_recettes: form.budget_recettes ? Number(form.budget_recettes) : null,
        budget_depenses: form.budget_depenses ? Number(form.budget_depenses) : null
      })
      setEditing(null)
      setForm({ name: '', date: '', venue: '', tables_count: 100, seats_per_table: 10, budget_recettes: '', budget_depenses: '' })
      setMessage('Événement modifié avec succès')
      refetch()
    } catch (err) {
      setMessage('Erreur : ' + (err.message || 'Modification impossible'))
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Supprimer cet événement ainsi que toutes ses données (invités, billets, tables, QR) ?')) {
      try {
        await deleteEvent(id)
        if (getCurrentEvent() === id) setCurrentEvent(null)
        setMessage('Événement supprimé')
        refetch()
      } catch (err) {
        setMessage('Erreur : ' + (err.message || 'Suppression impossible'))
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Événements</div>
      <div className="page-subtitle">Gérez plusieurs événements : chacun garde ses catégories, invités, billets, tables et QR Codes.</div>

      {message && (
        <div style={{ padding: '1rem', borderRadius: '8px', background: message.includes('Erreur') ? 'rgba(184,26,26,0.1)' : 'rgba(26,122,58,0.1)', color: message.includes('Erreur') ? '#b81a1a' : '#1a7a3a' }}>
          {message}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{editing ? 'Modifier l\'événement' : 'Créer un événement'}</h2>
        </div>
        <div className="card-body">
          <form onSubmit={editing ? handleUpdate : handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Nom de l\'événement *</label>
              <input className="form-input" placeholder="Ex : Dîner Gala 2027" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Date</label>
              <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Lieu</label>
              <input className="form-input" placeholder="Ex : Abidjan" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Nombre de tables</label>
              <input className="form-input" type="number" min="1" value={form.tables_count} onChange={(e) => setForm({ ...form, tables_count: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Places par table</label>
              <input className="form-input" type="number" min="1" value={form.seats_per_table} onChange={(e) => setForm({ ...form, seats_per_table: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Budget recettes (FCFA)</label>
              <input className="form-input" type="number" placeholder="0" value={form.budget_recettes} onChange={(e) => setForm({ ...form, budget_recettes: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Budget dépenses (FCFA)</label>
              <input className="form-input" type="number" placeholder="0" value={form.budget_depenses} onChange={(e) => setForm({ ...form, budget_depenses: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Création...' : editing ? 'Mettre à jour' : 'Créer'}
            </button>
          </form>
          {editing && (
            <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => { setEditing(null); setForm({ name: '', date: '', venue: '' }) }}>
              Annuler la modification
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Mes événements</h2>
        </div>
        <div className="card-body">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.75rem' }}>Nom</th>
                <th style={{ padding: '0.75rem' }}>Date</th>
                <th style={{ padding: '0.75rem' }}>Lieu</th>
                <th style={{ padding: '0.75rem' }}>Tables</th>
                <th style={{ padding: '0.75rem' }}>Places/table</th>
                <th style={{ padding: '0.75rem' }}>Budget</th>
                <th style={{ padding: '0.75rem' }}>Statut</th>
                <th style={{ padding: '0.75rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} style={{ borderBottom: '1px solid #2a2a2a', background: ev.id === current ? 'rgba(212,175,55,0.06)' : undefined }}>
                  <td style={{ padding: '0.75rem', fontWeight: '600' }}>
                    {ev.name} {ev.id === current && <span className="badge badge-gold">Actif</span>}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{ev.date || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{ev.venue || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{ev.tables_count ?? 100}</td>
                  <td style={{ padding: '0.75rem' }}>{ev.seats_per_table ?? 10}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {ev.budget_recettes ? 'Recettes ₣ ' + Number(ev.budget_recettes).toLocaleString('fr-FR') : '-'}
                    {ev.budget_depenses ? ' • Dépenses ₣ ' + Number(ev.budget_depenses).toLocaleString('fr-FR') : ''}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge ${ev.status === 'active' ? 'badge-success' : 'badge-muted'}`}>{ev.status}</span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button className="btn btn-gold btn-sm" style={{ marginRight: '0.5rem' }} onClick={() => setCurrentEvent(ev.id)}>
                      {ev.id === current ? '✓ En cours' : '▶ Utiliser'}
                    </button>
                    <button className="btn btn-secondary btn-sm" style={{ marginRight: '0.5rem' }} onClick={() => { setEditing(ev.id); setForm({ name: ev.name, date: ev.date || '', venue: ev.venue || '', tables_count: ev.tables_count ?? 100, seats_per_table: ev.seats_per_table ?? 10, budget_recettes: ev.budget_recettes ?? '', budget_depenses: ev.budget_depenses ?? '' }) }}>
                      ✏️ Modifier
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ev.id)}>
                      🗑️ Supprimer
                    </button>
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
