import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { getItem, sectionLabels } from '../lib/content'

export default function ContentPage() {
  const { section, slug } = useParams()
  const item = getItem(section, slug)

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
      <article className="content-prose prose prose-invert prose-headings:text-white prose-a:text-accent prose-img:rounded-xl max-w-3xl">
        <p className="!mb-2 text-xs font-medium uppercase tracking-widest text-accent">
          {sectionLabels[item.section]}
        </p>
        <h1>{item.title}</h1>
        {item.description && <p className="lead text-slate-400">{item.description}</p>}
        <ReactMarkdown>{item.body}</ReactMarkdown>
      </article>
    </main>
  )
}