import React, { useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { getCurrentEvent } from '../lib/currentEvent'

export default function Finances() {
  const { data: finances = [], insert: addFinance, update: updateFinance, del: deleteFinance } = useSupabase('finances')
  const { data: tickets = [] } = useSupabase('tickets')
  const { data: events = [] } = useSupabase('events')
  const activeEvent = events.find(e => e.id === getCurrentEvent())
  const [form, setForm] = useState({ type: '', amount: '', status: 'paid', payment_date: '' })
  const [editing, setEditing] = useState(null)
  const [message, setMessage] = useState('')

  const ticketsRevenue = tickets
    .filter(t => t.status === 'active' || t.status === 'confirmed')
    .reduce((s, t) => s + (t.total || 0), 0)
  const manualPaid = finances.filter(f => f.status === 'paid').reduce((s, f) => s + (f.amount || 0), 0)
  const manualPending = finances.filter(f => f.status === 'pending').reduce((s, f) => s + (f.amount || 0), 0)
  const totalRevenue = ticketsRevenue + manualPaid
  const budget = activeEvent?.budget_recettes ? Number(activeEvent.budget_recettes) : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      const payload = {
        type: form.type,
        amount: Number(form.amount) || 0,
        status: form.status,
        payment_date: form.payment_date || new Date().toISOString().slice(0, 10)
      }
      if (editing) {
        await updateFinance(editing, payload)
        setMessage('Recette modifiée')
      } else {
        await addFinance(payload)
        setMessage('Recette ajoutée')
      }
      setEditing(null)
      setForm({ type: '', amount: '', status: 'paid', payment_date: '' })
    } catch (err) {
      setMessage('Erreur : ' + (err.message || 'Opération impossible'))
    }
  }

  const remove = async (id) => {
    if (confirm('Supprimer cette recette ?')) {
      try { await deleteFinance(id) } catch (err) { setMessage('Erreur : ' + err.message) }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Recettes</div>
      <div className="page-subtitle">Suivi des encaissements de l'événement actif</div>

      {message && (
        <div style={{ padding: '1rem', borderRadius: '8px', background: message.includes('Erreur') ? 'rgba(184,26,26,0.1)' : 'rgba(26,122,58,0.1)', color: message.includes('Erreur') ? '#b81a1a' : '#1a7a3a' }}>
          {message}
        </div>
      )}

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#d4af37', fontSize: '1.5rem' }}>{budget !== null ? '₣ ' + budget.toLocaleString('fr-FR') : '-'}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Budget recettes</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#1a7a3a', fontSize: '1.5rem' }}>₣ {totalRevenue.toLocaleString('fr-FR')}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Encaissé (billets + manuel)</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#1a5a8a', fontSize: '1.5rem' }}>₣ {ticketsRevenue.toLocaleString('fr-FR')}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Dont billets</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#c99700', fontSize: '1.5rem' }}>₣ {manualPending.toLocaleString('fr-FR')}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>En attente (manuel)</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{editing ? 'Modifier une recette' : 'Ajouter une recette'}</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Type *</label>
              <input className="form-input" placeholder="Ex : Sponsor, Dons, Vente..." value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Montant (FCFA) *</label>
              <input className="form-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Statut</label>
              <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="paid">Encaissé</option>
                <option value="pending">En attente</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Date</label>
              <input className="form-input" type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary">{editing ? 'Mettre à jour' : 'Ajouter'}</button>
          </form>
          {editing && (
            <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => { setEditing(null); setForm({ type: '', amount: '', status: 'paid', payment_date: '' }) }}>Annuler</button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Liste des recettes</h2>
        </div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.75rem' }}>Date</th>
                <th style={{ padding: '0.75rem' }}>Type</th>
                <th style={{ padding: '0.75rem' }}>Montant</th>
                <th style={{ padding: '0.75rem' }}>Statut</th>
                <th style={{ padding: '0.75rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {finances.map((f) => (
                <tr key={f.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.75rem' }}>{f.payment_date || '-'}</td>
                  <td style={{ padding: '0.75rem', fontWeight: '600' }}>{f.type}</td>
                  <td style={{ padding: '0.75rem' }}>₣ {Number(f.amount || 0).toLocaleString('fr-FR')}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge ${f.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{f.status === 'paid' ? 'Encaissé' : 'En attente'}</span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button className="btn btn-secondary btn-sm" style={{ marginRight: '0.5rem' }} onClick={() => { setEditing(f.id); setForm({ type: f.type, amount: f.amount, status: f.status, payment_date: f.payment_date || '' }) }}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(f.id)}>🗑️</button>
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
