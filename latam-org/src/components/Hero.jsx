import { FaDiscord } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import bannerImage from '../assets/banner.webp'
import { DISCORD_URL } from '../config/links'

export default function Hero() {
  return (
    <section className="relative isolate w-full overflow-hidden border-b border-white/10">
      {/* Imagen de fondo a todo el ancho */}
      <img
        src={bannerImage}
        alt=""
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />

      {/* Fade a oscuro solo en la izquierda, para resaltar el texto */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-space-900 via-space-900/30 to-transparent" />

      {/* Contenido: usa el padding global y no ocupa todo el alto de pantalla */}
      <div className="px-global flex min-h-[420px] items-center py-16 md:min-h-[480px]">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent sm:text-sm">
            Comunidad LATAM de Star Citizen
          </p>

          <h1 className="mt-2 text-4xl font-extrabold uppercase leading-none tracking-tight text-white sm:text-5xl md:text-6xl">
            Tu próxima aventura comienza aquí.
          </h1>

          <p className="mt-5 max-w-xl text-base text-slate-300 sm:text-lg">
            Una comunidad, miles de historias por vivir. Encuentra tu lugar entre las estrellas con
            LATAM ORG.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-lg bg-[#5865F2] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5865F2]/30 transition hover:bg-[#4752c4] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <FaDiscord className="h-5 w-5" aria-hidden="true" />
              Unirse al Discord
            </a>
            <Link
              to="/nosotros"
              className="inline-flex items-center rounded-lg border border-accent px-6 py-3 text-sm font-semibold text-accent transition hover:bg-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
            >
              Conócenos
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}