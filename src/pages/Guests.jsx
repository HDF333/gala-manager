import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../hooks/useSupabase'

export default function Guests() {
  const { user } = useAuth()
  const { data: guests = [], send: createGuest } = useSupabase('guests')

  const handleAddGuest = async (e) => {
    e.preventDefault()
    const form = e.target
    const guest = {
      first_name: form.firstName.value,
      last_name: form.lastName.value,
      email: form.email.value,
      phone: form.phone.value,
      company: form.company.value,
      status: 'confirmed'
    }
    await createGuest(guest)
    alert('Invité ajouté !')
    form.reset()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Invités</div>
      <div className="page-subtitle">
        {guests.length} invité(s) gérés
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Ajouter un invité</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleAddGuest}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Prénom</label>
                <input name="firstName" className="form-input" placeholder="Prénom" />
              </div>
              <div className="form-group">
                <label>Nom</label>
                <input name="lastName" className="form-input" placeholder="Nom" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input name="email" type="email" className="form-input" placeholder="email@exemple.com" />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input name="phone" className="form-input" placeholder="06 12 34 56 78" />
              </div>
              <div className="form-group">
                <label>Société</label>
                <input name="company" className="form-input" placeholder="Société" />
              </div>
              <div className="form-group">
                <label>Statut</label>
                <select name="status" className="form-select">
                  <option value="confirmed">Confirmé</option>
                  <option value="pending">En attente</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Ajouter</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Liste des invités</h2>
        </div>
        <div className="card-body" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.85rem' }}>N°</th>
                <th style={{ padding: '0.85rem' }}>Prénom</th>
                <th style={{ padding: '0.85rem' }}>Nom</th>
                <th style={{ padding: '0.85rem' }}>Email</th>
                <th style={{ padding: '0.85rem' }}>Téléphone</th>
                <th style={{ padding: '0.85rem' }}>Société</th>
                <th style={{ padding: '0.85rem' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g, i) => (
                <tr key={g.id || i} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.85rem' }}>{g.id || i + 1}</td>
                  <td style={{ padding: '0.85rem', fontWeight: '600' }}>{g.first_name || '-'}</td>
                  <td style={{ padding: '0.85rem' }}>{g.last_name || '-'}</td>
                  <td style={{ padding: '0.85rem' }}>{g.email || '-'}</td>
                  <td style={{ padding: '0.85rem' }}>{g.phone || '-'}</td>
                  <td style={{ padding: '0.85rem' }}>{g.company || '-'}</td>
                  <td style={{ padding: '0.85rem' }}>
                    <span className={`badge ${g.status === 'confirmed' ? 'badge-success' : g.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                      {g.status}
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

