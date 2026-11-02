import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Expenses() {
  const { user } = useAuth()

  const expenses = [
    { id: 1, date: '2026-11-01', description: 'Location salle', vendor: 'Salles & Co', amount: 2500000, status: 'paid' },
    { id: 2, date: '2026-11-05', description: 'Restauration', vendor: 'Catering Royal', amount: 3200000, status: 'paid' },
    { id: 3, date: '2026-11-08', description: 'Amendi-serveur', vendor: 'Services Pro', amount: 800000, status: 'paid' },
    { id: 4, date: '2026-11-10', description: 'Achat objets de salon', vendor: 'Boucherie & Viandes', amount: 1500000, status: 'paid' },
    { id: 5, date: '2026-11-12', description: 'Événementiel', vendor: 'Event Pro', amount: 600000, status: 'paid' },
    { id: 6, date: '2026-11-14', description: 'Location camion', vendor: 'Freights Express', amount: 400000, status: 'paid' },
    { id: 7, date: '2026-11-15', description: 'Dépenses imprévues', vendor: 'Variées', amount: 1200000, status: 'pending' },
  ]

  const totalBudgeted = expenses.reduce((s, e) => s + e.amount, 0)
  const totalPaid = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0)
  const totalPending = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Dépenses</div>
      <div className="page-subtitle">Suivi budgétaire</div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#d4af37', fontSize: '1.5rem' }}>{totalBudgeted.toLocaleString('fr-FR').replace('.', ' ')}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Budgeté</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#1a7a3a', fontSize: '1.5rem' }}>{totalPaid.toLocaleString('fr-FR').replace('.', ' ')}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Payé</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#c99700', fontSize: '1.5rem' }}>{totalPending.toLocaleString('fr-FR').replace('.', ' ')}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>A engager</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#1a7a3a', fontSize: '1.5rem' }}>{totalPaid / totalBudgeted * 100}%</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Taux de réalisation</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Liste des dépenses</h2>
        </div>
        <div className="card-body" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.85rem' }}>N°</th>
                <th style={{ padding: '0.85rem' }}>Date</th>
                <th style={{ padding: '0.85rem' }}>Description</th>
                <th style={{ padding: '0.85rem' }}>Fournisseur</th>
                <th style={{ padding: '0.85rem' }}>Montant</th>
                <th style={{ padding: '0.85rem' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.85rem' }}>{e.id}</td>
                  <td style={{ padding: '0.85rem' }}>{e.date}</td>
                  <td style={{ padding: '0.85rem' }}>{e.description}</td>
                  <td style={{ padding: '0.85rem' }}>{e.vendor}</td>
                  <td style={{ padding: '0.85rem' }}>₣ {e.amount.toLocaleString('fr-FR').replace('.', ' ')}</td>
                  <td style={{ padding: '0.85rem' }}>
                    <span className={`badge ${e.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                      {e.status}
                    </span>
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

export default Expenses
