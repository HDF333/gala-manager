import React from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Administration from '../src/pages/Administration'

const fake = vi.hoisted(() => ({ update: vi.fn(), remove: vi.fn(), refetchGuests: vi.fn(), refetchTickets: vi.fn(), refetchQRs: vi.fn() }))
vi.mock('../src/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'test' } }) }))
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ error: null }),
    from: () => ({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  },
}))
vi.mock('../src/hooks/useSupabase', () => ({
  useSupabase: table => ({
    guests: { data: [{ id: 11, first_name: 'Awa', last_name: 'Test', status: 'pending' }], update: fake.update, refetch: fake.refetchGuests },
    tickets: { data: [], refetch: fake.refetchTickets },
    categories: { data: [], insert: fake.update, update: fake.update, del: fake.remove, refetch: fake.refetchGuests },
    qrcodes: { data: [{ id: 42, ticket_id: 2, code: 'qr-42', status: 'confirmed' }], del: fake.remove, refetch: fake.refetchQRs },
    tables_placement: { data: [] },
  })[table] || { data: [], refetch: vi.fn() },
}))

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('No live requests permitted')))
  vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
  fake.update.mockResolvedValue({ id: 11 })
  fake.remove.mockResolvedValue(undefined)
})

test('confirms the guest via authenticated Supabase client', async () => {
  render(<Administration />)
  fireEvent.click(screen.getByRole('button', { name: /Valider/ }))
  await waitFor(() => expect(fake.update).toHaveBeenCalledWith(11, expect.objectContaining({ status: 'confirmed', confirmation_date: expect.any(String) })))
  expect(await screen.findByText('Inscription validée avec succès ! Billet activé.')).toBeTruthy()
  expect(globalThis.fetch).not.toHaveBeenCalled()
})

test('rejection failures are visible and never reported as successful', async () => {
  fake.update.mockRejectedValue(new Error('Action interdite'))
  render(<Administration />)
  fireEvent.click(screen.getByRole('button', { name: /Rejeter/ }))
  await waitFor(() => expect(fake.update).toHaveBeenCalledWith(11, expect.objectContaining({ status: 'rejected' })))
  expect(await screen.findByText(/Action interdite/)).toBeTruthy()
})

test('deletes a QR after confirmation via Supabase, not localhost', async () => {
  render(<Administration />)
  fireEvent.click(screen.getByRole('button', { name: /Supprimer/ }))
  await waitFor(() => expect(fake.remove).toHaveBeenCalledWith(42))
  expect(await screen.findByText('QR Code supprimé avec succès')).toBeTruthy()
  expect(globalThis.fetch).not.toHaveBeenCalled()
})
