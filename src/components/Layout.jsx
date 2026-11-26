import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../hooks/useSupabase'
import { hasPerm } from '../lib/permissions'
import { useI18n } from '../lib/i18n'
import { getCurrentEvent, setCurrentEvent } from '../lib/currentEvent'

const navItems = [
  { path: '/events', labelKey: 'nav.events', icon: '🎭', perm: 'gerer_evenements' },
  { path: '/scan', labelKey: 'nav.scan', icon: '📷', perm: 'scan_qr' },
  { path: '/users', labelKey: 'nav.users', icon: '👤', perm: 'gerer_utilisateurs' },
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: '📊' },
  { path: '/guests', labelKey: 'nav.guests', icon: '👥', perm: 'voir_invites' },
  { path: '/inscription', labelKey: 'nav.inscription', icon: '📝', perm: 'gerer_participants' },
  { path: '/administration', labelKey: 'nav.administration', icon: '🛡️', perm: 'gerer_evenements' },
  { path: '/access-control', labelKey: 'nav.access', icon: '🎟️', perm: 'scan_qr' },
  { path: '/animations', labelKey: 'nav.animation', icon: '🎤', perm: 'animer_evenement' },
  { path: '/sms', labelKey: 'nav.sms', icon: '💬', perm: 'gerer_sms' },
  { path: '/tables', labelKey: 'nav.tables', icon: '🍽️' },
  { path: '/sponsors', labelKey: 'nav.sponsors', icon: '🤝', perm: 'gerer_finances' },
  { path: '/finances', labelKey: 'nav.finances', icon: '💰', perm: 'gerer_finances' },
  { path: '/budget', labelKey: 'nav.budget', icon: '💼', perm: 'gerer_finances' },
  { path: '/expenses', labelKey: 'nav.expenses', icon: '💸', perm: 'gerer_finances' },
  { path: '/program', labelKey: 'nav.program', icon: '📅', perm: 'gerer_evenements' },
  { path: '/committee', labelKey: 'nav.committee', icon: '👥', perm: 'gerer_evenements' },
  { path: '/qrcodes', labelKey: 'nav.qrcodes', icon: '📱', perm: 'gerer_evenements' },
]

// Action "Nouveau" propre à chaque page du menu
const QUICK_ACTIONS = {
  '/dashboard': { labelKey: 'quick.newRegistration', selector: 'form' },
  '/events': { labelKey: 'quick.newEvent', selector: 'form' },
  '/guests': { labelKey: 'quick.registerGuest', to: '/inscription' },
  '/inscription': { labelKey: 'quick.newRegistration', selector: 'form' },
  '/administration': { labelKey: 'quick.newCategory', selector: 'form' },
  '/users': { labelKey: 'quick.newUser', selector: '#create-user' },
  '/sponsors': { labelKey: 'quick.newSponsor', selector: 'form' },
  '/finances': { labelKey: 'quick.newIncome', selector: 'form' },
  '/expenses': { labelKey: 'quick.newExpense', selector: 'form' },
  '/program': { labelKey: 'quick.newItem', selector: 'form' },
  '/committee': { labelKey: 'quick.newMember', selector: 'form' },
  '/qrcodes': { labelKey: 'quick.generateQr', selector: 'select' },
  '/animations': { labelKey: 'quick.newAnimation', selector: 'form' },
}

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const { user, logout, profile } = useAuth()
  const { t, lang, setLang } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: events = [] } = useSupabase('events')
  const activeEvent = events.find(e => e.id === getCurrentEvent())
  const visibleNav = navItems.filter(item => !item.perm || hasPerm(profile, item.perm))
  const quickAction = QUICK_ACTIONS[location.pathname]

  const handleQuickAction = () => {
    if (!quickAction) return
    setQuickOpen(false)
    if (quickAction.to) { navigate(quickAction.to); return }
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
                <span>{t(item.labelKey)}</span>
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
            {loggingOut ? t('common.loggingOut') : '✕ ' + t('common.logout')}
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
                ➕ {t(quickAction.labelKey)}
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,255,255,0.08)', borderRadius: 999, padding: '0.15rem' }}>
              {['fr', 'en'].map(code => (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  title={code === 'fr' ? 'Français' : 'English'}
                  style={{
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: 999,
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    background: lang === code ? '#d4af37' : 'transparent',
                    color: lang === code ? '#011A43' : '#B9C7E6'
                  }}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
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

