import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Tableau de bord</div>
      <div className="page-subtitle">Bienvenue, {user?.first_name || 'Invité'} ! 👋</div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon revenue">💰</div>
          <div className="kpi-content">
            <div className="kpi-label">Recettes totales</div>
            <div className="kpi-value">₣ 15.279.941</div>
            <div className="kpi-change up">+12.5% vs mois dernier</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon result">📊</div>
          <div className="kpi-content">
            <div className="kpi-label">Résultat net</div>
            <div className="kpi-value" style={{ color: '#1a7a3a' }}>₣ 3.200.000</div>
            <div className="kpi-change up">+8.2% vs mois dernier</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon tuition">👥</div>
          <div className="kpi-content">
            <div className="kpi-label">Invités confirmés</div>
            <div className="kpi-value">1.240</div>
            <div className="kpi-change">+45 ce mois</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon dashboard">📋</div>
          <div className="kpi-content">
            <div className="kpi-label">Taux de réalisation</div>
            <div className="kpi-value">68%</div>
            <div className="kpi-change">Cible 75%</div>
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
              <p><strong>Recettes prévues :</strong> <span style={{ color: '#d4af37', fontWeight: '600' }}>₣ 12.500.000</span></p>
              <p><strong>Recettes encaissées :</strong> <span style={{ color: '#1a7a3a', fontWeight: '600' }}>₣ 9.850.000</span></p>
              <p><strong>Restant à encaisser :</strong> <span style={{ color: '#c99700', fontWeight: '600' }}>₣ 2.650.000</span></p>
            </div>
            <div>
              <p><strong>Dépenses budgétisées :</strong> <span style={{ color: '#b81a1a', fontWeight: '600' }}>₣ 9.300.000</span></p>
              <p><strong>Dépenses engagées :</strong> <span style={{ color: '#c99700', fontWeight: '600' }}>₣ 6.450.000</span></p>
              <p><strong>Dépenses payées :</strong> <span style={{ color: '#1a7a3a', fontWeight: '600' }}>₣ 5.920.000</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Répartition par activité</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', height: '300px', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ width: '40%', background: '#d4af37', color: '#0a0a0a', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontWeight: '600' }}>
              CLINKER<br/><span style={{ fontSize: '0.85rem' }}>38%</span>
            </div>
            <div style={{ width: '25%', background: '#1a7a3a', color: '#0a0a0a', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontWeight: '600' }}>
              BLE<br/><span style={{ fontSize: '0.85rem' }}>25%</span>
            </div>
            <div style={{ width: '20%', background: '#c99700', color: '#0a0a0a', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontWeight: '600' }}>
              SABLE/GRAVIER<br/><span style={{ fontSize: '0.85rem' }}>20%</span>
            </div>
            <div style={{ width: '15%', background: '#b81a1a', color: '#0a0a0a', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontWeight: '600' }}>
              AUTRES<br/><span style={{ fontSize: '0.85rem' }}>17%</span>
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

