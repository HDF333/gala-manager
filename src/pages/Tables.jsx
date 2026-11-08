import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../hooks/useSupabase'

export default function Tables() {
  const { user } = useAuth()
  const { data: tables = [] } = useSupabase('tables_placement')
  const { data: categories = [] } = useSupabase('categories')
  const [detail, setDetail] = useState(null)
  const { data: guests = [] } = useSupabase('guests')

  const seatsByTable = {}
  const guestsByTable = {}
  for (const g of guests) {
    if (!g.table_number) continue
    seatsByTable[g.table_number] = (seatsByTable[g.table_number] || 0) + (g.people_count || 1)
    guestsByTable[g.table_number] = (guestsByTable[g.table_number] || 0) + 1
  }

  const tablesByCategory = {}
  for (const t of tables) {
    const key = t.category_id ?? 'none'
    if (!tablesByCategory[key]) tablesByCategory[key] = []
    tablesByCategory[key].push(t)
  }
  Object.values(tablesByCategory).forEach(list => list.sort((a, b) => (a.number || a.id) - (b.number || b.id)))

  const occupiedTables = tables.filter(t => (seatsByTable[t.id] || 0) > 0).length
  const totalSeats = tables.reduce((s, t) => s + (t.capacity || 0), 0)
  const seatsTaken = guests.reduce((s, g) => s + (g.people_count || 1), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Tables</div>
      <div className="page-subtitle">Tables occupées : {occupiedTables} / {tables.length}</div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#d4af37', fontSize: '1.5rem' }}>{occupiedTables}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Tables occupées</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#1a7a3a', fontSize: '1.5rem' }}>{tables.length - occupiedTables}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Tables disponibles</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#d4af37', fontSize: '1.5rem' }}>{tables.length}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Tables totales</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#1a5a8a', fontSize: '1.5rem' }}>{seatsTaken} / {totalSeats}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Places occupées</p>
        </div>
      </div>

      {Object.entries(tablesByCategory).map(([catId, catTables]) => {
        const catName = catId === 'none' ? 'Sans catégorie' : (categories.find(c => c.id === Number(catId))?.name || 'Catégorie ' + catId)
        return (
          <div className="card" key={catId}>
            <div className="card-header">
              <h2 className="card-title">{catName}</h2>
              <span className="badge badge-gold">{catTables.length} table(s)</span>
            </div>
            <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {catTables.map(t => {
                const seats = seatsByTable[t.id] || 0
                const isFull = seats >= (t.capacity || 10)
                return (
                  <div key={t.id} onClick={() => setDetail(t)} style={{ padding: '1rem', background: '#F7F9FE', borderRadius: '10px', border: '1px solid var(--border)', cursor: 'pointer' }} title="Voir les participants">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ color: '#ffffff' }}>Table n°{String(t.number || t.id).padStart(3, '0')}</strong>
                        <p style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>Code : {t.code}</p>
                      </div>
                      <span className={`badge ${isFull ? 'badge-danger' : seats > 0 ? 'badge-warning' : 'badge-success'}`}>
                        {isFull ? 'Complète' : seats > 0 ? 'Occupée' : 'Disponible'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ background: '#2a2a2a', borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#ffffff' }}>
                        👥 {guestsByTable[t.id] || 0} invité(s)
                      </div>
                      <div style={{ background: '#2a2a2a', borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#d4af37' }}>
                        🪑 {seats} / {t.capacity || 10} places
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Table n°{String(detail.number || detail.id).padStart(3, '0')} — {categories.find(c => c.id === detail.category_id)?.name || 'Sans catégorie'}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 0 }}>
              {seatsByTable[detail.id] || 0} / {detail.capacity || 10} places occupées · {guestsByTable[detail.id] || 0} inscription(s)
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#EDF2FB' }}>
                  <th style={{ padding: '0.5rem' }}>Participant</th>
                  <th style={{ padding: '0.5rem' }}>Personnes</th>
                  <th style={{ padding: '0.5rem' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {guests.filter(g => g.table_number === detail.id).map(g => (
                  <tr key={g.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>{g.first_name} {g.last_name}</td>
                    <td style={{ padding: '0.5rem' }}>{g.people_count || 1}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <span className={`badge ${g.status === 'confirmed' ? 'badge-success' : g.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>{g.status}</span>
                    </td>
                  </tr>
                ))}
                {guests.filter(g => g.table_number === detail.id).length === 0 && (
                  <tr><td colSpan="3" style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Aucun participant sur cette table.</td></tr>
                )}
              </tbody>
            </table>
            <div style={{ marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setDetail(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
