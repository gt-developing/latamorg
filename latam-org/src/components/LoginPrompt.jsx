import { FaDiscord, FaLock } from 'react-icons/fa'
import { loginUrl } from '../context/AuthContext'

// Aviso con botón de login. `next` es la página a la que se vuelve al terminar.
export default function LoginPrompt({ next, title, text }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-space-800/60 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
        <FaLock className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-2xl font-bold text-white">{title}</h1>
      <p className="mt-3 text-slate-400">{text}</p>
      <a
        href={loginUrl(next)}
        className="mt-6 inline-flex items-center gap-3 rounded-lg bg-[#5865F2] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5865F2]/30 transition hover:bg-[#4752c4]"
      >
        <FaDiscord className="h-5 w-5" aria-hidden="true" />
        Iniciar sesión con Discord
      </a>
    </div>
  )
}
