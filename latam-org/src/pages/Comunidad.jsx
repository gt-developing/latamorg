import { FaDiscord, FaGlobeAmericas, FaUsers } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import { DISCORD_URL } from '../config/links'
import SEO from '../components/SEO'

const communityCards = [
  {
    icon: FaUsers,
    title: 'Una tripulación para todos',
    text: 'Conoce jugadores de toda Latinoamérica, forma tripulaciones y comparte tu experiencia en Star Citizen.',
  },
  {
    icon: FaGlobeAmericas,
    title: 'Juega a tu manera',
    text: 'Encuentra tu lugar entre la minería, el transporte, la exploración, la defensa y muchas otras actividades.',
  },
  {
    icon: FaDiscord,
    title: 'Conecta en Discord',
    text: 'Únete a nuestras conversaciones, organiza tus sesiones y mantente al tanto de lo que ocurre en LATAM ORG.',
  },
]

export default function Comunidad() {
  return (
    <main className="px-global pb-20">
      <SEO
        title="Comunidad de Star Citizen en español | LATAM Org"
        description="Únete a la comunidad hispanohablante de Star Citizen de LATAM Org, organiza tus sesiones y comparte aventuras con jugadores de toda Latinoamérica."
      />
      <div className="mx-auto max-w-5xl">
        <header className="py-16 text-center sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Comunidad LATAM
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Comparte el universo
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
            Somos una comunidad hispanohablante para disfrutar Star Citizen en compañía,
            aprender juntos y construir nuevas historias entre las estrellas.
          </p>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-3 rounded-lg bg-[#5865F2] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5865F2]/30 transition hover:bg-[#4752c4]"
          >
            <FaDiscord className="h-5 w-5" aria-hidden="true" />
            Unirse al Discord
          </a>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
          {communityCards.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-2xl border border-white/10 bg-space-800/60 p-6 sm:p-8"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-xl font-bold text-white">{title}</h2>
              <p className="mt-3 leading-relaxed text-slate-400">{text}</p>
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-2xl border border-accent/30 bg-accent/5 p-6 sm:p-10">
          <h2 className="text-2xl font-bold text-white">Descubre más de LATAM ORG</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-slate-300">
            Revisa nuestra historia y conoce los principios que nos ayudan a crecer como
            organización.
          </p>
          <Link
            to="/nosotros"
            className="mt-6 inline-flex rounded-lg border border-accent px-5 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/10"
          >
            Conócenos
          </Link>
        </section>
      </div>
    </main>
  )
}
