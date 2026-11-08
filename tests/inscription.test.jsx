import React from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Inscription from '../src/pages/Inscription'
import { supabase } from '../src/lib/supabase'

const fake = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,test') },
}))
vi.mock('../src/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'test' }, profile: { role: 'Administrateur', permissions: ['*'] } }) }))
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    rpc: fake.rpc,
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { name: 'Événement' }, error: null }) }) }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}))
vi.mock('../src/hooks/useSupabase', () => ({
  useSupabase: table => table === 'categories'
    ? { data: [{ id: 7, name: 'VIP', price: 500000, seats: 1, admin_only: false }], error: null }
    : { data: [], insert: vi.fn(), refetch: vi.fn() },
}))

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.setItem('even_manager_current_event', '1')
  fake.rpc.mockResolvedValue({
    data: { ok: true, image_url: 'data:image/png;base64,test', ticket_code: 'EVEN-1', table_number: 1, category: 'VIP' },
    error: null,
  })
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('No live requests permitted in this test')))
})

async function fillAndSubmit() {
  fireEvent.change(screen.getByPlaceholderText('Jean'), { target: { value: 'Awa' } })
  fireEvent.change(screen.getByPlaceholderText('Dupont'), { target: { value: 'Test' } })
  fireEvent.change(screen.getByPlaceholderText('jean@exemple.com'), { target: { value: 'awa@example.test' } })
  fireEvent.change(document.querySelector('select[name="category_id"]'), { target: { value: '7' } })
  fireEvent.change(screen.getByPlaceholderText('Événement spécial, allergie, demande particulière...'), { target: { value: 'Allergie' } })
  fireEvent.submit(screen.getByRole('button', { name: "S'inscrire au gala" }).closest('form'))
}

test('submits a pending registration with table and shows the personal QR code', async () => {
  render(<Inscription />)
  await fillAndSubmit()
  await waitFor(() => expect(fake.rpc).toHaveBeenCalledWith('register_guest', expect.objectContaining({
    p_payload: expect.objectContaining({ first_name: 'Awa', last_name: 'Test', category_id: 7, notes: 'Allergie', people_count: 1, person_type: 'participant' }),
  })))
  expect(await screen.findByText(/Table attribuée : VIP n°001/)).toBeTruthy()
  expect(await screen.findByText('🎫 Votre QR Code personnel')).toBeTruthy()
  expect(await screen.findByText('⬇️ Télécharger mon QR Code')).toBeTruthy()
  expect(globalThis.fetch).not.toHaveBeenCalled()
})

test('retains the input and shows the real error when registration fails', async () => {
  fake.rpc.mockRejectedValue(new Error('Écriture refusée'))
  render(<Inscription />)
  await fillAndSubmit()
  expect(await screen.findByText(/Écriture refusée/)).toBeTruthy()
  expect(screen.getByPlaceholderText('Jean').value).toBe('Awa')
})
