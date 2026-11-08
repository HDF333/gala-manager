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
  const guests = within(nav).getByRole('link', { name: /Participants/ })
  const sponsors = within(nav).getByRole('link', { name: /Sponsors/ })
  expect(guests.classList.contains('active')).toBe(true)
  expect(guests.getAttribute('aria-current')).toBe('page')
  expect(sponsors.getAttribute('aria-current')).toBeNull()
  await userEvent.click(sponsors)
  expect(sponsors.classList.contains('active')).toBe(true)
  expect(sponsors.getAttribute('aria-current')).toBe('page')
  expect(guests.classList.contains('active')).toBe(false)
  expect(guests.getAttribute('aria-current')).toBeNull()
})

test('the Sponsors link opens the real sponsors page', async () => {
  render(<App />)
  const nav = screen.getByRole('navigation')
  const link = within(nav).getByRole('link', { name: /Sponsors/ })
  expect(link.getAttribute('href')).toBe('/sponsors')
  await userEvent.click(link)
  expect(window.location.pathname).toBe('/sponsors')
  expect(globalThis.fetch).not.toHaveBeenCalled()
})

test('the Participants link opens the real guests page', async () => {
  render(<App />)
  const nav = screen.getByRole('navigation')
  const link = within(nav).getByRole('link', { name: /Participants/ })
  expect(link.getAttribute('href')).toBe('/guests')
  await userEvent.click(link)
  expect(window.location.pathname).toBe('/guests')
  expect(screen.getByText('Liste des participants')).toBeTruthy()
  expect(globalThis.fetch).not.toHaveBeenCalled()
})
