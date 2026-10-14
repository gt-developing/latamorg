import { randomBytes } from 'node:crypto'
import { DEFAULT_ADMIN_ID, ROLES, ROLE_IDS } from '../../shared/access.mjs'
import { parseCookies, serializeCookie, sign, verify } from './session.mjs'

const SESSION_COOKIE = 'latam_session'
const STATE_COOKIE = 'latam_oauth'
const SESSION_SECONDS = 7 * 24 * 60 * 60
const DISCORD_ID = /^\d{5,25}$/
const SLUG = /^[a-z0-9][a-z0-9_-]*$/i

const roleLabel = (id) => ROLES.find((role) => role.id === id)?.label ?? id

const json = (data, status = 200, cookies = []) => {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  for (const cookie of cookies) headers.append('set-cookie', cookie)
  return new Response(JSON.stringify(data), { status, headers })
}

const redirect = (location, cookies = []) => {
  const headers = new Headers({ location, 'cache-control': 'no-store' })
  for (const cookie of cookies) headers.append('set-cookie', cookie)
  return new Response(null, { status: 302, headers })
}

// Solo rutas internas del sitio: evita redirigir a páginas externas.
const safeNext = (value) =>
  typeof value === 'string' &&
  value.startsWith('/') &&
  !value.startsWith('//') &&
  !value.includes('\\')
    ? value
    : '/'

