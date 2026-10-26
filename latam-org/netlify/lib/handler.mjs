import { randomBytes } from 'node:crypto'
import { DEFAULT_ADMIN_ID, ROLES, ROLE_IDS, SUBADMIN_ROLE_ID } from '../../shared/access.mjs'
import {
  canManageUsers,
  canPublishGuides,
  canReadSection,
} from '../../shared/permissions.mjs'
import { parseCookies, serializeCookie, sign, verify } from './session.mjs'

const SESSION_COOKIE = 'latam_session'
const STATE_COOKIE = 'latam_oauth'
const SESSION_SECONDS = 7 * 24 * 60 * 60
const DISCORD_ID = /^\d{5,25}$/
const SLUG = /^[a-z0-9][a-z0-9_-]*$/i
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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
 *  - store:         { get(id), list(), updateRoles(id, roles), upsertLogin(datos) } con los usuarios y sus roles.
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
    isSubadmin: (user.roles ?? []).includes(SUBADMIN_ROLE_ID),
  })

  // Lee la cookie de sesión y carga al usuario con sus roles ACTUALES desde la base de datos,
  // así quitar un rol surte efecto de inmediato aunque la sesión siga abierta.
  async function getSession(req) {
    const token = parseCookies(req.headers.get('cookie') ?? '')[SESSION_COOKIE]
    const payload = verify(token, env.SESSION_SECRET)
    if (!payload?.id) return null
    const user = await store.get(payload.id)
    if (!user) return null
    const permissions = store.listPermissions ? await store.listPermissions(user.id) : []
    return {
      user,
      isAdmin: user.id === adminId,
      isSubadmin: (user.roles ?? []).includes(SUBADMIN_ROLE_ID),
      permissions,
    }
  }

  const canAccess = (session, role) =>
    canReadSection({ ...session, isSubadmin: session.isSubadmin }, role)

  const canManage = (session) => canManageUsers(session)

  const guidePayload = (guide, sectionLabel) => ({
    id: guide.id,
    role: guide.sectionId,
    slug: guide.slug,
    title: guide.title,
    description: guide.description,
    image: guide.image,
    body: guide.body,
    status: guide.status,
    authorId: guide.authorId,
    createdAt: guide.createdAt,
    updatedAt: guide.updatedAt,
    publishedAt: guide.publishedAt,
    roleLabel: sectionLabel ?? guide.sectionId,
  })

  const validateGuideInput = (body) => {
    if (!body || typeof body !== 'object') return 'Datos inválidos'
    if (typeof body.slug !== 'string' || !SLUG.test(body.slug)) return 'Slug inválido'
    if (typeof body.title !== 'string' || body.title.trim().length < 1 || body.title.length > 200) {
      return 'Título inválido'
    }
    if (typeof body.description !== 'string' || body.description.length > 500) {
      return 'Descripción inválida'
    }
    if (typeof body.body !== 'string' || body.body.length > 200 * 1024) return 'Cuerpo inválido'
    if (body.image !== '' && (typeof body.image !== 'string' || !/^https:\/\//i.test(body.image))) {
      return 'Imagen inválida'
    }
    if (body.status !== 'draft' && body.status !== 'published') return 'Estado inválido'
    if (body.sectionId !== null && (typeof body.sectionId !== 'string' || !ROLE_IDS.includes(body.sectionId))) {
      return 'Sección inválida'
    }
    return null
  }

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

        const now = new Date().toISOString()
        await store.upsertLogin({
          id: me.id,
          username: me.username,
          name: me.global_name || me.username,
          avatar: me.avatar ?? null,
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
        const publishGuides = session.isAdmin || session.isSubadmin
          ? ['public', ...ROLES.filter((role) => role.id !== SUBADMIN_ROLE_ID).map((role) => role.id)]
          : session.permissions.filter((permission) => permission.can_publish_guides).map((permission) => permission.section_id)
        const manageEvents = session.isAdmin || session.isSubadmin
          ? ['public', ...ROLES.filter((role) => role.id !== SUBADMIN_ROLE_ID).map((role) => role.id)]
          : session.permissions.filter((permission) => permission.can_manage_events).map((permission) => permission.section_id)
        return json({
          user,
          roles: user.roles,
          isAdmin: session.isAdmin,
          isSubadmin: user.isSubadmin,
          permissions: { publishGuides, manageEvents },
        })
      }

      // ───────── Guías privadas ─────────
      if (method === 'GET' && path === '/private/guides') {
        const session = await getSession(req)
        if (!session) return json({ error: 'Inicia sesión' }, 401)
        const sections = store.listSections ? await store.listSections() : []
        const guides = store.listGuides
          ? (await store.listGuides({ includeBody: false, status: 'published' }))
              .filter((guide) => guide.sectionId && canAccess(session, guide.sectionId))
              .map((guide) => guidePayload(
                guide,
                sections.find((section) => section.id === guide.sectionId)?.label,
              ))
          : privateGuides
              .filter((guide) => canAccess(session, guide.role))
              .map(({ body: _body, ...meta }) => ({
                ...meta,
                roleLabel: ROLES.find((role) => role.id === meta.role)?.label ?? meta.role,
              }))
        return json({ guides })
      }

      const guideMatch = path.match(/^\/private\/guides\/([^/]+)\/([^/]+)$/)
      if (method === 'GET' && guideMatch) {
        const [, role, slug] = guideMatch
        const session = await getSession(req)
        if (!session) return json({ error: 'Inicia sesión' }, 401)
        if (!SLUG.test(slug)) {
          return json({ error: 'No encontrada' }, 404)
        }
        if (!canAccess(session, role)) return json({ error: 'No tienes permiso' }, 403)
        const sections = store.listSections ? await store.listSections() : []
        const guide = store.getGuide
          ? await store.getGuide(slug, { sectionId: role, publishedOnly: true })
          : privateGuides.find((item) => item.role === role && item.slug === slug)
        if (!guide) return json({ error: 'No encontrada' }, 404)
        return json({
          guide: store.getGuide
            ? guidePayload(guide, sections.find((section) => section.id === role)?.label)
            : { ...guide, roleLabel: ROLES.find((item) => item.id === role)?.label ?? role },
        })
      }

      // ───────── Guías públicas ─────────
      if (method === 'GET' && (path === '/guides' || path.startsWith('/guides/'))) {
        if (!store.listGuides) return json({ guides: [] })
        const slug = path === '/guides' ? null : path.slice('/guides/'.length)
        if (slug && !SLUG.test(slug)) return json({ error: 'No encontrada' }, 404)
        const sections = store.listSections ? await store.listSections() : []
        if (!slug) {
          const guides = await store.listGuides({ sectionId: null, status: 'published', includeBody: false })
          return json({ guides: guides.map((guide) => guidePayload(guide, 'Público')) })
        }
        const guide = await store.getGuide(slug, { sectionId: null, publishedOnly: true })
        if (!guide) return json({ error: 'No encontrada' }, 404)
        return json({ guide: guidePayload(guide, sections.find((section) => section.id === null)?.label ?? 'Público') })
      }

      // ───────── Dashboard de guías ─────────
      if (path === '/dashboard/guides' || path.startsWith('/dashboard/guides/')) {
        const session = await getSession(req)
        if (!session) return json({ error: 'Inicia sesión' }, 401)
        if (!store.listGuides) return json({ error: 'No disponible' }, 500)
        const sections = await store.listSections()
        const visibleSections = sections.filter((section) =>
          canPublishGuides(session, section.id, session.permissions),
        )
        const sectionIds = new Set(visibleSections.map((section) => section.id))
        const publishMatch = path.match(/^\/dashboard\/guides\/([^/]+)\/publish$/)
        const isNewGuide = path === '/dashboard/guides/new'
        const guideId = path === '/dashboard/guides' || isNewGuide
          ? null
          : publishMatch
            ? publishMatch[1]
            : path.split('/').pop()

        if (method === 'GET' && !guideId) {
          const guides = await store.listGuides({ includeBody: false })
          return json({
            guides: guides.filter((guide) =>
              guide.authorId === session.user.id ||
              (guide.sectionId === null
                ? canPublishGuides(session, null, session.permissions)
                : sectionIds.has(guide.sectionId)),
            ).map((guide) => guidePayload(
              guide,
              guide.sectionId ? sections.find((section) => section.id === guide.sectionId)?.label : 'Público',
            )),
            sections: visibleSections,
          })
        }

        if (method === 'POST' && !guideId) {
          const body = await req.json().catch(() => null)
          const validation = validateGuideInput(body)
          if (validation) return json({ error: validation }, 400)
          if (body.sectionId === null
            ? !canPublishGuides(session, null, session.permissions)
            : !sectionIds.has(body.sectionId)) {
            return json({ error: 'No tienes permiso' }, 403)
          }
          try {
            const guide = await store.createGuide({
              section_id: body.sectionId,
              slug: body.slug,
              title: body.title.trim(),
              description: body.description,
              image: body.image,
              body: body.body,
              status: body.status,
              author_id: session.user.id,
              published_at: body.status === 'published' ? new Date().toISOString() : null,
            })
            return json({ guide: guidePayload(guide) }, 201)
          } catch (error) {
            if (error?.code === '23505') return json({ error: 'Ya existe una guía con ese slug' }, 409)
            throw error
          }
        }

        if (!guideId || !UUID.test(guideId)) return json({ error: 'Guía no encontrada' }, 404)
        const existing = await store.getGuide(guideId)
        if (!existing) return json({ error: 'Guía no encontrada' }, 404)
        const owns = existing.authorId === session.user.id
        const canEdit = existing.sectionId === null
          ? canPublishGuides(session, null, session.permissions)
          : canPublishGuides(session, existing.sectionId, session.permissions)
        if (!owns && !canEdit) return json({ error: 'No tienes permiso' }, 403)

        if (method === 'GET') {
          return json({
            guide: guidePayload(
              existing,
              existing.sectionId ? sections.find((section) => section.id === existing.sectionId)?.label : 'Público',
            ),
            sections: visibleSections,
          })
        }

        if (method === 'DELETE') {
          await store.deleteGuide(guideId)
          return json({ ok: true })
        }

        if (method === 'POST' && publishMatch) {
          const nextStatus = existing.status === 'published' ? 'draft' : 'published'
          const updated = await store.updateGuide(guideId, {
            status: nextStatus,
            published_at: nextStatus === 'published' ? new Date().toISOString() : null,
          })
          return json({ guide: guidePayload(updated) })
        }

        if (method === 'PUT') {
          if (existing.status === 'published' && !canEdit) return json({ error: 'No tienes permiso' }, 403)
          const body = await req.json().catch(() => null)
          const validation = validateGuideInput(body)
          if (validation) return json({ error: validation }, 400)
          if (body.sectionId === null && !canPublishGuides(session, null, session.permissions)) {
            return json({ error: 'No tienes permiso' }, 403)
          }
          if (body.sectionId !== null && !sectionIds.has(body.sectionId)) {
            return json({ error: 'No tienes permiso' }, 403)
          }
          let updated
          try {
            updated = await store.updateGuide(guideId, {
            slug: body.slug,
            title: body.title.trim(),
            description: body.description,
            image: body.image,
            body: body.body,
            section_id: body.sectionId,
            status: body.status,
            published_at: body.status === 'published' ? existing.publishedAt ?? new Date().toISOString() : null,
            })
          } catch (error) {
            if (error?.code === '23505') return json({ error: 'Ya existe una guía con ese slug' }, 409)
            throw error
          }
          return json({ guide: guidePayload(updated) })
        }
      }

      // ───────── Permisos de escritura ─────────
      if (path === '/admin/permissions' || path.startsWith('/admin/permissions/')) {
        const session = await getSession(req)
        if (!session) return json({ error: 'Inicia sesión' }, 401)
        if (!canManageUsers(session)) return json({ error: 'Solo administradores' }, 403)
        const match = path.match(/^\/admin\/permissions\/([^/]+)\/([^/]+)$/)
        if (!match) return json({ error: 'Ruta no encontrada' }, 404)
        const [, userId, sectionId] = match
        if (!DISCORD_ID.test(userId)) return json({ error: 'ID inválido' }, 400)
        const sections = await store.listSections()
        if (!sections.some((section) => section.id === sectionId)) {
          return json({ error: 'Sección inválida' }, 400)
        }
        if (userId === adminId) return json({ error: 'No puedes modificar este usuario' }, 403)
        const target = await store.get(userId)
        if (!target) return json({ error: 'Usuario no encontrado' }, 404)
        if (!session.isAdmin && (target.roles ?? []).includes(SUBADMIN_ROLE_ID)) {
          return json({ error: 'No puedes modificar este usuario' }, 403)
        }
        if (method === 'PUT') {
          const body = await req.json().catch(() => null)
          if (typeof body?.canPublishGuides !== 'boolean' || typeof body?.canManageEvents !== 'boolean') {
            return json({ error: 'Permisos inválidos' }, 400)
          }
          if (body.canPublishGuides || body.canManageEvents) {
            const roles = target.roles ?? []
            if (!roles.includes(sectionId)) await store.updateRoles(userId, [...roles, sectionId])
            const permission = await store.upsertPermission(userId, sectionId, {
              canPublishGuides: body.canPublishGuides,
              canManageEvents: body.canManageEvents,
              grantedBy: session.user.id,
            })
            return json({ permission })
          }
          await store.deletePermission(userId, sectionId)
          return json({ ok: true })
        }
        if (method === 'DELETE') {
          await store.deletePermission(userId, sectionId)
          return json({ ok: true })
        }
        return json({ error: 'Método no permitido' }, 405)
      }

      // ───────── Administración ─────────
      if (
        path === '/admin/users' ||
        path.startsWith('/admin/users/')
      ) {
        const session = await getSession(req)
        if (!session) return json({ error: 'Inicia sesión' }, 401)
        if (!canManage(session)) return json({ error: 'Solo administradores' }, 403)

        if (method === 'GET' && path === '/admin/users') {
          const users = (await store.list())
            .map(publicUser)
            .sort((a, b) => String(b.lastLogin).localeCompare(String(a.lastLogin)))
          return json({
            roles: ROLES,
            users,
            sections: await store.listSections(),
            permissions: await store.listAllPermissions(),
          })
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
            body.roles.some(
              (role) =>
                typeof role !== 'string' ||
                !ROLE_IDS.includes(role),
            )
          ) {
            return json({ error: 'Roles inválidos' }, 400)
          }

          const target = await store.get(id)
          if (!target) return json({ error: 'Usuario no encontrado' }, 404)
          if (target.id === adminId || (!session.isAdmin && body.roles.includes(SUBADMIN_ROLE_ID))) {
            return json({ error: 'No puedes modificar este usuario' }, 403)
          }
          const roles = ROLE_IDS.filter((role) => body.roles.includes(role))
          const updated = await store.updateRoles(id, roles)
          return json({ user: publicUser(updated) })
        }

      }

      return json({ error: 'No encontrado' }, 404)
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error))
      return json({ error: 'Error del servidor' }, 500)
    }
  }
}
