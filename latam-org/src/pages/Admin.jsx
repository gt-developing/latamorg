import { useEffect, useMemo, useState } from 'react'
import { FaShieldAlt } from 'react-icons/fa'
import LoginPrompt from '../components/LoginPrompt'
import { useAuth } from '../context/AuthContext'

const formatDate = (value) =>
  value ? new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

function PermissionEditor({ user }) {
  const [open, setOpen] = useState(false)
  const [sections, setSections] = useState([])
  const [permissions, setPermissions] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    fetch(`/api/admin/users/${user.id}/permissions`, { credentials: 'same-origin' }).then(async (res) => {
      if (!res.ok) throw new Error('No se pudieron cargar los permisos')
      return res.json()
    }).then((data) => { if (!cancelled) { setSections(data.sections); setPermissions(data.permissions) } }).catch((e) => !cancelled && setError(e.message))
    return () => { cancelled = true }
  }, [open, user.id])
  async function save(sectionId, key, checked) {
    const current = permissions.find((item) => item.section_id === sectionId) ?? { section_id: sectionId, can_publish_guides: false, can_manage_events: false }
    const next = { ...current, [key]: checked }
    const method = !next.can_publish_guides && !next.can_manage_events ? 'DELETE' : 'PUT'
    const response = await fetch(`/api/admin/users/${user.id}/permissions/${sectionId}`, {
      method, credentials: 'same-origin', headers: { 'content-type': 'application/json' },
      ...(method === 'PUT' ? { body: JSON.stringify({ canPublishGuides: next.can_publish_guides, canManageEvents: next.can_manage_events }) } : {}),
    })
    if (!response.ok) { setError('No se pudo guardar el permiso'); return }
    setPermissions((items) => method === 'DELETE' ? items.filter((item) => item.section_id !== sectionId) : [...items.filter((item) => item.section_id !== sectionId), next])
    setError('')
  }
  return <div className="mt-4 border-t border-white/10 pt-3">
    <button type="button" onClick={() => setOpen((value) => !value)} className="text-xs font-semibold text-accent">{open ? 'Ocultar permisos de escritura' : 'Permisos de escritura por sección'}</button>
    {open && <div className="mt-3 space-y-3">{error && <p role="alert" className="text-xs text-red-300">{error}</p>}{sections.map((section) => {
      const row = permissions.find((item) => item.section_id === section.id)
      return <div key={section.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300"><span className="w-32">{section.label}</span><label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(row?.can_publish_guides)} onChange={(event) => save(section.id, 'can_publish_guides', event.target.checked)} /> Publicar guías</label><label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(row?.can_manage_events)} onChange={(event) => save(section.id, 'can_manage_events', event.target.checked)} /> Gestionar eventos</label></div>
    })}</div>}
  </div>
}

