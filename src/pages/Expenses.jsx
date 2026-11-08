import React, { useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { getCurrentEvent } from '../lib/currentEvent'
import { downloadCSV } from '../utils/export'
import { parseCSVFile, triggerFileInput } from '../utils/import'

export default function Expenses() {
  const { data: expenses = [], insert: addExpense, update: updateExpense, del: deleteExpense } = useSupabase('expenses')
  const { data: events = [] } = useSupabase('events')
  const activeEvent = events.find(e => e.id === getCurrentEvent())
  const [form, setForm] = useState({ description: '', vendor: '', amount: '', status: 'paid', expense_date: '' })
  const [editing, setEditing] = useState(null)
  const [message, setMessage] = useState('')

  const totalPaid = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + (e.amount || 0), 0)
  const totalPending = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + (e.amount || 0), 0)
  const budget = activeEvent?.budget_depenses ? Number(activeEvent.budget_depenses) : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      const payload = {
        description: form.description,
        vendor: form.vendor || null,
        amount: Number(form.amount) || 0,
        status: form.status,
        expense_date: form.expense_date || new Date().toISOString().slice(0, 10)
      }
      if (editing) {
        await updateExpense(editing, payload)
        setMessage('Dépense modifiée')
      } else {
        await addExpense(payload)
        setMessage('Dépense ajoutée')
      }
      setEditing(null)
      setForm({ description: '', vendor: '', amount: '', status: 'paid', expense_date: '' })
    } catch (err) {
      setMessage('Erreur : ' + (err.message || 'Opération impossible'))
    }
  }

  const exportCSV = () => {
    downloadCSV('depenses.csv', expenses.map(e => ({
      Date: e.expense_date, Description: e.description, Fournisseur: e.vendor,
      Montant: e.amount, Statut: e.status
    })))
  }

  const importCSV = () => {
    triggerFileInput(async (file) => {
      setMessage('')
      try {
        const rows = await parseCSVFile(file)
        let ok = 0
        for (const r of rows) {
          if (!r.description) continue
          await addExpense({
            description: r.description,
            vendor: r.fournisseur || null,
            amount: Number(r.montant) || 0,
            status: r.statut === 'pending' ? 'pending' : 'paid',
            expense_date: r.date || new Date().toISOString().slice(0, 10)
          })
          ok++
        }
        setMessage(ok + ' dépense(s) importée(s)')
      } catch (err) {
        setMessage('Erreur : ' + (err.message || 'Import impossible'))
      }
    })
  }

  const remove = async (id) => {
    if (confirm('Supprimer cette dépense ?')) {
      try { await deleteExpense(id) } catch (err) { setMessage('Erreur : ' + err.message) }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Dépenses</div>
      <div className="page-subtitle">Suivi budgétaire de l'événement actif</div>

      {message && (
        <div style={{ padding: '1rem', borderRadius: '8px', background: message.includes('Erreur') ? 'rgba(184,26,26,0.1)' : 'rgba(26,122,58,0.1)', color: message.includes('Erreur') ? '#b81a1a' : '#1a7a3a' }}>
          {message}
        </div>
      )}

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#d4af37', fontSize: '1.5rem' }}>{budget !== null ? '₣ ' + budget.toLocaleString('fr-FR') : '-'}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Budget dépenses</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#1a7a3a', fontSize: '1.5rem' }}>₣ {totalPaid.toLocaleString('fr-FR')}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Payé</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#c99700', fontSize: '1.5rem' }}>₣ {totalPending.toLocaleString('fr-FR')}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>En attente</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#1a7a3a', fontSize: '1.5rem' }}>{budget !== null && budget > 0 ? Math.round((totalPaid / budget) * 100) + '%' : '-'}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Budget consommé</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{editing ? 'Modifier une dépense' : 'Ajouter une dépense'}</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Description *</label>
              <input className="form-input" placeholder="Ex : Location salle" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Fournisseur</label>
              <input className="form-input" placeholder="Ex : Salles & Co" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Montant (FCFA) *</label>
              <input className="form-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Statut</label>
              <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="paid">Payé</option>
                <option value="pending">En attente</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Date</label>
              <input className="form-input" type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary">{editing ? 'Mettre à jour' : 'Ajouter'}</button>
          </form>
          {editing && (
            <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => { setEditing(null); setForm({ description: '', vendor: '', amount: '', status: 'paid', expense_date: '' }) }}>Annuler</button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Liste des dépenses</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>⬇️ Exporter</button>
            <button className="btn btn-secondary btn-sm" onClick={importCSV}>⬆️ Importer CSV</button>
          </div>
        </div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.75rem' }}>Date</th>
                <th style={{ padding: '0.75rem' }}>Description</th>
                <th style={{ padding: '0.75rem' }}>Fournisseur</th>
                <th style={{ padding: '0.75rem' }}>Montant</th>
                <th style={{ padding: '0.75rem' }}>Statut</th>
                <th style={{ padding: '0.75rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.75rem' }}>{e.expense_date || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{e.description}</td>
                  <td style={{ padding: '0.75rem' }}>{e.vendor || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>₣ {Number(e.amount || 0).toLocaleString('fr-FR')}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge ${e.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{e.status === 'paid' ? 'Payé' : 'En attente'}</span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button className="btn btn-secondary btn-sm" style={{ marginRight: '0.5rem' }} onClick={() => { setEditing(e.id); setForm({ description: e.description, vendor: e.vendor || '', amount: e.amount, status: e.status, expense_date: e.expense_date || '' }) }}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(e.id)}>🗑️</button>
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
