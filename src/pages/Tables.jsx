import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Tables() {
  const { user } = useAuth()

  const tables = [
    { id: 1, code: 'T-001', name: 'Haute Table', capacity: 8, section: 'Principal', status: 'occupied' },
    { id: 2, code: 'T-002', name: 'Table 1', capacity: 10, section: 'Zone Privée', status: 'occupied' },
    { id: 3, code: 'T-003', name: 'Table 2', capacity: 8, section: 'Zone Privée', status: 'available' },
    { id: 4, code: 'T-004', name: 'Table 3', capacity: 8, section: 'Zone Privée', status: 'occupied' },
    { id: 5, code: 'T-005', name: 'Table 4', capacity: 6, section: 'Zone Privée', status: 'available' },
    { id: 6, code: 'T-006', name: 'Table 5', capacity: 8, section: 'Côté Vente', status: 'available' },
    { id: 7, code: 'T-007', name: 'Table 6', capacity: 10, section: 'Côté Vente', status: 'occupied' },
    { id: 8, code: 'T-008', name: 'Table 7', capacity: 8, section: 'Côté Vente', status: 'available' },
  ]

  const activeTables = tables.filter(t => t.status === 'occupied').length
  const totalTables = tables.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Tables</div>
      <div className="page-subtitle">Table occupée : {activeTables} / {totalTables}</div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#d4af37', fontSize: '1.5rem' }}>{activeTables}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Tables occupées</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#1a7a3a', fontSize: '1.5rem' }}>{totalTables - activeTables}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Tables disponibles</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#d4af37', fontSize: '1.5rem' }}>{totalTables}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Tables totales</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Positionnement des tables</h2>
        </div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {tables.map(t => (
            <div key={t.id} style={{ padding: '1rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#ffffff' }}>{t.name}</strong>
                  <p style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>Code : {t.code}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${t.status === 'occupied' ? 'badge-success' : 'badge-muted'}`}>
                    {t.status}
                  </span>
                </div>
              </div>
              <p style={{ color: '#6a6a6a', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Capacité : <strong style={{ color: '#ffffff' }}>{t.capacity}</strong> personne(s)
              </p>
              <p style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>Section : {t.section}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Placement des invités</h2>
        </div>
        <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {[
            { guest: 'Jean Dupont', table: 'T-001', seat: '1' },
            { guest: 'Marie Dupont', table: 'T-001', seat: '2' },
            { guest: 'Pierre Martin', table: 'T-002', seat: '1' },
            { guest: 'Sophie Laurent', table: 'T-002', seat: '2' },
            { guest: 'Paul Bernard', table: 'T-004', seat: '1' },
            { guest: 'Claire Dubois', table: 'T-004', seat: '2' },
          ].map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
              <span style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#d4af37', color: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' }}>
                {p.guest.split(' ').map(n => n[0]).join('')}
              </span>
              <div>
                <strong style={{ color: '#ffffff' }}>{p.guest}</strong>
                <p style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>{p.table} • Siège {p.seat}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Tables
