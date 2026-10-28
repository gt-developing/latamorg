import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { ROLES } from '../../shared/access.mjs'
import { useAuth } from '../context/AuthContext'
import { safeMarkdownUrl } from '../lib/markdown'

const blankGuide = { slug: '', title: '', description: '', image: '', section_id: null, body: '', status: 'draft' }
const fieldClass = 'mt-1 w-full rounded-lg border border-white/10 bg-space-700/70 px-3 py-2.5 text-sm text-slate-100 focus:border-accent/60 focus:outline-none'

export default function Dashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, permissions, isAdmin, isSubadmin, isVoidEnforcersManager } = useAuth()
  const [guides, setGuides] = useState([])
  const [guide, setGuide] = useState(blankGuide)
  const [status, setStatus] = useState(id && id !== 'nueva' ? 'loading' : 'ready')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const availableIds = useMemo(() => {
    if (isAdmin) return ROLES.map((item) => item.id).filter((id) => id !== 'subadmins')
    const ids = [...(permissions?.publishGuides ?? [])].filter((id) => id !== 'void-enforcers')
    if (isVoidEnforcersManager && !ids.includes('void-enforcers')) ids.push('void-enforcers')
    return ids
  }, [isAdmin, isVoidEnforcersManager, permissions])
  const availableSections = useMemo(() => ROLES.filter((item) => availableIds.includes(item.id) && item.id !== 'subadmins'), [availableIds])
  const mayWritePublic = isAdmin || isSubadmin || permissions?.publishPublicGuides

  useEffect(() => {
    let cancelled = false
    fetch('/api/dashboard/guides', { credentials: 'same-origin' }).then(async (res) => {
      if (!res.ok) throw new Error('No se pudieron cargar tus guías')
      return res.json()
    }).then((data) => { if (!cancelled) setGuides(data.guides ?? []) }).catch((e) => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!id || id === 'nueva') return undefined
    let cancelled = false
    fetch(`/api/dashboard/guides/${encodeURIComponent(id)}`, { credentials: 'same-origin' }).then(async (res) => {
      if (!res.ok) throw new Error('No se pudo cargar la guía para editar')
      return res.json()
    }).then((data) => { if (!cancelled) { setGuide({ ...blankGuide, ...data.guide, section_id: data.guide.section_id ?? data.guide.sectionId }); setStatus('ready') } }).catch((e) => { if (!cancelled) { setError(e.message); setStatus('error') } })
    return () => { cancelled = true }
  }, [id, availableSections, mayWritePublic])

  async function save(nextStatus = guide.status) {
    setSaving(true); setError('')
    try {
      const payload = { ...guide, status: nextStatus }
      const response = await fetch(id && id !== 'nueva' ? `/api/dashboard/guides/${encodeURIComponent(id)}` : '/api/dashboard/guides', {
        method: id && id !== 'nueva' ? 'PUT' : 'POST', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la guía')
      setGuide({ ...guide, ...data.guide, section_id: data.guide.section_id ?? data.guide.sectionId })
      if (!id || id === 'nueva') navigate(`/dashboard/guias/${data.guide.id}`, { replace: true })
      setStatus('ready')
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  async function togglePublish() {
    if (!id || id === 'nueva') return save('published')
    const response = await fetch(`/api/dashboard/guides/${encodeURIComponent(id)}/publish`, { method: 'POST', credentials: 'same-origin' })
    const data = await response.json()
    if (!response.ok) { setError(data.error || 'No se pudo cambiar el estado'); return }
    setGuide((current) => ({ ...current, ...data.guide, section_id: data.guide.section_id ?? data.guide.sectionId }))
  }

  async function removeGuide() {
    if (!window.confirm('¿Eliminar esta guía definitivamente?')) return
    const response = await fetch(`/api/dashboard/guides/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' })
    if (response.ok) navigate('/dashboard/guias')
    else setError('No se pudo eliminar la guía')
  }

  if (!user) return <main className="px-global py-16 text-slate-300">Inicia sesión para abrir el dashboard.</main>
  if (status === 'loading') return <main className="px-global py-16 text-slate-400">Cargando…</main>
  if (status === 'error') return <main className="px-global py-16 text-red-300">{error}</main>
  if (!id) return (
    <main className="px-global py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Dashboard</p><h1 className="mt-2 text-4xl font-extrabold text-white">Mis guías</h1></div><Link to="/dashboard/guias/nueva" className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-space-900">Crear guía</Link></div>
        {error && <p role="alert" className="mt-5 text-red-300">{error}</p>}
        <ul className="mt-8 space-y-3">{guides.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-space-800/60 p-4"><div><h2 className="font-semibold text-white">{item.title}</h2><p className="mt-1 text-xs text-slate-400">{item.section_id ? ROLES.find((section) => section.id === item.section_id)?.label : 'Pública'} · {item.status === 'published' ? 'Publicada' : 'Borrador'}</p></div><Link to={`/dashboard/guias/${item.id}`} className="text-sm font-semibold text-accent">Editar →</Link></li>)}</ul>
        {!guides.length && <p className="mt-8 rounded-xl border border-dashed border-white/10 p-7 text-center text-slate-400">Aún no hay guías para gestionar.</p>}
      </div>
    </main>
  )

  return (
    <main className="px-global py-12">
      <div className="mx-auto max-w-5xl">
        <Link to="/dashboard/guias" className="text-sm text-accent hover:underline">← Mis guías</Link>
        <h1 className="mt-3 text-3xl font-extrabold text-white">{id === 'nueva' ? 'Crear guía' : 'Editar guía'}</h1>
        {error && <p role="alert" className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            {[['title', 'Título'], ['slug', 'Slug'], ['description', 'Descripción'], ['image', 'Imagen HTTPS (opcional)']].map(([key, label]) => <label key={key} className="block text-sm font-medium text-slate-300">{label}<input className={fieldClass} value={guide[key] ?? ''} maxLength={key === 'title' ? 200 : key === 'description' ? 500 : undefined} onChange={(event) => setGuide({ ...guide, [key]: event.target.value })} /></label>)}
            <label className="block text-sm font-medium text-slate-300">Sección<select className={fieldClass} value={guide.section_id ?? ''} onChange={(event) => setGuide({ ...guide, section_id: event.target.value || null })}><option value="" disabled={!mayWritePublic}>Pública</option>{ROLES.filter((item) => availableIds.includes(item.id) && item.id !== 'subadmins').map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label className="block text-sm font-medium text-slate-300">Cuerpo en Markdown<textarea className={`${fieldClass} min-h-80 font-mono`} value={guide.body ?? ''} onChange={(event) => setGuide({ ...guide, body: event.target.value })} /></label>
          </div>
          <section className="min-w-0">
            <div className="flex items-center justify-between"><h2 className="font-bold text-white">Vista previa</h2><button type="button" onClick={() => setPreview((value) => !value)} className="text-sm text-accent">{preview ? 'Ocultar' : 'Ver Markdown'}</button></div>
            <article className="prose prose-invert prose-headings:text-white prose-a:text-accent prose-img:rounded-xl mt-4 min-h-64 max-w-none rounded-xl border border-white/10 bg-space-800/60 p-5">{preview ? <ReactMarkdown urlTransform={safeMarkdownUrl}>{guide.body || '*La vista previa aparecerá aquí.*'}</ReactMarkdown> : <><h1>{guide.title || 'Título de la guía'}</h1><p>{guide.description}</p><p className="whitespace-pre-wrap">{guide.body || 'Escribe contenido Markdown para ver una vista previa.'}</p></>}</article>
          </section>
        </div>
        <div className="mt-6 flex flex-wrap gap-3"><button type="button" disabled={saving} onClick={() => save('draft')} className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Guardar borrador</button><button type="button" disabled={saving} onClick={togglePublish} className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-space-900 disabled:opacity-50">{guide.status === 'published' ? 'Despublicar' : 'Publicar'}</button>{id !== 'nueva' && <button type="button" onClick={removeGuide} className="ml-auto rounded-lg border border-red-400/30 px-4 py-2.5 text-sm text-red-300">Eliminar</button>}</div>
      </div>
    </main>
  )
}
