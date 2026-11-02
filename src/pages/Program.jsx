import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Program() {
  const { user } = useAuth()

  const sections = [
    { id: 1, name: 'Accueil & Apéritif', description: 'Bienvenue des invités, apéritif léger', sort_order: 1, status: 'active' },
    { id: 2, name: 'Remise des gages', description: 'Remise des dons et présentation des sponsors', sort_order: 2, status: 'active' },
    { id: 3, name: 'Défilé de soie', description: 'Défilé glamour avec mode exclusive', sort_order: 3, status: 'active' },
    { id: 4, name: 'Dîner en famille', description: 'Repas sommelier servi aux invités', sort_order: 4, status: 'active' },
    { id: 5, name: 'Bain de soie', description: 'Permanence de coiffure et maquillage', sort_order: 5, status: 'active' },
    { id: 6, name: 'Soirée dance', description: 'Bal scène avec DJ et musique', sort_order: 6, status: 'active' },
    { id: 7, name: 'Clôture & Ballon de noël', description: 'Moment clémente et célébration', sort_order: 7, status: 'active' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Programme</div>
      <div className="page-subtitle">Planification de la soirée</div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Ajouter une section</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Nom de la section</label>
              <input className="form-input" placeholder="Ex: Accueil & Apéritif" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input className="form-input" placeholder="Description courte" />
            </div>
            <div className="form-group">
              <label>Ordre</label>
              <input className="form-input" type="number" placeholder="1" />
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }}>Ajouter</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Programme de la soirée</h2>
        </div>
        <div className="card-body" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.85rem' }}>N°</th>
                <th style={{ padding: '0.85rem' }}>Nom</th>
                <th style={{ padding: '0.85rem' }}>Description</th>
                <th style={{ padding: '0.85rem' }}>Ordre</th>
                <th style={{ padding: '0.85rem' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.85rem' }}>{s.id}</td>
                  <td style={{ padding: '0.85rem', fontWeight: '600' }}>{s.name}</td>
                  <td style={{ padding: '0.85rem' }}>{s.description}</td>
                  <td style={{ padding: '0.85rem' }}>{s.sort_order}</td>
                  <td style={{ padding: '0.85rem' }}>
                    <span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                      {s.status}
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

export default Program
