import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../hooks/useSupabase'

export default function Inscription() {
  const { user } = useAuth()
  const { data: categories = [], error, refetch } = useSupabase('categories')
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    category_id: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')

    try {
      const res = await fetch('http://localhost:54321/rest/v1/guests?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvemFsaWh6ZGlhdGRvb2N4eWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NzIxMTcsImV4cCI6MjEwOTE0ODExN30.pMwkh3DbjEUPtWtyVpmSx7Hd4_R659zp3ohaRqO5LiA', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvemFsaWh6ZGlhdGRvb2N4eWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NzIxMTcsImV4cCI6MjEwOTE0ODExN30.pMwkh3DbjEUPtWtyVpmSx7Hd4_R659zp3ohaRqO5LiA'
        },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          category_id: form.category_id,
          status: 'pending'
        })
      })
      const data = await res.json()
      if (data.error) {
        setMessage('Erreur: ' + data.error.message)
      } else {
        setMessage('Inscription envoyée avec succès ! L\'admin validera prochainement votre inscription.')
        setForm({ first_name: '', last_name: '', email: '', phone: '', company: '', category_id: '', notes: '' })
      }
    } catch (err) {
      setMessage('Erreur de connexion au serveur')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Inscription au Gala</div>
      <div className="page-subtitle">
        {message && (
          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            backgroundColor: message.includes('succès') ? 'rgba(26,122,58,0.1)' : 'rgba(184,26,26,0.1)',
            color: message.includes('succès') ? '#1a7a3a' : '#b81a1a'
          }}>
            {message}
          </div>
        )}
        <p>Remplissez le formulaire ci-dessous pour vous inscrire au gala.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Nouvelle inscription</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'end' }}>
              <div className="form-group">
                <label>Prénom *</label>
                <input
                  name="first_name"
                  type="text"
                  className="form-input"
                  placeholder="Jean"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Nom *</label>
                <input
                  name="last_name"
                  type="text"
                  className="form-input"
                  placeholder="Dupont"
                  value={form.last_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="jean@exemple.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input
                  name="phone"
                  type="tel"
                  className="form-input"
                  placeholder="06 12 34 56 78"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Société / Entreprise</label>
                <input
                  name="company"
                  type="text"
                  className="form-input"
                  placeholder="Société"
                  value={form.company}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Catégorie *</label>
                <select
                  name="category_id"
                  className="form-select"
                  value={form.category_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Sélectionnez une catégorie</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.price} FCFA)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Notes supplémentaires</label>
              <textarea
                name="notes"
                className="form-textarea"
                placeholder="Événement spécial, allergie, demande particulière..."
                value={form.notes || ''}
                onChange={handleChange}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Envoi...' : 'S\'inscrire au gala'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Inscription
