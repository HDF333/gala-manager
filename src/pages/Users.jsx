import React, { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase'
import { useSupabase } from '../hooks/useSupabase'
import { useAuth } from '../contexts/AuthContext'

const PERMISSIONS = [
  { key: 'scan_qr', short: 'Scan QR', label: 'Autoriser le scan des QR codes', desc: 'Contrôler l’entrée des invités en scannant leur billet QR.' },
  { key: 'voir_invites', short: 'Invités', label: 'Autoriser la consultation des invités', desc: 'Voir la liste des invités, leur tribu et leur table.' },
  { key: 'voir_billets', short: 'Billets', label: 'Autoriser la consultation des billets', desc: 'Voir les billets vendus, leur catégorie et leur statut.' },
  { key: 'gerer_evenements', short: 'Événements', label: 'Autoriser la gestion des événements', desc: 'Créer, modifier, activer et supprimer des événements.' },
  { key: 'gerer_categories', short: 'Catégories', label: 'Autoriser la gestion des catégories', desc: 'Ajouter ou modifier les catégories et fixer leurs prix.' },
  { key: 'gerer_finances', short: 'Finances', label: 'Autoriser la gestion des recettes et dépenses', desc: 'Enregistrer recettes, dépenses et budgets de l’événement.' },
  { key: 'gerer_utilisateurs', short: 'Utilisateurs', label: 'Autoriser la gestion des utilisateurs', desc: 'Créer des comptes et attribuer rôles, permissions et événements.' },
]

export default function Users() {
  const { profile } = useAuth()
  const { data: roles = [], insert: addRole, update: updateRole, del: deleteRole } = useSupabase('roles')
  const { data: profiles = [], insert: addProfile, update: updateProfile, del: deleteProfile, refetch: refetchProfiles } = useSupabase('profiles', 'user_id')
  const { data: events = [] } = useSupabase('events')
  const [roleForm, setRoleForm] = useState({ name: '', permissions: [] })
  const [editingRole, setEditingRole] = useState(null)
  const [userForm, setUserForm] = useState({ email: '', password: '', full_name: '', role_id: '', event_id: '' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const isAdmin = profile?.role === 'Administrateur'

  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-title">Utilisateurs & Rôles</div>
        <div className="alert alert-danger">Accès réservé à l'administrateur.</div>
      </div>
    )
  }

  const togglePerm = (key) => {
    setRoleForm(f => ({
      ...f,
      permissions: f.permissions.includes(key) ? f.permissions.filter(p => p !== key) : [...f.permissions, key]
    }))
  }

  const saveRole = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      if (editingRole) {
        await updateRole(editingRole, { name: roleForm.name, permissions: roleForm.permissions })
        setMessage('Type de compte modifié')
      } else {
        await addRole({ name: roleForm.name, permissions: roleForm.permissions })
        setMessage('Type de compte créé')
      }
      setEditingRole(null)
      setRoleForm({ name: '', permissions: [] })
    } catch (err) {
      setMessage('Erreur : ' + (err.message || 'Opération impossible'))
    }
  }

  const removeRole = async (id) => {
    if (confirm('Supprimer ce type de compte ?')) {
      try { await deleteRole(id); setMessage('Type supprimé') } catch (err) { setMessage('Erreur : ' + err.message) }
    }
  }

  const createUser = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      // 1. Créer le compte via un client isolé (ne remplace pas la session de l'admin)
      const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, storageKey: 'even-manager-signup' }
      })
      const { data: signUp, error: signUpError } = await tempClient.auth.signUp({
        email: userForm.email,
        password: userForm.password,
        options: { data: { full_name: userForm.full_name } }
      })
      if (signUpError) throw signUpError
      // 2. Confirmer l'email via RPC (admin)
      const { error: confirmError } = await supabase.rpc('confirm_user_email', { p_email: userForm.email })
      if (confirmError) throw confirmError
      // 3. Créer le profil (rôle + événement attribué)
      await addProfile({
        user_id: signUp.user.id,
        full_name: userForm.full_name,
        role_id: Number(userForm.role_id),
        event_id: userForm.event_id ? Number(userForm.event_id) : null,
        active: true
      })
      setUserForm({ email: '', password: '', full_name: '', role_id: '', event_id: '' })
      setMessage('Utilisateur créé : il peut se connecter avec son email et mot de passe.')
      refetchProfiles()
    } catch (err) {
      const msg = err.message || 'Création impossible'
      setMessage('Erreur : ' + (/rate limit/i.test(msg)
        ? 'Limite d\'envoi d\'emails Supabase atteinte (quelques comptes par heure). Réessayez plus tard ou créez l\'utilisateur depuis le tableau de bord Supabase.'
        : msg))
    } finally {
      setBusy(false)
    }
  }

  const updateUser = async (userId, patch) => {
    try {
      await updateProfile(userId, patch)
      setMessage('Utilisateur mis à jour')
      refetchProfiles()
    } catch (err) {
      setMessage('Erreur : ' + err.message)
    }
  }

  const roleName = (roleId) => roles.find(r => r.id === roleId)?.name || '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Utilisateurs & Types de compte</div>
      <div className="page-subtitle">Créez des types de compte, attribuez des permissions, puis créez les utilisateurs avec leur rôle et leur événement.</div>

      {message && (
        <div style={{ padding: '1rem', borderRadius: '8px', background: message.includes('Erreur') ? 'rgba(184,26,26,0.1)' : 'rgba(26,122,58,0.1)', color: message.includes('Erreur') ? '#b81a1a' : '#1a7a3a' }}>
          {message}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{editingRole ? 'Modifier le type de compte' : 'Créer un type de compte'}</h2>
        </div>
        <div className="card-body">
          <form onSubmit={saveRole}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ marginBottom: 0, minWidth: '220px' }}>
                <label>Nom du type *</label>
                <input className="form-input" placeholder="Ex : Vérificateur, Comptable..." value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} required />
              </div>
              <button type="submit" className="btn btn-primary">{editingRole ? 'Mettre à jour' : 'Créer le type'}</button>
              {editingRole && <button type="button" className="btn btn-secondary" onClick={() => { setEditingRole(null); setRoleForm({ name: '', permissions: [] }) }}>Annuler</button>}
            </div>
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', color: 'var(--text-soft)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Cochez ce que ce type de compte est autorisé à faire :</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
                {PERMISSIONS.map(p => (
                  <label key={p.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', color: 'var(--text)', fontSize: '0.9rem', cursor: 'pointer', padding: '0.55rem 0.7rem', border: '1px solid var(--border)', borderRadius: '8px', background: roleForm.permissions.includes(p.key) ? 'var(--accent-soft)' : '#fff' }}>
                    <input type="checkbox" checked={roleForm.permissions.includes(p.key)} onChange={() => togglePerm(p.key)} style={{ marginTop: '0.2rem' }} />
                    <span>
                      <strong style={{ display: 'block', color: 'var(--navy)', fontWeight: 600 }}>{p.label}</strong>
                      <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.15rem' }}>{p.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Types de compte existants</h2>
        </div>
        <div className="card-body">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.75rem' }}>Nom</th>
                <th style={{ padding: '0.75rem' }}>Permissions</th>
                <th style={{ padding: '0.75rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '600' }}>{r.name}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {(r.permissions || []).includes('*')
                        ? <span className="badge badge-gold">Tous les droits</span>
                        : (r.permissions || []).length === 0
                          ? <span className="badge badge-muted">Aucun droit</span>
                          : (r.permissions || []).map(pk => (
                              <span key={pk} className="badge badge-info">{PERMISSIONS.find(x => x.key === pk)?.short || pk}</span>
                            ))}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button className="btn btn-secondary btn-sm" style={{ marginRight: '0.5rem' }} onClick={() => { setEditingRole(r.id); setRoleForm({ name: r.name, permissions: r.permissions || [] }) }}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => removeRole(r.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Créer un utilisateur</h2>
        </div>
        <div className="card-body">
          <form onSubmit={createUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Nom complet *</label>
              <input className="form-input" value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Email *</label>
              <input className="form-input" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Mot de passe *</label>
              <input className="form-input" type="text" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Type de compte *</label>
              <select className="form-select" value={userForm.role_id} onChange={(e) => setUserForm({ ...userForm, role_id: e.target.value })} required>
                <option value="">Choisir...</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Événement attribué</label>
              <select className="form-select" value={userForm.event_id} onChange={(e) => setUserForm({ ...userForm, event_id: e.target.value })}>
                <option value="">Tous (admin)</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Création...' : 'Créer l’utilisateur'}</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Utilisateurs</h2>
        </div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#141414', color: '#a0a0a0', fontWeight: '600' }}>
                <th style={{ padding: '0.75rem' }}>Nom</th>
                <th style={{ padding: '0.75rem' }}>Type</th>
                <th style={{ padding: '0.75rem' }}>Événement</th>
                <th style={{ padding: '0.75rem' }}>Statut</th>
                <th style={{ padding: '0.75rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(u => (
                <tr key={u.user_id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '600' }}>{u.full_name || '—'}</td>
                  <td style={{ padding: '0.75rem' }}>{roleName(u.role_id)}</td>
                  <td style={{ padding: '0.75rem' }}>{u.event_id ? events.find(ev => ev.id === u.event_id)?.name || 'Événement ' + u.event_id : 'Tous'}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge ${u.active ? 'badge-success' : 'badge-danger'}`}>{u.active ? 'Actif' : 'Désactivé'}</span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button className="btn btn-secondary btn-sm" style={{ marginRight: '0.5rem' }} onClick={() => updateUser(u.user_id, { active: !u.active })}>
                      {u.active ? 'Désactiver' : 'Activer'}
                    </button>
                    <button className="btn btn-secondary btn-sm" style={{ marginRight: '0.5rem' }} onClick={() => {
                      const roleId = prompt('ID du type de compte ? ' + roles.map(r => r.id + '=' + r.name).join(', '))
                      const eventId = prompt('ID événement (vide = tous) ? ' + events.map(ev => ev.id + '=' + ev.name).join(', '))
                      updateUser(u.user_id, { role_id: Number(roleId), event_id: eventId ? Number(eventId) : null })
                    }}>Rôle</button>
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
