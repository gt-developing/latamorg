// Convierte private-content/<rol>/<guia>.md en un módulo que solo usa la función del servidor.
// Así las guías confidenciales NUNCA entran al JavaScript público del sitio.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROLE_IDS } from '../shared/access.mjs'

const SOURCE = 'private-content'
const OUTPUT = join('netlify', 'lib', 'private-guides.generated.mjs')

function parse(raw) {
  const match = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw }
  const meta = {}
  for (const line of match[1].split('\n')) {
    const index = line.indexOf(':')
    if (index === -1) continue
    meta[line.slice(0, index).trim()] = line
      .slice(index + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
  }
  return { meta, body: match[2] }
}

const guides = []

if (existsSync(SOURCE)) {
  for (const role of readdirSync(SOURCE)) {
    const dir = join(SOURCE, role)
    if (!statSync(dir).isDirectory()) continue
    if (!ROLE_IDS.includes(role)) {
      console.warn(`⚠ "${dir}" no coincide con ningún rol de shared/access.mjs: se ignora`)
      continue
    }
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.md')) continue
      const slug = file.replace(/\.md$/, '')
      const { meta, body } = parse(readFileSync(join(dir, file), 'utf8'))
      guides.push({
        role,
        slug,
        title: meta.title || slug,
        description: meta.description || '',
        body,
      })
    }
  }
}

writeFileSync(OUTPUT, `export default ${JSON.stringify(guides, null, 2)}\n`)
console.log(`Guías privadas incluidas en la función: ${guides.length}`)
