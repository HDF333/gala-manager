import React from 'react'
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
        </Routes>
      </Layout>
    </Router>
  )
}

function AuthPage() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a0f 50%, #0a0a0a 100%)', fontFamily: 'Segoe UI, system-ui, -apple-system, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #d4af37, #b8941f)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem' }}>
          ⚜️
        </div>
        <div>
          <h1 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>GALA MANAGER</h1>
          <p style={{ color: '#a0a0a0', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Gestion intégrale de votre dîner-gala
          </p>
          <button
            onClick={() => alert('Page de connexion (à implémenter)')}
            style={{
              background: 'linear-gradient(135deg, #d4af37, #b8941f)',
              color: '#0a0a0a',
              border: 'none',
              padding: '12px 32px',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)'
            }}
          >
            Se connecter
          </button>
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
