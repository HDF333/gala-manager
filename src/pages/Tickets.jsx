import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../hooks/useSupabase'

export default function Tickets() {
  const { user } = useAuth()
  const { data: tickets = [], send: createTicket } = useSupabase('tickets')
  const { data: categories = [] } = useSupabase('categories')

  const handleAddTicket = async (e) => {
    e.preventDefault()
    const form = e.target
    const ticket = {
      category_id: parseInt(form.category.value),
      quantity: parseInt(form.quantity.value) || 0,
      total_f: 0,
      status: 'active',
      purchased_at: new Date().toISOString()
    }
    const cat = categories.find(c => c.id === ticket.category_id)
    if (cat) {
      ticket.total_f = cat.price_f * ticket.quantity
    }
    await createTicket(ticket)
    alert('Billetterie enregistrée !')
    form.reset()
  }

  const totalRevenue = tickets.reduce((sum, t) => sum + (t.total_f || 0), 0)

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
                    <option key={c.id} value={c.id}>{c.name} - ₣ {c.price_f}</option>
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
              </tr>
            </thead>
            <tbody>
              {tickets.map((t, i) => (
                <tr key={t.id || i} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.85rem' }}>{t.id || i + 1}</td>
                  <td style={{ padding: '0.85rem' }}>{categories.find(c => c.id === t.category_id)?.name || '-'}</td>
                  <td style={{ padding: '0.85rem' }}>{t.quantity || 0}</td>
                  <td style={{ padding: '0.85rem' }}>₣ {t.total_f || 0}</td>
                  <td style={{ padding: '0.85rem' }}>₣ {(t.total_f || 0).toLocaleString('fr-FR').replace('.', ' ')}</td>
                  <td style={{ padding: '0.85rem' }}>
                    <span className={`badge ${t.status === 'active' ? 'badge-success' : t.status === 'used' ? 'badge-warning' : 'badge-muted'}`}>
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

