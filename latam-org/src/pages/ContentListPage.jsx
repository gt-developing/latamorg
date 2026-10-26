import { useEffect, useMemo, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { Link, Navigate, useParams } from 'react-router-dom'
import ContentCard from '../components/ContentCard'
import { useAuth } from '../context/AuthContext'
import { fetchAvailableGuides, sectionLabels } from '../lib/content'
import SEO from '../components/SEO'

const normalize = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

export default function ContentListPage() {
  const { section } = useParams()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [allItems, setAllItems] = useState([])
  const [status, setStatus] = useState('loading')
  const label = sectionLabels[section]
  useEffect(() => {
    if (section !== 'guias') return undefined
    let cancelled = false
    fetchAvailableGuides(Boolean(user))
      .then((items) => {
        if (!cancelled) {
          setAllItems(items)
          setStatus('ready')
        }
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
    }
  }, [section, user])

  const items = useMemo(() => {
    const sectionItems = section === 'guias' ? allItems : allItems.filter((item) => item.section === section)
    const normalizedQuery = normalize(query.trim())

    if (!normalizedQuery) return sectionItems

    return sectionItems.filter((item) =>
      normalize(`${item.title} ${item.description}`).includes(normalizedQuery),
    )
  }, [allItems, query, section])

  if (section === 'recursos') return <Navigate to="/guias" replace />

  if (!label) {
    return (
      <main className="px-global py-16">
        <h1 className="text-2xl font-bold text-white">Sección no encontrada</h1>
        <Link to="/" className="mt-4 inline-block text-accent hover:underline">
          Volver al inicio
        </Link>
      </main>
    )
  }

  return (
    <main className="px-global py-12">
      <SEO
        title={`${label}s de Star Citizen en español | LATAM Org`}
        description={`Explora las ${label.toLowerCase()}s de LATAM Org sobre Star Citizen: contenido práctico y recursos para la comunidad hispanohablante.`}
      />
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-accent">{label}s</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
          Todo el contenido
        </h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Explora nuestra colección completa de {section === 'guias' ? 'guías' : 'recursos'}.
        </p>
        <label className="mt-6 flex max-w-xl items-center gap-3 rounded-xl border border-white/10 bg-space-800 px-4 py-3 transition focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20">
          <FiSearch className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="sr-only">Buscar {label.toLowerCase()}s</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Buscar ${section === 'guias' ? 'guías' : 'recursos'}…`}
            autoComplete="off"
            className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
        </label>
      </header>

      {status === 'loading' ? (
        <p className="text-slate-400">Cargando guías…</p>
      ) : status === 'error' ? (
        <p className="rounded-2xl border border-red-400/30 bg-red-400/10 p-6 text-sm text-red-200">
          No se pudieron cargar las guías. Intenta de nuevo.
        </p>
      ) : items.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
          {query.trim()
            ? `No encontramos ${section === 'guias' ? 'guías' : 'recursos'} para “${query}”.`
            : 'Próximamente encontrarás contenido aquí.'}
        </p>
      )}
    </main>
  )
}
