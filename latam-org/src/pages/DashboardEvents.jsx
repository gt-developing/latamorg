import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ROLES } from '../../shared/access.mjs'
import { useAuth } from '../context/AuthContext'
import { formatEventTime, toLocalDateTimeInput } from '../lib/events'

const blankEvent = { title: '', description: '', location: '', starts_at: '', capacity: '', section_id: '' }
const fieldClass = 'mt-1 w-full rounded-lg border border-white/10 bg-space-700/70 px-3 py-2.5 text-sm text-slate-100 focus:border-accent/60 focus:outline-none'

export default function DashboardEvents() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, permissions, isAdmin, isSubadmin } = useAuth()
  const [events, setEvents] = useState([])
  const [event, setEvent] = useState(blankEvent)
  const [status, setStatus] = useState(id && id !== 'nueva' ? 'loading' : 'ready')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const managerSections = useMemo(() => isAdmin || isSubadmin ? ROLES.filter((item) => item.id !== 'subadmins').map((item) => item.id) : permissions?.manageEvents ?? [], [isAdmin, isSubadmin, permissions])
  const canManagePublic = isAdmin || isSubadmin
  const sectionOptions = ROLES.filter((item) => managerSections.includes(item.id) && item.id !== 'subadmins')
  const selectedSection = event.section_id || (!canManagePublic ? sectionOptions[0]?.id ?? '' : '')

  useEffect(() => {
    let cancelled = false
    fetch('/api/dashboard/events', { credentials: 'same-origin' }).then(async (response) => {
      if (!response.ok) throw new Error('No se pudieron cargar los eventos gestionables')
      return response.json()
    }).then((data) => { if (!cancelled) setEvents(data.events ?? []) }).catch((e) => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!id || id === 'nueva') return undefined
    let cancelled = false
    fetch(`/api/events/${encodeURIComponent(id)}`, { credentials: 'same-origin' }).then(async (response) => {
      if (!response.ok) throw new Error('No se pudo cargar el evento')
      return response.json()
    }).then((data) => {
      if (cancelled) return
      const current = data.event
      setEvent({ title: current.title, description: current.description, location: current.location, starts_at: toLocalDateTimeInput(current.starts_at), capacity: current.capacity ?? '', section_id: current.section_id ?? '' })
      setStatus('ready')
    }).catch((e) => { if (!cancelled) { setError(e.message); setStatus('error') } })
    return () => { cancelled = true }
  }, [id])

  async function save() {
    setSaving(true); setError('')
    try {
      const payload = { ...event, starts_at: new Date(event.starts_at).toISOString(), capacity: event.capacity === '' ? null : Number(event.capacity), section_id: selectedSection || null }
      const response = await fetch(id && id !== 'nueva' ? `/api/dashboard/events/${encodeURIComponent(id)}` : '/api/dashboard/events', { method: id && id !== 'nueva' ? 'PUT' : 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el evento')
      if (!id || id === 'nueva') navigate(`/dashboard/eventos/${data.event.id}`, { replace: true })
      else setEvent({ ...event, starts_at: toLocalDateTimeInput(data.event.starts_at) })
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  async function cancelEvent() {
    const response = await fetch(`/api/dashboard/events/${encodeURIComponent(id)}/cancel`, { method: 'POST', credentials: 'same-origin' })
    if (!response.ok) setError('No se pudo cancelar el evento')
    else navigate('/dashboard/eventos')
  }
  async function deleteEvent() {
    if (!window.confirm('¿Eliminar este evento y sus respuestas?')) return
    const response = await fetch(`/api/dashboard/events/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' })
    if (response.ok) navigate('/dashboard/eventos')
    else setError('No se pudo eliminar el evento')
  }

  if (!user) return <main className="px-global py-16 text-slate-300">Inicia sesión para gestionar eventos.</main>
  if (status === 'loading') return <main className="px-global py-16 text-slate-400">Cargando…</main>
  if (status === 'error') return <main className="px-global py-16 text-red-300">{error}</main>
  if (!id) return <main className="px-global py-12"><div className="mx-auto max-w-5xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Dashboard</p><h1 className="mt-2 text-4xl font-extrabold text-white">Gestionar eventos</h1></div><Link to="/dashboard/eventos/nueva" className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-space-900">Crear evento</Link></div>{error && <p role="alert" className="mt-4 text-red-300">{error}</p>}<ul className="mt-8 space-y-3">{events.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-space-800/60 p-4"><div><h2 className="font-semibold text-white">{item.title} {item.cancelled && <span className="text-xs text-red-300">· Cancelado</span>}</h2><p className="mt-1 text-xs text-slate-400">{item.sectionLabel} · {formatEventTime(item.starts_at)} · {item.going} asistentes</p></div><Link to={`/dashboard/eventos/${item.id}`} className="text-sm font-semibold text-accent">Editar →</Link></li>)}</ul>{!events.length && <p className="mt-8 rounded-xl border border-dashed border-white/10 p-7 text-center text-slate-400">No hay eventos para gestionar.</p>}</div></main>

  return <main className="px-global py-12"><div className="mx-auto max-w-3xl"><Link to="/dashboard/eventos" className="text-sm text-accent hover:underline">← Eventos</Link><h1 className="mt-3 text-3xl font-extrabold text-white">{id === 'nueva' ? 'Crear evento' : 'Editar evento'}</h1>{error && <p role="alert" className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}<div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-300 sm:col-span-2">Título<input className={fieldClass} maxLength={200} value={event.title} onChange={(e) => setEvent({ ...event, title: e.target.value })} /></label><label className="text-sm font-medium text-slate-300 sm:col-span-2">Descripción<textarea className={`${fieldClass} min-h-32`} maxLength={5000} value={event.description} onChange={(e) => setEvent({ ...event, description: e.target.value })} /></label><label className="text-sm font-medium text-slate-300 sm:col-span-2">Lugar (opcional)<input className={fieldClass} maxLength={300} value={event.location} onChange={(e) => setEvent({ ...event, location: e.target.value })} /></label><label className="text-sm font-medium text-slate-300 sm:col-span-2">Inicio (tu hora local)<input className={fieldClass} type="datetime-local" value={event.starts_at} onChange={(e) => setEvent({ ...event, starts_at: e.target.value })} /></label><label className="text-sm font-medium text-slate-300">Sección<select className={fieldClass} value={selectedSection} onChange={(e) => setEvent({ ...event, section_id: e.target.value })}><option value="" disabled={!canManagePublic}>Público</option>{sectionOptions.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}</select></label><label className="text-sm font-medium text-slate-300">Capacidad (opcional)<input className={fieldClass} type="number" min="1" step="1" value={event.capacity} onChange={(e) => setEvent({ ...event, capacity: e.target.value })} /></label></div><p className="mt-3 text-xs text-slate-500">La hora se convierte y guarda en UTC; cada asistente la verá en su zona local ({Intl.DateTimeFormat().resolvedOptions().timeZone}). El RSVP cierra al iniciar el evento.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" disabled={saving} onClick={save} className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-space-900 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar evento'}</button>{id !== 'nueva' && <><button type="button" onClick={cancelEvent} className="rounded-lg border border-amber-300/30 px-4 py-2.5 text-sm text-amber-200">Cancelar evento</button><button type="button" onClick={deleteEvent} className="ml-auto rounded-lg border border-red-400/30 px-4 py-2.5 text-sm text-red-300">Eliminar</button></>}</div></div></main>
}
