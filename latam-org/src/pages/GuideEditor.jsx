import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '../context/AuthContext'
import { markdownComponents } from '../lib/markdown.jsx'

const empty = { slug: '', title: '', description: '', image: '', sectionId: null, body: '', status: 'draft' }

export default function GuideEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, permissions, loading } = useAuth()
  const [form, setForm] = useState(empty)
  const [sections, setSections] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return undefined
    const endpoint = id === 'new'
      ? '/api/dashboard/guides/new'
      : `/api/dashboard/guides/${encodeURIComponent(id)}`
    fetch(endpoint, { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || `Error ${response.status}`)
        }
        return response.json()
      })
      .then((data) => {
        if (data.guide) setForm(data.guide)
        setSections(data.sections)
        setStatus('ready')
      })
      .catch((cause) => {
        setError(cause.message)
        setStatus('error')
      })
  }, [id, user])

  if (loading) return <main className="px-global py-16 text-slate-400">Cargando…</main>
  if (!user) return <main className="px-global py-16 text-slate-400">Inicia sesión para continuar.</main>
  if (permissions.publishGuides.length === 0) return <main className="px-global py-16 text-slate-400">No tienes permisos.</main>
  if (status === 'loading') return <main className="px-global py-16 text-slate-400">Cargando guía…</main>
  if (status === 'error') {
    return (
      <main className="px-global py-16 text-red-300">
        <p>No se pudo cargar la guía.</p>
        {error && <p className="mt-2 text-sm text-red-200">{error}</p>}
      </main>
    )
  }

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const endpoint = id === 'new' ? '/api/dashboard/guides' : `/api/dashboard/guides/${id}`
    const response = await fetch(endpoint, {
      method: id === 'new' ? 'POST' : 'PUT',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error || 'No se pudo guardar la guía.')
      setSaving(false)
      return
    }
    const data = await response.json()
    navigate(`/dashboard/guides/${data.guide.id}`)
    setSaving(false)
  }

  return (
    <main className="px-global py-12">
      <div className="mx-auto max-w-6xl">
        <Link to="/dashboard" className="text-sm font-semibold text-accent hover:underline">← Volver al dashboard</Link>
        <h1 className="mt-4 text-4xl font-extrabold text-white">{id === 'new' ? 'Nueva guía' : 'Editar guía'}</h1>
        <form onSubmit={save} className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <input required maxLength={200} value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Título" className="w-full rounded-lg border border-white/10 bg-space-800 px-4 py-3 text-white" />
            <input required pattern="[A-Za-z0-9_-]+" value={form.slug} onChange={(event) => update('slug', event.target.value)} placeholder="slug-de-la-guia" className="w-full rounded-lg border border-white/10 bg-space-800 px-4 py-3 text-white" />
            <textarea maxLength={500} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Descripción" rows="3" className="w-full rounded-lg border border-white/10 bg-space-800 px-4 py-3 text-white" />
            <input type="url" value={form.image} onChange={(event) => update('image', event.target.value)} placeholder="https://... (imagen opcional)" className="w-full rounded-lg border border-white/10 bg-space-800 px-4 py-3 text-white" />
            <select value={form.sectionId ?? ''} onChange={(event) => update('sectionId', event.target.value || null)} className="w-full rounded-lg border border-white/10 bg-space-800 px-4 py-3 text-white">
              <option value="">Público</option>
              {sections.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}
            </select>
            <select value={form.status} onChange={(event) => update('status', event.target.value)} className="w-full rounded-lg border border-white/10 bg-space-800 px-4 py-3 text-white">
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
            </select>
            <textarea required value={form.body} onChange={(event) => update('body', event.target.value)} placeholder="Contenido Markdown" rows="18" className="w-full rounded-lg border border-white/10 bg-space-800 px-4 py-3 font-mono text-sm text-white" />
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <button disabled={saving} className="rounded-lg bg-accent px-5 py-3 font-bold text-space-900 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar guía'}</button>
          </div>
          <article className="content-prose prose prose-invert prose-headings:text-white prose-a:text-accent prose-img:rounded-xl max-w-none rounded-2xl border border-white/10 bg-space-800/40 p-6">
            <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-accent">Vista previa</p>
            <ReactMarkdown components={markdownComponents}>{form.body || '*Escribe Markdown para ver la vista previa.*'}</ReactMarkdown>
          </article>
        </form>
      </div>
    </main>
  )
}
