import { Link } from 'react-router-dom'
import ContentCard from './ContentCard'

export default function ContentSection({ id, title, description, items, linkLabel, linkTo }) {
  return (
    <section id={id} className="px-global pb-16">
      <div className="mb-7 flex items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">{title}</h2>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">{description}</p>
        </div>
        <Link
          to={linkTo}
          className="shrink-0 text-center text-sm font-semibold text-accent transition hover:text-white"
        >
          {linkLabel}
        </Link>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.slice(0, 4).map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
          Próximamente encontrarás contenido aquí.
        </p>
      )}
    </section>
  )
}
