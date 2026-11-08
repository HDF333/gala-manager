import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../hooks/useSupabase'

export default function Dashboard() {
  const { user } = useAuth()
  const { data: guests = [] } = useSupabase('guests')
  const { data: tickets = [] } = useSupabase('tickets')
  const { data: tables = [] } = useSupabase('tables_placement')

  const totalRevenue = tickets
    .filter(t => t.status === 'active' || t.status === 'confirmed')
    .reduce((sum, t) => sum + (t.total || 0), 0)
  const pendingRevenue = tickets
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + (t.total || 0), 0)
  const confirmedGuests = guests.filter(g => g.status === 'confirmed').length
  const pendingGuests = guests.filter(g => g.status === 'pending').length
  const seatsTaken = guests.reduce((sum, g) => sum + (g.people_count || 1), 0)
  const totalSeats = tables.reduce((sum, t) => sum + (t.capacity || 0), 0)
  const occupancy = totalSeats > 0 ? Math.round((seatsTaken / totalSeats) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Tableau de bord</div>
      <div className="page-subtitle">Bienvenue, {user?.first_name || 'Invité'} ! 👋</div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon revenue">💰</div>
          <div className="kpi-content">
            <div className="kpi-label">Recettes encaissées</div>
            <div className="kpi-value">₣ {totalRevenue.toLocaleString('fr-FR')}</div>
            <div className="kpi-change up">{tickets.filter(t => t.status === 'active').length} billet(s) actif(s)</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon result">📊</div>
          <div className="kpi-content">
            <div className="kpi-label">Recettes en attente</div>
            <div className="kpi-value" style={{ color: '#c99700' }}>₣ {pendingRevenue.toLocaleString('fr-FR')}</div>
            <div className="kpi-change up">{tickets.filter(t => t.status === 'pending').length} billet(s) à encaisser</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon tuition">👥</div>
          <div className="kpi-content">
            <div className="kpi-label">Invités confirmés</div>
            <div className="kpi-value">{confirmedGuests}</div>
            <div className="kpi-change">{pendingGuests} en attente</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon dashboard">📋</div>
          <div className="kpi-content">
            <div className="kpi-label">Occupation des tables</div>
            <div className="kpi-value">{occupancy}%</div>
            <div className="kpi-change">{seatsTaken} / {totalSeats} places</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Mesures clés</h2>
          <span className="badge badge-success">En temps réel</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <p><strong>Recettes totales (tous billets) :</strong> <span style={{ color: '#d4af37', fontWeight: '600' }}>₣ {(totalRevenue + pendingRevenue).toLocaleString('fr-FR')}</span></p>
              <p><strong>Recettes encaissées :</strong> <span style={{ color: '#1a7a3a', fontWeight: '600' }}>₣ {totalRevenue.toLocaleString('fr-FR')}</span></p>
              <p><strong>Restant à encaisser :</strong> <span style={{ color: '#c99700', fontWeight: '600' }}>₣ {pendingRevenue.toLocaleString('fr-FR')}</span></p>
            </div>
            <div>
              <p><strong>Billets actifs :</strong> <span style={{ color: '#1a7a3a', fontWeight: '600' }}>{tickets.filter(t => t.status === 'active').length}</span></p>
              <p><strong>Billets en attente :</strong> <span style={{ color: '#c99700', fontWeight: '600' }}>{tickets.filter(t => t.status === 'pending').length}</span></p>
              <p><strong>Invitations confirmées :</strong> <span style={{ color: '#d4af37', fontWeight: '600' }}>{confirmedGuests} invité(s) / {seatsTaken} personne(s)</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Prochains événements</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { id: 1, name: 'Hommage aux Sponsors', date: '2026-11-15', attendees: '340', type: 'Sponsor' },
              { id: 2, name: 'Dîner Gala Officiel', date: '2026-11-20', attendees: '780', type: 'Principale' },
              { id: 3, name: 'Appel des engagements', date: '2026-11-25', attendees: '120', type: 'Comité' },
            ].map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
                <div>
                  <strong style={{ color: '#ffffff' }}>{item.name}</strong>
                  <p style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>{item.type} • {item.date}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ color: '#d4af37' }}>{item.attendees}</strong>
                  <p style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>participants</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