const avatarUrl = (user) =>
  user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(user.id) >> 22n) % 6n)}.png`

/**
 * Crea el manejador de la API.
 *  - store:         { get(id), set(id, valor), list() } con los usuarios y sus roles.
 *  - env:           variables de entorno.
 *  - privateGuides: guías confidenciales [{ role, slug, title, description, body }].
 *  - fetchImpl:     fetch (se puede reemplazar en pruebas).
 */
export function createHandler({ store, env, privateGuides = [], fetchImpl = fetch }) {
  const adminId = env.ADMIN_DISCORD_ID || DEFAULT_ADMIN_ID

  const publicUser = (user) => ({
    id: user.id,
    name: user.name,
    username: user.username,
    avatar: avatarUrl(user),
    roles: user.roles ?? [],
    firstSeen: user.firstSeen,
    lastLogin: user.lastLogin,
    isAdmin: user.id === adminId,
  })

  // Lee la cookie de sesión y carga al usuario con sus roles ACTUALES desde la base de datos,
  // así quitar un rol surte efecto de inmediato aunque la sesión siga abierta.
  async function getSession(req) {
    const token = parseCookies(req.headers.get('cookie') ?? '')[SESSION_COOKIE]
    const payload = verify(token, env.SESSION_SECRET)
    if (!payload?.id) return null
    const user = await store.get(payload.id)
    if (!user) return null
    return { user, isAdmin: user.id === adminId }
  }

  const canAccess = (session, role) =>
    session.isAdmin || (session.user.roles ?? []).includes(role)

  return async function handle(req) {
    try {
      if (!env.SESSION_SECRET) {
        console.error('Falta la variable de entorno SESSION_SECRET')
        return json({ error: 'El servidor no está configurado' }, 500)
      }

      const url = new URL(req.url)
      const origin = (env.SITE_URL || url.origin).replace(/\/$/, '')
      const secure = origin.startsWith('https')
      const path =
        url.pathname.replace(/^\/(\.netlify\/functions\/api|api)/, '').replace(/\/+$/, '') || '/'
      const method = req.method

      // ───────── Inicio de sesión con Discord ─────────
      if (method === 'GET' && path === '/auth/login') {
        if (!env.DISCORD_CLIENT_ID) {
          console.error('Falta DISCORD_CLIENT_ID')
          return json({ error: 'El servidor no está configurado' }, 500)
        }
        const state = randomBytes(16).toString('hex')
        const next = safeNext(url.searchParams.get('next'))
        const authorize = new URL('https://discord.com/oauth2/authorize')
        authorize.search = new URLSearchParams({
          client_id: env.DISCORD_CLIENT_ID,
          response_type: 'code',
          redirect_uri: `${origin}/api/auth/callback`,
          scope: 'identify',
          state,
          prompt: 'consent',
        }).toString()

        const stateCookie = serializeCookie(
          STATE_COOKIE,
          sign({ state, next, exp: Math.floor(Date.now() / 1000) + 600 }, env.SESSION_SECRET),
          { maxAge: 600, secure },
        )
        return redirect(authorize.toString(), [stateCookie])
      }

      if (method === 'GET' && path === '/auth/callback') {
        const clearState = serializeCookie(STATE_COOKIE, '', { maxAge: 0, secure })
        if (url.searchParams.get('error')) return redirect('/?login=cancelled', [clearState])

        const saved = verify(
          parseCookies(req.headers.get('cookie') ?? '')[STATE_COOKIE],
          env.SESSION_SECRET,
        )
        const code = url.searchParams.get('code')
        if (!code || !saved || saved.state !== url.searchParams.get('state')) {
          return redirect('/?login=error', [clearState])
        }

        const tokenRes = await fetchImpl('https://discord.com/api/oauth2/token', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: env.DISCORD_CLIENT_ID,
            client_secret: env.DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri: `${origin}/api/auth/callback`,
          }),
        })
        if (!tokenRes.ok) return redirect('/?login=error', [clearState])
        const { access_token: accessToken } = await tokenRes.json()

        const meRes = await fetchImpl('https://discord.com/api/users/@me', {
          headers: { authorization: "Bearer " + accessToken },
        })
        if (!meRes.ok) return redirect('/?login=error', [clearState])
        const me = await meRes.json()
        if (!DISCORD_ID.test(String(me.id))) return redirect('/?login=error', [clearState])

        // Se conservan los roles que ya tuviera asignados.
        const now = new Date().toISOString()
        const existing = await store.get(me.id)
        await store.set(me.id, {
          id: me.id,
          username: me.username,
          name: me.global_name || me.username,
          avatar: me.avatar ?? null,
          roles: existing?.roles ?? [],
          firstSeen: existing?.firstSeen ?? now,
          lastLogin: now,
        })

        const sessionCookie = serializeCookie(
          SESSION_COOKIE,
          sign(
            { id: me.id, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS },
            env.SESSION_SECRET,
          ),
          { maxAge: SESSION_SECONDS, secure },
        )
        return redirect(safeNext(saved.next), [sessionCookie, clearState])
      }

      if (method === 'POST' && path === '/auth/logout') {
        return json({ ok: true }, 200, [serializeCookie(SESSION_COOKIE, '', { maxAge: 0, secure })])
      }

      // ───────── Sesión actual ─────────
      if (method === 'GET' && path === '/me') {
        const session = await getSession(req)
        if (!session) return json({ user: null, roles: [], isAdmin: false })
        const user = publicUser(session.user)
        return json({ user, roles: user.roles, isAdmin: session.isAdmin })
      }

      // ───────── Guías privadas ─────────
      if (method === 'GET' && path === '/private/guides') {
        const session = await getSession(req)
        if (!session) return json({ error: 'Inicia sesión' }, 401)
        const guides = privateGuides
          .filter((guide) => canAccess(session, guide.role))
          .map(({ body, ...meta }) => ({ ...meta, roleLabel: roleLabel(meta.role) }))
        return json({ guides })
      }

      const guideMatch = path.match(/^\/private\/guides\/([^/]+)\/([^/]+)$/)
      if (method === 'GET' && guideMatch) {
        const [, role, slug] = guideMatch
        const session = await getSession(req)
        if (!session) return json({ error: 'Inicia sesión' }, 401)
        if (!ROLE_IDS.includes(role) || !SLUG.test(slug)) return json({ error: 'No encontrada' }, 404)
        if (!canAccess(session, role)) return json({ error: 'No tienes permiso' }, 403)
        const guide = privateGuides.find((item) => item.role === role && item.slug === slug)
        if (!guide) return json({ error: 'No encontrada' }, 404)
        return json({ guide: { ...guide, roleLabel: roleLabel(role) } })
      }

      // ───────── Administración ─────────
      if (path === '/admin/users' || path.startsWith('/admin/users/')) {
        const session = await getSession(req)
        if (!session) return json({ error: 'Inicia sesión' }, 401)
        if (!session.isAdmin) return json({ error: 'Solo administradores' }, 403)

        if (method === 'GET' && path === '/admin/users') {
          const users = (await store.list())
            .map(publicUser)
            .sort((a, b) => String(b.lastLogin).localeCompare(String(a.lastLogin)))
          return json({ roles: ROLES, users })
        }

        const roleMatch = path.match(/^\/admin\/users\/([^/]+)\/roles$/)
        if (method === 'PUT' && roleMatch) {
          const id = roleMatch[1]
          if (!DISCORD_ID.test(id)) return json({ error: 'ID inválido' }, 400)
          if (!(req.headers.get('content-type') ?? '').includes('application/json')) {
            return json({ error: 'Content-Type debe ser application/json' }, 415)
          }
          let body
          try {
            body = await req.json()
          } catch {
            return json({ error: 'JSON inválido' }, 400)
          }
          if (
            !Array.isArray(body?.roles) ||
            body.roles.some((role) => typeof role !== 'string' || !ROLE_IDS.includes(role))
          ) {
            return json({ error: 'Roles inválidos' }, 400)
          }

          const target = await store.get(id)
          if (!target) return json({ error: 'Usuario no encontrado' }, 404)
          target.roles = ROLE_IDS.filter((role) => body.roles.includes(role))
          await store.set(id, target)
          return json({ user: publicUser(target) })
        }
      }

      return json({ error: 'No encontrado' }, 404)
    } catch (error) {
      console.error(error)
      return json({ error: 'Error del servidor' }, 500)
    }
  }
}
