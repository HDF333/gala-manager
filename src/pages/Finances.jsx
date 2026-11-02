import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Finances() {
  const { user } = useAuth()

  const recettes = [
    { id: 1, date: '2026-11-01', amount: 5000000, type: 'Vente billets', status: 'paid' },
    { id: 2, date: '2026-11-05', amount: 3000000, type: 'Sponsor Diamandis', status: 'paid' },
    { id: 3, date: '2026-11-10', amount: 2000000, type: 'Sponsor Gala Events', status: 'paid' },
    { id: 4, date: '2026-11-15', amount: 1500000, type: 'Achat billets', status: 'paid' },
    { id: 5, date: '2026-11-18', amount: 3000000, type: 'Sponsor Catering Royal', status: 'pending' },
    { id: 6, date: '2026-11-20', amount: 1200000, type: 'Dons', status: 'pending' },
  ]

  const totalRequested = recettes.reduce((s, r) => s + r.amount, 0)
  const totalPaid = recettes.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0)
  const totalPending = recettes.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Recettes</div>
      <div className="page-subtitle">Suivi des encaissements</div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#d4af37', fontSize: '1.5rem' }}>{totalRequested.toLocaleString('fr-FR').replace('.', ' ')}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Total demandé</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#1a7a3a', fontSize: '1.5rem' }}>{totalPaid.toLocaleString('fr-FR').replace('.', ' ')}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Facturé</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#c99700', fontSize: '1.5rem' }}>{totalPending.toLocaleString('fr-FR').replace('.', ' ')}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>À encaisser</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#1a7a3a', fontSize: '1.5rem' }}>{totalPaid / totalRequested * 100}%</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Taux de collecte</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Historique des recettes</h2>
        </div>
        <div className="card-body" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.85rem' }}>N°</th>
                <th style={{ padding: '0.85rem' }}>Date</th>
                <th style={{ padding: '0.85rem' }}>Type</th>
                <th style={{ padding: '0.85rem' }}>Montant</th>
                <th style={{ padding: '0.85rem' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {recettes.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.85rem' }}>{r.id}</td>
                  <td style={{ padding: '0.85rem' }}>{r.date}</td>
                  <td style={{ padding: '0.85rem' }}>{r.type}</td>
                  <td style={{ padding: '0.85rem' }}>₣ {r.amount.toLocaleString('fr-FR').replace('.', ' ')}</td>
                  <td style={{ padding: '0.85rem' }}>
                    <span className={`badge ${r.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                      {r.status}
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

export default Finances
