import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ProgrammePublic() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const initialEvent = Number(params.get('event')) || null

  const [eventId, setEventId] = useState(initialEvent)
  const [event, setEvent] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      let id = eventId
      if (!id) {
        const { data } = await supabase.from('events').select('id').order('id').limit(1)
        id = data?.[0]?.id || null
        if (alive) setEventId(id)
      }
      if (!id) {
        if (alive) setLoading(false)
        return
      }
      const [{ data: ev }, { data: prog }] = await Promise.all([
        supabase.from('events').select('id,name,date,venue').eq('id', id).maybeSingle(),
        supabase.from('program_items').select('*').eq('event_id', id).order('sort_order')
      ])
      if (!alive) return
      setEvent(ev || null)
      setItems((prog || []).slice().sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || ''))))
      setLoading(false)
    })()
    return () => { alive = false }
  }, [eventId])

  const card = {
    background: '#fff',
    border: '1px solid #E3E9F7',
    borderRadius: 16,
    padding: '1rem',
    boxShadow: '0 4px 18px rgba(1,11,38,0.06)'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#010B26 0%,#011A43 45%,#0a1f4d 100%)', padding: '1rem', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ textAlign: 'center', padding: '0.85rem 0 0.35rem' }}>
          <div style={{ fontSize: '1.7rem' }}>⚜️</div>
          <h1 style={{ color: '#fff', fontSize: '1.2rem', margin: '0.3rem 0' }}>Programme</h1>
          <p style={{ color: '#A9B8D8', fontSize: '0.85rem', margin: 0 }}>{event?.name || 'Soirée'}</p>
          <p style={{ color: '#8FA3CC', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
            {event?.date ? new Date(event.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : ''}
            {event?.venue ? ' · ' + event.venue : ''}
          </p>
        </div>

        {loading && <div style={{ ...card, textAlign: 'center', color: '#5A6B8C' }}>Chargement…</div>}

        {!loading && items.length === 0 && (
          <div style={{ ...card, textAlign: 'center', color: '#5A6B8C' }}>
            <div style={{ fontSize: '1.5rem' }}>🗓️</div>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem' }}>Le programme sera publié très bientôt.</p>
          </div>
        )}

        {!loading && items.map((it) => (
          <div key={it.id} style={{ ...card, display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
            <div style={{
              minWidth: 58, textAlign: 'center', background: '#FFF9E6', border: '1px solid #F0E2B8',
              borderRadius: 10, padding: '0.35rem 0.3rem', color: '#9a7a12', fontWeight: 700, fontSize: '0.9rem'
            }}>
              {it.start_time || '—'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#011A43', fontWeight: 700, fontSize: '0.98rem' }}>{it.title}</div>
              {it.description && <div style={{ color: '#5A6B8C', fontSize: '0.85rem', marginTop: '0.2rem' }}>{it.description}</div>}
            </div>
          </div>
        ))}

        <p style={{ textAlign: 'center', color: '#6E80A6', fontSize: '0.72rem', margin: '0.5rem 0 1rem' }}>
          EVEN MANAGER · programme officiel
        </p>
      </div>
    </div>
  )
}
