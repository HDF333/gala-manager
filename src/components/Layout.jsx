import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { path: '/dashboard', label: 'Tableau de bord', icon: '📊' },
  { path: '/inscription', label: 'Inscription', icon: '📝' },
  { path: '/administration', label: 'Administration', icon: '🛡️' },
  { path: '/access-control', label: 'Contrôle d\'accès', icon: '🎟️' },
  { path: '/tables', label: 'Tables', icon: '🍽️' },
  { path: '/sponsors', label: 'Sponsors', icon: '🤝' },
  { path: '/finances', label: 'Recettes', icon: '💰' },
  { path: '/expenses', label: 'Dépenses', icon: '💸' },
  { path: '/program', label: 'Programme', icon: '📅' },
  { path: '/committee', label: 'Comité', icon: '👥' },
  { path: '/reports', label: 'Rapports', icon: '📊' },
  { path: '/qrcodes', label: 'QR Codes', icon: '📱' },
]

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const location = useLocation()

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚜️</div>
          <span className="sidebar-logo-text">GALA MANAGER</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path} className="sidebar-nav-item">
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}

        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-footer-user">
            <div className="sidebar-footer-user-avatar">{user?.first_name?.charAt(0) || 'G'}</div>
            <div>
              <div className="sidebar-footer-user-name">{user?.first_name} {user?.last_name}</div>
              <div className="sidebar-footer-user-role">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={() => {}}
            className="sidebar-footer-link"
          >
            ✕ Déconnexion
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <div className="header-left">
            <button className="header-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
            <h1 className="header-title">GALA MANAGER</h1>
          </div>
          <div className="header-right">
            <button className="btn btn-gold btn-sm">Nouveau</button>
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

