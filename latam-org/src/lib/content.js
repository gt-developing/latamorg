// Carga todos los .md de src/content/guias y src/content/recursos.
// Para añadir contenido nuevo solo crea un archivo .md en la carpeta correspondiente.
const sources = {
  guias: import.meta.glob('../content/guias/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  recursos: import.meta.glob('../content/recursos/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
}

export const sectionLabels = {
  guias: 'Guía',
  recursos: 'Recurso',
}

// Lee el bloque inicial entre --- (title, description) y separa el cuerpo.
function parse(raw) {
  const match = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw }

  const meta = {}
  for (const line of match[1].split('\n')) {
    const i = line.indexOf(':')
    if (i === -1) continue
    meta[line.slice(0, i).trim()] = line
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
  }
  return { meta, body: match[2] }
}

const items = Object.entries(sources).flatMap(([section, files]) =>
  Object.entries(files).map(([path, raw]) => {
    const slug = path.split('/').pop().replace(/\.md$/, '')
    const { meta, body } = parse(raw)
    return {
      id: `${section}/${slug}`,
      section,
      slug,
      type: sectionLabels[section],
      title: meta.title || slug,
      description: meta.description || '',
      image: meta.image || '',
      body,
      href: `/${section}/${slug}`,
    }
  }),
)

export const searchIndex = items

export const getItem = (section, slug) =>
  items.find((item) => item.section === section && item.slug === slug)