// Test de bout en bout du module d'animation (Supabase réel).
// Lancement : node scripts/e2e-animation.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const raw = fs.readFileSync(path.resolve('src/lib/supabase.js'), 'utf8')
const url = raw.match(/SUPABASE_URL = '([^']+)'/)[1]
const anon = raw.match(/SUPABASE_ANON_KEY = '([^']+)'/)[1]

const admin = createClient(url, anon, { auth: { persistSession: false } })
const anonClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })

const EMAIL = process.env.E2E_EMAIL || 'admin@gala.test'
const PASSWORD = process.env.E2E_PASSWORD || 'Gala#Admin2026'
const EVENT = 1

const ok = (label, cond, extra = '') => console.log((cond ? '✅' : '❌') + ' ' + label + (extra ? ' — ' + extra : ''))

const { data: signIn, error: signInError } = await admin.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
if (signInError) {
  console.log('❌ Connexion admin impossible :', signInError.message)
  process.exit(1)
}
console.log('✅ Connecté :', signIn.user.email)

// Nettoyage préalable des animations de test
await admin.from('animations').delete().eq('event_id', EVENT).like('title', 'E2E %')

const created = []
try {
  // 1. Création des 3 animations par l'admin
  const { data: quiz, error: e1 } = await admin.from('animations')
    .insert({ event_id: EVENT, kind: 'quiz', title: 'E2E Quiz', status: 'draft' }).select().single()
  ok('création quiz', !e1 && quiz?.id, e1?.message)
  created.push(quiz?.id)

  const { data: vote, error: e2 } = await admin.from('animations')
    .insert({ event_id: EVENT, kind: 'vote', title: 'E2E Distinctions', status: 'live' }).select().single()
  ok('création vote', !e2 && vote?.id, e2?.message)
  created.push(vote?.id)

  const { data: tombola, error: e3 } = await admin.from('animations')
    .insert({ event_id: EVENT, kind: 'tombola', title: 'E2E Tombola', prize: 'Week-end', status: 'live' }).select().single()
  ok('création tombola', !e3 && tombola?.id, e3?.message)
  created.push(tombola?.id)

  const { data: question, error: e4 } = await admin.from('animation_questions').insert({
    animation_id: quiz.id, event_id: EVENT, prompt: 'E2E Capitale ?',
    options: ['Abidjan', 'Yamoussoukro', 'Bouaké'], correct_index: 1, points: 10, status: 'live',
    started_at: new Date().toISOString()
  }).select().single()
  ok('création question', !e4 && question?.id, e4?.message)

  const { data: candidate, error: e5 } = await admin.from('animation_candidates').insert({
    animation_id: vote.id, event_id: EVENT, name: 'E2E Candidat', description: 'Meilleure ambiance'
  }).select().single()
  ok('création candidat', !e5 && candidate?.id, e5?.message)

  // 2. Parcours participant (anon)
  const phone = '070000' + String(Date.now()).slice(-4)
  const { data: join, error: e6 } = await anonClient.rpc('animation_join', { p_event: EVENT, p_name: 'E2E Joueur', p_phone: phone })
  ok('inscription joueur (anon)', !e6 && join?.ok, e6?.message || join?.message)
  const player = join?.player_id

  const { data: state1, error: e7 } = await anonClient.rpc('animation_state', { p_event: EVENT, p_player: player })
  ok('état animation (anon)', !e7 && !!state1?.quiz, e7?.message)
  ok('question live visible', state1?.quiz?.prompt === 'E2E Capitale ?', state1?.quiz?.prompt)
  ok('candidat visible', (state1?.votes?.[0]?.candidates || []).some(c => c.id === candidate.id))

  const { data: ans, error: e8 } = await anonClient.rpc('animation_answer', { p_player: player, p_question: question.id, p_choice: 1 })
  ok('réponse correcte', !e8 && ans?.ok && ans?.correct === true, e8?.message || JSON.stringify(ans))

  const { data: ans2 } = await anonClient.rpc('animation_answer', { p_player: player, p_question: question.id, p_choice: 0 })
  ok('double réponse refusée', ans2?.ok === false, ans2?.message)

  const { data: v1, error: e9 } = await anonClient.rpc('animation_vote', { p_player: player, p_candidate: candidate.id })
  ok('vote enregistré', !e9 && v1?.ok, e9?.message || v1?.message)

  const { data: t1, error: e10 } = await anonClient.rpc('animation_enter', { p_player: player, p_animation: tombola.id })
  ok('participation tombola', !e10 && t1?.ok, e10?.message || t1?.message)

  const { data: state2 } = await anonClient.rpc('animation_state', { p_event: EVENT, p_player: player })
  ok('classement contient le joueur', (state2?.ranking || []).some(r => r.player_id === player && r.points >= 10), JSON.stringify(state2?.ranking?.[0]))
  ok('vote compté', state2?.votes?.[0]?.candidates?.find(c => c.id === candidate.id)?.votes >= 1)

  // 3. Tirage au sort (admin)
  const { data: draw, error: e11 } = await admin.rpc('animation_draw', { p_animation: tombola.id })
  ok('tirage tombola', !e11 && draw?.ok, e11?.message || draw?.message)

  // 4. Tirage interdit en anon
  const { data: drawAnon, error: drawAnonErr } = await anonClient.rpc('animation_draw', { p_animation: tombola.id })
  ok('tirage refusé aux participants', !!drawAnonErr || drawAnon?.ok === false, drawAnonErr?.message || drawAnon?.message)

  // 5. Doublon d'inscription (RPC register_guest)
  const { data: reg1 } = await anonClient.rpc('register_guest', {
    p_payload: { event_id: EVENT, category_id: 6, first_name: 'E2E', last_name: 'Doublon', phone: '0709090909', person_type: 'participant' }
  })
  const { data: reg2 } = await anonClient.rpc('register_guest', {
    p_payload: { event_id: EVENT, category_id: 6, first_name: 'E2E', last_name: 'Doublon', phone: '+225 07 09 09 09 09', person_type: 'participant' }
  })
  ok('première inscription', reg1?.ok === true, reg1?.message)
  ok('doublon refusé (formats différents)', reg2?.ok === false && reg2?.duplicate === true, reg2?.message)
} finally {
  // Nettoyage
  const { data: players } = await admin.from('animation_players').select('id').like('full_name', 'E2E %')
  for (const p of players || []) await admin.from('animation_players').delete().eq('id', p.id)
  const { data: guests } = await admin.from('guests').select('id').eq('last_name', 'Doublon').like('first_name', 'E2E%')
  for (const g of guests || []) {
    const { data: tickets } = await admin.from('tickets').select('id').eq('buyer_id', g.id)
    for (const t of tickets || []) {
      await admin.from('qrcodes').delete().eq('ticket_id', t.id)
      await admin.from('tickets').delete().eq('id', t.id)
    }
    await admin.from('finances').delete().eq('guest_id', g.id)
    await admin.from('guests').delete().eq('id', g.id)
  }
  for (const id of created.filter(Boolean)) await admin.from('animations').delete().eq('id', id)
  console.log('🧹 Données de test supprimées')
}
