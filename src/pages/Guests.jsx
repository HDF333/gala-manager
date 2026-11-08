import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../hooks/useSupabase'
import { downloadCSV } from '../utils/export'

export default function Guests() {
  const { user } = useAuth()
  const { data: guests = [], send: createGuest, update: updateGuest, del: deleteGuest } = useSupabase('guests')
  const { data: tables = [] } = useSupabase('tables_placement')
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [search, setSearch] = useState('')

  const filteredGuests = guests.filter(g => {
    if (!search) return true
    const q = search.toLowerCase()
    return (g.first_name || '').toLowerCase().includes(q) ||
      (g.last_name || '').toLowerCase().includes(q) ||
      (g.email || '').toLowerCase().includes(q) ||
      (g.company || '').toLowerCase().includes(q)
  })

  const removeGuest = async (id) => {
    if (confirm('Supprimer cet invité ?')) {
      try {
        await deleteGuest(id)
      } catch (err) {
        alert('Erreur : ' + (err.message || 'Suppression impossible'))
      }
    }
  }

  const exportCSV = () => {
    downloadCSV('invites.csv', filteredGuests.map(g => ({
      ID: g.id,
      Prenom: g.first_name,
      Nom: g.last_name,
      Email: g.email,
      Telephone: g.phone,
      Tribu: g.company,
      Personnes: g.people_count || 1,
      Table: tableFor(g.table_number),
      Statut: g.status
    })))
  }

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

  const openEdit = (g) => {
    setEditing(g.id)
    setEditForm({
      first_name: g.first_name || '',
      last_name: g.last_name || '',
      email: g.email || '',
      phone: g.phone || '',
      company: g.company || '',
      status: g.status || 'confirmed'
    })
  }

  const saveEdit = async () => {
    try {
      await updateGuest(editing, editForm)
      setEditing(null)
    } catch (err) {
      alert('Erreur : ' + (err.message || 'Modification impossible'))
    }
  }

  const tableFor = (tableNumber) => {
    if (!tableNumber) return '-'
    const t = tables.find(tb => tb.id === tableNumber)
    return t ? 'Table n°' + String(t.number || t.id).padStart(3, '0') : 'Table ' + tableNumber
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
                <label>Tribu</label>
                <input name="company" className="form-input" placeholder="Nom de la tribu" />
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
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '220px' }}
            />
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>⬇️ Export CSV</button>
          </div>
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
                <th style={{ padding: '0.85rem' }}>Tribu</th>
                <th style={{ padding: '0.85rem' }}>Table</th>
                <th style={{ padding: '0.85rem' }}>Statut</th>
                <th style={{ padding: '0.85rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((g, i) => (
                <tr key={g.id || i} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.85rem' }}>{g.id || i + 1}</td>
                  <td style={{ padding: '0.85rem', fontWeight: '600' }}>{g.first_name || '-'}</td>
                  <td style={{ padding: '0.85rem' }}>{g.last_name || '-'}</td>
                  <td style={{ padding: '0.85rem' }}>{g.email || '-'}</td>
                  <td style={{ padding: '0.85rem' }}>{g.phone || '-'}</td>
                  <td style={{ padding: '0.85rem' }}>{g.company || '-'}</td>
                  <td style={{ padding: '0.85rem' }}>{tableFor(g.table_number)}</td>
                  <td style={{ padding: '0.85rem' }}>
                    <span className={`badge ${g.status === 'confirmed' ? 'badge-success' : g.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                      {g.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(g)}>
                      ✏️ Modifier
                    </button>{' '}
                    <button className="btn btn-danger btn-sm" onClick={() => removeGuest(g.id)}>
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
            <h3 className="modal-title">Modifier l'invité</h3>
            <div className="form-group">
              <label>Prénom</label>
              <input className="form-input" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Nom</label>
              <input className="form-input" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="form-input" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Téléphone</label>
              <input className="form-input" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Tribu</label>
              <input className="form-input" value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Statut</label>
              <select className="form-select" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="confirmed">Confirmé</option>
                <option value="pending">En attente</option>
                <option value="cancelled">Annulé</option>
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
