import React, { useMemo, useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { getCurrentEvent } from '../lib/currentEvent'
import { useI18n } from '../lib/i18n'

const money = (n) => Number(n || 0).toLocaleString('fr-FR')

export default function Finances() {
  const { t } = useI18n()
  const { data: finances = [], insert: addFinance, update: updateFinance, del: deleteFinance } = useSupabase('finances')
  const { data: events = [] } = useSupabase('events')
  const activeEvent = events.find(e => e.id === getCurrentEvent())

  const [form, setForm] = useState({ label: '', amount: '', status: 'paid', payment_date: '' })
  const [editing, setEditing] = useState(null)
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('all')

  const sales = finances.filter(f => f.type === 'Vente')
  const manualRows = finances.filter(f => f.type !== 'Vente')

  const sum = (rows, status) => rows.filter(r => r.status === status).reduce((s, r) => s + Number(r.amount || 0), 0)

  const salesPaid = sum(sales, 'paid')
  const salesPending = sum(sales, 'pending')
  const manualPaid = sum(manualRows, 'paid')
  const manualPending = sum(manualRows, 'pending')

  // Seuls les paiements reçus sont comptabilisés.
  const received = salesPaid + manualPaid
  const pending = salesPending + manualPending
  const total = received + pending
  const budget = activeEvent?.budget_recettes ? Number(activeEvent.budget_recettes) : null

  const visibleRows = useMemo(() => {
    const rows = filter === 'sales' ? sales : filter === 'manual' ? manualRows : finances
    return [...rows].sort((a, b) => String(b.payment_date || '').localeCompare(String(a.payment_date || '')) || b.id - a.id)
  }, [finances, filter, sales, manualRows])

  const resetForm = () => {
    setEditing(null)
    setForm({ label: '', amount: '', status: 'paid', payment_date: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      const payload = {
        type: 'Manuel',
        reference: form.label.trim() || null,
        amount: Number(form.amount) || 0,
        status: form.status,
        payment_date: form.payment_date || new Date().toISOString().slice(0, 10)
      }
      if (editing) {
        await updateFinance(editing, payload)
        setMessage(t('finance.updated'))
      } else {
        await addFinance(payload)
        setMessage(t('finance.added'))
      }
      resetForm()
    } catch (err) {
      setMessage(t('common.error') + ' : ' + (err.message || ''))
    }
  }

  const startEdit = (row) => {
    setEditing(row.id)
    setForm({
      label: row.reference || '',
      amount: row.amount || '',
      status: row.status || 'paid',
      payment_date: row.payment_date || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const remove = async (row) => {
    if (!window.confirm(t('common.confirmDelete'))) return
    try {
      await deleteFinance(row.id)
      setMessage(t('finance.deleted'))
    } catch (err) {
      setMessage(t('common.error') + ' : ' + err.message)
    }
  }

  const kpiStyle = { padding: '1.25rem', marginBottom: 0 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <div className="page-title">{t('finance.title')}</div>
        <div className="page-subtitle" style={{ marginBottom: 0 }}>{t('finance.subtitle')}</div>
      </div>

      {message && (
        <div style={{ padding: '0.85rem 1rem', borderRadius: 8, background: message.startsWith(t('common.error')) ? 'rgba(184,26,26,0.08)' : 'rgba(26,122,58,0.08)', color: message.startsWith(t('common.error')) ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
          {message}
        </div>
      )}

      <div className="kpi-grid">
        <div className="card" style={kpiStyle}>
          <div className="kpi-label">{t('finance.received')}</div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>₣ {money(received)}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {t('finance.salesReceived')} : ₣ {money(salesPaid)} · {t('finance.manual')} : ₣ {money(manualPaid)}
          </div>
        </div>
        <div className="card" style={kpiStyle}>
          <div className="kpi-label">{t('finance.pending')}</div>
          <div className="kpi-value" style={{ color: 'var(--warning)' }}>₣ {money(pending)}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {t('finance.salesPending')} : ₣ {money(salesPending)} · {t('finance.manual')} : ₣ {money(manualPending)}
          </div>
        </div>
        <div className="card" style={kpiStyle}>
          <div className="kpi-label">{t('finance.total')}</div>
          <div className="kpi-value">₣ {money(total)}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {total > 0 ? Math.round((received / total) * 100) : 0} % {t('finance.received').toLowerCase()}
          </div>
        </div>
        <div className="card" style={kpiStyle}>
          <div className="kpi-label">{t('finance.budget')}</div>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>{budget !== null ? '₣ ' + money(budget) : '—'}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {budget ? Math.round((received / budget) * 100) + ' % ' + t('finance.received').toLowerCase() : '—'}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{editing ? t('finance.editTitle') : t('finance.addTitle')}</h2>
          <span className="badge badge-gold">{t('finance.typeFixed')}</span>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{t('finance.label')}</label>
            <input
              className="form-input"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Sponsor, don, billetterie physique…"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{t('finance.amount')}</label>
            <input className="form-input" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{t('finance.statusLabel')}</label>
            <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="paid">{t('status.paid')}</option>
              <option value="pending">{t('status.unpaid')}</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{t('finance.dateLabel')}</label>
            <input className="form-input" type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary">{editing ? t('finance.update') : t('finance.add')}</button>
            {editing && <button type="button" className="btn btn-secondary" onClick={resetForm}>{t('common.cancel')}</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{t('finance.list')}</h2>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[['all', t('finance.filterAll')], ['sales', t('finance.filterSales')], ['manual', t('finance.filterManual')]].map(([key, label]) => (
              <button
                key={key}
                className={'btn btn-sm ' + (filter === key ? 'btn-primary' : 'btn-secondary')}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {visibleRows.length === 0 && <p style={{ color: 'var(--text-muted)', margin: 0 }}>{t('finance.noRows')}</p>}

        {visibleRows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#F6F8FE', color: 'var(--text-soft)', fontWeight: 600 }}>
                  <th style={{ padding: '0.7rem', textAlign: 'left' }}>{t('common.date')}</th>
                  <th style={{ padding: '0.7rem', textAlign: 'left' }}>{t('common.type')}</th>
                  <th style={{ padding: '0.7rem', textAlign: 'right' }}>{t('common.amount')}</th>
                  <th style={{ padding: '0.7rem', textAlign: 'left' }}>{t('finance.reference')}</th>
                  <th style={{ padding: '0.7rem', textAlign: 'left' }}>{t('finance.qr')}</th>
                  <th style={{ padding: '0.7rem', textAlign: 'left' }}>{t('common.status')}</th>
                  <th style={{ padding: '0.7rem', textAlign: 'right' }}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((f) => {
                  const isSale = f.type === 'Vente'
                  return (
                    <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.7rem' }}>{f.payment_date || '-'}</td>
                      <td style={{ padding: '0.7rem' }}>
                        <span className={`badge ${isSale ? 'badge-info' : 'badge-gold'}`}>
                          {isSale ? t('finance.typeSale') : t('finance.typeFixed')}
                        </span>
                      </td>
                      <td style={{ padding: '0.7rem', textAlign: 'right', fontWeight: 600 }}>₣ {money(f.amount)}</td>
                      <td style={{ padding: '0.7rem', fontSize: '0.82rem', color: 'var(--text-soft)' }}>{f.reference || f.id}</td>
                      <td style={{ padding: '0.7rem' }}>
                        {f.qr_code ? <code style={{ fontSize: '0.76rem', background: '#EDF2FB', padding: '0.15rem 0.4rem', borderRadius: 4 }}>{f.qr_code}</code> : '—'}
                      </td>
                      <td style={{ padding: '0.7rem' }}>
                        <span className={`badge ${f.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                          {f.status === 'paid' ? t('status.paid') : t('status.unpaid')}
                        </span>
                      </td>
                      <td style={{ padding: '0.7rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {isSale ? (
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>🔒 {t('finance.typeSale')}</span>
                        ) : (
                          <>
                            <button className="btn btn-secondary btn-sm" style={{ marginRight: '0.4rem' }} onClick={() => startEdit(f)}>✏️</button>
                            <button className="btn btn-danger btn-sm" onClick={() => remove(f)}>🗑️</button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
