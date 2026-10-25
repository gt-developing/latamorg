import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LoginPrompt from '../components/LoginPrompt'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, permissions, loading } = useAuth()
  const [state, setState] = useState({ status: 'loading', guides: [], sections: [] })

  useEffect(() => {
    if (!user) return undefined
    fetch('/api/dashboard/guides', { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) throw new Error()
        return response.json()
      })
      .then((data) => setState({ status: 'ready', guides: data.guides, sections: data.sections }))
      .catch(() => setState({ status: 'error', guides: [], sections: [] }))
  }, [user])

  if (loading) return <main className="px-global py-16 text-slate-400">Cargando…</main>
  if (!user) {
    return (
      <main className="px-global py-16">
        <LoginPrompt next="/dashboard" title="Dashboard de guías" text="Inicia sesión para gestionar contenido." />
      </main>
    )
  }
  if (permissions.publishGuides.length === 0) {
    return <main className="px-global py-16 text-slate-400">No tienes permisos para gestionar guías.</main>
  }
  if (state.status === 'loading') return <main className="px-global py-16 text-slate-400">Cargando guías…</main>
  if (state.status === 'error') return <main className="px-global py-16 text-red-300">No se pudo cargar el dashboard.</main>

  return (
    <main className="px-global py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Contenido</p>
            <h1 className="mt-3 text-4xl font-extrabold text-white">Mis guías</h1>
          </div>
          <Link to="/dashboard/guides/new" className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-space-900">
            Nueva guía
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.guides.map((guide) => (
            <Link key={guide.id} to={`/dashboard/guides/${guide.id}`} className="rounded-2xl border border-white/10 bg-space-800/60 p-5 hover:border-accent/50">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold text-white">{guide.title}</h2>
                <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase text-slate-300">{guide.status}</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{guide.sectionId ? state.sections.find((section) => section.id === guide.sectionId)?.label : 'Público'}</p>
              {guide.description && <p className="mt-3 line-clamp-2 text-sm text-slate-400">{guide.description}</p>}
            </Link>
          ))}
        </div>
        {state.guides.length === 0 && <p className="mt-8 text-slate-400">Todavía no hay guías gestionables.</p>}
      </div>
    </main>
  )
}
