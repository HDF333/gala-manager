import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const projectDir = path.resolve(process.argv[2] || '.')

let raw
try { raw = fs.readFileSync(path.resolve(projectDir, 'src/lib/supabase.js'), 'utf8') }
catch {
  try { raw = fs.readFileSync(path.resolve(projectDir, 'src/lib/supabase.js'), 'utf8') }
  catch (e){ throw new Error('Could not read src/lib/supabase.js from project root') }
}

const urlMatch = raw.match(/SUPABASE_URL = '([^']+)'/)
const keyMatch = raw.match(/SUPABASE_ANON_KEY = '([^']+)'/)
if (!urlMatch || !keyMatch) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY not found in src/lib/supabase.js')

const supabase = createClient(urlMatch[1], keyMatch[1], { auth: { persistSession: false, autoRefreshToken: false } })

const email = process.env.ADMIN_EMAIL || 'admin@app.galamanager.test'
const password = process.env.ADMIN_PASSWORD || 'GalaManager2026!'

async function main() {
  const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    console.error('Auth signInWithPassword failed:', signInError.code, signInError.message)
    process.exit(1)
  }
  if (!signIn?.session) {
    console.error('No session returned from signInWithPassword')
    process.exit(1)
  }
  console.log('Authenticated as', signIn.user.email)
  console.log('Session present:', !!signIn.session.access_token)

  await fs.promises.writeFile(
    path.join(projectDir, 'admin-session.json'),
    JSON.stringify({ email: signIn.user.email, created: new Date().toISOString() }, null, 2)
  )
  console.log('Session metadata written to admin-session.json')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
