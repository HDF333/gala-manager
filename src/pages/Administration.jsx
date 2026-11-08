import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../hooks/useSupabase'
import { supabase } from '../lib/supabase'

export default function Administration() {
  const { user } = useAuth()
  const { data: guests = [], refetch, error, update: updateGuest } = useSupabase('guests')
  const { data: tickets = [], refetch: refetchTickets } = useSupabase('tickets')
  const { data: categories = [] } = useSupabase('categories')
  const { data: tables = [] } = useSupabase('tables_placement')
  const { data: qrcodes = [], refetch: refetchQRCodes, del: removeQRCode } = useSupabase('qrcodes')

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [message, setMessage] = useState('')
  const tableFor = (tableNumber) => {
    if (!tableNumber) return '-'
    const t = tables.find(tb => tb.id === tableNumber)
    if (!t) return 'Table ' + tableNumber
    const catName = t.category_id ? categories.find(c => c.id === t.category_id)?.name || '' : ''
    return 'Table n°' + String(t.number || t.id).padStart(3, '0') + (catName ? ' (' + catName + ')' : '')
  }

  const filteredGuests = guests.filter(g => {
    if (search && !g.first_name?.toLowerCase().includes(search.toLowerCase()) && !g.last_name?.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    if (categoryFilter !== 'all' && g.category_id?.toString() !== categoryFilter) {
      return false
    }
    if (statusFilter !== 'all' && g.status !== statusFilter) {
      return false
    }
    return true
  })

  const handleConfirm = async (guestId) => {
    try {
      await updateGuest(guestId, {
        status: 'confirmed',
        confirmation_date: new Date().toISOString()
      })
      // Activer le billet lié à cette catégorie
      await supabase.rpc('activate_tickets_for_guest', { p_buyer: guestId })
      setMessage('Inscription validée avec succès ! Billet activé.')
      refetch()
      refetchTickets()
    } catch (err) {
      setMessage('Erreur : ' + (err.message || 'Erreur lors de la validation'))
    }
  }

  const handleReject = async (guestId) => {
    if (confirm('Êtes-vous sûr de vouloir rejeter cette inscription ?')) {
      try {
        await updateGuest(guestId, {
          status: 'rejected',
          confirmation_date: new Date().toISOString()
        })
        setMessage('Inscription rejetée')
        refetch()
        refetchTickets()
      } catch (err) {
        setMessage('Erreur : ' + (err.message || 'Erreur lors du rejet'))
      }
    }
  }

  const handleDeleteQR = async (qrId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce QR Code ?')) {
      try {
        await removeQRCode(qrId)
        setMessage('QR Code supprimé avec succès')
        refetchQRCodes()
      } catch (err) {
        setMessage('Erreur : ' + (err.message || 'Erreur de connexion'))
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Administration des Inscriptions</div>
      <div className="page-subtitle">
        Validez les inscriptions et gérez les QR Codes.
        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#a0a0a0' }}>
          Les invités recevront leur QR Code après validation.
        </div>
      </div>

      {message && (
        <div style={{ padding: '1rem', backgroundColor: message.includes('succès') ? 'rgba(26,122,58,0.1)' : 'rgba(184,26,26,0.1)', color: message.includes('succès') ? '#1a7a3a' : '#b81a1a', borderRadius: '8px', marginBottom: '1rem' }}>
          {message}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Filtres de recherche</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <input
              type="text"
              placeholder="Rechercher un participant..."
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Toutes les catégories</option>
              <option value="1">Guest</option>
              <option value="2">Premium</option>
              <option value="3">VIP</option>
            </select>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmé</option>
              <option value="rejected">Rejeté</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">Liste des inscriptions</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary">Tout valider</button>
              <button className="btn btn-secondary">Exporter CSV</button>
            </div>
          </div>
        </div>
        <div className="card-body" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.85rem' }}>N°</th>
                <th style={{ padding: '0.85rem' }}>Nom</th>
                <th style={{ padding: '0.85rem' }}>Email</th>
                <th style={{ padding: '0.85rem' }}>Personnes</th>
                <th style={{ padding: '0.85rem' }}>Table</th>
                <th style={{ padding: '0.85rem' }}>Catégorie</th>
                <th style={{ padding: '0.85rem' }}>Statut</th>
                <th style={{ padding: '0.85rem' }}>Dernière mise à jour</th>
                <th style={{ padding: '0.85rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((g) => (
                <tr key={g.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.85rem' }}>{g.id}</td>
                  <td style={{ padding: '0.85rem', fontWeight: '600' }}>{g.first_name} {g.last_name}</td>
                  <td style={{ padding: '0.85rem' }}>{g.email}</td>
                  <td style={{ padding: '0.85rem' }}>{g.people_count || 1}</td>
                  <td style={{ padding: '0.85rem' }}>{tableFor(g.table_number)}</td>
                  <td style={{ padding: '0.85rem' }}>
                    {g.category_id ? categories.find(c => c.id === g.category_id)?.name || 'N/A' : '-'}
                  </td>
                  <td style={{ padding: '0.85rem' }}>
                    <span className={`badge ${g.status === 'confirmed' ? 'badge-success' : g.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                      {g.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem' }}>{g.updated_at ? new Date(g.updated_at).toLocaleString() : '-'}</td>
                  <td style={{ padding: '0.85rem' }}>
                    {g.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-success btn-sm" onClick={() => handleConfirm(g.id)}>
                          ✅ Valider
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleReject(g.id)}>
                          ❌ Rejeter
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">QR Codes Génerés</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary">Exporter CSV</button>
            </div>
          </div>
        </div>
        <div className="card-body" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.85rem' }}>N°</th>
                <th style={{ padding: '0.85rem' }}>Ticket ID</th>
                <th style={{ padding: '0.85rem' }}>Code QR</th>
                <th style={{ padding: '0.85rem' }}>Statut</th>
                <th style={{ padding: '0.85rem' }}>Ticket ID associé</th>
                <th style={{ padding: '0.85rem' }}>Généré le</th>
                <th style={{ padding: '0.85rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {qrcodes.map((q) => (
                <tr key={q.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.85rem' }}>{q.id}</td>
                  <td style={{ padding: '0.85rem' }}>{q.ticket_id}</td>
                  <td style={{ padding: '0.85rem' }}>
                    <code style={{ fontSize: '0.8rem', background: '#2a2a2a', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#d4af37' }}>
                      {q.code}
                    </code>
                  </td>
                  <td style={{ padding: '0.85rem' }}>
                    <span className={`badge ${q.status === 'confirmed' ? 'badge-success' : 'badge-warning'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem' }}>
                    {q.ticket_id ? tickets.find(t => t.id === q.ticket_id)?.ticket_code || '-' : '-'}
                  </td>
                  <td style={{ padding: '0.85rem' }}>{q.generated_at ? new Date(q.generated_at).toLocaleString() : '-'}</td>
                  <td style={{ padding: '0.85rem' }}>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteQR(q.id)}
                      disabled={q.status === 'used'}
                    >
                      🗑️ Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Statistiques QR Codes</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
              <strong style={{ color: '#d4af37', fontSize: '1.5rem' }}>{qrcodes.length}</strong>
              <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>QR Codes totaux</p>
            </div>
            <div style={{ padding: '1rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
              <strong style={{ color: '#1a7a3a', fontSize: '1.5rem' }}>{qrcodes.filter(q => q.status === 'confirmed').length}</strong>
              <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>QR Codes activés</p>
            </div>
            <div style={{ padding: '1rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
              <strong style={{ color: '#b81a1a', fontSize: '1.5rem' }}>{qrcodes.filter(q => q.status === 'pending').length}</strong>
              <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>QR Codes en attente</p>
            </div>
            <div style={{ padding: '1rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
              <strong style={{ color: '#b81a1a', fontSize: '1.5rem' }}>{qrcodes.filter(q => q.status === 'used').length}</strong>
              <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>QR Codes utilisés</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Données de test - Billets</h2>
        </div>
        <div className="card-body" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.85rem' }}>N°</th>
                <th style={{ padding: '0.85rem' }}>Ticket ID</th>
                <th style={{ padding: '0.85rem' }}>Nom</th>
                <th style={{ padding: '0.85rem' }}>Email</th>
                <th style={{ padding: '0.85rem' }}>Personnes</th>
                <th style={{ padding: '0.85rem' }}>Table</th>
                <th style={{ padding: '0.85rem' }}>Catégorie</th>
                <th style={{ padding: '0.85rem' }}>Total</th>
                <th style={{ padding: '0.85rem' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.85rem' }}>{t.id}</td>
                  <td style={{ padding: '0.85rem' }}>{t.ticket_code}</td>
                  <td style={{ padding: '0.85rem' }}>{t.first_name || "-"} {t.last_name || ""}</td>
                  <td style={{ padding: '0.85rem' }}>{t.email || "-"}</td>
                  <td style={{ padding: '0.85rem' }}>
                    {t.category_id ? categories.find(c => c.id === t.category_id)?.name || '-' : '-'}
                  </td>
                  <td style={{ padding: '0.85rem' }}>₣ {t.total || 0}</td>
                  <td style={{ padding: '0.85rem' }}>
                    <span className={`badge ${t.status === 'active' ? 'badge-success' : t.status === 'pending' ? 'badge-warning' : t.status === 'redeemed' ? 'badge-info' : 'badge-muted'}`}>
                      {t.status}
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

