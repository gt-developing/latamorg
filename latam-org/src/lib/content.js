import { ROLES } from '../../shared/access.mjs'

export const sectionLabels = { guias: 'Guía', recursos: 'Recurso', ...Object.fromEntries(ROLES.map((role) => [role.id, role.label])) }
const files = import.meta.glob('../content/recursos/**/*.md', { eager: true, query: '?raw', import: 'default' })

function parseFile(path, raw) {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/)
  const meta = {}
  if (match) for (const line of match[1].split(/\r?\n/)) {
    const divider = line.indexOf(':')
    if (divider > 0) meta[line.slice(0, divider).trim()] = line.slice(divider + 1).trim().replace(/^['"]|['"]$/g, '')
  }
  const section = path.includes('/recursos/') ? 'recursos' : 'guias'
  const slug = path.split('/').at(-1).replace(/\.md$/, '')
  return { id: `repo:${section}:${slug}`, slug, title: meta.title || slug, description: meta.description || '', image: meta.image || '', body: match ? match[2] : raw, section, type: sectionLabels[section], href: `/${section}/${encodeURIComponent(slug)}` }
}

const repositoryResources = Object.entries(files).map(([path, raw]) => parseFile(path, raw))
export const searchIndex = repositoryResources

const mapGuide = (guide) => ({ ...guide, section: 'guias', type: 'Guía', href: `/guias/${encodeURIComponent(guide.slug)}` })

export async function fetchPublicGuides() {
  try {
    const response = await fetch('/api/guides', { credentials: 'same-origin' })
    if (!response.ok) throw new Error('No se pudieron cargar las guías')
    const { guides = [] } = await response.json()
    return guides.map(mapGuide)
  } catch {
    return []
  }
}

export async function fetchPublicGuide(slug) {
  const canonicalSlug = ({ 'Primeros pasos': 'Primeros-pasos' })[slug] ?? slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
  for (const candidate of [...new Set([slug, canonicalSlug])]) {
    try {
      const response = await fetch(`/api/guides/${encodeURIComponent(candidate)}`, { credentials: 'same-origin' })
      if (response.ok) {
        const { guide } = await response.json()
        if (guide) return mapGuide(guide)
      }
    } catch {
      // La página mostrará el estado de contenido no encontrado.
    }
  }
  return null
}

export function getItem(section, slug) {
  return section === 'recursos' ? repositoryResources.find((item) => item.slug === slug) ?? null : null
}
