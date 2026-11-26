import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { supabasePublic as supabase } from '../lib/supabasePublic'

const STORAGE_PREFIX = 'even_animation_player_'

export default function AnimationPublic() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const queryEvent = Number(params.get('event')) || null

  const [eventId, setEventId] = useState(queryEvent)
  const [eventRow, setEventRow] = useState(null)
  const [player, setPlayer] = useState(null)
  const [state, setState] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [flash, setFlash] = useState(null)
  const [now, setNow] = useState(Date.now())

  // Événement
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!eventId) {
        const { data } = await supabase.from('events').select('id, name, date, venue').order('id').limit(1)
        if (alive && data && data[0]) setEventId(data[0].id)
        return
      }
      const { data } = await supabase.from('events').select('id, name, date, venue').eq('id', eventId).maybeSingle()
      if (alive) setEventRow(data || null)
    })()
    return () => { alive = false }
  }, [eventId])

  // Joueur mémorisé sur le téléphone
  useEffect(() => {
    if (!eventId) return
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + eventId)
      if (raw) setPlayer(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [eventId])

  const refresh = useCallback(async () => {
    if (!eventId) return
    const { data, error } = await supabase.rpc('animation_state', {
      p_event: eventId,
      p_player: player?.id ?? null
    })
    if (!error && data) setState(data)
  }, [eventId, player?.id])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 8000)
    return () => clearInterval(timer)
  }, [refresh])

  useEffect(() => {
    if (!eventId) return
    const channel = supabase
      .channel('animation-live-' + Math.random().toString(36).slice(2, 8))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'animation_questions' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'animations' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'animation_candidates' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'animation_votes' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'animation_entries' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'animation_draws' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'animation_answers' }, refresh)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [eventId, refresh])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const toast = (text, ok = true) => {
    setFlash({ text, ok })
    setTimeout(() => setFlash(null), 4000)
  }

  const join = async (e) => {
    e.preventDefault()
    if (!eventId) return
    setBusy(true)
    setMessage('')
    try {
      const { data, error } = await supabase.rpc('animation_join', {
        p_event: eventId,
        p_name: form.name,
        p_phone: form.phone
      })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.message || 'Inscription impossible')
      const me = { id: data.player_id, name: data.full_name }
      setPlayer(me)
      localStorage.setItem(STORAGE_PREFIX + eventId, JSON.stringify(me))
      toast('Bienvenue ' + data.full_name + ' !')
      await refresh()
    } catch (err) {
      setMessage(err.message || 'Connexion impossible')
    } finally {
      setBusy(false)
    }
  }

  const answer = async (questionId, index) => {
    if (!player) return
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('animation_answer', {
        p_player: player.id, p_question: questionId, p_choice: index
      })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.message || 'Réponse refusée')
      toast(data.correct ? '✅ Bonne réponse ! +' + data.points + ' pts' : '❌ Mauvaise réponse', data.correct)
      await refresh()
    } catch (err) {
      toast(err.message, false)
    } finally {
      setBusy(false)
    }
  }

  const vote = async (candidateId, name) => {
    if (!player) return
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('animation_vote', { p_player: player.id, p_candidate: candidateId })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.message || 'Vote refusé')
      toast('Vote enregistré pour ' + name)
      await refresh()
    } catch (err) {
      toast(err.message, false)
    } finally {
      setBusy(false)
    }
  }

  const enter = async (animationId) => {
    if (!player) return
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('animation_enter', { p_player: player.id, p_animation: animationId })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.message || 'Participation impossible')
      toast('🎟️ Vous participez à la tombola !')
      await refresh()
    } catch (err) {
      toast(err.message, false)
    } finally {
      setBusy(false)
    }
  }

  const leave = () => {
    localStorage.removeItem(STORAGE_PREFIX + eventId)
    setPlayer(null)
    setState(null)
  }

  const quiz = state?.quiz
  const votes = state?.votes || []
  const tombolas = state?.tombola || []
  const ranking = state?.ranking || []

  const secondsLeft = useMemo(() => {
    if (!quiz?.started_at || !quiz?.duration_seconds) return null
    const end = new Date(quiz.started_at).getTime() + quiz.duration_seconds * 1000
    return Math.max(0, Math.round((end - now) / 1000))
  }, [quiz?.started_at, quiz?.duration_seconds, now])

  const myRank = ranking.findIndex(r => r.player_id === player?.id) + 1

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
        <div style={{ textAlign: 'center', padding: '0.75rem 0 0.25rem' }}>
          <div style={{ fontSize: '1.6rem' }}>⚜️</div>
          <h1 style={{ color: '#fff', fontSize: '1.2rem', margin: '0.25rem 0' }}>{eventRow?.name || 'Soirée Gala'}</h1>
          <p style={{ color: '#A9B8D8', fontSize: '0.82rem', margin: 0 }}>
            {eventRow?.date ? new Date(eventRow.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
            {eventRow?.venue ? ' · ' + eventRow.venue : ''}
          </p>
        </div>

        {flash && (
          <div style={{ ...card, padding: '0.75rem 0.9rem', borderColor: flash.ok ? '#B7E2C4' : '#F2C2C2', background: flash.ok ? '#F1FBF4' : '#FDF1F1', color: flash.ok ? '#1a7a3a' : '#b81a1a', fontWeight: 600, fontSize: '0.9rem' }}>
            {flash.text}
          </div>
        )}

        {!player && (
          <div style={card}>
            <h2 style={{ color: '#011A43', fontSize: '1.05rem', marginTop: 0 }}>Rejoindre l'animation</h2>
            <p style={{ color: '#5A6B8C', fontSize: '0.85rem', marginTop: 0 }}>
              Indiquez votre nom et votre numéro de téléphone pour participer au quiz, voter et tenter la tombola.
            </p>
            {message && <div style={{ background: '#FDF1F1', color: '#b81a1a', padding: '0.6rem 0.75rem', borderRadius: 10, fontSize: '0.85rem', marginBottom: '0.75rem' }}>{message}</div>}
            <form onSubmit={join} style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              <input
                className="form-input"
                placeholder="Prénom et nom"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                style={{ fontSize: '1rem', padding: '0.8rem' }}
              />
              <input
                className="form-input"
                type="tel"
                placeholder="Téléphone (ex. 07 00 00 00 00)"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                required
                style={{ fontSize: '1rem', padding: '0.8rem' }}
              />
              <button className="btn btn-gold" type="submit" disabled={busy || !eventId} style={{ padding: '0.85rem', fontSize: '1rem' }}>
                {busy ? 'Connexion...' : 'Entrer dans la soirée'}
              </button>
            </form>
          </div>
        )}

        {player && (
          <>
            <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0.9rem' }}>
              <div style={{ fontSize: '0.88rem', color: '#16223F' }}>
                👤 <strong>{player.name}</strong>
                {myRank > 0 && <span style={{ color: '#8A97B3' }}> · {myRank}ᵉ au classement</span>}
              </div>
              <button onClick={leave} style={{ background: 'none', border: 'none', color: '#8A97B3', fontSize: '0.78rem', cursor: 'pointer' }}>
                Changer
              </button>
            </div>

            {quiz && (
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span className="badge badge-info">🧠 Quiz en direct</span>
                  {secondsLeft !== null && (
                    <span style={{ fontSize: '0.8rem', color: secondsLeft <= 5 ? '#b81a1a' : '#5A6B8C', fontWeight: 600 }}>
                      ⏱ {secondsLeft}s
                    </span>
                  )}
                </div>
                <h2 style={{ color: '#011A43', fontSize: '1.05rem', margin: '0.35rem 0 0.75rem' }}>{quiz.prompt}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {(quiz.options || []).map((opt, i) => {
                    const chosen = quiz.my_choice === i
                    const locked = quiz.my_choice !== null && quiz.my_choice !== undefined
                    return (
                      <button
                        key={i}
                        onClick={() => answer(quiz.id, i)}
                        disabled={busy || locked}
                        style={{
                          textAlign: 'left', padding: '0.8rem 0.9rem', borderRadius: 12, cursor: locked ? 'default' : 'pointer',
                          border: '1px solid ' + (chosen ? '#1a7a3a' : '#E3E9F7'),
                          background: chosen ? '#F1FBF4' : '#F8FAFF',
                          color: '#16223F', fontSize: '0.95rem', fontWeight: 600,
                          opacity: locked && !chosen ? 0.55 : 1
                        }}
                      >
                        <span style={{ color: '#8A97B3', marginRight: 8 }}>{String.fromCharCode(65 + i)}</span>
                        {opt}
                        {chosen && <span style={{ float: 'right' }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
                {quiz.my_choice !== null && quiz.my_choice !== undefined && (
                  <p style={{ margin: '0.6rem 0 0', fontSize: '0.8rem', color: '#5A6B8C' }}>Réponse enregistrée — attendez la question suivante.</p>
                )}
              </div>
            )}

            {votes.map(v => {
              const total = v.candidates.reduce((s, c) => s + c.votes, 0)
              return (
                <div key={v.animation_id} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-gold">🏆 {v.title || 'Distinctions'}</span>
                    <span style={{ fontSize: '0.78rem', color: '#8A97B3' }}>{total} vote(s)</span>
                  </div>
                  {v.description && <p style={{ color: '#5A6B8C', fontSize: '0.85rem', margin: '0.4rem 0' }}>{v.description}</p>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginTop: '0.5rem' }}>
                    {v.candidates.map(c => {
                      const chosen = v.my_vote === c.id
                      const pct = total ? Math.round((c.votes / total) * 100) : 0
                      return (
                        <button
                          key={c.id}
                          onClick={() => vote(c.id, c.name)}
                          disabled={busy}
                          style={{
                            textAlign: 'left', padding: '0.7rem 0.85rem', borderRadius: 12, cursor: 'pointer',
                            border: '1px solid ' + (chosen ? '#d4af37' : '#E3E9F7'),
                            background: chosen ? '#FFF9E6' : '#F8FAFF', color: '#16223F'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.92rem' }}>{c.name}</strong>
                            <span style={{ fontSize: '0.78rem', color: '#8A97B3' }}>{c.votes} · {pct}%</span>
                          </div>
                          {c.description && <div style={{ fontSize: '0.78rem', color: '#8A97B3' }}>{c.description}</div>}
                          <div style={{ height: 6, background: '#EEF2FB', borderRadius: 99, marginTop: 6, overflow: 'hidden' }}>
                            <div style={{ width: pct + '%', height: '100%', background: chosen ? '#d4af37' : '#C9D4EA' }} />
                          </div>
                          {chosen && <div style={{ fontSize: '0.75rem', color: '#9a7a12', marginTop: 4 }}>✓ Votre vote</div>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {tombolas.map(t => (
              <div key={t.animation_id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-success">🎟️ Tombola</span>
                  <span style={{ fontSize: '0.78rem', color: '#8A97B3' }}>{t.entries} inscrit(s)</span>
                </div>
                <h2 style={{ color: '#011A43', fontSize: '1.02rem', margin: '0.45rem 0 0.2rem' }}>{t.title}</h2>
                {t.prize && <p style={{ color: '#5A6B8C', fontSize: '0.85rem', margin: 0 }}>Lot : <strong>{t.prize}</strong></p>}
                <button
                  className={t.entered ? 'btn btn-secondary' : 'btn btn-gold'}
                  onClick={() => enter(t.animation_id)}
                  disabled={busy || t.entered}
                  style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem' }}
                >
                  {t.entered ? '✓ Vous participez' : 'Participer au tirage'}
                </button>
                {t.last_draw && (
                  <p style={{ margin: '0.6rem 0 0', fontSize: '0.82rem', color: '#1a7a3a' }}>
                    🎉 Dernier gagnant : <strong>{t.last_draw.name}</strong>
                  </p>
                )}
              </div>
            ))}

            {ranking.length > 0 && (
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span className="badge badge-gold">🏅 Classement</span>
                  <span style={{ fontSize: '0.78rem', color: '#8A97B3' }}>{ranking.length} joueur(s)</span>
                </div>
                {ranking.slice(0, 10).map((r, i) => (
                  <div
                    key={r.player_id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.35rem',
                      borderBottom: '1px solid #EEF2FB',
                      background: r.player_id === player.id ? '#FFF9E6' : 'transparent',
                      borderRadius: 8
                    }}
                  >
                    <span style={{ width: 24, fontWeight: 700, color: i === 0 ? '#b8941f' : '#8A97B3' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </span>
                    <span style={{ flex: 1, fontSize: '0.9rem', color: '#16223F', fontWeight: r.player_id === player.id ? 700 : 500 }}>
                      {r.name}{r.player_id === player.id ? ' (vous)' : ''}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#8A97B3' }}>{r.correct}/{r.answers}</span>
                    <strong style={{ color: '#b8941f', fontSize: '0.9rem' }}>{r.points} pts</strong>
                  </div>
                ))}
              </div>
            )}

            {!quiz && votes.length === 0 && tombolas.length === 0 && (
              <div style={{ ...card, textAlign: 'center', color: '#5A6B8C' }}>
                <div style={{ fontSize: '1.6rem' }}>⏳</div>
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem' }}>Aucune animation en cours. Restez sur cette page : elle se met à jour automatiquement.</p>
              </div>
            )}
          </>
        )}

        <p style={{ textAlign: 'center', color: '#6E80A6', fontSize: '0.72rem', margin: '0.5rem 0 1rem' }}>
          EVEN MANAGER · animation en direct
        </p>
      </div>
    </div>
  )
}
