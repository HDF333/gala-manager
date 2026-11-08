import React, { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Scan() {
  const { profile } = useAuth()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [scanning, setScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  const startCamera = async () => {
    setError('')
    setResult(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)
      requestAnimationFrame(tick)
    } catch (e) {
      setError('Caméra indisponible : ' + (e.message || 'vérifiez les autorisations du navigateur.'))
    }
  }

  const tick = () => {
    if (!videoRef.current || !streamRef.current) return
    const video = videoRef.current
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (code && code.data) {
        stopCamera()
        validate(code.data)
        return
      }
    }
    if (streamRef.current) requestAnimationFrame(tick)
  }

  const validate = async (rawCode) => {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      let code = rawCode
      try {
        const parsed = JSON.parse(rawCode)
        code = parsed.code || parsed.ticket_code || rawCode
      } catch { /* pas du JSON */ }
      const { data, error: rpcError } = await supabase.rpc('validate_access', { p_qr_code: String(code) })
      if (rpcError) throw rpcError
      setResult(data)
      if (!data?.ok) setError(data?.message || 'Accès refusé')
    } catch (e) {
      setError('Erreur : ' + (e.message || 'Validation impossible'))
    } finally {
      setBusy(false)
    }
  }

  if (!profile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-title">Scanner QR</div>
        <p style={{ color: '#a0a0a0' }}>Chargement de votre profil...</p>
      </div>
    )
  }

  if (!(profile.role === 'Administrateur' || (profile.permissions || []).includes('scan_qr'))) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-title">Scanner QR</div>
        <div className="alert alert-danger">Accès réservé aux vérificateurs. Contactez l'administrateur pour obtenir un compte de type « Vérificateur ».</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-title">Scanner QR — Contrôle d'accès</div>
      <div className="page-subtitle">
        {profile.role === 'Vérificateur' ? 'Vérificateur : vous validez uniquement l’accès de votre événement.' : 'Administrateur : accès à tous les événements.'}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {result?.ok && (
        <div className="alert alert-success">
          ✅ Accès autorisé — {result.guest?.first_name} {result.guest?.last_name} · Table {result.guest?.category} n°{String(result.guest?.table_number).padStart(3, '0')}
          {result.guest?.people_count > 1 ? ` · ${result.guest.people_count} personnes` : ''}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Scanner</h2>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <video ref={videoRef} style={{ width: '100%', maxWidth: '360px', borderRadius: '12px', background: '#000', display: scanning ? 'block' : 'none' }} muted playsInline />
          {!scanning ? (
            <button className="btn btn-gold" onClick={startCamera}>📷 Activer la caméra</button>
          ) : (
            <button className="btn btn-secondary" onClick={stopCamera}>⏹ Arrêter</button>
          )}
          <div style={{ width: '100%', maxWidth: '360px' }}>
            <label style={{ display: 'block', color: '#a0a0a0', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Ou saisir le code manuellement</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="form-input" placeholder="Code du billet..." value={manualCode} onChange={(e) => setManualCode(e.target.value)} />
              <button className="btn btn-primary" disabled={busy || !manualCode} onClick={() => validate(manualCode)}>Valider</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
