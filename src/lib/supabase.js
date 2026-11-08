import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://sozalihzdiatdoocxybs.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvemFsaWh6ZGlhdGRvb2N4eWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NzIxMTcsImV4cCI6MjEwOTE0ODExN30.pMwkh3DbjEUPtWtyVpmSx7Hd4_R659zp3ohaRqO5LiA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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
    // Listen for realtime changes
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
    update,
    del,
    refetch: fetch
  }
}

export default supabase
