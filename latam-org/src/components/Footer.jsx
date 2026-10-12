import { Link } from 'react-router-dom'
import {
  FaArrowUp,
  FaDiscord,
  FaFacebookF,
  FaInstagram,
  FaTwitch,
  FaYoutube,
} from 'react-icons/fa'
import logoImage from '../assets/logo.png'
import * as links from '../config/links'

const findLink = (name) =>
  Object.entries(links).find(([key]) => key.toLowerCase().includes(name))?.[1]

const discordUrl = findLink('discord')
const socials = [
  { label: 'Discord', icon: FaDiscord, href: discordUrl },
  { label: 'Facebook', icon: FaFacebookF, href: findLink('facebook') },
  { label: 'Instagram', icon: FaInstagram, href: findLink('instagram') },
  { label: 'Twitch', icon: FaTwitch, href: findLink('twitch') },
  { label: 'YouTube', icon: FaYoutube, href: findLink('youtube') },
].filter((social) => social.href)

const exploreLinks = [
  { label: 'Inicio', to: '/' },
  { label: 'Guías', to: '/guias' },
  { label: 'Recursos', to: '/recursos' },
  { label: 'Comunidad', to: '/comunidad' },
  { label: 'Nosotros', to: '/nosotros' },
]

const columnTitle = 'text-sm font-semibold uppercase tracking-widest text-white'
const footerLink = 'text-sm text-slate-400 transition hover:text-accent'

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-space-800/60">
      <div className="px-global">
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Link to="/" className="flex items-center gap-3">
              <img src={logoImage} alt="Logo LATAM ORG" className="h-11 w-11 object-contain" />
              <div className="leading-tight">
                <p className="text-lg font-bold tracking-wide text-white">LATAM ORG</p>
                <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-400">
                  Star Citizen
                </p>
              </div>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              La comunidad hispanohablante de Star Citizen. Juntos hacia las estrellas.
            </p>
            <ul className="mt-6 flex flex-wrap gap-3">
              {socials.map(({ label, icon: Icon, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:border-accent/60 hover:text-accent"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Explorar">
            <h2 className={columnTitle}>Explorar</h2>
            <ul className="mt-5 space-y-3">
              {exploreLinks.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className={footerLink}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className={columnTitle}>Únete a nosotros</h2>
            <p className="mt-5 text-sm leading-relaxed text-slate-400">
              Habla con otros pilotos, forma tu tripulación y no te pierdas ningún evento.
            </p>
            {discordUrl && (
              <a
                href={discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-3 rounded-lg bg-[#5865F2] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#5865F2]/30 transition hover:bg-[#4752c4]"
              >
                <FaDiscord className="h-5 w-5" aria-hidden="true" />
                Unirse al Discord
              </a>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 py-6">
          <p className="max-w-4xl text-xs leading-relaxed text-slate-500">
            LATAM ORG es una comunidad de fans no oficial y no está afiliada a Cloud Imperium
            Games. Star Citizen®, Roberts Space Industries® y Cloud Imperium® son marcas
            registradas de Cloud Imperium Rights LLC. Todo el contenido que no sea de nuestra
            autoría pertenece a sus respectivos dueños.
          </p>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} LATAM ORG. Todos los derechos reservados.
            </p>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 self-start text-xs font-semibold text-slate-400 transition hover:text-accent sm:self-auto"
            >
              Volver arriba
              <FaArrowUp className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
