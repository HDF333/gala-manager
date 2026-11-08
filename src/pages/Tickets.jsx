import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../hooks/useSupabase'
import { downloadCSV } from '../utils/export'

export default function Tickets() {
  const { user } = useAuth()
  const { data: tickets = [], send: createTicket, update: updateTicket, del: deleteTicket } = useSupabase('tickets')
  const { data: categories = [] } = useSupabase('categories')

  const handleAddTicket = async (e) => {
    e.preventDefault()
    const form = e.target
    const ticket = {
      category_id: parseInt(form.category.value),
      quantity: parseInt(form.quantity.value) || 0,
      total: 0,
      status: 'active',
      purchased_at: new Date().toISOString()
    }
    const cat = categories.find(c => c.id === ticket.category_id)
    if (cat) {
      ticket.total = cat.price * ticket.quantity
    }
    await createTicket(ticket)
    alert('Billetterie enregistrée !')
    form.reset()
  }

  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})

  const openEdit = (t) => {
    setEditing(t.id)
    setEditForm({
      category_id: t.category_id || '',
      quantity: t.quantity || 1,
      total: t.total || 0,
      status: t.status || 'active'
    })
  }

  const saveEdit = async () => {
    try {
      await updateTicket(editing, {
        category_id: Number(editForm.category_id),
        quantity: Number(editForm.quantity) || 1,
        total: Number(editForm.total) || 0,
        status: editForm.status
      })
      setEditing(null)
    } catch (err) {
      alert('Erreur : ' + (err.message || 'Modification impossible'))
    }
  }

  const removeTicket = async (id) => {
    if (confirm('Supprimer ce billet ?')) {
      try {
        await deleteTicket(id)
      } catch (err) {
        alert('Erreur : ' + (err.message || 'Suppression impossible'))
      }
    }
  }

  const exportCSV = () => {
    downloadCSV('billets.csv', tickets.map(t => ({
      ID: t.id,
      Code: t.ticket_code,
      Categorie: categories.find(c => c.id === t.category_id)?.name || '-',
      Quantite: t.quantity,
      Total: t.total,
      Statut: t.status,
      Achete: t.purchased_at
    })))
  }

  const totalRevenue = tickets.reduce((sum, t) => sum + (t.total || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Billets</div>
      <div className="page-subtitle">Total recettes : ₣ 15.279.941</div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#d4af37', fontSize: '1.5rem' }}>₣ {totalRevenue.toLocaleString('fr-FR').replace('.', ' ')}</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Total des billets vendus</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#1a7a3a', fontSize: '1.5rem' }}>₣ 9.850.000</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Encaissés</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#c99700', fontSize: '1.5rem' }}>₣ 2.650.000</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Restant à encaisser</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <strong style={{ color: '#1a7a3a', fontSize: '1.5rem' }}>1.240</strong>
          <p style={{ color: '#6a6a6a', fontSize: '0.9rem' }}>Billets vendus</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Ajouter un billet</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleAddTicket}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Catégorie</label>
                <select name="category" className="form-select">
                  <option value="">Sélectionner...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - ₣ {c.price}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Quantité</label>
                <input name="quantity" type="number" className="form-input" placeholder="Quantité" />
              </div>
              <div className="form-group">
                <label>Prix unitaire (₣)</label>
                <input name="price" type="number" className="form-input" placeholder="50000" />
              </div>
              <div className="form-group">
                <label>Total TTC (₣)</label>
                <input name="total" type="number" className="form-input" placeholder="Montant" disabled />
              </div>
              <div className="form-group">
                <label>Statut</label>
                <select name="status" className="form-select">
                  <option value="active">Actif</option>
                  <option value="used">Utilisé</option>
                  <option value="redeemed">Récupéré</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Enregistrer</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Billets disponibles</h2>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>⬇️ Export CSV</button>
        </div>
        <div className="card-body" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.85rem' }}>N°</th>
                <th style={{ padding: '0.85rem' }}>Catégorie</th>
                <th style={{ padding: '0.85rem' }}>Quantité</th>
                <th style={{ padding: '0.85rem' }}>Prix unitaire</th>
                <th style={{ padding: '0.85rem' }}>Total</th>
                <th style={{ padding: '0.85rem' }}>Statut</th>
                <th style={{ padding: '0.85rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t, i) => (
                <tr key={t.id || i} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.85rem' }}>{t.id || i + 1}</td>
                  <td style={{ padding: '0.85rem' }}>{categories.find(c => c.id === t.category_id)?.name || '-'}</td>
                  <td style={{ padding: '0.85rem' }}>{t.quantity || 0}</td>
                  <td style={{ padding: '0.85rem' }}>₣ {t.total || 0}</td>
                  <td style={{ padding: '0.85rem' }}>₣ {(t.total || 0).toLocaleString('fr-FR').replace('.', ' ')}</td>
                  <td style={{ padding: '0.85rem' }}>
                    <span className={`badge ${t.status === 'active' ? 'badge-success' : t.status === 'used' ? 'badge-warning' : 'badge-muted'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}>
                      ✏️ Modifier
                    </button>{' '}
                    <button className="btn btn-danger btn-sm" onClick={() => removeTicket(t.id)}>
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Modifier le billet</h3>
            <div className="form-group">
              <label>Catégorie</label>
              <select className="form-select" value={editForm.category_id} onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}>
                <option value="">Sélectionner...</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - ₣ {c.price}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Quantité</label>
              <input type="number" className="form-input" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Total (₣)</label>
              <input type="number" className="form-input" value={editForm.total} onChange={(e) => setEditForm({ ...editForm, total: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Statut</label>
              <select className="form-select" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="active">Actif</option>
                <option value="used">Utilisé</option>
                <option value="redeemed">Récupéré</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={saveEdit}>Enregistrer</button>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

