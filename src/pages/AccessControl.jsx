import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function AccessControl() {
  const { user } = useAuth()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Contrôle d'accès</div>
      <div className="page-subtitle">Scannez un billet pour vérifier l'accès</div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Scanner un billet</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem', background: '#1a1a1a', borderRadius: '12px' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, #d4af37, #b8941f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>
              📱
            </div>
            <p style={{ color: '#a0a0a0' }}>Scannez le code QR du billet</p>
            <div style={{ width: '100%', maxWidth: '300px', background: '#222222', border: '1px solid #3a3a3a', borderRadius: '8px', padding: '1rem', textAlign: 'center', color: '#a0a0a0' }}>
              Résultat de la reconnaissance
            </div>
            <button onClick={() => alert('PDF QR Code sérialisé, envoi du contenu du billet...')} className="btn btn-gold">
              📄 Télécharger le contenu du billet
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Historique des accès</h2>
        </div>
        <div className="card-body" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.85rem' }}>N°</th>
                <th style={{ padding: '0.85rem' }}>N° billet / Code QR</th>
                <th style={{ padding: '0.85rem' }}>Acheteur</th>
                <th style={{ padding: '0.85rem' }}>Heure de scan</th>
                <th style={{ padding: '0.85rem' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 1, code: '551725-001', buyer: 'Jean Dupont', time: '2026-11-13 14:30', status: 'Accédé' },
                { id: 2, code: '551726-002', buyer: 'Marie Dupont', time: '2026-11-13 14:32', status: 'Accédé' },
                { id: 3, code: '551727-003', buyer: 'Pierre Martin', time: '2026-11-13 14:45', status: 'Accédé' },
              ].map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.85rem' }}>{a.id}</td>
                  <td style={{ padding: '0.85rem' }}>{a.code}</td>
                  <td style={{ padding: '0.85rem' }}>{a.buyer}</td>
                  <td style={{ padding: '0.85rem' }}>{a.time}</td>
                  <td style={{ padding: '0.85rem' }}><span className="badge badge-success">Accédé</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

