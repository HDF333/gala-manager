import React from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'

// Navigation is exercised with real pages and isolated authentication/data.
vi.mock('../src/contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: { id: 'test-user', first_name: 'Test' },
    profile: { role: 'Administrateur', permissions: ['*'], eventId: null, active: true },
    loading: false,
    logout: vi.fn(),
  }),
}))
vi.mock('../src/hooks/useSupabase', () => ({
  useSupabase: () => ({ data: [], loading: false, error: null, refetch: vi.fn() }),
}))

beforeEach(() => {
  window.history.replaceState({}, '', '/dashboard')
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Live network forbidden in tests')))
})

test('the current page is marked when opened directly and after navigation', async () => {
  window.history.replaceState({}, '', '/guests')
  render(<App />)
  const nav = screen.getByRole('navigation')
  const guests = within(nav).getByRole('link', { name: /Invités/ })
  const tickets = within(nav).getByRole('link', { name: /Billets/ })
  expect(guests.classList.contains('active')).toBe(true)
  expect(guests.getAttribute('aria-current')).toBe('page')
  expect(tickets.getAttribute('aria-current')).toBeNull()
  await userEvent.click(tickets)
  expect(tickets.classList.contains('active')).toBe(true)
  expect(tickets.getAttribute('aria-current')).toBe('page')
  expect(guests.classList.contains('active')).toBe(false)
  expect(guests.getAttribute('aria-current')).toBeNull()
})

test('the Billets link opens the real tickets page', async () => {
  render(<App />)
  const nav = screen.getByRole('navigation')
  const link = within(nav).getByRole('link', { name: /Billets/ })
  expect(link.getAttribute('href')).toBe('/tickets')
  await userEvent.click(link)
  expect(window.location.pathname).toBe('/tickets')
  expect(screen.getByText('Billets disponibles')).toBeTruthy()
  expect(globalThis.fetch).not.toHaveBeenCalled()
})

test('the Invités link opens the real guests page', async () => {
  render(<App />)
  const nav = screen.getByRole('navigation')
  const link = within(nav).getByRole('link', { name: /Invités/ })
  expect(link.getAttribute('href')).toBe('/guests')
  await userEvent.click(link)
  expect(window.location.pathname).toBe('/guests')
  expect(screen.getByText('Liste des invités')).toBeTruthy()
  expect(globalThis.fetch).not.toHaveBeenCalled()
})
