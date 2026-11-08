import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { setCurrentEvent } from '../lib/currentEvent'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (uid) => {
    try {
      const { data, error } = await supabase.from('profiles').select('user_id, full_name, role_id, event_id, active, roles(name, permissions)').eq('user_id', uid).single()
      if (error) { setProfile(null); return }
      const p = {
        fullName: data.full_name,
        roleId: data.role_id,
        eventId: data.event_id,
        active: data.active,
        role: data.roles?.name || null,
        permissions: data.roles?.permissions || []
      }
      setProfile(p)
      // Un vérificateur est verrouillé sur son événement attribué
      if (p.eventId && p.role !== 'Administrateur') {
        setCurrentEvent(p.eventId)
      }
    } catch {
      setProfile(null)
    }
  }

  useEffect(() => {
    let active = true
    let authEventReceived = false
    const applySession = (session) => {
      if (!active) return
      const authUser = session?.user
      setUser(authUser ? {
        ...authUser,
        first_name: authUser.user_metadata?.first_name || authUser.user_metadata?.full_name || 'Invité',
        last_name: authUser.user_metadata?.last_name || '',
      } : null)
      if (authUser) loadProfile(authUser.id)
      else setProfile(null)
      setLoading(false)
    }
    // Subscribe before reading the session so a newer event cannot be overwritten.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true
      applySession(session)
    })
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!authEventReceived) applySession(error ? null : data?.session)
      })
      .catch(() => {
        if (!authEventReceived) applySession(null)
      })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (!data?.user || !data?.session) throw new Error('Aucune session reçue du serveur')
    setUser({
      ...data.user,
      first_name: data.user.user_metadata?.first_name || data.user.user_metadata?.full_name || 'Invité',
      last_name: data.user.user_metadata?.last_name || '',
    })
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw error
    localStorage.removeItem('gala_manager_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
