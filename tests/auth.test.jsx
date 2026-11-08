import React from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'

// Isolated regression tests: no requests or mutations reach live Supabase.
const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('../src/lib/supabase', () => ({ supabase: { auth } }))
vi.mock('../src/hooks/useSupabase', () => ({
  useSupabase: () => ({ data: [], loading: false, error: null, refetch: vi.fn() }),
}))

const testUser = {
  id: 'test-user', email: 'test@example.com',
  user_metadata: { first_name: 'Test', last_name: 'Utilisateur' },
}

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  window.history.replaceState({}, '', '/')
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  auth.signOut.mockResolvedValue({ error: null })
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Live network forbidden in tests')))
})

test('login uses Supabase Auth and opens the dashboard', async () => {
  auth.signInWithPassword.mockResolvedValue({
    data: { user: testUser, session: { user: testUser } }, error: null,
  })
  render(<App />)
  const actor = userEvent.setup()
  await actor.type(await screen.findByPlaceholderText('email@exemple.com'), testUser.email)
  await actor.type(screen.getByPlaceholderText('Mot de passe'), 'test-only-password')
  await actor.click(screen.getByRole('button', { name: 'Se connecter' }))
  await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledWith({
    email: testUser.email, password: 'test-only-password',
  }))
  expect(await screen.findByText('Bienvenue, Test ! 👋')).toBeTruthy()
  expect(globalThis.fetch).not.toHaveBeenCalled()
})

test('explains invalid application credentials without opening the dashboard', async () => {
  auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: { code: 'invalid_credentials', message: 'Invalid login credentials' } })
  render(<App />)
  const actor = userEvent.setup()
  await actor.type(await screen.findByPlaceholderText('email@exemple.com'), testUser.email)
  await actor.type(screen.getByPlaceholderText('Mot de passe'), 'test-only-password')
  await actor.click(screen.getByRole('button', { name: 'Se connecter' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Email ou mot de passe incorrect. Utilisez un compte de l’application, pas celui du tableau de bord Supabase.')
  expect(screen.queryByText('Bienvenue, Test ! 👋')).toBeNull()
})

test('restores the Supabase session after a reload', async () => {
  auth.getSession.mockResolvedValue({ data: { session: { user: testUser } }, error: null })
  render(<App />)
  expect(await screen.findByText('Bienvenue, Test ! 👋')).toBeTruthy()
  expect(auth.onAuthStateChange).toHaveBeenCalled()
})

test('ignores a forged legacy localStorage user without a Supabase session', async () => {
  localStorage.setItem('gala_manager_user', JSON.stringify({ first_name: 'Fake', id: 'fake' }))
  render(<App />)
  expect(await screen.findByRole('button', { name: 'Se connecter' })).toBeTruthy()
  expect(screen.queryByText('Bienvenue, Fake ! 👋')).toBeNull()
})

test('logout revokes the local Supabase session and returns to login', async () => {
  auth.getSession.mockResolvedValue({ data: { session: { user: testUser } }, error: null })
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: /Déconnexion/ }))
  await waitFor(() => expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' }))
  expect(await screen.findByRole('button', { name: 'Se connecter' })).toBeTruthy()
})
