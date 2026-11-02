import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

import Layout from './components/Layout'

import Dashboard from './pages/Dashboard'
import Guests from './pages/Guests'
import Tickets from './pages/Tickets'
import AccessControl from './pages/AccessControl'
import Tables from './pages/Tables'
import Sponsors from './pages/Sponsors'
import Finances from './pages/Finances'
import Expenses from './pages/Expenses'
import Program from './pages/Program'
import Committee from './pages/Committee'
import Reports from './pages/Reports'
import Inscription from './pages/Inscription'
import Administration from './pages/Administration'
import QRCodes from './pages/QRCodes'

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: '#ffffff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚜️</div>
          <p style={{ color: '#a0a0a0' }}>Chargement de GALA MANAGER...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/guests" element={<Guests />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/access-control" element={<AccessControl />} />
          <Route path="/tables" element={<Tables />} />
          <Route path="/sponsors" element={<Sponsors />} />
          <Route path="/finances" element={<Finances />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/program" element={<Program />} />
          <Route path="/committee" element={<Committee />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/inscription" element={<Inscription />} />
          <Route path="/administration" element={<Administration />} />
          <Route path="/qrcodes" element={<QRCodes />} />
        </Routes>
      </Layout>
    </Router>
  )
}

function AuthPage() {
  const { login, logout } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('https://sozalihzdiatdoocxybs.supabase.co/rest/v1/auth/users', {
        method: 'POST',
        headers: {
          'apikey': 'eyJhbG...5LiA',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      })

      const data = await res.json()

      if (data.error) {
        setError(data.error.message || 'Erreur de connexion')
      } else {
        if (data.user) {
          login({
            id: data.user.id,
            email: data.user.email,
            first_name: data.user.user_metadata?.full_name || 'Invité',
            last_name: ''
          })
          alert('Connexion réussie !')
        }
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a0f 50%, #0a0a0a 100%)', fontFamily: 'Segoe UI, system-ui, -apple-system, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #d4af37, #b8941f)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem' }}>
          ⚜️
        </div>
        <div>
          <h1 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>GALA MANAGER</h1>
          <p style={{ color: '#a0a0a0', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Connexion au dîner-gala
          </p>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ color: '#b81a1a', background: 'rgba(184,26,26,0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(184,26,26,0.3)' }}>
                {error}
              </div>
            )}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#a0a0a0', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemple.com"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.95rem'
                }}
                required
                disabled={loading}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: '#a0a0a0', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.95rem'
                }}
                required
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #d4af37, #b8941f)',
                color: '#0a0a0a',
                border: 'none',
                padding: '12px 32px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
                width: '100%'
              }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
