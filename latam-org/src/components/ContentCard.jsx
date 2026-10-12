import { Link } from 'react-router-dom'
import bannerImage from '../assets/banner.png'

export default function ContentCard({ item }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-space-800 transition hover:-translate-y-1 hover:border-accent/40">
      <Link to={item.href} className="block">
        <div
          className="h-44 bg-cover bg-center"
          style={{ backgroundImage: `url(${item.image || bannerImage})` }}
        />
        <div className="p-5">
          <h3 className="text-lg font-bold text-white">{item.title}</h3>
          {item.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-400">
              {item.description}
            </p>
          )}
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">
            Leer {item.section === 'guias' ? 'guía' : 'recurso'} →
          </span>
        </div>
      </Link>
    </article>
  )
}
