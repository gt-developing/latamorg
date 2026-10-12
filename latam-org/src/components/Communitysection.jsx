import { FiBookOpen as BookOpen, FiCalendar as CalendarDays, FiFolder, FiStar, FiUsers } from 'react-icons/fi'

// Para editar o añadir tarjetas, modifica esta lista.
const features = [
  {
    icon: FiUsers,
    title: 'Comunidad',
    text: 'Conoce a otros jugadores, forma tripulaciones y comparte tu experiencia.',
  },
  {
    icon: CalendarDays,
    title: 'Eventos',
    text: 'Participa en eventos, competencias y encuentros organizados por y para la comunidad.',
  },
  {
    icon: BookOpen,
    title: 'Guías',
    text: 'Aprende con tutoriales paso a paso, desde tus primeros pasos hasta estrategias avanzadas.',
  },
  {
    icon: FiFolder,
    title: 'Recursos',
    text: 'Mapas, herramientas y material útil en español para sacarle el máximo al Verso.',
  },
  {
    icon: FiStar,
    title: 'LATAM ORG',
    text: 'Una organización hispanohablante que une a jugadores de toda Latinoamérica.',
  },
]

export default function CommunitySection() {
  return (
    <section className="px-global py-16">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
        {features.map(({ icon: Icon, title, text }) => (
          <article key={title}>
            <Icon className="h-9 w-9 text-accent" strokeWidth={1.5} aria-hidden="true" />
            <h2 className="mt-4 text-lg font-bold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}