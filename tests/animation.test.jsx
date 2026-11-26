import React from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AnimationPublic from '../src/pages/AnimationPublic'

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))

vi.mock('../src/lib/supabasePublic', () => {
  const chain = {
    select: () => chain,
    order: () => chain,
    limit: async () => ({ data: [] }),
    eq: () => chain,
    maybeSingle: async () => ({
      data: { id: 1, name: 'Dîner Gala 2026', date: '2026-12-25', venue: 'Abidjan' }
    })
  }
  const channel = { on: () => channel, subscribe: () => ({}) }
  const client = {
    from: () => chain,
    rpc: rpcMock,
    channel: () => channel,
    removeChannel: () => {}
  }
  return { supabasePublic: client, supabase: client, default: client }
})

beforeEach(() => {
  window.history.replaceState({}, '', '/animation?event=1')
  localStorage.clear()
  rpcMock.mockReset()
  rpcMock.mockImplementation(async (fn, params) => {
    if (fn === 'animation_join') {
      return { data: { ok: true, player_id: 7, full_name: params.p_name }, error: null }
    }
    if (fn === 'animation_state') {
      return { data: { quiz: null, votes: [], tombola: [], ranking: [] }, error: null }
    }
    return { data: { ok: true }, error: null }
  })
})

test('la page publique propose de rejoindre l’animation avec le nom de l’événement', async () => {
  render(<AnimationPublic />)
  await waitFor(() => expect(screen.getByText('Dîner Gala 2026')).toBeTruthy())
  expect(screen.getByText(/Rejoindre l'animation/i)).toBeTruthy()
  expect(screen.getByPlaceholderText('Prénom et nom')).toBeTruthy()
  expect(screen.getByPlaceholderText(/Téléphone/i)).toBeTruthy()
})

test('la participation enregistre le joueur et affiche son état', async () => {
  render(<AnimationPublic />)
  await waitFor(() => expect(screen.getByPlaceholderText('Prénom et nom')).toBeTruthy())

  await userEvent.type(screen.getByPlaceholderText('Prénom et nom'), 'Awa Koné')
  await userEvent.type(screen.getByPlaceholderText(/Téléphone/i), '0700000001')
  await userEvent.click(screen.getByRole('button', { name: /Entrer dans la soirée/i }))

  await waitFor(() => expect(rpcMock).toHaveBeenCalledWith('animation_join', expect.objectContaining({
    p_event: 1,
    p_name: 'Awa Koné',
    p_phone: '0700000001'
  })))
  await waitFor(() => expect(screen.getByText('Awa Koné', { exact: true })).toBeTruthy())
  expect(localStorage.getItem('even_animation_player_1')).toContain('Awa Koné')
})
