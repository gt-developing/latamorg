export const sectionLabels = {
  guias: 'Guía',
  recursos: 'Recurso',
}

const mapGuide = (guide) => ({
  ...guide,
  section: 'guias',
  type: 'Guía',
  href: `/guias/${guide.slug}`,
})

export async function fetchPublicGuides() {
  const response = await fetch('/api/guides', { credentials: 'same-origin' })
  if (!response.ok) throw new Error('No se pudieron cargar las guías')
  const data = await response.json()
  return (data.guides ?? []).map(mapGuide)
}

export async function fetchPublicGuide(slug) {
  const response = await fetch(`/api/guides/${encodeURIComponent(slug)}`, {
    credentials: 'same-origin',
  })
  if (!response.ok) return null
  const data = await response.json()
  return data.guide ? mapGuide(data.guide) : null
}
