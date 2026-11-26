import React, { useEffect, useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { getCurrentEvent } from '../lib/currentEvent'

const money = (n) => Number(n || 0).toLocaleString('fr-FR')

export default function Budget() {
  const { data: events = [], update: updateEvent, refetch } = useSupabase('events')
  const { data: finances = [] } = useSupabase('finances')
  const { data: expenses = [] } = useSupabase('expenses')
  const eventId = getCurrentEvent()
  const event = events.find(e => e.id === eventId)

  const [form, setForm] = useState({ budget_recettes: '', budget_depenses: '' })
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (event) {
      setForm({
        budget_recettes: event.budget_recettes ?? '',
        budget_depenses: event.budget_depenses ?? ''
      })
    }
  }, [event?.id, event?.budget_recettes, event?.budget_depenses])

  const budgetRecettes = Number(event?.budget_recettes || 0)
  const budgetDepenses = Number(event?.budget_depenses || 0)
  const received = finances.filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.amount || 0), 0)
  const spent = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + Number(e.amount || 0), 0)
  const committed = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + Number(e.amount || 0), 0)

  const forecastResult = budgetRecettes - budgetDepenses
  const realResult = received - spent

  const save = async (e) => {
    e.preventDefault()
    if (!eventId) return
    setSaving(true)
    setMessage('')
    try {
      await updateEvent(eventId, {
        budget_recettes: Number(form.budget_recettes) || 0,
        budget_depenses: Number(form.budget_depenses) || 0
      })
      await refetch()
      setMessage('Budget enregistré. Il est repris dans les menus Recettes et Dépenses.')
    } catch (err) {
      setMessage('Erreur : ' + (err.message || 'Enregistrement impossible'))
    } finally {
      setSaving(false)
    }
  }

  if (!eventId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-title">Budget</div>
        <div className="alert alert-danger">Choisissez d'abord un événement dans le menu Événements.</div>
      </div>
    )
  }

  const pct = (value, target) => (target > 0 ? Math.round((value / target) * 100) : 0)
  const bar = (value, target, color) => (
    <div style={{ height: 10, background: '#EDF2FB', borderRadius: 999, overflow: 'hidden', marginTop: '0.35rem' }}>
      <div style={{ width: Math.min(100, pct(value, target)) + '%', height: '100%', background: color }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <div className="page-title">Budget</div>
        <div className="page-subtitle" style={{ marginBottom: 0 }}>
          Prévisionnel de {event?.name || 'l’événement'} — synchronisé avec les menus Recettes et Dépenses.
        </div>
      </div>

      {message && (
        <div style={{ padding: '0.85rem 1rem', borderRadius: 8, background: message.startsWith('Erreur') ? 'rgba(184,26,26,0.08)' : 'rgba(26,122,58,0.08)', color: message.startsWith('Erreur') ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
          {message}
        </div>
      )}

      <div className="kpi-grid">
        <div className="card" style={{ padding: '1.25rem', marginBottom: 0 }}>
          <div className="kpi-label">Budget recettes</div>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>₣ {money(budgetRecettes)}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{pct(received, budgetRecettes)} % réalisé</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', marginBottom: 0 }}>
          <div className="kpi-label">Budget dépenses</div>
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>₣ {money(budgetDepenses)}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{pct(spent + committed, budgetDepenses)} % engagé</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', marginBottom: 0 }}>
          <div className="kpi-label">Résultat prévisionnel</div>
          <div className="kpi-value" style={{ color: forecastResult >= 0 ? 'var(--success)' : 'var(--danger)' }}>₣ {money(forecastResult)}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>recettes − dépenses prévues</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', marginBottom: 0 }}>
          <div className="kpi-label">Résultat réel</div>
          <div className="kpi-value" style={{ color: realResult >= 0 ? 'var(--success)' : 'var(--danger)' }}>₣ {money(realResult)}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{money(received)} reçus − {money(spent)} payés</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Définir le budget prévisionnel</h2>
        </div>
        <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Budget des recettes (FCFA)</label>
            <input className="form-input" type="number" min="0" value={form.budget_recettes} onChange={(e) => setForm({ ...form, budget_recettes: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Budget des dépenses (FCFA)</label>
            <input className="form-input" type="number" min="0" value={form.budget_depenses} onChange={(e) => setForm({ ...form, budget_depenses: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : '💾 Enregistrer le budget'}</button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h2 className="card-title">Recettes : prévu vs réalisé</h2>
            <span className="badge badge-gold">{pct(received, budgetRecettes)} %</span>
          </div>
          <p style={{ margin: '0 0 0.35rem', color: 'var(--text-soft)', fontSize: '0.9rem' }}>
            Réalisé (paiements reçus) : <strong>₣ {money(received)}</strong> sur ₣ {money(budgetRecettes)}
          </p>
          {bar(received, budgetRecettes, 'linear-gradient(90deg,#d4af37,#b8941f)')}
          <p style={{ margin: '0.6rem 0 0', fontSize: '0.85rem', color: received < budgetRecettes ? 'var(--warning)' : 'var(--success)' }}>
            {received < budgetRecettes
              ? 'Reste à encaisser : ₣ ' + money(budgetRecettes - received)
              : 'Objectif atteint (+₣ ' + money(received - budgetRecettes) + ')'}
          </p>
          <a href="/finances" className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }}>Ouvrir le menu Recettes</a>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h2 className="card-title">Dépenses : prévu vs réel</h2>
            <span className="badge badge-info">{pct(spent, budgetDepenses)} % payé</span>
          </div>
          <p style={{ margin: '0 0 0.35rem', color: 'var(--text-soft)', fontSize: '0.9rem' }}>
            Réel payé : <strong>₣ {money(spent)}</strong> · en attente : ₣ {money(committed)} · budget : ₣ {money(budgetDepenses)}
          </p>
          {bar(spent, budgetDepenses, 'linear-gradient(90deg,#e06a6a,#b81a1a)')}
          <p style={{ margin: '0.6rem 0 0', fontSize: '0.85rem', color: spent > budgetDepenses ? 'var(--danger)' : 'var(--success)' }}>
            {spent > budgetDepenses
              ? 'Dépassement : ₣ ' + money(spent - budgetDepenses)
              : 'Marge disponible : ₣ ' + money(budgetDepenses - spent)}
          </p>
          <a href="/expenses" className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }}>Ouvrir le menu Dépenses</a>
        </div>
      </div>
    </div>
  )
}
