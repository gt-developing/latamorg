import { useEffect, useRef, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { fetchPublicGuides } from '../lib/content'

const normalize = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [searchIndex, setSearchIndex] = useState([])
  const wrapperRef = useRef(null)

  useEffect(() => {
    fetchPublicGuides().then(setSearchIndex).catch(() => setSearchIndex([]))
  }, [])

  const q = normalize(query.trim())
  const results = q ? searchIndex.filter((item) => normalize(item.title).includes(q)).slice(0, 6) : []

  // Cierra el panel de resultados al hacer clic fuera
  useEffect(() => {
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xs">
      <label htmlFor="site-search" className="sr-only">
        Buscar guías
      </label>
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-space-700/70 px-4 py-2 transition focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20">
        <FiSearch className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <input
          id="site-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          placeholder="Buscar guías…"
          autoComplete="off"
          className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {open && query.trim() && (
        <ul className="absolute right-0 z-50 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-space-800 shadow-xl shadow-black/40">
          {results.length > 0 ? (
            results.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-space-600/60"
                >
                  <span className="truncate">{item.title}</span>
                  <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                    {item.type}
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-sm text-slate-400">Sin resultados para “{query}”</li>
          )}
        </ul>
      )}
    </div>
  )
}