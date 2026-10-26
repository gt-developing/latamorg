import { Link } from 'react-router-dom'
import SearchBar from './SearchBar'
import UserMenu from './UserMenu'
import logoImage from '../assets/logo.png'

const links = [
  { label: 'Inicio', href: '/' },
  { label: 'Guías', href: '/guias' },
  { label: 'Recursos', href: '/recursos' },
  { label: 'Eventos', href: '/eventos' },
  { label: 'Comunidad', href: '/comunidad' },
  { label: 'Nosotros', href: '/nosotros' },
]

export default function Header() {
  return (
    <header className="relative z-50 w-full border-b border-white/10 bg-space-800/80 backdrop-blur">
      {/* px-global: padding lateral compartido por todo el sitio */}
      <div className="px-global flex w-full flex-wrap items-center gap-x-8 gap-y-3 py-3">
        {/* Logo + marca (extremo izquierdo) */}
        <Link to="/" className="flex shrink-0 items-center gap-3">
          <img src={logoImage} alt="Logo LATAM ORG" className="h-11 w-11 object-contain" />
          <div className="leading-tight">
            <p className="text-lg font-bold tracking-wide text-white">LATAM ORG</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-400">
              Star Citizen
            </p>
          </div>
        </Link>

        {/* Secciones */}
        <nav aria-label="Principal" className="order-3 w-full md:order-none md:w-auto">
          <ul className="flex flex-wrap items-center gap-1 text-sm font-medium text-slate-300">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className="rounded-md px-3 py-2 transition hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Buscador + sesión (extremo derecho) */}
        <div className="ml-auto flex w-full items-center justify-end gap-3 md:w-auto md:flex-1">
          <div className="min-w-0 flex-1 md:max-w-xs">
            <SearchBar />
          </div>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
