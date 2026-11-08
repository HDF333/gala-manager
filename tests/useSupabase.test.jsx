import { beforeEach, expect, test, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import client, { useSupabase } from '../src/hooks/useSupabase'

// Replace the entire Supabase boundary: these tests never contact a database.
const supabase = vi.hoisted(() => ({
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
}))
vi.mock('../src/lib/supabase', () => ({ supabase }))

function createBoundary() {
  const reads = []
  const mutations = []
  const channels = []
  const readResults = []
  const mutationResults = []

  function mutation(table, operation, record) {
    const call = { table, operation, record, selected: false, filter: null }
    mutations.push(call)
    const builder = {
      eq(column, value) { call.filter = [column, value]; return builder },
      select(columns) { call.selected = true; call.columns = columns; return builder },
      single() {
        call.single = true
        const response = mutationResults.shift() ?? { data: record, error: null }
        return Promise.resolve(response).then(result => ({
          ...result,
          data: call.selected ? result.data : null,
        }))
      },
      then(resolve, reject) {
        return Promise.resolve(mutationResults.shift() ?? { data: null, error: null }).then(resolve, reject)
      },
    }
    return builder
  }

  supabase.from.mockImplementation(table => ({
    select: columns => {
      reads.push({ table, columns })
      return Promise.resolve(readResults.shift() ?? { data: [], error: null })
    },
    insert: record => mutation(table, 'insert', record),
    update: record => mutation(table, 'update', record),
    delete: () => mutation(table, 'delete', null),
  }))
  supabase.channel.mockImplementation(name => {
    const channel = {
      name,
      on(event, filter, callback) { Object.assign(channel, { event, filter, callback }); return channel },
      subscribe() { return channel },
    }
    channels.push(channel)
    return channel
  })
  supabase.removeChannel.mockResolvedValue('ok')
  return { reads, mutations, channels, readResults, mutationResults }
}

let boundary
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Live network forbidden in tests')))
  boundary = createBoundary()
})

test('insert selects and returns the created row; send remains its alias', async () => {
  const row = { id: 7, name: 'Alice' }
  boundary.mutationResults.push({ data: row, error: null })
  const { result } = renderHook(() => useSupabase('guests'))
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(client).toBe(supabase)
  expect(result.current.send).toBe(result.current.insert)

  let returned
  await act(async () => { returned = await result.current.insert({ name: 'Alice' }) })

  expect(returned).toEqual(row)
  expect(boundary.mutations).toEqual([expect.objectContaining({
    table: 'guests', operation: 'insert', record: { name: 'Alice' }, selected: true, single: true,
  })])
  expect(globalThis.fetch).not.toHaveBeenCalled()
})

test('a successful insert refetches the current table without waiting for realtime', async () => {
  boundary.readResults.push({ data: [], error: null })
  const { result } = renderHook(() => useSupabase('guests'))
  await waitFor(() => expect(result.current.loading).toBe(false))
  const row = { id: 7, name: 'Alice' }
  boundary.mutationResults.push({ data: row, error: null })
  boundary.readResults.push({ data: [row], error: null })

  await act(async () => { await result.current.send({ name: 'Alice' }) })

  expect(result.current.data).toEqual([row])
  expect(boundary.reads).toEqual([
    { table: 'guests', columns: '*' }, { table: 'guests', columns: '*' },
  ])
})

test('successful updates and deletions refetch the current table', async () => {
  const oldRow = { id: 7, name: 'Alice' }
  const newRow = { id: 7, name: 'Beatrice' }
  boundary.readResults.push({ data: [oldRow], error: null })
  const { result } = renderHook(() => useSupabase('guests'))
  await waitFor(() => expect(result.current.data).toEqual([oldRow]))

  boundary.mutationResults.push({ data: newRow, error: null })
  boundary.readResults.push({ data: [newRow], error: null })
  await act(async () => { await result.current.update(7, { name: 'Beatrice' }) })
  expect(result.current.data).toEqual([newRow])

  boundary.mutationResults.push({ data: null, error: null })
  boundary.readResults.push({ data: [], error: null })
  await act(async () => { await result.current.del(7) })
  expect(result.current.data).toEqual([])
  expect(boundary.mutations[1]).toEqual(expect.objectContaining({ operation: 'delete', filter: ['id', 7] }))
  expect(boundary.reads).toHaveLength(3)
})

test('update selects and returns the updated row for the requested id', async () => {
  const row = { id: 7, name: 'Beatrice' }
  boundary.mutationResults.push({ data: row, error: null })
  const { result } = renderHook(() => useSupabase('guests'))
  await waitFor(() => expect(result.current.loading).toBe(false))

  let returned
  await act(async () => { returned = await result.current.update(7, { name: 'Beatrice' }) })

  expect(returned).toEqual(row)
  expect(boundary.mutations).toEqual([expect.objectContaining({
    table: 'guests', operation: 'update', filter: ['id', 7],
    record: { name: 'Beatrice' }, selected: true, single: true,
  })])
})
