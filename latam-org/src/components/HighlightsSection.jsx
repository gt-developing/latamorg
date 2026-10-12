import { Link } from 'react-router-dom'
import {
  FaArrowRight as ArrowRight,
  FaBookOpen as BookOpen,
  FaCalculator,
  FaComments as MessageCircle,
  FaGlobe,
} from 'react-icons/fa'
import featuredImage from '../assets/destacado.png'
import newbieImage from '../assets/nuevos.png'
import ContentSection from './ContentSection'
import { searchIndex } from '../lib/content'
import { DISCORD_URL } from '../config/links'

const RSI_COMMUNITY_URL = 'https://robertsspaceindustries.com/community-hub'

const quickLinks = [
  {
    icon: BookOpen,
    title: 'Guías de inicio',
    text: 'Empieza tu viaje en Star Citizen',
    href: '/guias/primeros-pasos',
  },
  {
    icon: MessageCircle,
    title: 'Canal de Discord',
    text: 'Habla con la comunidad en tiempo real',
    href: DISCORD_URL,
    external: true,
  },
  {
    icon: FaGlobe,
    title: 'Comunidad en RSI',
    text: 'Visítanos en el sitio oficial de Roberts Space Industries',
    href: RSI_COMMUNITY_URL,
    external: true,
  },
  {
    icon: FaCalculator,
    title: 'Calculadora de aUEC',
    text: 'Calcula tus ganancias y rutas',
    href: '/recursos/calculadora-auec',
  },
]

const cardBase = 'overflow-hidden rounded-2xl border border-white/10'

function QuickLink({ icon: Icon, title, text, href, external }) {
  const className =
    'flex items-center gap-4 rounded-xl bg-accent/10 p-4 transition hover:bg-accent/20'
  const content = (
    <>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-white">{title}</p>
        <p className="text-sm text-slate-400">{text}</p>
      </div>
    </>
  )

  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <Link to={href} className={className}>
      {content}
    </Link>
  )
}

export default function HighlightsSection() {
  const guides = searchIndex.filter((item) => item.section === 'guias')
  const resources = searchIndex.filter((item) => item.section === 'recursos')

  return (
    <>
      <section className="px-global pb-16">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <article className={`${cardBase} relative isolate sm:col-span-2`}>
          <div
            className="absolute inset-0 -z-20 bg-gradient-to-br from-space-600 to-space-800 bg-cover bg-center"
            style={{ backgroundImage: `url(${featuredImage})` }}
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-space-900/95 via-space-900/60 to-transparent" />

          <div className="flex min-h-[420px] flex-col justify-end p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              Destacado
            </p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              Conoce el universo
              <br />
              junto a nuestra comunidad.
            </h2>
            <p className="mt-4 max-w-md text-sm text-slate-300 sm:text-base">
              Explora, aprende y vive Star Citizen con nosotros. No importa si eres nuevo o
              veterano, siempre hay un lugar para ti.
            </p>
            <Link
              to="/comunidad"
              className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent"
            >
              Descubrir más
              <ArrowRight
                className="h-4 w-4 transition group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </div>
        </article>

        <article className={`${cardBase} p-6`}>
          <h2 className="text-xl font-bold text-white">Accesos rápidos</h2>
          <div className="mt-5 flex flex-col gap-3">
            {quickLinks.map((link) => (
              <QuickLink key={link.title} {...link} />
            ))}
          </div>
        </article>

        <article className={`${cardBase} relative isolate flex min-h-[380px] flex-col`}>
  <div
    className="absolute inset-0 -z-20 bg-gradient-to-br from-space-600 to-space-800 bg-cover bg-center"
    style={{ backgroundImage: `url(${newbieImage})` }}
  />
  <div className="absolute inset-0 -z-10 bg-gradient-to-t from-space-900 via-space-900/70 to-transparent" />

  <div className="flex flex-1 flex-col justify-end p-6">
    <h2 className="text-2xl font-bold text-white">¿Eres nuevo?</h2>
    <p className="mt-3 text-sm leading-relaxed text-slate-300">
      No te preocupes, todos empezamos en algún punto. Aquí encontrarás la información
      básica y una comunidad dispuesta a ayudarte.
    </p>
    <Link
      to="/guias/primeros-pasos"
      className="group mt-6 inline-flex items-center gap-2 self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-space-900 transition hover:brightness-110"
    >
      Guía para nuevos
      <ArrowRight
        className="h-4 w-4 transition group-hover:translate-x-1"
        aria-hidden="true"
      />
    </Link>
  </div>
</article>
      </div>
      </section>
      <ContentSection
        id="guias"
        title="Guías destacadas"
        description="Aprende lo esencial y avanza más rápido en el universo"
        items={guides}
        linkLabel="Ver todas las guías"
        linkTo="/guias"
      />
      <ContentSection
        id="recursos"
        title="Recursos"
        description="Herramientas y referencias para aprovechar cada sesión"
        items={resources}
        linkLabel="Ver todos los recursos"
        linkTo="/recursos"
      />
    </>
  )
}
