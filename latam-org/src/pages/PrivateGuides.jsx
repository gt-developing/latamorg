import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaLock } from 'react-icons/fa'
import LoginPrompt from '../components/LoginPrompt'
import { useAuth } from '../context/AuthContext'

export default function PrivateGuides() {
  const { user, roles, isAdmin, loading } = useAuth()
  const [guides, setGuides] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    setStatus('loading')
    fetch('/api/private/guides', { credentials: 'same-origin' })
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setGuides(data.guides)
        setStatus('ready')
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
    }
  }, [user])

  if (loading) {
    return <main className="px-global py-16 text-slate-400">Cargando…</main>
  }

  if (!user) {
    return (
      <main className="px-global py-16">
        <LoginPrompt
          next="/privadas"
          title="Guías de la organización"
          text="Estas guías son confidenciales. Inicia sesión con tu cuenta de Discord para ver las que tu rol tiene permitidas."
        />
      </main>
    )
  }

  const groups = guides.reduce((result, guide) => {
    const group = result.find((item) => item.id === guide.role)
    if (group) group.items.push(guide)
    else result.push({ id: guide.role, label: guide.roleLabel, items: [guide] })
    return result
  }, [])

  return (
    <main className="px-global py-12">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Confidencial</p>
        <h1 className="mt-3 text-4xl font-extrabold text-white">Guías privadas</h1>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <span>Tus accesos:</span>
          {isAdmin ? (
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
              Administrador · todas las secciones
            </span>
          ) : roles.length > 0 ? (
            roles.map((id) => (
              <span
                key={id}
                className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent"
              >
                {id}
              </span>
            ))
          ) : (
            <span>ninguno todavía</span>
          )}
        </div>

        {status === 'loading' && <p className="mt-10 text-slate-400">Cargando guías…</p>}
        {status === 'error' && (
          <p className="mt-10 text-red-300">No se pudieron cargar las guías. Intenta de nuevo.</p>
        )}

        {status === 'ready' && groups.length === 0 && (
          <div className="mt-10 rounded-2xl border border-white/10 p-8 text-center text-slate-400">
            Todavía no tienes acceso a guías privadas. Pide a un administrador que te asigne el rol
            de tu sección.
          </div>
        )}

        {status === 'ready' &&
          groups.map((group) => (
            <section key={group.id} className="mt-10">
              <h2 className="text-lg font-bold text-white">{group.label}</h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {group.items.map((guide) => (
                  <li key={`${guide.role}/${guide.slug}`}>
                    <Link
                      to={`/privadas/${guide.role}/${guide.slug}`}
                      className="group flex h-full gap-4 rounded-2xl border border-white/10 bg-space-800/60 p-5 transition hover:border-accent/50"
                    >
                      <FaLock className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      <div>
                        <p className="font-semibold text-white group-hover:text-accent">
                          {guide.title}
                        </p>
                        {guide.description && (
                          <p className="mt-1 text-sm text-slate-400">{guide.description}</p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </main>
  )
}
