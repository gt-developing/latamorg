import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { fetchPublicGuide, sectionLabels } from '../lib/content'
import { markdownComponents } from '../lib/markdown.jsx'
import SEO from '../components/SEO'

export default function ContentPage() {
  const { section, slug } = useParams()
  const [item, setItem] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (section !== 'guias') return undefined
    let cancelled = false
    fetchPublicGuide(slug)
      .then((guide) => {
        if (!cancelled) {
          setItem(guide)
          setStatus(guide ? 'ready' : 'missing')
        }
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
    }
  }, [section, slug])

  if (section === 'recursos') return <Navigate to={`/guias/${slug}`} replace />
  if (status === 'loading') return <main className="px-global py-16 text-slate-400">Cargando…</main>
  if (status === 'error') {
    return <main className="px-global py-16 text-red-300">No se pudo cargar el contenido.</main>
  }

  if (!item) {
    return (
      <main className="px-global py-16">
        <h1 className="text-2xl font-bold text-white">Contenido no encontrado</h1>
        <p className="mt-2 text-slate-400">No existe esta guía.</p>
        <Link to="/guias" className="mt-4 inline-block text-accent hover:underline">
          Volver a las guías
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
        <ReactMarkdown components={markdownComponents}>{item.body}</ReactMarkdown>
      </article>
    </main>
  )
}