function Dashboard() {
  const { isAdmin: isMainAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/users', { credentials: 'same-origin' })
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setUsers(data.users)
        setRoles(data.roles)
        setStatus('ready')
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(
    () => Object.fromEntries(roles.map((role) => [role.id, users.filter((u) => u.roles.includes(role.id)).length])),
    [roles, users],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((user) => {
      const matchesQuery =
        !q || [user.name, user.username, user.id].some((field) => String(field).toLowerCase().includes(q))
      const matchesFilter =
        filter === 'all' ||
        (filter === 'none' ? user.roles.length === 0 && !user.isAdmin : user.roles.includes(filter))
      return matchesQuery && matchesFilter
    })
  }, [users, query, filter])

  async function toggleRole(user, roleId) {
    if (roleId === 'subadmins' && !user.isAdmin && !isMainAdmin) return
    const next = user.roles.includes(roleId)
      ? user.roles.filter((id) => id !== roleId)
      : [...user.roles, roleId]

    setError('')
    setSavingId(user.id)
    // Se muestra el cambio de inmediato y se revierte si el servidor lo rechaza.
    setUsers((list) => list.map((item) => (item.id === user.id ? { ...item, roles: next } : item)))

    try {
      const res = await fetch(`/api/admin/users/${user.id}/roles`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roles: next }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setUsers((list) => list.map((item) => (item.id === user.id ? data.user : item)))
    } catch {
      setUsers((list) => list.map((item) => (item.id === user.id ? user : item)))
      setError(`No se pudo actualizar a ${user.name}. Intenta de nuevo.`)
    } finally {
      setSavingId(null)
    }

  }

  if (status === 'loading') return <p className="text-slate-400">Cargando usuarios…</p>
  if (status === 'error') return <p className="text-red-300">No se pudo cargar el panel.</p>

  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <div className="rounded-xl border border-white/10 p-4">
          <p className="text-2xl font-extrabold text-white">{users.length}</p>
          <p className="text-xs text-slate-400">Usuarios</p>
        </div>
        {roles.map((role) => (
          <div key={role.id} className="rounded-xl border border-white/10 p-4">
            <p className="text-2xl font-extrabold text-accent">{counts[role.id]}</p>
            <p className="text-xs text-slate-400">{role.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, usuario o ID…"
          aria-label="Buscar usuarios"
          className="w-full rounded-lg border border-white/10 bg-space-700/70 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:border-accent/60 focus:outline-none sm:max-w-sm"
        />
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Filtrar por rol"
          className="rounded-lg border border-white/10 bg-space-700/70 px-4 py-2.5 text-sm text-slate-100 focus:border-accent/60 focus:outline-none"
        >
          <option value="all">Todos los usuarios</option>
          <option value="none">Sin ningún rol</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {visible.map((user) => (
          <li
            key={user.id}
            className={`rounded-2xl border border-white/10 bg-space-800/60 p-5 transition ${
              savingId === user.id ? 'opacity-60' : ''
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <img src={user.avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-white">
                    <span className="truncate">{user.name}</span>
                    {user.isAdmin && (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                        Admin
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    @{user.username} · <span className="font-mono">{user.id}</span>
                  </p>
                  <p className="text-xs text-slate-500">Última sesión: {formatDate(user.lastLogin)}</p>
                </div>
              </div>

              {user.isAdmin ? (
                <p className="text-sm text-slate-400">Acceso total a todas las secciones</p>
              ) : (
                <div className="flex flex-wrap gap-2" role="group" aria-label={`Roles de ${user.name}`}>
                  {roles.map((role) => {
                    const active = user.roles.includes(role.id)
                    return (
                      <button
                        key={role.id}
                        type="button"
                        aria-pressed={active}
                        disabled={savingId === user.id || (role.id === 'subadmins' && !isMainAdmin)}
                        onClick={() => toggleRole(user, role.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? 'border-accent bg-accent/15 text-accent'
                            : 'border-white/10 text-slate-400 hover:border-white/30 hover:text-white'
                        }`}
                      >
                        {role.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            {!user.isAdmin && <PermissionEditor user={user} />}
          </li>
        ))}
        {visible.length === 0 && (
          <li className="rounded-2xl border border-white/10 p-8 text-center text-slate-400">
            No hay usuarios que coincidan. Aquí aparecen quienes ya iniciaron sesión con Discord.
          </li>
        )}
      </ul>
    </>
  )
}

export default function Admin() {
  const { user, isAdmin, isSubadmin, loading } = useAuth()

  if (loading) return <main className="px-global py-16 text-slate-400">Cargando…</main>

  if (!user) {
    return (
      <main className="px-global py-16">
        <LoginPrompt
          next="/admin"
          title="Panel de administración"
          text="Inicia sesión con tu cuenta de Discord para continuar."
        />
      </main>
    )
  }

  if (!isAdmin && !isSubadmin) {
    return (
      <main className="px-global py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Acceso restringido</h1>
        <p className="mt-3 text-slate-400">Esta sección es solo para administradores.</p>
      </main>
    )
  }

  return (
    <main className="px-global py-12">
      <div className="mx-auto max-w-6xl">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
          <FaShieldAlt aria-hidden="true" /> Administración
        </p>
        <h1 className="mt-3 text-4xl font-extrabold text-white">Roles y accesos</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Asigna o quita roles a quienes han iniciado sesión. Cada rol da acceso a las guías
          privadas de su sección, y el cambio se aplica de inmediato.
        </p>
        <Dashboard />
      </div>
    </main>
  )
}
