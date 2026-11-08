import React, { useState } from 'react'
import QRCode from 'qrcode'
import { buildQRCard } from '../utils/qrcard'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../hooks/useSupabase'
import { supabase } from '../lib/supabase'
import { getCurrentEvent } from '../lib/currentEvent'

export default function Inscription() {
  const { user } = useAuth()
  const { data: categories = [], error } = useSupabase('categories')
  const { data: guests = [], insert: insertGuest } = useSupabase('guests')
  const { data: tables = [] } = useSupabase('tables_placement')
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
  const [linkCopied, setLinkCopied] = useState(false)
  const [qrResult, setQrResult] = useState(null)

  const eventId = getCurrentEvent()
  const publicLink = typeof window !== 'undefined'
    ? window.location.origin + '/inscription-publique?event=' + (eventId || '')
    : '/inscription-publique?event=' + (eventId || '')

  const copyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
    } catch {
      setMessage('Lien : ' + publicLink)
    }
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const selectedCategory = categories.find(c => c.id === Number(form.category_id))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')

    try {
      if (!selectedCategory) {
        throw new Error('Veuillez sélectionner une catégorie')
      }
      if (!eventId) {
        throw new Error('Aucun événement actif. Choisissez un événement dans le menu Événements.')
      }
      const evRow = (await supabase.from('events').select('name, date, venue').eq('id', eventId).single()).data
      const eventName = evRow?.name || 'Événement'
      const eventDate = evRow?.date || null
      const eventVenue = evRow?.venue || ''
      // QR unique et personnalisé avec toutes les informations
      const qrPayload = JSON.stringify({
        code: '',
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        tribu: form.company,
        category: selectedCategory.name,
        people_count: selectedCategory.seats,
        event_name: eventName
      })
      const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 480, margin: 1, errorCorrectionLevel: 'M' })
      const imageUrl = qrDataUrl
      const { data: reg, error: rpcError } = await supabase.rpc('register_guest', {
        p_payload: {
          event_id: eventId,
          category_id: selectedCategory.id,
          people_count: selectedCategory.seats,
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          notes: form.notes,
          image_url: imageUrl
        }
      })
      if (rpcError) throw rpcError
      if (!reg || !reg.ok) throw new Error(reg?.message || 'Inscription impossible')

      // Carte QR personnalisée : nom de l'événement en haut, date/lieu + table en bas
      const cardImage = await buildQRCard({
        eventName,
        eventDate,
        eventVenue,
        guestName: (form.first_name + ' ' + form.last_name).trim(),
        category: reg.category,
        tableNumber: reg.table_number,
        qrDataUrl
      }).catch(() => qrDataUrl)
      if (cardImage && cardImage !== qrDataUrl) {
        await supabase.rpc('set_qr_image', { p_ticket_code: reg.ticket_code, p_image: cardImage })
      }

      setQrResult({
        imageUrl: cardImage,
        ticketCode: reg.ticket_code,
        tableNumber: reg.table_number,
        category: reg.category
      })
      setMessage('Inscription envoyée avec succès ! Billet ' + selectedCategory.name + ' créé (' + Number(selectedCategory.price).toLocaleString('fr-FR') + ' FCFA). Table attribuée : ' + selectedCategory.name + ' n°' + String(reg.table_number).padStart(3, '0') + '.')
      setForm({ first_name: '', last_name: '', email: '', phone: '', company: '', category_id: '', notes: '' })
    } catch (err) {
      setMessage('Erreur : ' + (err.message || 'Erreur de connexion au serveur'))
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
        <button type="button" className="btn btn-secondary btn-sm" onClick={copyPublicLink} style={{ marginTop: '0.5rem' }}>
          🔗 {linkCopied ? 'Lien copié !' : 'Copier le lien d\'inscription publique'}
        </button>
        {qrResult && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(26,122,58,0.1)', border: '1px solid rgba(26,122,58,0.3)', borderRadius: '12px', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <img src={qrResult.imageUrl} alt="Votre QR Code" style={{ width: '140px', height: '140px', borderRadius: '8px', background: '#fff' }} />
            <div>
              <strong style={{ color: '#1a7a3a' }}>🎫 Votre QR Code personnel</strong>
              <p style={{ color: '#a0a0a0', fontSize: '0.85rem', margin: '0.35rem 0' }}>
                Billet : {qrResult.ticketCode}<br/>
                Table : {qrResult.category} n°{String(qrResult.tableNumber).padStart(3, '0')}<br/>
                Conservez-le : il sera scanné à l'entrée.
              </p>
              <a className="btn btn-gold btn-sm" href={qrResult.imageUrl} download={'QR-' + qrResult.ticketCode + '.png'}>⬇️ Télécharger mon QR Code</a>
            </div>
          </div>
        )}
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
                <label>Tribu</label>
                <input
                  name="company"
                  type="text"
                  className="form-input"
                  placeholder="Nom de la tribu"
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
                  {categories.filter(c => !c.admin_only).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} — {Number(cat.price).toLocaleString('fr-FR')} FCFA{cat.seats > 1 ? ' (2 personnes)' : ''}
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
