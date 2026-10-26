import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { fetchPublicGuide, getItem, sectionLabels } from '../lib/content'
import SEO from '../components/SEO'
import { safeMarkdownUrl } from '../lib/markdown'

export default function ContentPage() {
  const { section, slug } = useParams()
  const [remoteItem, setRemoteItem] = useState(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (section !== 'guias') return undefined
    let cancelled = false
    fetchPublicGuide(slug).then((guide) => {
      if (!cancelled) { setRemoteItem(guide); setLoaded(true) }
    }).catch(() => !cancelled && setLoaded(true))
    return () => { cancelled = true }
  }, [section, slug])
  const item = section === 'guias' ? remoteItem : getItem(section, slug)

  if (section === 'guias' && !loaded) return <main className="px-global py-16 text-slate-400">Cargando guía…</main>

  if (!item) {
    return (
      <main className="px-global py-16">
        <h1 className="text-2xl font-bold text-white">Contenido no encontrado</h1>
        <p className="mt-2 text-slate-400">No existe esta guía o recurso.</p>
        <Link to="/" className="mt-4 inline-block text-accent hover:underline">
          Volver al inicio
        </Link>
      </main>
    )
  }

  return (
    <main className="px-global py-12">
      <SEO
        title={`${item.title} | LATAM Org`}
        description={item.description || `Lee ${item.title} en LATAM Org, comunidad hispanohablante de Star Citizen.`}
        type="article"
        image={item.image}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: item.title,
          description: item.description,
          image: item.image ? [item.image] : undefined,
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${window.location.origin}${window.location.pathname}`,
          },
          publisher: {
            '@type': 'Organization',
            name: 'LATAM Org',
            logo: {
              '@type': 'ImageObject',
              url: `${window.location.origin}/logo.png`,
            },
          },
        }}
      />
      <article className="content-prose prose prose-invert prose-headings:text-white prose-a:text-accent prose-img:rounded-xl max-w-3xl">
        <p className="!mb-2 text-xs font-medium uppercase tracking-widest text-accent">
          {sectionLabels[item.section]}
        </p>
        <h1>{item.title}</h1>
        {item.description && <p className="lead text-slate-400">{item.description}</p>}
        <ReactMarkdown urlTransform={safeMarkdownUrl}>{item.body}</ReactMarkdown>
      </article>
    </main>
  )
}
