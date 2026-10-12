import { Link } from 'react-router-dom'
import {
  FaBoxes,
  FaCompass,
  FaComments,
  FaDiscord,
  FaGem,
  FaRecycle,
  FaShieldAlt,
  FaSitemap,
  FaTools,
  FaVoteYea,
} from 'react-icons/fa'
import { DISCORD_URL } from '../config/links'
import SEO from '../components/SEO'

const activities = [
  { icon: FaGem, label: 'Minería' },
  { icon: FaBoxes, label: 'Transporte de carga' },
  { icon: FaShieldAlt, label: 'Servicios de defensa' },
  { icon: FaCompass, label: 'Exploración' },
  { icon: FaTools, label: 'Ingeniería' },
  { icon: FaRecycle, label: 'Reciclaje' },
]

const democracyFacts = [
  { value: 'Cada año', text: 'Se realizan elecciones' },
  { value: 'Top 3', text: 'Los más votados forman el alto mando' },
  { value: 'Mérito', text: 'Valoramos las cualidades, no la antigüedad' },
]

const card = 'rounded-2xl border border-white/10 bg-space-800/60 p-6 sm:p-8'

function SectionIcon({ icon: Icon }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </div>
  )
}

export default function Nosotros() {
  return (
    <main className="px-global pb-20">
      <SEO
        title="Sobre LATAM Org | Organización de Star Citizen"
        description="Conoce la historia, los departamentos y la estructura democrática de LATAM Org, una organización latinoamericana de Star Citizen."
      />
      <div className="mx-auto max-w-5xl">
        {/* Encabezado + introducción */}
        <header className="py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Nosotros</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Nuestra historia
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300 sm:text-xl">
            LATAM propone un campo de juego único para jugadores de América Latina, los cuales
            más allá de sus múltiples nacionalidades, personalidades, tradiciones y costumbres se
            emparejan en un clima de pleno entendimiento, aprendizaje, formación de talentos y
            desarrollo de sistemas de organización y transparencia. El clima distendido, la
            solidaridad y el “buen rollo” entre los miembros son pilares fundamentales, lo que
            hace de nuestra organización una experiencia agradable mientras los créditos fluyen.
          </p>
        </header>

        {/* Actividades */}
        <section>
          <p className="max-w-3xl leading-relaxed text-slate-400">
            Al decidir ser una organización, desplegamos una amplia gama de actividades, como la
            minería, el transporte de carga, los servicios de defensa, la exploración, la
            ingeniería y el reciclaje, integrándolos en una sola fuerza con objetivos comunes.
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {activities.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex flex-col items-center gap-3 rounded-xl border border-white/10 px-3 py-5 text-center transition hover:border-accent/40"
              >
                <Icon className="h-6 w-6 text-accent" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-200">{label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Departamentos y democracia */}
        <section className="mt-12 grid gap-5 lg:grid-cols-2">
          <article className={card}>
            <SectionIcon icon={FaSitemap} />
            <h2 className="mt-5 text-xl font-bold text-white">Departamentos</h2>
            <p className="mt-3 leading-relaxed text-slate-400">
              Esto nos ha permitido, con el tiempo, formar diferentes departamentos que dan
              oportunidad a cada miembro de elegir un campo de estudio en el cual perfeccionarse y
              servir a la organización en la actividad que más disfrute. Sin embargo, cada
              compañero tiene también la oportunidad de integrarse en las diferentes disciplinas.
              No importa si un piloto de combate decide realizar tareas de minería o de transporte
              y carga por un rato: esto permite colaborar en diferentes ámbitos para alcanzar los
              objetivos de la organización.
            </p>
          </article>

          <article className={card}>
            <SectionIcon icon={FaVoteYea} />
            <h2 className="mt-5 text-xl font-bold text-white">Estructura democrática</h2>
            <p className="mt-3 leading-relaxed text-slate-400">
              La estructura jerárquica de LATAM es democrática: se realizan elecciones anuales y
              los tres jugadores con más votos pasan a formar parte del alto mando. Desde ahí,
              definen quiénes serán las cabezas de cada departamento, y estos líderes
              departamentales organizan con autonomía las funciones y regulaciones dentro de su
              respectivo departamento. Valoramos más las cualidades de cada persona que su
              antigüedad en la organización para aspirar a los puestos elegibles.
            </p>
            <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-6">
              {democracyFacts.map(({ value, text }) => (
                <div key={value}>
                  <dt className="text-lg font-extrabold text-accent">{value}</dt>
                  <dd className="mt-1 text-xs leading-snug text-slate-400">{text}</dd>
                </div>
              ))}
            </dl>
          </article>
        </section>

        {/* Cierre */}
        <section className="mt-12 rounded-2xl border border-accent/30 bg-accent/5 p-6 sm:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <SectionIcon icon={FaComments} />
                <h2 className="text-xl font-bold text-white">Tu voz cuenta</h2>
              </div>
              <p className="mt-4 leading-relaxed text-slate-300">
                En LATAM las ideas de todos sus integrantes son escuchadas, discutidas y tomadas en
                cuenta. Esto garantiza una óptima comunicación entre nosotros y fortalece la
                relación, lo que se traduce en mejores resultados durante el juego. Los rangos son
                exclusivos de las fuerzas militares por la naturaleza de la misma.
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-4">
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-lg bg-[#5865F2] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5865F2]/30 transition hover:bg-[#4752c4]"
              >
                <FaDiscord className="h-5 w-5" aria-hidden="true" />
                Unirse al Discord
              </a>
              <Link to="/" className="text-sm font-semibold text-accent hover:underline">
                Volver al inicio
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}