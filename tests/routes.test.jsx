import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, expect, test, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import App from '../src/App'

// Render real page components with an isolated authenticated test context.
// Data hooks are mocked; these tests do not prove remote CRUD functionality.
vi.mock('../src/contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { id: 'test-user', first_name: 'Test' }, loading: false, logout: vi.fn() }),
}))
vi.mock('../src/hooks/useSupabase', () => ({
  useSupabase: () => ({ data: [], loading: false, error: null, refetch: vi.fn() }),
}))

const source = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8')
const routes = [...source.matchAll(/<Route path="([^"]+)" element=\{<([A-Za-z]+) \/>\}/g)]
  .map(([, route, component]) => {
    const pagePath = path.resolve(`src/pages/${component}.jsx`)
    if (!fs.existsSync(pagePath)) return null
    const page = fs.readFileSync(pagePath, 'utf8')
    // Les pages publiques plein écran (téléphone) n'utilisent pas .page-title
    const titleMatch = page.match(/className="page-title">([^<]+)</)
    if (!titleMatch) return null
    const raw = titleMatch[1].trim()
    // Titre dynamique (i18n) : vérifié comme non vide au rendu
    return [route, raw.startsWith('{') ? null : raw]
  })
  .filter(Boolean)

const pageFiles = fs.readdirSync(path.resolve('src/pages')).filter(f => f.endsWith('.jsx'))
const titledPages = pageFiles.filter(f => fs.readFileSync(path.resolve('src/pages', f), 'utf8').includes('className="page-title"')).length

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Live network forbidden in tests')))
})

test('route coverage includes all declared pages and the home alias', () => {
  expect(routes).toHaveLength(titledPages + 1) // '/' alias (la page publique est un message, pas une page)
  expect(new Set(routes.map(([route]) => route)).size).toBe(routes.length)
})

test.each(routes)('renders %s without a blank screen', async (route, title) => {
  window.history.replaceState({}, '', route)
  const { container } = render(<App />)
  if (title) {
    await waitFor(() => expect(container.querySelector('.page-title')?.textContent).toBe(title))
  } else {
    await waitFor(() => expect((container.querySelector('.page-title')?.textContent || '').length).toBeGreaterThan(0))
  }
  if (route !== '/inscription-publique') {
    expect(container.querySelector('.sidebar')).not.toBeNull()
  }
  expect(globalThis.fetch).not.toHaveBeenCalled()
})
