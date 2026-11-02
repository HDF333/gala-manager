import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useSupabase(table) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from(table).select('*')
      if (error) throw error
      setData(data)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch()
    const channel = supabase
      .channel(`${table}:changed`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        fetch()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table])

  const insert = async (record) => {
    const { data, error } = await supabase.from(table).insert(record).single()
    if (error) throw error
    return data
  }

  const update = async (id, record) => {
    const { data, error } = await supabase.from(table).update(record).eq('id', id).single()
    if (error) throw error
    return data
  }

  const del = async (id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
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
