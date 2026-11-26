import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase'

// Client « public » : jamais de session utilisateur.
// Indispensable pour les pages ouvertes aux participants (QR, animation, programme),
// sinon un jeton expiré présent dans le navigateur masque les données publiques (RLS anon).
export const supabasePublic = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'public-anon-key',
  { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'even-public-anon' } }
)

export default supabasePublic
