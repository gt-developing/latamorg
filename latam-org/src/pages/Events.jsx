import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ROLES } from '../../shared/access.mjs'
import { loginUrl, useAuth } from '../context/AuthContext'
import { formatEventTime, relativeEventTime } from '../lib/events'

const cardClass = 'rounded-2xl border border-white/10 bg-space-800/60 p-5'
const labelFor = (id) => id ? ROLES.find((section) => section.id === id)?.label ?? id : 'Público'

function EventList() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [section, setSection] = useState('')
  const [state, setState] = useState('loading')
  const [refreshKey, setRefreshKey] = useState(0)
  const [busyEvent, setBusyEvent] = useState(null)
  const [message, setMessage] = useState('')
  useEffect(() => {
    let cancelled = false
    const query = section ? `?section=${encodeURIComponent(section)}` : ''
    fetch(`/api/events${query}`, { credentials: 'same-origin' }).then(async (response) => {
      if (!response.ok) throw new Error()
      return response.json()
    }).then((data) => { if (!cancelled) { setEvents(data.events ?? []); setState('ready') } }).catch(() => !cancelled && setState('error'))
    return () => { cancelled = true }
  }, [section, refreshKey])

  async function respond(eventId, status) {
    setBusyEvent(eventId)
    setMessage('')
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/rsvp`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar tu respuesta')
      setRefreshKey((value) => value + 1)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusyEvent(null)
    }
  }
  return <main className="px-global py-12"><div className="mx-auto max-w-6xl">
    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Comunidad</p><h1 className="mt-2 text-4xl font-extrabold text-white">Eventos</h1>
    <p className="mt-3 max-w-2xl text-slate-400">Encuentros próximos de la comunidad, en tu hora local.</p>
    <label className="mt-6 block max-w-xs text-sm text-slate-300">Filtrar por sección<select value={section} onChange={(event) => setSection(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-space-700 px-3 py-2.5 text-white"><option value="">Todas las secciones</option><option value="public">Eventos públicos</option>{ROLES.filter((item) => item.id !== 'subadmins').map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    {state === 'loading' && <p className="mt-8 text-slate-400">Cargando eventos…</p>}{state === 'error' && <p role="alert" className="mt-8 text-red-300">No se pudieron cargar los eventos.</p>}{message && <p role="alert" className="mt-5 text-sm text-red-300">{message}</p>}
    {state === 'ready' && !events.length && <p className="mt-8 rounded-xl border border-dashed border-white/10 p-8 text-center text-slate-400">No hay eventos próximos para este filtro.</p>}
    <ul className="mt-8 grid gap-4 md:grid-cols-2">{events.map((event) => <li key={event.id} className={cardClass}><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">{labelFor(event.section_id)}</span>{event.cancelled && <span className="text-xs font-semibold text-red-300">Cancelado</span>}</div><h2 className="mt-4 text-xl font-bold text-white"><Link to={`/eventos/${event.id}`} className="hover:text-accent">{event.title}</Link></h2><p className="mt-2 text-sm text-slate-300">{formatEventTime(event.starts_at)} <span className="text-slate-500">· {relativeEventTime(event.starts_at)}</span></p>{event.location && <p className="mt-1 text-sm text-slate-400">{event.location}</p>}<p className="mt-3 line-clamp-2 text-sm text-slate-400">{event.description}</p><p className="mt-4 text-xs text-slate-400">{event.going} asistirán · {event.maybe} quizá{event.capacity ? ` · capacidad ${event.capacity}` : ''}</p>{!event.rsvpClosed && user && <div className="mt-4 flex flex-wrap gap-2">{[['going', 'Asistiré'], ['maybe', 'Quizá'], ['declined', 'No asistiré']].map(([status, label]) => <button key={status} type="button" disabled={busyEvent === event.id} onClick={() => respond(event.id, status)} aria-pressed={event.myRsvp === status} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${event.myRsvp === status ? 'border-accent bg-accent/15 text-accent' : 'border-white/10 text-slate-200 hover:border-accent/50'}`}>{label}</button>)}</div>}{!event.rsvpClosed && !user && <Link to={`/eventos/${event.id}`} className="mt-4 inline-block text-sm font-semibold text-accent">Inicia sesión para responder →</Link>}{event.rsvpClosed && !event.cancelled && <p className="mt-4 text-xs text-slate-500">El RSVP cerró al iniciar el evento.</p>}</li>)}</ul>
  </div></main>
}

function EventDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [isManager, setIsManager] = useState(false)
  const [attendees, setAttendees] = useState(null)
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function load() {
    const response = await fetch(`/api/events/${encodeURIComponent(id)}`, { credentials: 'same-origin' })
    const data = await response.json()
    if (!response.ok) throw new Error(response.status === 404 ? 'Evento no encontrado.' : 'No se pudo cargar el evento.')
    setEvent(data.event); setIsManager(Boolean(data.isManager))
  }
  useEffect(() => {
    let cancelled = false
    fetch(`/api/events/${encodeURIComponent(id)}`, { credentials: 'same-origin' }).then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(response.status === 404 ? 'Evento no encontrado.' : 'No se pudo cargar el evento.')
      return data
    }).then((data) => { if (!cancelled) { setEvent(data.event); setIsManager(Boolean(data.isManager)); setState('ready') } }).catch((error) => { if (!cancelled) { setMessage(error.message); setState('error') } })
    return () => { cancelled = true }
  }, [id])
  async function respond(status) {
    setBusy(true); setMessage('')
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(id)}/rsvp`, { method: 'PUT', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar tu respuesta')
      await load()
    } catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }
  async function removeResponse() {
    setBusy(true); setMessage('')
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(id)}/rsvp`, { method: 'DELETE', credentials: 'same-origin' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo retirar tu respuesta')
      await load()
    } catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }
  async function showAttendees() {
    const response = await fetch(`/api/events/${encodeURIComponent(id)}/attendees`, { credentials: 'same-origin' })
    const data = await response.json()
    if (response.ok) setAttendees(data.attendees ?? [])
    else setMessage(data.error || 'No se pudieron cargar los asistentes')
  }
  if (state === 'loading') return <main className="px-global py-16 text-slate-400">Cargando evento…</main>
  if (state === 'error') return <main className="px-global py-16"><h1 className="text-2xl font-bold text-white">{message}</h1><Link to="/eventos" className="mt-4 inline-block text-accent">Volver a eventos</Link></main>
  const closed = event.rsvpClosed
  const responseLabels = { going: 'Asistiré', maybe: 'Quizá', declined: 'No asistiré' }
  return <main className="px-global py-12"><article className="mx-auto max-w-3xl"><Link to="/eventos" className="text-sm text-accent hover:underline">← Eventos</Link><div className="mt-5 flex flex-wrap items-center gap-2"><span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">{event.sectionLabel}</span>{event.cancelled && <span className="rounded-full bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-300">Cancelado</span>}</div><h1 className="mt-4 text-4xl font-extrabold text-white">{event.title}</h1><p className="mt-4 text-lg text-slate-200">{formatEventTime(event.starts_at)}</p><p className="text-sm text-slate-400">Tu zona: {Intl.DateTimeFormat().resolvedOptions().timeZone} · {relativeEventTime(event.starts_at)}</p>{event.location && <p className="mt-4 text-slate-300">Lugar: {event.location}</p>}<p className="mt-6 whitespace-pre-wrap leading-relaxed text-slate-300">{event.description || 'Sin descripción.'}</p>
    <div className="mt-8 grid grid-cols-3 gap-3 text-center">{[['going', 'Asistirán'], ['maybe', 'Quizá'], ['declined', 'No asistirán']].map(([key, label]) => <div key={key} className={cardClass}><p className="text-2xl font-bold text-white">{event[key]}</p><p className="mt-1 text-xs text-slate-400">{label}</p></div>)}</div>{event.capacity && <p className="mt-3 text-sm text-slate-400">Capacidad: {event.capacity}{event.going >= event.capacity ? ' · Completo' : ''}</p>}
    {!closed && user && <div className="mt-6"><p className="text-sm text-slate-300">{event.myRsvp ? `Tu respuesta: ${responseLabels[event.myRsvp]}` : 'Confirma tu asistencia'}</p><div className="mt-3 flex flex-wrap gap-2">{Object.entries(responseLabels).map(([status, label]) => <button key={status} type="button" disabled={busy} onClick={() => respond(status)} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${event.myRsvp === status ? 'border-accent bg-accent/15 text-accent' : 'border-white/10 text-slate-200 hover:border-accent/50'}`}>{label}</button>)}{event.myRsvp && <button type="button" disabled={busy} onClick={removeResponse} className="px-3 text-sm text-slate-400 hover:text-white">Retirar respuesta</button>}</div></div>}
    {!closed && !user && <a href={loginUrl(`/eventos/${id}`)} className="mt-6 inline-block rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-space-900">Inicia sesión para responder</a>}{message && <p role="alert" className="mt-4 text-sm text-red-300">{message}</p>}
    {isManager && <section className="mt-9 border-t border-white/10 pt-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-white">Asistentes</h2><button type="button" onClick={showAttendees} className="text-sm font-semibold text-accent">{attendees ? 'Actualizar' : 'Ver asistentes'}</button></div>{attendees && <ul className="mt-4 grid gap-2 sm:grid-cols-2">{attendees.map((attendee) => <li key={attendee.username} className="rounded-lg border border-white/10 p-3 text-sm text-slate-200">{attendee.name || attendee.username} <span className="text-slate-500">@{attendee.username}</span></li>)}</ul>}</section>}
  </article></main>
}

export default function Events() {
  const { id } = useParams()
  return id ? <EventDetail /> : <EventList />
}
