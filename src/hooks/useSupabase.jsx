import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentEvent, subscribeCurrentEvent } from '../lib/currentEvent'

const EVENT_TABLES = ['categories', 'guests', 'tickets', 'qrcodes', 'tables_placement', 'program_items', 'committee_members', 'expenses', 'finances', 'sponsors']

export function useSupabase(table, keyColumn = 'id') {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const eventId = EVENT_TABLES.includes(table) ? getCurrentEvent() : null

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase.from(table).select('*')
      if (eventId) query = query.eq('event_id', eventId)
      const { data, error } = await query
      if (error) throw error
      setData(data)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [table, eventId])

  useEffect(() => {
    fetch()
    const unsubscribe = subscribeCurrentEvent(() => fetch())
    let channel = null
    try {
      // Nom de canal unique : évite la collision quand plusieurs pages écoutent la même table
      const uniqueName = `${table}-${Math.random().toString(36).slice(2, 10)}:changed`
      channel = supabase
        .channel(uniqueName)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          fetch()
        })
        .subscribe()
    } catch {
      // Canal déjà abonné (double instance) : le refetch manuel suffit
      channel = null
    }

    return () => {
      unsubscribe()
      if (channel) {
        try { supabase.removeChannel(channel) } catch { /* déjà retiré */ }
      }
    }
  }, [table, fetch])

  const insert = async (record) => {
    const payload = (eventId && EVENT_TABLES.includes(table)) ? { ...record, event_id: eventId } : record
    const { data, error } = await supabase.from(table).insert(payload).select().single()
    if (error) throw error
    await fetch()
    return data
  }

  const update = async (id, record) => {
    const { data, error } = await supabase.from(table).update(record).eq(keyColumn, id).select().single()
    if (error) throw error
    await fetch()
    return data
  }

  const del = async (id) => {
    const { error } = await supabase.from(table).delete().eq(keyColumn, id)
    if (error) throw error
    await fetch()
  }

  return {
    data,
    loading,
    error,
    fetch,
    insert,
    send: insert,
    update,
    del,
    refetch: fetch
  }
}

export default supabase
