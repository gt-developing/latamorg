// Importación de una sola vez de guías Markdown públicas y privadas a Supabase.
// Ejecutar con SUPABASE_URL, SUPABASE_SECRET_KEY y ADMIN_DISCORD_ID configurados.
import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_ADMIN_ID } from '../../shared/access.mjs'

const { SUPABASE_URL, SUPABASE_SECRET_KEY, ADMIN_DISCORD_ID } = process.env
const adminId = ADMIN_DISCORD_ID || DEFAULT_ADMIN_ID
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error('Configura SUPABASE_URL y SUPABASE_SECRET_KEY en el entorno')
}
const client = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const owner = await client.from('users').select('id').eq('id', adminId).maybeSingle()
if (owner.error) throw new Error(owner.error.message)
if (!owner.data) throw new Error('El administrador debe iniciar sesión antes de importar las guías')

function parseMarkdown(raw) {
  const match = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  const meta = {}
  if (match) for (const line of match[1].split('\n')) {
    const index = line.indexOf(':')
    if (index > 0) meta[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')
  }
  return { meta, body: match ? match[2] : raw }
}

const slugify = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
let imported = 0
let skipped = 0

async function importGuide({ sectionId, file, directory }) {
  const sourceSlug = file.slice(0, -3)
  const slug = slugify(sourceSlug)
  if (!slug) return
  const { meta, body } = parseMarkdown(await readFile(join(directory, file), 'utf8'))
  let query = client.from('guides').select('id').eq('slug', slug)
  query = sectionId ? query.eq('section_id', sectionId) : query.is('section_id', null)
  const match = await query.maybeSingle()
  if (match.error) throw new Error(match.error.message)
  if (match.data) { skipped += 1; return }
  const result = await client.from('guides').insert({
    section_id: sectionId,
    slug,
    title: meta.title || sourceSlug,
    description: meta.description || '',
    image: meta.image || '',
    body,
    status: 'published',
    author_id: adminId,
    published_at: new Date().toISOString(),
  })
  if (result.error) throw new Error(result.error.message)
  imported += 1
}

const publicDirectory = join('src', 'content', 'guias')
for (const file of await readdir(publicDirectory)) {
  if (file.endsWith('.md')) await importGuide({ sectionId: null, file, directory: publicDirectory })
}

for (const sectionId of await readdir('private-content')) {
  const directory = join('private-content', sectionId)
  if (!(await stat(directory)).isDirectory()) continue
  for (const file of await readdir(directory)) {
    if (file.endsWith('.md')) await importGuide({ sectionId, file, directory })
  }
}

console.log(`Guías importadas: ${imported}; ya existentes y conservadas: ${skipped}`)
