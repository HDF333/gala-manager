import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const root = path.resolve('C:/Users/Utilisateur/Projects/gala-manager')
const raw = fs.readFileSync(path.join(root, 'src/lib/supabase.js'), 'utf8')
const url = raw.match(/SUPABASE_URL = '([^']+)'/)[1]
const key = raw.match(/SUPABASE_ANON_KEY = '([^']+)'/)[1]
const supabase = createClient(url, key, { auth: { persistSession: false } })

const email = 'admin@gala.test'
const password = 'Gala#Admin2026'

const { data, error } = await supabase.auth.signInWithPassword({ email, password })
if (error) {
  console.log(JSON.stringify({ ok: false, code: error.code, message: error.message }))
  process.exit(1)
}
console.log(JSON.stringify({ ok: true, userId: data.user.id, emailConfirmed: !!data.user.email_confirmed_at, sessionOk: !!data.session }))
