import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../hooks/useSupabase'
import { getCurrentEvent } from '../lib/currentEvent'

export default function Dashboard() {
  const { user } = useAuth()
  const { data: guests = [] } = useSupabase('guests')
  const { data: tickets = [] } = useSupabase('tickets')
  const { data: tables = [] } = useSupabase('tables_placement')
  const { data: categories = [] } = useSupabase('categories')
  const { data: events = [] } = useSupabase('events')
  const { data: finances = [] } = useSupabase('finances')
  const { data: expenses = [] } = useSupabase('expenses')

  const activeEvent = events.find(e => e.id === getCurrentEvent())

  const totalRevenue = finances.filter(f => f.status === 'paid').reduce((s, f) => s + (f.amount || 0), 0)
  const pendingRevenue = finances.filter(f => f.status === 'pending').reduce((s, f) => s + (f.amount || 0), 0)
  const manualPaid = 0
  const confirmedGuests = guests.filter(g => g.status === 'confirmed').length
  const pendingGuests = guests.filter(g => g.status === 'pending').length
  const seatsTaken = guests.reduce((s, g) => s + (g.people_count || 1), 0)
  const totalSeats = tables.reduce((s, t) => s + (t.capacity || 0), 0)
  const occupancy = totalSeats > 0 ? Math.round((seatsTaken / totalSeats) * 100) : 0
  const expensesPaid = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + (e.amount || 0), 0)
  const netResult = totalRevenue + manualPaid - expensesPaid
  const budgetRecettes = activeEvent?.budget_recettes ? Number(activeEvent.budget_recettes) : 0
  const collected = totalRevenue + manualPaid
  const budgetPct = budgetRecettes > 0 ? Math.min(100, Math.round((collected / budgetRecettes) * 100)) : 0

  // Remplissage par catégorie
  const catFill = categories.map(c => {
    const catTables = tables.filter(t => t.category_id === c.id)
    const capacity = catTables.length
      ? catTables.reduce((s, t) => s + (t.capacity || 0), 0)
      : (activeEvent?.seats_per_table || 10)
    const used = guests.filter(g => g.category_id === c.id).reduce((s, g) => s + (g.people_count || 1), 0)
    return { id: c.id, name: c.name, used, capacity, pct: capacity > 0 ? Math.round((used / capacity) * 100) : 0 }
  })

  const recent = [...guests]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 6)

  const tableLabel = (tid) => {
    const t = tables.find(x => x.id === tid)
    return t ? String(t.number || t.id).padStart(3, '0') : '—'
  }
  const catName = (cid) => categories.find(c => c.id === cid)?.name || '—'

  const occupiedTables = tables.filter(t => guests.some(g => g.table_number === t.id)).length
  const usedTickets = tickets.filter(t => t.status === 'used').length
  const activeTickets = tickets.filter(t => t.status === 'active').length
  const pendingTickets = tickets.filter(t => t.status === 'pending').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <div className="page-title">Tableau de bord</div>
        <div className="page-subtitle">
          Bienvenue, {user?.first_name || 'Invité'} ! 👋 {activeEvent ? `— ${activeEvent.name}${activeEvent.date ? ' · ' + new Date(activeEvent.date).toLocaleDateString('fr-FR') : ''}${activeEvent.venue ? ' · ' + activeEvent.venue : ''}` : ''}
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon revenue">💰</div>
          <div className="kpi-content">
            <div className="kpi-label">Recettes encaissées</div>
            <div className="kpi-value">₣ {(totalRevenue + manualPaid).toLocaleString('fr-FR')}</div>
            <div className="kpi-change up">{activeTickets} billet(s) actif(s)</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon expense">📊</div>
          <div className="kpi-content">
            <div className="kpi-label">Résultat net</div>
            <div className="kpi-value" style={{ color: netResult >= 0 ? 'var(--success)' : 'var(--danger)' }}>₣ {netResult.toLocaleString('fr-FR')}</div>
            <div className="kpi-change">Dépenses payées : ₣ {expensesPaid.toLocaleString('fr-FR')}</div>
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
          <div className="kpi-icon dashboard">🍽️</div>
          <div className="kpi-content">
            <div className="kpi-label">Occupation des tables</div>
            <div className="kpi-value">{occupancy}%</div>
            <div className="kpi-change">{seatsTaken} / {totalSeats} places</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h2 className="card-title">Remplissage par catégorie</h2>
            <Link to="/tables" className="btn btn-secondary btn-sm">Voir les tables</Link>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {catFill.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Aucune catégorie pour cet événement.</p>}
            {catFill.map(c => (
              <div key={c.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                  <strong style={{ color: 'var(--navy)' }}>{c.name}</strong>
                  <span style={{ color: 'var(--text-muted)' }}>{c.used}/{c.capacity} places</span>
                </div>
                <div style={{ height: '8px', background: '#EDF2FB', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: (c.pct || 0) + '%', height: '100%', background: 'var(--accent)', borderRadius: '999px', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h2 className="card-title">Dernières inscriptions</h2>
            <Link to="/guests" className="btn btn-secondary btn-sm">Tout voir</Link>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {recent.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Aucune inscription pour le moment.</p>}
            {recent.map(g => (
              <Link key={g.id} to="/guests" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: '#F7F9FE', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <div>
                  <strong style={{ color: 'var(--navy)', display: 'block' }}>{g.first_name} {g.last_name}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{catName(g.category_id)} · Table n°{tableLabel(g.table_number)}</span>
                </div>
                <span className={`badge ${g.status === 'confirmed' ? 'badge-success' : g.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                  {g.status === 'confirmed' ? 'Confirmé' : g.status === 'pending' ? 'En attente' : 'Rejeté'}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h2 className="card-title">Recouvrement du budget</h2>
          </div>
          <div className="card-body">
            <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem', marginTop: 0 }}>
              Budget recettes : <strong style={{ color: 'var(--navy)' }}>{budgetRecettes ? '₣ ' + budgetRecettes.toLocaleString('fr-FR') : 'non défini'}</strong>
            </p>
            <div style={{ height: '12px', background: '#EDF2FB', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.5rem' }}>
              <div style={{ width: budgetPct + '%', height: '100%', background: 'linear-gradient(90deg, var(--accent), #b8941f)' }} />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>{budgetPct}% collecté · Reste en attente : ₣ {pendingRevenue.toLocaleString('fr-FR')}</p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h2 className="card-title">Billets & tables</h2>
            <Link to="/qrcodes" className="btn btn-secondary btn-sm">QR Codes</Link>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ background: '#F7F9FE', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem' }}>
              <strong style={{ color: 'var(--success)', fontSize: '1.2rem' }}>{activeTickets}</strong>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Billets actifs</p>
            </div>
            <div style={{ background: '#F7F9FE', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem' }}>
              <strong style={{ color: 'var(--warning)', fontSize: '1.2rem' }}>{pendingTickets}</strong>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Billets en attente</p>
            </div>
            <div style={{ background: '#F7F9FE', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem' }}>
              <strong style={{ color: 'var(--info)', fontSize: '1.2rem' }}>{usedTickets}</strong>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Billets scannés</p>
            </div>
            <div style={{ background: '#F7F9FE', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem' }}>
              <strong style={{ color: 'var(--navy)', fontSize: '1.2rem' }}>{occupiedTables}/{tables.length}</strong>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Tables occupées</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
