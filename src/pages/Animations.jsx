import React, { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../hooks/useSupabase'
import { supabase } from '../lib/supabase'
import { getCurrentEvent } from '../lib/currentEvent'
import { hasPerm } from '../lib/permissions'

const KINDS = {
  quiz: { label: 'Quiz', icon: '🧠', color: '#1a5a8a' },
  vote: { label: 'Distinctions', icon: '🏆', color: '#9a7a12' },
  tombola: { label: 'Tombola', icon: '🎟️', color: '#1a7a3a' }
}

const STATUS_LABEL = { draft: 'Brouillon', live: 'En direct', closed: 'Terminé' }

export default function Animations() {
  const { profile } = useAuth()
  const eventId = getCurrentEvent()

  const { data: animations = [], insert: insertAnimation, update: updateAnimation, del: deleteAnimation } = useSupabase('animations')
  const { data: questions = [], insert: insertQuestion, update: updateQuestion, del: deleteQuestion } = useSupabase('animation_questions')
  const { data: candidates = [], insert: insertCandidate, del: deleteCandidate } = useSupabase('animation_candidates')
  const { data: players = [] } = useSupabase('animation_players')
  const { data: answers = [] } = useSupabase('animation_answers')
  const { data: votes = [] } = useSupabase('animation_votes')
  const { data: entries = [] } = useSupabase('animation_entries')
  const { data: draws = [] } = useSupabase('animation_draws')

  const [selectedId, setSelectedId] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [newAnim, setNewAnim] = useState({ kind: 'quiz', title: '', description: '', prize: '' })
  const [newQuestion, setNewQuestion] = useState({ prompt: '', options: ['', '', '', ''], correct: 0, points: 10 })
  const [newCandidate, setNewCandidate] = useState({ name: '', description: '' })

  const allowed = hasPerm(profile, 'gerer_evenements')

  const publicLink = useMemo(() => {
    if (typeof window === 'undefined' || !eventId) return ''
    return window.location.origin + '/animation?event=' + eventId
  }, [eventId])

  useEffect(() => {
    if (!publicLink) return
    QRCode.toDataURL(publicLink, { width: 320, margin: 1 }).then(setQrUrl).catch(() => setQrUrl(''))
  }, [publicLink])

  useEffect(() => {
    if (!selectedId && animations.length > 0) setSelectedId(animations[0].id)
  }, [animations, selectedId])

  const selected = animations.find(a => a.id === selectedId) || null
  const selectedQuestions = useMemo(
    () => questions.filter(q => q.animation_id === selectedId).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [questions, selectedId]
  )
  const selectedCandidates = useMemo(
    () => candidates.filter(c => c.animation_id === selectedId).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [candidates, selectedId]
  )

  const flash = (text, isError = false) => {
    setMessage((isError ? '⚠️ ' : '✅ ') + text)
    setTimeout(() => setMessage(''), 6000)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
    } catch {
      flash('Lien : ' + publicLink)
    }
  }

  const createAnimation = async (e) => {
    e.preventDefault()
    if (!newAnim.title.trim()) return
    setBusy(true)
    try {
      const row = await insertAnimation({
        kind: newAnim.kind,
        title: newAnim.title.trim(),
        description: newAnim.description.trim() || null,
        prize: newAnim.kind === 'tombola' ? (newAnim.prize.trim() || null) : null,
        status: 'draft'
      })
      setSelectedId(row.id)
      setNewAnim({ kind: newAnim.kind, title: '', description: '', prize: '' })
      flash('Animation créée.')
    } catch (err) {
      flash(err.message || 'Création impossible', true)
    } finally {
      setBusy(false)
    }
  }

  const setStatus = async (animation, status) => {
    setBusy(true)
    try {
      await updateAnimation(animation.id, { status, updated_at: new Date().toISOString() })
      if (status !== 'live' && animation.kind === 'quiz') {
        for (const q of questions.filter(x => x.animation_id === animation.id && x.status === 'live')) {
          await updateQuestion(q.id, { status: 'closed', closed_at: new Date().toISOString() })
        }
      }
      flash(status === 'live' ? 'Animation ouverte aux participants.' : status === 'closed' ? 'Animation clôturée.' : 'Animation repassée en brouillon.')
    } catch (err) {
      flash(err.message || 'Mise à jour impossible', true)
    } finally {
      setBusy(false)
    }
  }

  const removeAnimation = async (animation) => {
    if (!confirm('Supprimer « ' + animation.title + ' » et toutes ses données ?')) return
    try {
      await deleteAnimation(animation.id)
      if (selectedId === animation.id) setSelectedId(null)
      flash('Animation supprimée.')
    } catch (err) {
      flash(err.message || 'Suppression impossible', true)
    }
  }

  const addQuestion = async (e) => {
    e.preventDefault()
    if (!selected) return
    const options = newQuestion.options.map(o => o.trim()).filter(Boolean)
    if (!newQuestion.prompt.trim() || options.length < 2) {
      flash('Question et au moins deux réponses sont nécessaires.', true)
      return
    }
    if (newQuestion.correct >= options.length) {
      flash('La bonne réponse doit correspondre à une réponse remplie.', true)
      return
    }
    setBusy(true)
    try {
      await insertQuestion({
        animation_id: selected.id,
        prompt: newQuestion.prompt.trim(),
        options,
        correct_index: Number(newQuestion.correct),
        points: Number(newQuestion.points) || 10,
        sort_order: selectedQuestions.length,
        status: 'draft'
      })
      setNewQuestion({ prompt: '', options: ['', '', '', ''], correct: 0, points: 10 })
      flash('Question ajoutée.')
    } catch (err) {
      flash(err.message || 'Ajout impossible', true)
    } finally {
      setBusy(false)
    }
  }

  const launchQuestion = async (q) => {
    setBusy(true)
    try {
      for (const other of selectedQuestions.filter(x => x.status === 'live' && x.id !== q.id)) {
        await updateQuestion(other.id, { status: 'closed', closed_at: new Date().toISOString() })
      }
      await updateQuestion(q.id, { status: 'live', started_at: new Date().toISOString(), closed_at: null })
      if (selected && selected.status !== 'live') {
        await updateAnimation(selected.id, { status: 'live', updated_at: new Date().toISOString() })
      }
      flash('Question lancée : les téléphones peuvent répondre.')
    } catch (err) {
      flash(err.message || 'Lancement impossible', true)
    } finally {
      setBusy(false)
    }
  }

  const closeQuestion = async (q) => {
    try {
      await updateQuestion(q.id, { status: 'closed', closed_at: new Date().toISOString() })
      flash('Question clôturée.')
    } catch (err) {
      flash(err.message || 'Clôture impossible', true)
    }
  }

  const removeQuestion = async (q) => {
    if (!confirm('Supprimer cette question ?')) return
    try {
      await deleteQuestion(q.id)
      flash('Question supprimée.')
    } catch (err) {
      flash(err.message || 'Suppression impossible', true)
    }
  }

  const addCandidate = async (e) => {
    e.preventDefault()
    if (!selected || !newCandidate.name.trim()) return
    setBusy(true)
    try {
      await insertCandidate({
        animation_id: selected.id,
        name: newCandidate.name.trim(),
        description: newCandidate.description.trim() || null,
        sort_order: selectedCandidates.length
      })
      setNewCandidate({ name: '', description: '' })
      flash('Candidat ajouté.')
    } catch (err) {
      flash(err.message || 'Ajout impossible', true)
    } finally {
      setBusy(false)
    }
  }

  const removeCandidate = async (c) => {
    if (!confirm('Supprimer ' + c.name + ' ?')) return
    try {
      await deleteCandidate(c.id)
      flash('Candidat supprimé.')
    } catch (err) {
      flash(err.message || 'Suppression impossible', true)
    }
  }

  const drawWinner = async () => {
    if (!selected) return
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('animation_draw', { p_animation: selected.id })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.message || 'Tirage impossible')
      flash('🎉 ' + data.name + (data.prize ? ' remporte ' + data.prize : ' est tiré(e) au sort') + ' !')
    } catch (err) {
      flash(err.message || 'Tirage impossible', true)
    } finally {
      setBusy(false)
    }
  }

  const ranking = useMemo(() => {
    const rows = players.map(p => {
      const mine = answers.filter(a => a.player_id === p.id)
      return {
        id: p.id,
        name: p.full_name,
        points: mine.reduce((s, a) => s + (a.points || 0), 0),
        answers: mine.length,
        correct: mine.filter(a => a.is_correct).length
      }
    })
    const voted = new Set(votes.map(v => v.player_id))
    const entered = new Set(entries.map(e => e.player_id))
    return rows
      .map(r => ({ ...r, bonus: (voted.has(r.id) ? 1 : 0) + (entered.has(r.id) ? 1 : 0) }))
      .sort((a, b) => b.points - a.points || b.correct - a.correct || a.name.localeCompare(b.name))
  }, [players, answers, votes, entries])

  const questionStats = (q) => {
    const qa = answers.filter(a => a.question_id === q.id)
    const counts = (q.options || []).map((_, i) => qa.filter(a => a.choice_index === i).length)
    return { total: qa.length, correct: qa.filter(a => a.is_correct).length, counts }
  }

  const candidateStats = (animationId) => {
    const list = votes.filter(v => v.animation_id === animationId)
    return { total: list.length }
  }

  if (!eventId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-title">Animation</div>
        <div className="alert alert-danger">Choisissez d'abord un événement dans le menu Événements.</div>
      </div>
    )
  }

  if (!allowed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-title">Animation</div>
        <div className="alert alert-danger">
          Le module d'animation est réservé à l'administrateur et aux gestionnaires de l'événement.
        </div>
      </div>
    )
  }

  const livePlayers = new Set(answers.map(a => a.player_id)).size

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div className="page-title">Animation</div>
          <div className="page-subtitle" style={{ marginBottom: 0 }}>
            Quiz, distinctions et tombola — les participants jouent depuis leur téléphone.
          </div>
        </div>
      </div>

      {message && (
        <div className="card" style={{ padding: '0.75rem 1rem', borderColor: message.startsWith('⚠️') ? 'rgba(184,26,26,0.4)' : 'rgba(26,122,58,0.35)', background: message.startsWith('⚠️') ? 'rgba(184,26,26,0.06)' : 'rgba(26,122,58,0.06)' }}>
          <strong style={{ color: message.startsWith('⚠️') ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>{message}</strong>
        </div>
      )}

      <div className="kpi-grid">
        <div className="card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="kpi-icon tuition">📱</div>
          <div>
            <div className="kpi-label">Participants connectés</div>
            <div className="kpi-value" style={{ marginBottom: 0 }}>{players.length}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{livePlayers} ont répondu au quiz</div>
          </div>
        </div>
        <div className="card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="kpi-icon revenue">🗳️</div>
          <div>
            <div className="kpi-label">Votes distinctions</div>
            <div className="kpi-value" style={{ marginBottom: 0 }}>{votes.length}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{candidates.length} candidat(s)</div>
          </div>
        </div>
        <div className="card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="kpi-icon result">🎟️</div>
          <div>
            <div className="kpi-label">Tombola</div>
            <div className="kpi-value" style={{ marginBottom: 0 }}>{entries.length}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{draws.length} tirage(s)</div>
          </div>
        </div>
        <div className="card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="kpi-icon dashboard">🏅</div>
          <div>
            <div className="kpi-label">Meilleur score</div>
            <div className="kpi-value" style={{ marginBottom: 0 }}>{ranking[0]?.points ?? 0} pts</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{ranking[0]?.name || 'Aucun joueur'}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Lien participant</h2>
          <button className="btn btn-gold btn-sm" onClick={copyLink}>
            🔗 {linkCopied ? 'Lien copié !' : 'Copier le lien'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {qrUrl && (
            <img src={qrUrl} alt="QR animation" style={{ width: 132, height: 132, borderRadius: 10, border: '1px solid var(--border)' }} />
          )}
          <div style={{ flex: 1, minWidth: 240 }}>
            <p style={{ margin: '0 0 0.35rem', color: 'var(--text-soft)', fontSize: '0.9rem' }}>
              Les participants scannent ce QR code ou ouvrent le lien sur leur téléphone : ils indiquent leur nom et leur numéro, puis jouent.
            </p>
            <code style={{ display: 'block', background: '#F6F8FE', border: '1px solid var(--border)', borderRadius: 8, padding: '0.6rem 0.75rem', fontSize: '0.82rem', wordBreak: 'break-all', color: 'var(--navy)' }}>
              {publicLink}
            </code>
            <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Astuce : projetez le classement et le résultat du tirage sur grand écran pendant la soirée.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Nouvelle animation</h2>
        </div>
        <form onSubmit={createAnimation} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Type *</label>
            <select className="form-select" value={newAnim.kind} onChange={e => setNewAnim({ ...newAnim, kind: e.target.value })}>
              <option value="quiz">🧠 Quiz</option>
              <option value="vote">🏆 Distinctions</option>
              <option value="tombola">🎟️ Tombola</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Titre *</label>
            <input className="form-input" value={newAnim.title} onChange={e => setNewAnim({ ...newAnim, title: e.target.value })} placeholder="Quiz culture générale" required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Description</label>
            <input className="form-input" value={newAnim.description} onChange={e => setNewAnim({ ...newAnim, description: e.target.value })} placeholder="Facultatif" />
          </div>
          {newAnim.kind === 'tombola' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Lot</label>
              <input className="form-input" value={newAnim.prize} onChange={e => setNewAnim({ ...newAnim, prize: e.target.value })} placeholder="Week-end à Grand-Bassam" />
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={busy}>➕ Créer</button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 300px) 1fr', gap: '1.25rem', alignItems: 'start' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h2 className="card-title">Animations ({animations.length})</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {animations.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Aucune animation pour cet événement.</p>}
            {animations.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                style={{
                  textAlign: 'left', padding: '0.7rem 0.8rem', borderRadius: 10, cursor: 'pointer',
                  border: '1px solid ' + (a.id === selectedId ? 'var(--accent)' : 'var(--border)'),
                  background: a.id === selectedId ? 'var(--accent-soft)' : '#fff',
                  display: 'flex', flexDirection: 'column', gap: '0.25rem'
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--navy)', fontSize: '0.92rem' }}>
                  {KINDS[a.kind]?.icon} {a.title}
                </span>
                <span style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <span className={`badge ${a.status === 'live' ? 'badge-success' : a.status === 'closed' ? 'badge-muted' : 'badge-warning'}`}>
                    {STATUS_LABEL[a.status]}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{KINDS[a.kind]?.label}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {!selected && (
            <div className="card" style={{ marginBottom: 0 }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Sélectionnez ou créez une animation pour la configurer.</p>
            </div>
          )}

          {selected && (
            <>
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <div>
                    <h2 className="card-title">{KINDS[selected.kind]?.icon} {selected.title}</h2>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {selected.description || 'Sans description'}
                      {selected.prize ? ' · Lot : ' + selected.prize : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span className={`badge ${selected.status === 'live' ? 'badge-success' : selected.status === 'closed' ? 'badge-muted' : 'badge-warning'}`}>
                      {STATUS_LABEL[selected.status]}
                    </span>
                    {selected.status !== 'live' && (
                      <button className="btn btn-primary btn-sm" onClick={() => setStatus(selected, 'live')} disabled={busy}>▶ Ouvrir</button>
                    )}
                    {selected.status === 'live' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => setStatus(selected, 'closed')} disabled={busy}>■ Clôturer</button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => removeAnimation(selected)}>🗑️</button>
                  </div>
                </div>

                {selected.kind === 'quiz' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedQuestions.map(q => {
                      const st = questionStats(q)
                      return (
                        <div key={q.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <strong style={{ color: 'var(--navy)' }}>{q.prompt}</strong>
                            <span style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              <span className={`badge ${q.status === 'live' ? 'badge-success' : q.status === 'closed' ? 'badge-muted' : 'badge-warning'}`}>{STATUS_LABEL[q.status]}</span>
                              <span className="badge badge-info">{st.total} réponse(s)</span>
                              <span className="badge badge-gold">{st.correct} correcte(s)</span>
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', margin: '0.6rem 0' }}>
                            {(q.options || []).map((opt, i) => {
                              const n = st.counts[i] || 0
                              const pct = st.total ? Math.round((n / st.total) * 100) : 0
                              const isCorrect = i === q.correct_index
                              return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem' }}>
                                  <span style={{ width: 16, color: isCorrect ? 'var(--success)' : 'var(--text-muted)', fontWeight: 700 }}>{isCorrect ? '✓' : String.fromCharCode(65 + i)}</span>
                                  <span style={{ flex: 1, color: 'var(--text)' }}>{opt}</span>
                                  <div style={{ width: 90, height: 6, background: '#EEF2FB', borderRadius: 99, overflow: 'hidden' }}>
                                    <div style={{ width: pct + '%', height: '100%', background: isCorrect ? 'var(--success)' : 'var(--accent)' }} />
                                  </div>
                                  <span style={{ width: 52, textAlign: 'right', color: 'var(--text-muted)' }}>{n} · {pct}%</span>
                                </div>
                              )
                            })}
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {q.status !== 'live' && <button className="btn btn-primary btn-sm" onClick={() => launchQuestion(q)} disabled={busy}>▶ Lancer</button>}
                            {q.status === 'live' && <button className="btn btn-secondary btn-sm" onClick={() => closeQuestion(q)} disabled={busy}>■ Clôturer</button>}
                            <button className="btn btn-danger btn-sm" onClick={() => removeQuestion(q)}>🗑️</button>
                          </div>
                        </div>
                      )
                    })}

                    <form onSubmit={addQuestion} style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.9rem' }}>
                      <div className="form-group">
                        <label>Nouvelle question *</label>
                        <input className="form-input" value={newQuestion.prompt} onChange={e => setNewQuestion({ ...newQuestion, prompt: e.target.value })} placeholder="Quelle est la capitale de la Côte d'Ivoire ?" />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem' }}>
                        {newQuestion.options.map((opt, i) => (
                          <input
                            key={i}
                            className="form-input"
                            value={opt}
                            onChange={e => {
                              const options = [...newQuestion.options]
                              options[i] = e.target.value
                              setNewQuestion({ ...newQuestion, options })
                            }}
                            placeholder={'Réponse ' + String.fromCharCode(65 + i) + (i === newQuestion.correct ? ' (bonne)' : '')}
                          />
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Bonne réponse</label>
                          <select className="form-select" value={newQuestion.correct} onChange={e => setNewQuestion({ ...newQuestion, correct: Number(e.target.value) })}>
                            {['A', 'B', 'C', 'D'].map((l, i) => <option key={l} value={i}>{l}</option>)}
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Points</label>
                          <input className="form-input" type="number" min="0" value={newQuestion.points} onChange={e => setNewQuestion({ ...newQuestion, points: e.target.value })} style={{ width: 90 }} />
                        </div>
                        <button className="btn btn-primary" type="submit" disabled={busy}>➕ Ajouter la question</button>
                      </div>
                    </form>
                  </div>
                )}

                {selected.kind === 'vote' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(() => {
                      const total = candidateStats(selected.id).total
                      return selectedCandidates.map(c => {
                        const n = votes.filter(v => v.candidate_id === c.id).length
                        const pct = total ? Math.round((n / total) * 100) : 0
                        return (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', borderRadius: 10, padding: '0.7rem 0.85rem' }}>
                            <div style={{ flex: 1 }}>
                              <strong style={{ color: 'var(--navy)' }}>{c.name}</strong>
                              {c.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.description}</div>}
                              <div style={{ height: 8, background: '#EEF2FB', borderRadius: 99, marginTop: '0.45rem', overflow: 'hidden' }}>
                                <div style={{ width: pct + '%', height: '100%', background: 'linear-gradient(90deg, #d4af37, #b8941f)' }} />
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', minWidth: 70 }}>
                              <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{n} voix</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{pct}%</div>
                            </div>
                            <button className="btn btn-danger btn-sm" onClick={() => removeCandidate(c)}>🗑️</button>
                          </div>
                        )
                      })
                    })()}
                    {selectedCandidates.length === 0 && <p style={{ color: 'var(--text-muted)', margin: 0 }}>Aucun candidat. Ajoutez les nominés ci-dessous.</p>}
                    <form onSubmit={addCandidate} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'end', borderTop: '1px dashed var(--border)', paddingTop: '0.9rem' }}>
                      <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}>
                        <label>Nom du candidat *</label>
                        <input className="form-input" value={newCandidate.name} onChange={e => setNewCandidate({ ...newCandidate, name: e.target.value })} placeholder="Awa Koné" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}>
                        <label>Distinction / description</label>
                        <input className="form-input" value={newCandidate.description} onChange={e => setNewCandidate({ ...newCandidate, description: e.target.value })} placeholder="Meilleure danseuse" />
                      </div>
                      <button className="btn btn-primary" type="submit" disabled={busy}>➕ Ajouter</button>
                    </form>
                  </div>
                )}

                {selected.kind === 'tombola' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 160, background: '#F6F8FE', borderRadius: 10, padding: '0.85rem' }}>
                        <div className="kpi-label">Inscrits</div>
                        <div className="kpi-value" style={{ marginBottom: 0 }}>{entries.filter(e => e.animation_id === selected.id).length}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 160, background: '#F6F8FE', borderRadius: 10, padding: '0.85rem' }}>
                        <div className="kpi-label">Tirages</div>
                        <div className="kpi-value" style={{ marginBottom: 0 }}>{draws.filter(d => d.animation_id === selected.id).length}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button className="btn btn-gold" onClick={drawWinner} disabled={busy}>🎲 Tirer au sort</button>
                      </div>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', color: 'var(--navy)', marginBottom: '0.4rem' }}>Gagnants</h3>
                      {draws.filter(d => d.animation_id === selected.id).length === 0 && <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Aucun tirage effectué.</p>}
                      {draws.filter(d => d.animation_id === selected.id).map(d => {
                        const p = players.find(x => x.id === d.player_id)
                        return (
                          <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                            <span>🎉 <strong>{p?.full_name || 'Participant'}</strong>{d.prize ? ' — ' + d.prize : ''}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{new Date(d.drawn_at).toLocaleTimeString('fr-FR')}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <h2 className="card-title">🏅 Classement général</h2>
                  <span className="badge badge-gold">{ranking.length} joueur(s)</span>
                </div>
                {ranking.length === 0 && <p style={{ color: 'var(--text-muted)', margin: 0 }}>Aucun participant connecté pour l'instant.</p>}
                {ranking.slice(0, 10).map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ width: 28, fontWeight: 700, color: i === 0 ? '#b8941f' : 'var(--text-muted)' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1)}
                    </span>
                    <span style={{ flex: 1, fontWeight: 600, color: 'var(--navy)' }}>{r.name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.correct}/{r.answers} bonnes</span>
                    <strong style={{ color: 'var(--accent)' }}>{r.points} pts</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
