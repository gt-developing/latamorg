import { useEffect } from 'react'

const DEFAULT_DESCRIPTION =
  'LATAM Org: comunidad hispanohablante de Star Citizen con guías, recursos y un espacio para compartir aventuras en el universo.'
const DEFAULT_IMAGE = '/logo.png'

function setMeta(name, content, attribute = 'name') {
  let element = document.head.querySelector(`meta[${attribute}="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, name)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function setLink(rel, href) {
  let element = document.head.querySelector(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

export default function SEO({
  title = 'LATAM Org | Comunidad de Star Citizen',
  description = DEFAULT_DESCRIPTION,
  type = 'website',
  image = DEFAULT_IMAGE,
  structuredData,
}) {
  useEffect(() => {
    const siteUrl = window.location.origin
    const canonicalUrl = `${siteUrl}${window.location.pathname}`
    const imageUrl = new URL(image, siteUrl).href

    document.title = title
    setMeta('description', description)
    setMeta('robots', 'index, follow')
    setLink('canonical', canonicalUrl)

    setMeta('og:title', title, 'property')
    setMeta('og:description', description, 'property')
    setMeta('og:type', type, 'property')
    setMeta('og:url', canonicalUrl, 'property')
    setMeta('og:image', imageUrl, 'property')
    setMeta('og:site_name', 'LATAM Org', 'property')
    setMeta('og:locale', 'es_ES', 'property')
    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', title)
    setMeta('twitter:description', description)
    setMeta('twitter:image', imageUrl)

    let schema = document.head.querySelector('script[data-seo-schema]')
    if (!schema) {
      schema = document.createElement('script')
      schema.type = 'application/ld+json'
      schema.dataset.seoSchema = 'true'
      document.head.appendChild(schema)
    }
    schema.textContent = JSON.stringify(
      structuredData || {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'LATAM Org',
        url: siteUrl,
        logo: imageUrl,
        description: DEFAULT_DESCRIPTION,
      },
    )
  }, [description, image, structuredData, title, type])

  return null
}
