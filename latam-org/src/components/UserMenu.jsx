import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaChevronDown, FaDiscord, FaLock, FaShieldAlt, FaSignOutAlt } from 'react-icons/fa'
import { loginUrl, useAuth } from '../context/AuthContext'

const itemClass =
  'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/5'

export default function UserMenu() {
  const { user, isAdmin, isSubadmin, permissions, loading, logout } = useAuth()
  const { pathname, search } = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Cierra el menú al hacer clic fuera o al pulsar Escape.
  useEffect(() => {
    if (!open) return undefined
    const onMouseDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (loading) {
    return <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/5" aria-hidden="true" />
  }

  if (!user) {
    return (
      <a
        href={loginUrl(pathname + search)}
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#5865F2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4752c4]"
      >
        <FaDiscord className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Iniciar sesión</span>
      </a>
    )
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-space-700/70 py-1 pl-1 pr-3 transition hover:border-accent/50"
      >
        <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
        <span className="hidden max-w-[8rem] truncate text-sm font-medium text-white sm:inline">
          {user.name}
        </span>
        <FaChevronDown className="h-3 w-3 text-slate-400" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-white/10 bg-space-800 shadow-xl shadow-black/40"
        >
          <div className="border-b border-white/10 px-4 py-3">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-400">@{user.username}</p>
          </div>

          <Link to="/privadas" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
            <FaLock className="h-4 w-4 text-accent" aria-hidden="true" />
            Guías privadas
          </Link>

          {(isAdmin || isSubadmin) && (
            <Link to="/admin" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              <FaShieldAlt className="h-4 w-4 text-accent" aria-hidden="true" />
              Panel de administración
            </Link>
          )}

          {Boolean(isAdmin || isSubadmin || permissions?.publishGuides?.length || permissions?.manageEvents?.length || permissions?.publishPublicGuides) && (
            <Link to="/dashboard/guias" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              <FaShieldAlt className="h-4 w-4 text-accent" aria-hidden="true" />
              Dashboard de contenido
            </Link>
          )}

          {Boolean(isAdmin || isSubadmin || permissions?.manageEvents?.length) && (
            <Link to="/dashboard/eventos" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              <FaShieldAlt className="h-4 w-4 text-accent" aria-hidden="true" />
              Gestionar eventos
            </Link>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              logout()
            }}
            className={`${itemClass} border-t border-white/10`}
          >
            <FaSignOutAlt className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
