import React from 'react'
import { useSupabase } from '../hooks/useSupabase'

export default function AccessControl() {
  const { data: logs = [] } = useSupabase('access_logs')
  const { data: guests = [] } = useSupabase('guests')
  const { data: tickets = [] } = useSupabase('tickets')
  const { data: categories = [] } = useSupabase('categories')
  const { data: tables = [] } = useSupabase('tables_placement')

  const today = new Date().toISOString().slice(0, 10)
  const fmt = (d) => d ? new Date(d).toLocaleString('fr-FR') : '-'

  const sorted = [...logs].sort((a, b) => new Date(b.scanned_at) - new Date(a.scanned_at))
  const todayLogs = sorted.filter(l => String(l.scanned_at || '').slice(0, 10) === today)
  const okLogs = sorted.filter(l => l.result === 'ok')

  // Participants confirmés qui ne sont pas encore entrés
  const enteredCodes = new Set(okLogs.map(l => l.ticket_code))
  const ticketByGuest = {}
  for (const t of tickets) {
    if (t.buyer_id) ticketByGuest[t.buyer_id] = t
  }
  const waiting = guests
    .filter(g => g.status === 'confirmed')
    .filter(g => {
      const t = ticketByGuest[g.id]
      return !t || !enteredCodes.has(t.ticket_code)
    })

  const tableLabel = (tid) => {
    const t = tables.find(x => x.id === tid)
    return t ? String(t.number || t.id).padStart(3, '0') : '—'
  }
  const catName = (cid) => categories.find(c => c.id === cid)?.name || '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="page-title">Contrôle d'accès</div>
      <div className="page-subtitle">Participants et invités déjà entrés le jour de l'événement</div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="kpi-card">
          <div className="kpi-icon result">✅</div>
          <div className="kpi-content">
            <div className="kpi-label">Entrées aujourd'hui</div>
            <div className="kpi-value">{todayLogs.filter(l => l.result === 'ok').length}</div>
            <div className="kpi-change up">sur {guests.filter(g => g.status === 'confirmed').length} confirmés</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon revenue">🎟️</div>
          <div className="kpi-content">
            <div className="kpi-label">Total des entrées</div>
            <div className="kpi-value">{okLogs.length}</div>
            <div className="kpi-change">depuis le début</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon expense">⏳</div>
          <div className="kpi-content">
            <div className="kpi-label">En attente d'entrée</div>
            <div className="kpi-value">{waiting.length}</div>
            <div className="kpi-change">participants confirmés</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon tuition">🚫</div>
          <div className="kpi-content">
            <div className="kpi-label">Refus enregistrés</div>
            <div className="kpi-value">{sorted.filter(l => l.result !== 'ok').length}</div>
            <div className="kpi-change">scans refusés</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Entrées enregistrées</h2>
          <span className="badge badge-gold">{sorted.length} scan(s)</span>
        </div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#EDF2FB' }}>
                <th style={{ padding: '0.7rem' }}>Participant</th>
                <th style={{ padding: '0.7rem' }}>Billet / QR</th>
                <th style={{ padding: '0.7rem' }}>Date et heure</th>
                <th style={{ padding: '0.7rem' }}>Résultat</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr><td colSpan="4" style={{ padding: '0.9rem', color: 'var(--text-muted)' }}>Aucun scan pour le moment. Utilisez la page Scanner.</td></tr>
              )}
              {sorted.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.7rem', fontWeight: 600 }}>{l.guest_name || '—'}</td>
                  <td style={{ padding: '0.7rem' }}><code style={{ fontSize: '0.8rem', background: '#EDF2FB', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>{l.ticket_code || '—'}</code></td>
                  <td style={{ padding: '0.7rem' }}>{fmt(l.scanned_at)}</td>
                  <td style={{ padding: '0.7rem' }}>
                    <span className={`badge ${l.result === 'ok' ? 'badge-success' : 'badge-danger'}`}>{l.result === 'ok' ? 'Accès autorisé' : 'Refusé'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Participants confirmés en attente d'entrée</h2>
          <span className="badge badge-warning">{waiting.length}</span>
        </div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#EDF2FB' }}>
                <th style={{ padding: '0.7rem' }}>Participant</th>
                <th style={{ padding: '0.7rem' }}>Catégorie</th>
                <th style={{ padding: '0.7rem' }}>Table</th>
                <th style={{ padding: '0.7rem' }}>Personnes</th>
              </tr>
            </thead>
            <tbody>
              {waiting.length === 0 && (
                <tr><td colSpan="4" style={{ padding: '0.9rem', color: 'var(--text-muted)' }}>Tous les participants confirmés sont entrés ✅</td></tr>
              )}
              {waiting.map(g => (
                <tr key={g.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.7rem', fontWeight: 600 }}>{g.first_name} {g.last_name}</td>
                  <td style={{ padding: '0.7rem' }}>{catName(g.category_id)}</td>
                  <td style={{ padding: '0.7rem' }}>Table n°{tableLabel(g.table_number)}</td>
                  <td style={{ padding: '0.7rem' }}>{g.people_count || 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
