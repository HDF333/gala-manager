import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../hooks/useSupabase'

export default function QRCodes() {
  const { user } = useAuth()
  const { data: tickets = [], error, refetch } = useSupabase('tickets')
  const { data: qrcodes = [], error: qrError } = useSupabase('qrcodes')

  const [pendingTicketId, setPendingTicketId] = useState(null)
  const [showGenerate, setShowGenerate] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [generateSuccess, setGenerateSuccess] = useState('')

  // Get pending tickets (unconfirmed registrations)
  const pendingTickets = tickets.filter(t => t.status === 'pending' || !t.status)
  const confirmedTickets = tickets.filter(t => t.status === 'confirmed')

  // Generate QR code for a ticket
  const generateQR = async (ticketId) => {
    try {
      setGenerateError('')
      setGenerateSuccess('')

      // Get ticket details
      const ticketRes = await fetch('http://localhost:54321/rest/v1/tickets?id=eq.' + ticketId, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvemFsaWh6ZGlhdGRvb2N4eWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NzIxMTcsImV4cCI6MjEwOTE0ODExN30.pMwkh3DbjEUPtWtyVpmSx7Hd4_R659zp3ohaRqO5LiA'
        },
        headers: { 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvemFsaWh6ZGlhdGRvb2N4eWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NzIxMTcsImV4cCI6MjEwOTE0ODExN30.pMwkh3DbjEUPtWtyVpmSx7Hd4_R659zp3ohaRqO5LiA' }
      })
      const ticketData = await ticketRes.json()

      if (ticketData.error || !ticketData.data) {
        throw new Error('Ticket non trouvé ou inaccessible')
      }

      const ticket = ticketData.data[0]

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
        event: 'GALA MANAGER'
      }

      // Generate the QR code as a data URL
      const qrDataUrl = await generateQRCodeString(qrData)

      // Insert QR code into database
      const res = await fetch('http://localhost:54321/rest/v1/qrcodes?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvemFsaWh6ZGlhdGRvb2N4eWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NzIxMTcsImV4cCI6MjEwOTE0ODExN30.pMwkh3DbjEUPtWtyVpmSx7Hd4_R659zp3ohaRqO5LiA', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvemFsaWh6ZGlhdGRvb2N4eWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NzIxMTcsImV4cCI6MjEwOTE0ODExN30.pMwkh3DbjEUPtWtyVpmSx7Hd4_R659zp3ohaRqO5LiA'
        },
        body: JSON.stringify({
          ticket_id: ticket.id,
          code: qrData.ticket_code,
          data: qrData,
          status: 'confirmed'
        })
      })

      if (res.ok) {
        setGenerateSuccess('QR Code généré avec succès !')
        refetch()
        setPendingTicketId(null)
      } else {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Erreur lors de la génération')
      }
    } catch (err) {
      setGenerateError(err.message)
    }
  }

  // Helper function to generate QR code data URL
  function generateQRCodeString(data) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const size = 256
      canvas.width = size
      canvas.height = size

      // Simple QR code generation (for demo - use qrcode library in production)
      // This is a placeholder - use a library like qrcode.react in production
      const cellSize = size / 29
      const modules = generateQRCodeData(data)

      for (let row = 0; row < 29; row++) {
        for (let col = 0; col < 29; col++) {
          if (modules[row] & (1 << col)) {
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize)
          }
        }
      }

      // Add finder patterns
      drawFinderPattern(ctx, 0, 0)
      drawFinderPattern(ctx, 0, size - 29)
      drawFinderPattern(ctx, size - 29, 0)

      resolve(canvas.toDataURL('image/png'))
    })
  }

  function drawFinderPattern(ctx, x, y) {
    const size = 7
    const color = '#000000'
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if ((r < 3 && c < 3) || (r < 3 && c >= 4) || (r >= 4 && c < 3)) {
          ctx.fillStyle = color
          ctx.fillRect(x + c * 4, y + r * 4, 1, 1)
        }
      }
    }
  }

  function generateQRCodeData(data) {
    // Simple placeholder - in production, use a proper QR code library
    const chars = []
    for (let i = 0; i < 29; i++) {
      chars.push(0)
    }
    // Set some data bits
    const dataStr = JSON.stringify(data)
    let idx = 0
    for (let i = 0; i < Math.min(dataStr.length, 100); i++) {
      chars[idx % 29] |= (dataStr.charCodeAt(i) << ((i * 3) % 29))
      idx++
    }
    return chars
  }

  const deleteQRCode = async (qrId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce QR Code ?')) {
      try {
        const res = await fetch('http://localhost:54321/rest/v1/qrcodes?id=eq.' + qrId, {
          method: 'Delete',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvemFsaWh6ZGlhdGRvb2N4eWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NzIxMTcsImV4cCI6MjEwOTE0ODExN30.pMwkh3DbjEUPtWtyVpmSx7Hd4_R659zp3ohaRqO5LiA'
          }
        })
        if (res.ok) {
          setGenerateSuccess('QR Code supprimé avec succès !')
          refetch()
        } else {
          setGenerateError('Erreur lors de la suppression')
        }
      } catch (err) {
        setGenerateError('Erreur réseau')
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
              onChange={(e) => setPendingTicketId(e.target.value)}
              disabled={!pendingTicketId}
            >
              <option value="">Select...</option>
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
                <th style={{ padding: '0.85rem' }}>Statut</th>
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
    </div>
  )
}

export default QRCodes
