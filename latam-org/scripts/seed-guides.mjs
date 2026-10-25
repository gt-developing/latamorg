import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createSupabaseClient } from '../netlify/lib/db.mjs'
import { DEFAULT_ADMIN_ID } from '../shared/access.mjs'

const root = join('src', 'content')
const privateRoot = 'private-content'
const adminId = process.env.ADMIN_DISCORD_ID || DEFAULT_ADMIN_ID

const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

const parse = (raw) => {
  const match = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw }
  const meta = {}
  for (const line of match[1].split('\n')) {
    const index = line.indexOf(':')
    if (index === -1) continue
    meta[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^["']|["']$/g, '')
  }
  return { meta, body: match[2] }
}

const rows = []
for (const section of ['guias', 'recursos']) {
  const directory = join(root, section)
  if (!existsSync(directory)) continue
  for (const file of readdirSync(directory)) {
    if (!file.endsWith('.md') || !statSync(join(directory, file)).isFile()) continue
    const { meta, body } = parse(readFileSync(join(directory, file), 'utf8'))
    rows.push({
      section_id: null,
      slug: slugify(file.slice(0, -3)),
      title: meta.title || file.slice(0, -3),
      description: meta.description || '',
      image: meta.image || '',
      body,
      status: 'published',
      author_id: adminId,
      published_at: new Date().toISOString(),
    })
  }

  if (existsSync(privateRoot)) {
    for (const section of readdirSync(privateRoot)) {
      const directory = join(privateRoot, section)
      if (!statSync(directory).isDirectory()) continue
      for (const file of readdirSync(directory)) {
        if (!file.endsWith('.md') || !statSync(join(directory, file)).isFile()) continue
        const { meta, body } = parse(readFileSync(join(directory, file), 'utf8'))
        rows.push({
          section_id: section,
          slug: slugify(file.slice(0, -3)),
          title: meta.title || file.slice(0, -3),
          description: meta.description || '',
          image: meta.image || '',
          body,
          status: 'published',
          author_id: adminId,
          published_at: new Date().toISOString(),
        })
      }
    }
  }
}

const client = createSupabaseClient(process.env)
const { error } = await client
  .from('guides')
  .upsert(rows, { onConflict: 'section_id,slug' })

if (error) {
  console.error(error.message)
  process.exitCode = 1
} else {
  console.log(`Guías públicas sembradas: ${rows.length}`)
}
