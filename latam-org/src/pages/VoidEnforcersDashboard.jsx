import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiAward, FiCheckSquare, FiSettings, FiShield, FiUsers } from 'react-icons/fi'
import { VOID_ENFORCERS_RANKS } from '../../shared/access.mjs'
import { useAuth } from '../context/AuthContext'

const cardClass = 'rounded-2xl border border-white/10 bg-space-800/60 p-5'
const fieldClass = 'mt-1 w-full rounded-lg border border-white/10 bg-space-700/70 px-3 py-2.5 text-sm text-slate-100 focus:border-accent/60 focus:outline-none'
const tabs = [
  { id: 'profile', label: 'Mi perfil', icon: FiShield },
  { id: 'personnel', label: 'Personal y asignaciones', icon: FiUsers, manager: true },
  { id: 'operations', label: 'Operaciones pasadas', icon: FiCheckSquare },
  { id: 'settings', label: 'Configuración', icon: FiSettings, manager: true },
]

function formatDate(value) {
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

const normalizeRankName = (name) => name.toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
const rankHierarchy = new Map(VOID_ENFORCERS_RANKS.map((name, index) => [normalizeRankName(name), index]))

function compareRanksDescending(left, right) {
  const leftOrder = rankHierarchy.get(normalizeRankName(left.name))
  const rightOrder = rankHierarchy.get(normalizeRankName(right.name))
  if (leftOrder !== undefined || rightOrder !== undefined) {
    return (rightOrder ?? -1) - (leftOrder ?? -1)
  }
  return right.sort_order - left.sort_order || left.name.localeCompare(right.name, 'es-MX')
}

function groupPersonnel(data, sortedRanks) {
  if (!data?.members) return []
  const assignedMembers = new Set()
  const groups = [...VOID_ENFORCERS_RANKS].reverse().map((name) => {
    const rank = data.ranks.find((item) => normalizeRankName(item.name) === normalizeRankName(name))
    const members = data.members.filter((member) => {
      const matches = name === 'Almirante'
        ? member.isAdmiral || normalizeRankName(member.rank?.name ?? '') === normalizeRankName(name)
        : !member.isAdmiral && member.rank?.id === rank?.id
      if (matches) assignedMembers.add(member.id)
      return matches
    })
    return { id: rank?.id ?? `default:${name}`, name, members }
  })
  const customRanks = sortedRanks.filter((rank) => !rankHierarchy.has(normalizeRankName(rank.name)))
  for (const rank of customRanks) {
    const members = data.members.filter((member) => !member.isAdmiral && member.rank?.id === rank.id)
    for (const member of members) assignedMembers.add(member.id)
    groups.push({ id: rank.id, name: rank.name, members })
  }
  const unassigned = data.members.filter((member) => !assignedMembers.has(member.id))
  if (unassigned.length) groups.push({ id: 'unassigned', name: 'Sin rango', members: unassigned })
  return groups
}

export default function VoidEnforcersDashboard() {
  const { user, isAdmin } = useAuth()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [tab, setTab] = useState('profile')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedRankId, setSelectedRankId] = useState('')
  const [selectedCertificationIds, setSelectedCertificationIds] = useState([])
  const [selectedOperationId, setSelectedOperationId] = useState('')
  const [attendance, setAttendance] = useState([])
  const [saving, setSaving] = useState(false)
  const [admiralChoice, setAdmiralChoice] = useState('')
  const [rankName, setRankName] = useState('')
  const [certificationName, setCertificationName] = useState('')
  const [certificationDescription, setCertificationDescription] = useState('')
  const selectedMemberRef = useRef('')
  const selectedOperationRef = useRef('')

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/void-enforcers/dashboard', { credentials: 'same-origin' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo cargar el dashboard')
      const nextMemberId = result.members?.some((member) => member.id === selectedMemberRef.current)
        ? selectedMemberRef.current
        : result.member?.id ?? result.members?.[0]?.id ?? ''
      const nextOperationId = result.operations?.some((operation) => operation.id === selectedOperationRef.current)
        ? selectedOperationRef.current
        : result.operations?.[0]?.id ?? ''
      const nextMember = result.members?.find((member) => member.id === nextMemberId) ?? result.member
      const nextOperation = result.operations?.find((operation) => operation.id === nextOperationId)
      selectedMemberRef.current = nextMemberId
      selectedOperationRef.current = nextOperationId
      setData(result)
      setAdmiralChoice(result.admiralId ?? '')
      setSelectedMemberId(nextMemberId)
      setSelectedRankId(nextMember?.rank?.id ?? '')
      setSelectedCertificationIds(nextMember?.certifications?.map((certification) => certification.id) ?? [])
      setSelectedOperationId(nextOperationId)
      setAttendance(nextOperation && result.members
        ? result.members.map((member) => ({
          userId: member.id,
          attended: Boolean(member.operations.find((operation) => operation.id === nextOperation.id)?.attended),
        }))
        : [])
      setStatus('ready')
      setError('')
    } catch (loadError) {
      setError(loadError.message)
      setStatus((current) => current === 'loading' ? 'error' : current)
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(load)
  }, [load])

  const selectedMember = useMemo(
    () => data?.members?.find((member) => member.id === selectedMemberId) ?? data?.member ?? null,
    [data, selectedMemberId],
  )
  const sortedRanks = [...(data?.ranks ?? [])].sort(compareRanksDescending)
  const personnelGroups = groupPersonnel(data, sortedRanks)

  const selectedOperation = data?.operations?.find((operation) => operation.id === selectedOperationId) ?? null

  function selectMember(member) {
    selectedMemberRef.current = member.id
    setSelectedMemberId(member.id)
    setSelectedRankId(member.rank?.id ?? '')
    setSelectedCertificationIds(member.certifications.map((certification) => certification.id))
  }

  function selectOperation(operationId) {
    selectedOperationRef.current = operationId
    setSelectedOperationId(operationId)
    const operation = data?.operations?.find((item) => item.id === operationId)
    setAttendance((data?.members ?? []).map((member) => ({
      userId: member.id,
      attended: Boolean(member.operations.find((item) => item.id === operation?.id)?.attended),
    })))
  }

  async function submit(url, method, body) {
    setSaving(true)
    setError('')
    try {
      const response = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar')
      await load()
      return result
    } catch (submitError) {
      setError(submitError.message)
      return null
    } finally {
      setSaving(false)
    }
  }

  async function saveMember() {
    if (!selectedMember) return
    await submit(`/api/void-enforcers/members/${encodeURIComponent(selectedMember.id)}`, 'PUT', {
      rankId: selectedRankId || null,
      certificationIds: selectedCertificationIds,
    })
  }

  async function saveAttendance() {
    if (!selectedOperation) return
    await submit(`/api/void-enforcers/operations/${encodeURIComponent(selectedOperation.id)}/attendance`, 'PUT', { attendance })
  }

  const setAttended = (userId, attended) => setAttendance((items) => items.map((item) => item.userId === userId ? { ...item, attended } : item))

  async function saveAdmiral() {
    await submit('/api/void-enforcers/admiral', 'PUT', { userId: admiralChoice || null })
  }

  async function saveConfig(kind, method = 'POST', id, values) {
    const suffix = id ? `/${encodeURIComponent(id)}` : ''
    const result = await submit(`/api/void-enforcers/config/${kind}${suffix}`, method, values)
    return result
  }

  if (status === 'loading') return <main className="px-global py-16 text-slate-400">Cargando dashboard Void Enforcers…</main>
  if (status === 'error') return <main className="px-global py-16"><h1 className="text-2xl font-bold text-white">Void Enforcers</h1><p className="mt-3 text-red-300">{error}</p></main>
  if (!data?.isManager && !data?.isMember) return <main className="px-global py-16 text-slate-300">No tienes acceso a esta división.</main>

  const visibleTabs = tabs.filter((item) => !item.manager || data.isManager)
  const member = data.member
  const attendedOperations = member?.operations?.filter((operation) => operation.attendanceRecorded && operation.attended).length ?? 0
  const operationCount = member?.operations?.filter((operation) => operation.attendanceRecorded).length ?? 0

  return (
    <main className="px-global py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent"><FiShield /> División militar</p>
          <h1 className="mt-3 text-4xl font-extrabold text-white">Void Enforcers</h1>
          <p className="mt-2 text-slate-400">Personal, cualificaciones y registro de operaciones.</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-white/10 bg-space-800/50 p-3 lg:sticky lg:top-6">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Menú de división</p>
            <nav aria-label="Dashboard Void Enforcers" className="flex gap-2 overflow-x-auto lg:flex-col">
              {visibleTabs.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${tab === id ? 'bg-accent/15 text-accent' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />{label}
                </button>
              ))}
            </nav>
            {data.isManager && <Link to="/dashboard/eventos" className="mt-3 hidden rounded-xl border border-white/10 px-3 py-3 text-sm text-slate-300 transition hover:border-accent/50 hover:text-white lg:block">Crear o gestionar operaciones →</Link>}
          </aside>

          <section className="min-w-0">
            {error && <p role="alert" className="mb-5 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}

            {tab === 'profile' && (
              <div className="space-y-5">
                {member ? <>
                  <article className={`${cardClass} flex flex-wrap items-center gap-4`}>
                    <img src={member.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
                    <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-widest text-accent">Perfil de miembro</p><h2 className="mt-1 text-2xl font-bold text-white">{member.name}</h2><p className="text-sm text-slate-400">@{member.username}</p></div>
                    <div className="rounded-xl bg-accent/10 px-4 py-3 text-center"><p className="text-xs text-slate-400">Rango</p><p className="mt-1 font-bold text-accent">{member.isAdmiral ? 'Almirante' : member.rank?.name ?? 'Sin rango asignado'}</p></div>
                  </article>
                  <div className="grid gap-4 sm:grid-cols-3"><article className={cardClass}><p className="text-3xl font-extrabold text-white">{member.certifications.length}</p><p className="text-sm text-slate-400">Certificaciones</p></article><article className={cardClass}><p className="text-3xl font-extrabold text-white">{attendedOperations}</p><p className="text-sm text-slate-400">Operaciones asistidas</p></article><article className={cardClass}><p className="text-3xl font-extrabold text-white">{operationCount}</p><p className="text-sm text-slate-400">Operaciones registradas</p></article></div>
                  <article className={cardClass}><h2 className="flex items-center gap-2 text-lg font-bold text-white"><FiAward className="text-accent" />Certificaciones</h2>{member.certifications.length ? <ul className="mt-4 flex flex-wrap gap-2">{member.certifications.map((certification) => <li key={certification.id} title={certification.description} className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-sm text-accent">{certification.name}</li>)}</ul> : <p className="mt-3 text-sm text-slate-400">Aún no tienes certificaciones asignadas.</p>}</article>
                  <article className={cardClass}><h2 className="text-lg font-bold text-white">Historial de operaciones</h2>{member.operations.length ? <ul className="mt-4 divide-y divide-white/5">{member.operations.map((operation) => <li key={operation.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium text-slate-200">{operation.title}</p><p className="text-xs text-slate-500">{formatDate(operation.starts_at)}{operation.location ? ` · ${operation.location}` : ''}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${!operation.attendanceRecorded ? 'bg-white/5 text-slate-400' : operation.attended ? 'bg-emerald-400/10 text-emerald-200' : 'bg-red-400/10 text-red-200'}`}>{!operation.attendanceRecorded ? 'Pendiente de registro' : operation.attended ? 'Asistió' : 'No asistió'}</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-400">No hay operaciones pasadas registradas.</p>}</article>
                </> : <article className={cardClass}><h2 className="text-lg font-bold text-white">Panel de administración de división</h2><p className="mt-2 text-sm text-slate-400">Administra miembros, operaciones, rangos y certificaciones desde el menú lateral.</p></article>}
              </div>
            )}

            {tab === 'personnel' && data.isManager && (
              <div className="grid gap-5 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]">
                <article className={cardClass}><h2 className="text-lg font-bold text-white">Personal Void Enforcers</h2><p className="mt-1 text-sm text-slate-400">{data.members.length} miembros · rangos de mayor a menor</p><div className="mt-4 space-y-5">{personnelGroups.map((group) => <section key={group.id}><h3 className="flex items-center justify-between border-b border-white/10 pb-2 text-xs font-bold uppercase tracking-wide text-accent"><span>{group.name}</span><span>{group.members.length}</span></h3>{group.members.length ? <ul className="mt-2 space-y-2">{group.members.map((item) => <li key={item.id}><button type="button" onClick={() => selectMember(item)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selectedMemberId === item.id ? 'border-accent/50 bg-accent/10' : 'border-white/5 hover:border-white/20'}`}><img src={item.avatar} alt="" className="h-10 w-10 rounded-full object-cover" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-white">{item.name}</span><span className="block truncate text-xs text-slate-400">{item.isAdmiral ? 'Almirante' : item.rank?.name ?? 'Sin rango'}</span></span></button></li>)}</ul> : <p className="mt-2 text-xs text-slate-500">Sin personal asignado</p>}</section>)}</div></article>
                <article className={cardClass}><h2 className="text-lg font-bold text-white">Asignar rango y certificaciones</h2>{selectedMember ? <><div className="mt-4 flex items-center gap-3"><img src={selectedMember.avatar} alt="" className="h-12 w-12 rounded-full object-cover" /><div><p className="font-semibold text-white">{selectedMember.name}</p><p className="text-xs text-slate-400">@{selectedMember.username}</p></div></div>{selectedMember.isAdmiral ? <p className="mt-5 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-sm font-semibold text-accent">Rango: Almirante (determinado por la configuración de la división)</p> : <label className="mt-5 block text-sm text-slate-300">Rango<select className={fieldClass} value={selectedRankId} onChange={(event) => setSelectedRankId(event.target.value)}><option value="">Sin rango</option>{sortedRanks.map((rank) => <option key={rank.id} value={rank.id} disabled={!rank.active || rank.name === 'Almirante'}>{rank.name}{rank.active ? '' : ' (inactivo)'}</option>)}</select></label>}<fieldset className="mt-5"><legend className="text-sm font-semibold text-slate-300">Certificaciones</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{data.certifications.filter((certification) => certification.active || selectedCertificationIds.includes(certification.id)).map((certification) => <label key={certification.id} className="flex items-start gap-2 rounded-lg border border-white/5 p-3 text-sm text-slate-300"><input type="checkbox" checked={selectedCertificationIds.includes(certification.id)} disabled={!certification.active && !selectedCertificationIds.includes(certification.id)} onChange={(event) => setSelectedCertificationIds((items) => event.target.checked ? [...items, certification.id] : items.filter((id) => id !== certification.id))} /><span>{certification.name}{certification.description && <span className="mt-1 block text-xs text-slate-500">{certification.description}</span>}</span></label>)}</div></fieldset><button type="button" disabled={saving} onClick={saveMember} className="mt-5 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-space-900 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar asignaciones'}</button></> : <p className="mt-4 text-sm text-slate-400">Asigna el rol Void Enforcers a los miembros desde el panel de administración para que aparezcan aquí.</p>}</article>
              </div>
            )}

            {tab === 'operations' && (
              <article className={cardClass}><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-bold text-white">Asistencia a operaciones</h2><p className="mt-1 text-sm text-slate-400">Checklist de asistencia de las operaciones pasadas de Void Enforcers.</p></div>{data.isManager && data.operations.length > 0 && <select aria-label="Seleccionar operación" className="rounded-lg border border-white/10 bg-space-700 px-3 py-2 text-sm text-white" value={selectedOperationId} onChange={(event) => selectOperation(event.target.value)}>{data.operations.map((operation) => <option key={operation.id} value={operation.id}>{operation.title} · {formatDate(operation.starts_at)}</option>)}</select>}</div>
                {data.isManager ? selectedOperation ? <><div className="mt-5 rounded-xl border border-white/5 bg-space-900/50 p-4"><p className="font-semibold text-white">{selectedOperation.title}</p><p className="mt-1 text-xs text-slate-400">{formatDate(selectedOperation.starts_at)}{selectedOperation.location ? ` · ${selectedOperation.location}` : ''}</p></div><ul className="mt-4 divide-y divide-white/5">{data.members.map((item) => <li key={item.id} className="flex items-center gap-3 py-3"><img src={item.avatar} alt="" className="h-9 w-9 rounded-full object-cover" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-white">{item.name}</span><span className="text-xs text-slate-500">{item.isAdmiral ? 'Almirante' : item.rank?.name ?? 'Sin rango'}</span></span><label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={Boolean(attendance.find((entry) => entry.userId === item.id)?.attended)} onChange={(event) => setAttended(item.id, event.target.checked)} />Asistió</label></li>)}</ul><button type="button" disabled={saving} onClick={saveAttendance} className="mt-5 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-space-900 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar checklist'}</button></> : <p className="mt-6 text-sm text-slate-400">No hay operaciones pasadas de Void Enforcers.</p> : <ul className="mt-5 divide-y divide-white/5">{member?.operations.map((operation) => <li key={operation.id} className="flex items-center justify-between gap-3 py-3"><span className="text-sm text-slate-200">{operation.title}<span className="mt-1 block text-xs text-slate-500">{formatDate(operation.starts_at)}</span></span><span className="text-xs text-slate-400">{!operation.attendanceRecorded ? 'Pendiente' : operation.attended ? 'Asistió' : 'No asistió'}</span></li>)}</ul>}
              </article>
            )}

            {tab === 'settings' && data.isManager && (
              <div className="space-y-5">
                {isAdmin && <article className={cardClass}><h2 className="text-lg font-bold text-white">Almirante de la división</h2><p className="mt-1 text-sm text-slate-400">Solo el administrador principal puede designar o retirar al almirante. El almirante debe tener el rol Void Enforcers y no ser subadmin.</p><div className="mt-4 flex flex-wrap gap-3"><select className="min-w-64 rounded-lg border border-white/10 bg-space-700 px-3 py-2.5 text-sm text-white" value={admiralChoice} onChange={(event) => setAdmiralChoice(event.target.value)}><option value="">Sin almirante</option>{data.members.filter((item) => item.id !== user?.id).map((item) => <option key={item.id} value={item.id}>{item.name} (@{item.username})</option>)}</select><button type="button" disabled={saving} onClick={saveAdmiral} className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-space-900 disabled:opacity-50">Guardar</button></div></article>}
                <div className="grid gap-5 xl:grid-cols-2">
                  <article className={cardClass}><h2 className="text-lg font-bold text-white">Rangos</h2><form className="mt-4 flex gap-2" onSubmit={async (event) => { event.preventDefault(); if (!rankName.trim()) return; const result = await saveConfig('ranks', 'POST', null, { name: rankName.trim(), sort_order: data.ranks.length }); if (result) setRankName('') }}><input className="min-w-0 flex-1 rounded-lg border border-white/10 bg-space-700 px-3 py-2 text-sm text-white" maxLength={100} value={rankName} onChange={(event) => setRankName(event.target.value)} placeholder="Nuevo rango" /><button className="rounded-lg border border-accent/30 px-3 text-sm font-semibold text-accent">Añadir</button></form><ul className="mt-4 space-y-2">{sortedRanks.map((rank) => <li key={rank.id} className="flex items-center justify-between rounded-lg border border-white/5 p-3"><span className="text-sm text-slate-200">{rank.name}</span><button type="button" disabled={saving} onClick={() => saveConfig('ranks', 'PUT', rank.id, { name: rank.name, sort_order: rank.sort_order, active: !rank.active })} className={`text-xs font-semibold ${rank.active ? 'text-emerald-300' : 'text-slate-500'}`}>{rank.active ? 'Activo · desactivar' : 'Inactivo · activar'}</button></li>)}</ul></article>
                  <article className={cardClass}><h2 className="text-lg font-bold text-white">Certificaciones</h2><form className="mt-4 space-y-2" onSubmit={async (event) => { event.preventDefault(); if (!certificationName.trim()) return; const result = await saveConfig('certifications', 'POST', null, { name: certificationName.trim(), description: certificationDescription.trim(), sort_order: data.certifications.length }); if (result) { setCertificationName(''); setCertificationDescription('') } }}><input className="w-full rounded-lg border border-white/10 bg-space-700 px-3 py-2 text-sm text-white" maxLength={120} value={certificationName} onChange={(event) => setCertificationName(event.target.value)} placeholder="Nombre de certificación" /><textarea className="w-full rounded-lg border border-white/10 bg-space-700 px-3 py-2 text-sm text-white" maxLength={500} value={certificationDescription} onChange={(event) => setCertificationDescription(event.target.value)} placeholder="Descripción (opcional)" /><button className="rounded-lg border border-accent/30 px-3 py-2 text-sm font-semibold text-accent">Añadir certificación</button></form><ul className="mt-4 space-y-2">{data.certifications.map((certification) => <li key={certification.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 p-3"><span className="min-w-0"><span className="block text-sm text-slate-200">{certification.name}</span>{certification.description && <span className="text-xs text-slate-500">{certification.description}</span>}</span><button type="button" disabled={saving} onClick={() => saveConfig('certifications', 'PUT', certification.id, { name: certification.name, description: certification.description, sort_order: certification.sort_order, active: !certification.active })} className={`shrink-0 text-xs font-semibold ${certification.active ? 'text-emerald-300' : 'text-slate-500'}`}>{certification.active ? 'Activa' : 'Inactiva'}</button></li>)}</ul></article>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
