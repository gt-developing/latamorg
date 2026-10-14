import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import LoginPrompt from '../components/LoginPrompt'
import { useAuth } from '../context/AuthContext'

const messages = {
  forbidden: {
    title: 'No tienes permiso',
    text: 'Tu cuenta no tiene el rol necesario para ver esta guía. Pide acceso a un administrador.',
  },
  notfound: {
    title: 'Guía no encontrada',
    text: 'Esta guía no existe o fue movida.',
  },
  error: {
    title: 'No se pudo cargar',
    text: 'Ocurrió un error al cargar la guía. Intenta de nuevo en un momento.',
  },
}

export default function PrivateGuide() {
  const { role, slug } = useParams()
  const { user, loading } = useAuth()
  const [state, setState] = useState({ status: 'loading', guide: null })

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    setState({ status: 'loading', guide: null })
    fetch(`/api/private/guides/${encodeURIComponent(role)}/${encodeURIComponent(slug)}`, {
      credentials: 'same-origin',
    })
      .then(async (res) => {
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          setState({ status: 'ready', guide: data.guide })
        } else if (res.status === 403) setState({ status: 'forbidden', guide: null })
        else if (res.status === 404) setState({ status: 'notfound', guide: null })
        else setState({ status: 'error', guide: null })
      })
      .catch(() => !cancelled && setState({ status: 'error', guide: null }))
    return () => {
      cancelled = true
    }
  }, [user, role, slug])

  if (loading) {
    return <main className="px-global py-16 text-slate-400">Cargando…</main>
  }

  if (!user) {
    return (
      <main className="px-global py-16">
        <LoginPrompt
          next={`/privadas/${role}/${slug}`}
          title="Guía confidencial"
          text="Inicia sesión con tu cuenta de Discord para comprobar si tienes acceso a esta guía."
        />
      </main>
    )
  }

  if (state.status === 'loading') {
    return <main className="px-global py-16 text-slate-400">Cargando guía…</main>
  }

  if (state.status !== 'ready') {
    const message = messages[state.status]
    return (
      <main className="px-global py-16">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-bold text-white">{message.title}</h1>
          <p className="mt-3 text-slate-400">{message.text}</p>
          <Link to="/privadas" className="mt-6 inline-block text-sm font-semibold text-accent hover:underline">
            Volver a guías privadas
          </Link>
        </div>
      </main>
    )
  }

  const { guide } = state
  return (
    <main className="px-global py-12">
      <article className="prose prose-invert prose-headings:text-white prose-a:text-accent prose-img:rounded-xl max-w-3xl">
        <p className="!mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
          Confidencial · {guide.roleLabel}
        </p>
        <h1>{guide.title}</h1>
        {guide.description && <p className="lead text-slate-400">{guide.description}</p>}
        <ReactMarkdown>{guide.body}</ReactMarkdown>
      </article>
      <Link to="/privadas" className="mt-10 inline-block text-sm font-semibold text-accent hover:underline">
        ← Volver a guías privadas
      </Link>
    </main>
  )
}
