import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Sponsors() {
  const { user } = useAuth()

  const sponsors = [
    { id: 1, company: 'Diamandis Industrie', contact: 'Jean Durand', phone: '06 12 34 56 78', email: 'contact@diamandis.com', website: '', status: 'active', deposit: 1000000, paid: 1000000, due: 0 },
    { id: 2, company: 'Gala Events', contact: 'Sophie Laurent', phone: '07 12 34 56 78', email: 'contact@galaevents.com', website: 'https://galaevents.com', status: 'active', deposit: 500000, paid: 300000, due: 200000 },
    { id: 3, company: 'Catering Royal', contact: 'Marc Lefebvre', phone: '06 34 56 78 90', email: 'contact@cateringroyal.fr', website: 'https://cateringroyal.fr', status: 'pending', deposit: 800000, paid: 0, due: 800000 },
    { id: 4, company: 'Photo & Vidéo', contact: 'Anne Moreau', phone: '07 23 45 67 89', email: 'contact@photovideo.fr', website: 'https://photovideo.fr', status: 'active', deposit: 300000, paid: 300000, due: 0 },
  ]

  const totalDeposits = sponsors.reduce((s, sp) => s + sp.deposit, 0)
  const totalPaid = sponsors.reduce((s, sp) => s + sp.paid, 0)
  const totalDue = sponsors.reduce((s, sp) => s + sp.due, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Sponsors</div>
      <div className="page-subtitle">Total engagements : ₣ {totalDeposits.toLocaleString('fr-FR').replace('.', ' ')}</div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#d4af37', fontSize: '1.5rem' }}>{totalDeposits.toLocaleString('fr-FR').replace('.', ' ')}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Dépôts reçus</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#1a7a3a', fontSize: '1.5rem' }}>{totalPaid.toLocaleString('fr-FR').replace('.', ' ')}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Payés</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#c99700', fontSize: '1.5rem' }}>{totalDue.toLocaleString('fr-FR').replace('.', ' ')}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Restant à verser</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Liste des sponsors</h2>
        </div>
        <div className="card-body" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.85rem' }}>N°</th>
                <th style={{ padding: '0.85rem' }}>Société</th>
                <th style={{ padding: '0.85rem' }}>Contact</th>
                <th style={{ padding: '0.85rem' }}>Téléphone</th>
                <th style={{ padding: '0.85rem' }}>Site</th>
                <th style={{ padding: '0.85rem' }}>Dépôt</th>
                <th style={{ padding: '0.85rem' }}>Payés</th>
                <th style={{ padding: '0.85rem' }}>Due</th>
                <th style={{ padding: '0.85rem' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {sponsors.map((sp, i) => (
                <tr key={sp.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.85rem' }}>{sp.id}</td>
                  <td style={{ padding: '0.85rem', fontWeight: '600' }}>{sp.company}</td>
                  <td style={{ padding: '0.85rem' }}>{sp.contact}</td>
                  <td style={{ padding: '0.85rem' }}>{sp.phone}</td>
                  <td style={{ padding: '0.85rem' }}>{sp.website || '-'}</td>
                  <td style={{ padding: '0.85rem' }}>₣ {sp.deposit.toLocaleString('fr-FR').replace('.', ' ')}</td>
                  <td style={{ padding: '0.85rem' }}>₣ {sp.paid.toLocaleString('fr-FR').replace('.', ' ')}</td>
                  <td style={{ padding: '0.85rem' }}>₣ {sp.due.toLocaleString('fr-FR').replace('.', ' ')}</td>
                  <td style={{ padding: '0.85rem' }}>
                    <span className={`badge ${sp.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                      {sp.status}
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

export default Sponsors
