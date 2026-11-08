import React, { useState } from 'react'
import QRCode from 'qrcode'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../hooks/useSupabase'

export default function QRCodes() {
  const { user } = useAuth()
  const { data: tickets = [], error } = useSupabase('tickets')
  const { data: qrcodes = [], error: qrError, insert: insertQRCode, del: deleteQR, refetch } = useSupabase('qrcodes')
  const { data: categories = [] } = useSupabase('categories')

  const [pendingTicketId, setPendingTicketId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [generateError, setGenerateError] = useState('')
  const [generateSuccess, setGenerateSuccess] = useState('')

  // Get pending tickets (unconfirmed registrations)
  const pendingTickets = tickets.filter(t => t.status === 'pending' || !t.status)

  // Generate QR code for a ticket
  const generateQR = async (ticketId) => {
    try {
      setGenerateError('')
      setGenerateSuccess('')

      const ticket = tickets.find(t => t.id === ticketId)
      if (!ticket) {
        throw new Error('Ticket non trouvé ou inaccessible')
      }

      // Generate QR code data
      const qrData = {
        ticket_id: ticket.id,
        ticket_code: ticket.ticket_code,
        category_id: ticket.category_id,
        category: ticket.category_id ? categories.find(c => c.id === ticket.category_id)?.name : 'Invité',
        first_name: ticket.first_name || '',
        last_name: ticket.last_name || '',
        email: ticket.email || '',
        quantity: ticket.quantity || 1,
        status: 'confirmed',
        event: 'EVEN MANAGER'
      }

      // Générer un vrai QR code (PNG data URL)
      const imageUrl = await QRCode.toDataURL(JSON.stringify(qrData), { width: 256, margin: 1 })

      // Insert QR code into database
      await insertQRCode({
        ticket_id: ticket.id,
        code: ticket.ticket_code,
        data: { ...qrData, imageUrl },
        status: 'confirmed'
      })

      setGenerateSuccess('QR Code généré avec succès !')
      refetch()
      setPendingTicketId(null)
    } catch (err) {
      setGenerateError(err.message || 'Erreur lors de la génération')
    }
  }

  const deleteQRCode = async (qrId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce QR Code ?')) {
      try {
        await deleteQR(qrId)
        setGenerateSuccess('QR Code supprimé avec succès !')
        refetch()
      } catch (err) {
        setGenerateError(err.message || 'Erreur lors de la suppression')
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">QR Codes & Contrôle d'accès</div>
      <div className="page-subtitle">
        Générez des QR Codes pour les billets confirmés. Les invités recevront leur QR Code après validation admin.
      </div>

      {generateError && (
        <div style={{ padding: '1rem', background: 'rgba(184,26,26,0.1)', color: '#b81a1a', borderRadius: '8px', marginBottom: '1rem' }}>
          {generateError}
        </div>
      )}
      {generateSuccess && (
        <div style={{ padding: '1rem', background: 'rgba(26,122,58,0.1)', color: '#1a7a3a', borderRadius: '8px', marginBottom: '1rem' }}>
          {generateSuccess}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Générer un QR Code</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <select
              className="form-select"
              value={pendingTicketId || ''}
              onChange={(e) => setPendingTicketId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Sélectionner un billet...</option>
              {pendingTickets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ticket_code} - {t.first_name || 'M.'} {t.last_name || ''} ({t.category_id ? categories.find(c => c.id === t.category_id)?.name || 'Invité' : 'Invité'})
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary"
              onClick={() => pendingTicketId && generateQR(pendingTicketId)}
              disabled={!pendingTicketId}
            >
              ✅ Générer le QR Code
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">QR Codes générés</h2>
        </div>
        <div className="card-body" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.85rem' }}>N°</th>
                <th style={{ padding: '0.85rem' }}>Ticket ID</th>
                <th style={{ padding: '0.85rem' }}>Code QR</th>
                <th style={{ padding: '0.85rem' }}>Aperçu</th>
                <th style={{ padding: '0.85rem' }}>Statut</th>
                <th style={{ padding: '0.85rem' }}>Généré le</th>
                <th style={{ padding: '0.85rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {qrcodes.map((q) => (
                <tr key={q.id} onClick={() => setDetail(q)} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} title="Voir à qui appartient ce QR">
                  <td style={{ padding: '0.85rem' }}>{q.id}</td>
                  <td style={{ padding: '0.85rem' }}>{q.ticket_id}</td>
                  <td style={{ padding: '0.85rem' }}>
                    <code style={{ fontSize: '0.8rem', background: '#2a2a2a', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#d4af37' }}>
                      {q.code}
                    </code>
                  </td>
                  <td style={{ padding: '0.85rem' }}>
                    {q.data?.imageUrl ? (
                      <a href={q.data.imageUrl} download={'QR-' + q.code + '.png'} title="Télécharger le QR">
                        <img src={q.data.imageUrl} alt="QR" style={{ width: '48px', height: '48px', borderRadius: '4px', background: '#fff' }} />
                      </a>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '0.85rem' }}>
                    <span className={`badge ${q.status === 'confirmed' ? 'badge-success' : 'badge-warning'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem' }}>{q.generated_at ? new Date(q.generated_at).toLocaleString() : '-'}</td>
                  <td style={{ padding: '0.85rem' }}>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteQRCode(q.id)}
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

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">QR {detail.code}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 0 }}>Ce QR appartient à :</p>
            <p style={{ margin: '0.3rem 0' }}><strong>{detail.data?.first_name} {detail.data?.last_name}</strong></p>
            <p style={{ margin: '0.3rem 0', color: 'var(--text-soft)' }}>{detail.data?.category} · Table n°{String(detail.data?.table_number || '—').padStart(3, '0')}</p>
            <p style={{ margin: '0.3rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {detail.data?.event_name} · {detail.data?.email || 'email non renseigné'} · {detail.data?.people_count || 1} personne(s)
            </p>
            <p style={{ margin: '0.5rem 0' }}>
              <span className={`badge ${detail.status === 'confirmed' ? 'badge-success' : detail.status === 'pending' ? 'badge-warning' : 'badge-info'}`}>{detail.status}</span>
            </p>
            {detail.data?.imageUrl && (
              <img src={detail.data.imageUrl} alt="QR" style={{ width: '100%', maxWidth: '280px', borderRadius: '10px', border: '1px solid var(--border)', marginTop: '0.5rem' }} />
            )}
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              {detail.data?.imageUrl && (
                <a className="btn btn-gold" href={detail.data.imageUrl} download={'QR-' + detail.code + '.png'}>⬇️ Télécharger</a>
              )}
              <button className="btn btn-secondary" onClick={() => setDetail(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

