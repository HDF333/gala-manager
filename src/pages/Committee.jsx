import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Committee() {
  const { user } = useAuth()

  const members = [
    { id: 1, full_name: 'Jean Dupont', role: 'Chef d\'orchestre', email: 'jean@gala.com', phone: '06 12 34 56 78', status: 'active', messages: 'Préparation de la salle' },
    { id: 2, full_name: 'Marie Curie', role: 'Gestion des invités', email: 'marie@gala.com', phone: '06 11 22 33 44', status: 'active', messages: 'Vérification des confirmations' },
    { id: 3, full_name: 'Pierre Petit', role: 'Budget & finance', email: 'pierre@gala.com', phone: '06 22 33 44 55', status: 'active', messages: 'Suivi des paiements' },
    { id: 4, full_name: 'Marie Dubois', role: 'Communiqué', email: 'marie.d@gala.com', phone: '06 33 44 55 66', status: 'active', messages: 'Rédaction du communiqué' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Comité</div>
      <div className="page-subtitle">Membres de l'organisation</div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Ajouter un membre</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Nom complet</label>
              <input className="form-input" placeholder="Prénom et Nom" />
            </div>
            <div className="form-group">
              <label>Rôle</label>
              <input className="form-input" placeholder="Ex: Chef d'orchestre, Budget, etc." />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="form-input" type="email" placeholder="email@exemple.com" />
            </div>
            <div className="form-group">
              <label>Téléphone</label>
              <input className="form-input" placeholder="06 12 34 56 78" />
            </div>
          </div>
          <button type="button" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Ajouter le membre
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Membres du comité</h2>
        </div>
        <div className="card-body" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.85rem' }}>N°</th>
                <th style={{ padding: '0.85rem' }}>Nom</th>
                <th style={{ padding: '0.85rem' }}>Rôle</th>
                <th style={{ padding: '0.85rem' }}>Email</th>
                <th style={{ padding: '0.85rem' }}>Téléphone</th>
                <th style={{ padding: '0.85rem' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.85rem' }}>{m.id}</td>
                  <td style={{ padding: '0.85rem', fontWeight: '600' }}>{m.full_name}</td>
                  <td style={{ padding: '0.85rem' }}>{m.role}</td>
                  <td style={{ padding: '0.85rem' }}>{m.email}</td>
                  <td style={{ padding: '0.85rem' }}>{m.phone}</td>
                  <td style={{ padding: '0.85rem' }}>
                    <span className="badge badge-success">{m.status}</span>
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

