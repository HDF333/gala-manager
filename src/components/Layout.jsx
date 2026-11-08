import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../hooks/useSupabase'
import { getCurrentEvent, setCurrentEvent } from '../lib/currentEvent'

const navItems = [
  { path: '/events', label: 'Événements', icon: '🎭', perm: 'gerer_evenements' },
  { path: '/scan', label: 'Scanner', icon: '📷', perm: 'scan_qr' },
  { path: '/users', label: 'Utilisateurs', icon: '👤', perm: 'gerer_utilisateurs' },
  { path: '/dashboard', label: 'Tableau de bord', icon: '📊' },
  { path: '/guests', label: 'Invités', icon: '👥', perm: 'voir_invites' },
  { path: '/tickets', label: 'Billets', icon: '🎫', perm: 'voir_billets' },
  { path: '/inscription', label: 'Inscription', icon: '📝' },
  { path: '/administration', label: 'Administration', icon: '🛡️', perm: 'gerer_evenements' },
  { path: '/access-control', label: 'Contrôle d\'accès', icon: '🎟️', perm: 'scan_qr' },
  { path: '/tables', label: 'Tables', icon: '🍽️' },
  { path: '/sponsors', label: 'Sponsors', icon: '🤝', perm: 'gerer_finances' },
  { path: '/finances', label: 'Recettes', icon: '💰', perm: 'gerer_finances' },
  { path: '/expenses', label: 'Dépenses', icon: '💸', perm: 'gerer_finances' },
  { path: '/program', label: 'Programme', icon: '📅', perm: 'gerer_evenements' },
  { path: '/committee', label: 'Comité', icon: '👥', perm: 'gerer_evenements' },
  { path: '/reports', label: 'Rapports', icon: '📊', perm: 'gerer_finances' },
  { path: '/qrcodes', label: 'QR Codes', icon: '📱', perm: 'gerer_evenements' },
]

const hasPerm = (profile, key) => {
  if (!profile) return false
  if (profile.role === 'Administrateur') return true
  const perms = profile.permissions || []
  return perms.includes('*') || (key ? perms.includes(key) : true)
}

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const { user, logout, profile } = useAuth()
  const { data: events = [] } = useSupabase('events')
  const activeEvent = events.find(e => e.id === getCurrentEvent())
  const visibleNav = navItems.filter(item => !item.perm || hasPerm(profile, item.perm))
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const location = useLocation()

  // Par défaut, utiliser le premier événement si aucun n'est sélectionné
  useEffect(() => {
    if (events.length > 0 && !getCurrentEvent()) {
      setCurrentEvent(events[0].id)
    }
  }, [events])

  // Personnalisation automatique : appliquer la couleur de thème de l'événement actif
  useEffect(() => {
    const theme = activeEvent?.theme_color || '#d4af37'
    document.documentElement.style.setProperty('--accent', theme)
    document.documentElement.style.setProperty('--accent-soft', theme + '22')
    return () => {
      document.documentElement.style.setProperty('--accent', '#d4af37')
      document.documentElement.style.setProperty('--accent-soft', '#FFF3CD')
    }
  }, [activeEvent?.id, activeEvent?.theme_color])

  const handleLogout = async () => {
    setLoggingOut(true)
    setLogoutError('')
    try {
      await logout()
    } catch (err) {
      setLogoutError(err.message || 'Déconnexion impossible. Réessayez.')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="app">
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/logo.jpg" alt="EVEN MANAGER" className="sidebar-logo-icon" style={{ objectFit: 'cover', padding: 0 }} />
          <span className="sidebar-logo-text">EVEN MANAGER</span>
        </div>
        <nav className="sidebar-nav">
          {visibleNav.map((item) => {
            const active = location.pathname === item.path ||
              (item.path === '/dashboard' && location.pathname === '/')
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-nav-item${active ? ' active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}

        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-footer-user">
            <div className="sidebar-footer-user-avatar">{user?.first_name?.charAt(0) || 'G'}</div>
            <div>
              <div className="sidebar-footer-user-name">{user?.first_name} {user?.last_name}</div>
              <div className="sidebar-footer-user-role">{user?.email}</div>
            </div>
          </div>
          {logoutError && <p role="alert">{logoutError}</p>}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="sidebar-footer-link"
          >
            {loggingOut ? 'Déconnexion...' : '✕ Déconnexion'}
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <div className="header-left">
            <button className="header-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
            <h1 className="header-title">{activeEvent ? activeEvent.name : 'EVEN MANAGER'}</h1>
          </div>
          <div className="header-right" style={{ position: 'relative' }}>
            <button className="btn btn-gold btn-sm" onClick={() => setQuickOpen(!quickOpen)}>
              ➕ Nouveau
            </button>
            {quickOpen && (
              <div style={{ position: 'absolute', right: 0, top: '42px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '0.5rem', zIndex: 300, minWidth: '220px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <Link to="/events" onClick={() => setQuickOpen(false)} style={{ display: 'block', padding: '0.5rem 0.75rem', color: '#ffffff', borderRadius: '6px', fontSize: '0.9rem' }}>🎭 Nouvel événement</Link>
                <Link to="/guests" onClick={() => setQuickOpen(false)} style={{ display: 'block', padding: '0.5rem 0.75rem', color: '#ffffff', borderRadius: '6px', fontSize: '0.9rem' }}>👥 Nouvel invité</Link>
                <Link to="/tickets" onClick={() => setQuickOpen(false)} style={{ display: 'block', padding: '0.5rem 0.75rem', color: '#ffffff', borderRadius: '6px', fontSize: '0.9rem' }}>🎫 Nouveau billet</Link>
                <Link to="/inscription" onClick={() => setQuickOpen(false)} style={{ display: 'block', padding: '0.5rem 0.75rem', color: '#ffffff', borderRadius: '6px', fontSize: '0.9rem' }}>📝 Nouvelle inscription</Link>
                <Link to="/expenses" onClick={() => setQuickOpen(false)} style={{ display: 'block', padding: '0.5rem 0.75rem', color: '#ffffff', borderRadius: '6px', fontSize: '0.9rem' }}>💸 Nouvelle dépense</Link>
                <Link to="/finances" onClick={() => setQuickOpen(false)} style={{ display: 'block', padding: '0.5rem 0.75rem', color: '#ffffff', borderRadius: '6px', fontSize: '0.9rem' }}>💰 Nouvelle recette</Link>
              </div>
            )}
          </div>
        </header>
        <div className="content">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout

