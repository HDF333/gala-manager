import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Reports() {
  const { user } = useAuth()

  const data = {
    revenue: 15279941,
    expensesBudgeted: 9300000,
    expensesPaid: 5920000,
    resultForecast: 5979941,
    resultReal: 3200000,
    cashFlow: 320000,
    revenueRate: 68,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Rapports</div>
      <div className="page-subtitle">Bilan financier et analyse</div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Bilan financier</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            <div style={{ padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
              <p style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>Recettes totales (prévues)</p>
              <p style={{ fontSize: '2rem', fontWeight: '700', color: '#d4af37' }}>
                ₣ {data.revenue.toLocaleString('fr-FR').replace('.', ' ')}
              </p>
            </div>
            <div style={{ padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
              <p style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>Dépenses budgétisées</p>
              <p style={{ fontSize: '2rem', fontWeight: '700', color: '#b81a1a' }}>
                ₣ {data.expensesBudgeted.toLocaleString('fr-FR').replace('.', ' ')}
              </p>
            </div>
            <div style={{ padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
              <p style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>Dépenses payées</p>
              <p style={{ fontSize: '2rem', fontWeight: '700', color: '#1a7a3a' }}>
                ₣ {data.expensesPaid.toLocaleString('fr-FR').replace('.', ' ')}
              </p>
            </div>
            <div style={{ padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
              <p style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>Résultat prévisionnel</p>
              <p style={{ fontSize: '2rem', fontWeight: '700', color: '#d4af37' }}>
                ₣ {data.resultForecast.toLocaleString('fr-FR').replace('.', ' ')}
              </p>
            </div>
            <div style={{ padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
              <p style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>Résultat réel</p>
              <p style={{ fontSize: '2rem', fontWeight: '700', color: '#1a7a3a' }}>
                ₣ {data.resultReal.toLocaleString('fr-FR').replace('.', ' ')}
              </p>
            </div>
            <div style={{ padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
              <p style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>Solde de trésorerie</p>
              <p style={{ fontSize: '2rem', fontWeight: '700', color: '#c99700' }}>
                ₣ {data.cashFlow.toLocaleString('fr-FR').replace('.', ' ')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Évolution des recettes</h2>
        </div>
        <div className="card-body">
          {[
            { month: 'Sep 2026', projected: 3500000, collected: 2500000 },
            { month: 'Oct 2026', projected: 4500000, collected: 3200000 },
            { month: 'Nov 2026', projected: 5000000, collected: 4000000 },
            { month: 'Dec 2026', projected: 3500000, collected: 0 },
          ].map((m) => (
            <div key={m.month} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
              <div style={{ fontWeight: '600', color: '#ffffff' }}>{m.month}</div>
              <div style={{ display: 'flex', gap: '1rem', flex: 1, justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <div style={{ background: '#d4af37', color: '#0a0a0a', padding: '0.3rem 0.8rem', borderRadius: '4px', fontWeight: '600', fontSize: '0.85rem' }}>
                    Projété: ₣ {m.projected.toLocaleString('fr-FR').replace('.', ' ')}
                  </div>
                  <div style={{ background: '#1a7a3a', color: '#0a0a0a', padding: '0.3rem 0.8rem', borderRadius: '4px', fontWeight: '600', fontSize: '0.85rem' }}>
                    Collecté: ₣ {m.collected.toLocaleString('fr-FR').replace('.', ' ')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Export des données</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <button className="btn btn-primary">Exporter CSV</button>
            <button className="btn btn-gold">Exporter PDF</button>
            <button className="btn btn-secondary">Exporter JSON</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports
