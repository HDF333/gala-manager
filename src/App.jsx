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
import Inscription from './pages/Inscription'
import Administration from './pages/Administration'
import QRCodes from './pages/QRCodes'
import Events from './pages/Events'
import Scan from './pages/Scan'
import Users from './pages/Users'
import { setCurrentEvent } from './lib/currentEvent'

function AppContent() {
  const { user, loading } = useAuth()

  // Public registration page accessible without login via shareable link
  if (typeof window !== 'undefined' && window.location.pathname === '/inscription-publique') {
    const evParam = new URLSearchParams(window.location.search).get('event')
    if (evParam) setCurrentEvent(Number(evParam))
    return (
      <Router>
        <Routes>
          <Route path="/inscription-publique" element={<Inscription />} />
        </Routes>
      </Router>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#010B26', color: '#ffffff' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/logo.jpg" alt="EVEN MANAGER" style={{ width: '96px', height: '96px', borderRadius: '16px', marginBottom: '1rem' }} />
          <p style={{ color: '#a0a0a0' }}>Chargement de EVEN MANAGER...</p>
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
          <Route path="/inscription" element={<Inscription />} />
          <Route path="/administration" element={<Administration />} />
          <Route path="/qrcodes" element={<QRCodes />} />
          <Route path="/events" element={<Events />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/users" element={<Users />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </Router>
  )
}

function AuthPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login({ email: email.trim(), password })
    } catch (err) {
      setError(err.code === 'invalid_credentials'
        ? 'Email ou mot de passe incorrect. Utilisez un compte de l’application, pas celui du tableau de bord Supabase.'
        : err.message || 'Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, #010B26 0%, #011A43 55%, #010B26 100%)', fontFamily: 'Segoe UI, system-ui, -apple-system, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
        <img src="/logo.jpg" alt="EVEN MANAGER" style={{ width: '96px', height: '96px', borderRadius: '20px', margin: '0 auto 1.5rem', display: 'block', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }} />
        <div>
          <h1 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>EVEN MANAGER</h1>
          <p style={{ color: '#a0a0a0', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Connexion au dîner-gala
          </p>
          <form onSubmit={handleSubmit}>
            {error && (
              <div role="alert" style={{ color: '#b81a1a', background: 'rgba(184,26,26,0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(184,26,26,0.3)' }}>
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
                  background: '#ffffff',
                  border: '1px solid #E3E9F7',
                  borderRadius: '8px',
                  color: '#16223F',
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
                  background: '#ffffff',
                  border: '1px solid #E3E9F7',
                  borderRadius: '8px',
                  color: '#16223F',
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

function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
      <div style={{ fontSize: '3rem' }}>🚫</div>
      <h2 style={{ color: '#ffffff', margin: 0 }}>Page introuvable</h2>
      <p style={{ color: '#a0a0a0', margin: 0 }}>Cette page n'existe pas dans GALA MANAGER.</p>
      <a href="/dashboard" className="btn btn-gold">Retour au tableau de bord</a>
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
