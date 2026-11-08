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

// Action "Nouveau" propre à chaque page du menu
const QUICK_ACTIONS = {
  '/dashboard': { label: 'Nouvelle inscription', selector: 'form' },
  '/events': { label: 'Nouvel événement', selector: 'form' },
  '/guests': { label: 'Nouvel invité', selector: 'form' },
  '/tickets': { label: 'Nouveau billet', selector: 'form' },
  '/inscription': { label: 'Nouvelle inscription', selector: 'form' },
  '/administration': { label: 'Nouvelle catégorie', selector: 'form' },
  '/users': { label: 'Nouvel utilisateur', selector: '#create-user' },
  '/sponsors': { label: 'Nouveau sponsor', selector: 'form' },
  '/finances': { label: 'Nouvelle recette', selector: 'form' },
  '/expenses': { label: 'Nouvelle dépense', selector: 'form' },
  '/program': { label: 'Nouvel élément', selector: 'form' },
  '/committee': { label: 'Nouveau membre', selector: 'form' },
  '/qrcodes': { label: 'Générer un QR code', selector: 'select' },
}

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
  const location = useLocation()
  const { data: events = [] } = useSupabase('events')
  const activeEvent = events.find(e => e.id === getCurrentEvent())
  const visibleNav = navItems.filter(item => !item.perm || hasPerm(profile, item.perm))
  const quickAction = QUICK_ACTIONS[location.pathname]

  const handleQuickAction = () => {
    if (!quickAction) return
    setQuickOpen(false)
    const target = document.querySelector(quickAction.selector)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const field = target.querySelector('input, select, textarea') || target
      setTimeout(() => { try { field.focus({ preventScroll: true }) } catch { /* ignore */ } }, 350)
    }
  }
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

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
            {quickAction && (
              <button className="btn btn-gold btn-sm" onClick={handleQuickAction}>
                ➕ {quickAction.label}
              </button>
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

