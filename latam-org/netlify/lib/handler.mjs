import { randomBytes } from 'node:crypto'
import { DEFAULT_ADMIN_ID, ROLES, ROLE_IDS, SUBADMIN_ROLE_ID, VOID_ENFORCERS_RANKS } from '../../shared/access.mjs'
import { parseCookies, serializeCookie, sign, verify } from './session.mjs'
import { canManageEvents, canManageUsers, canPublishGuides, canReadSection } from '../../shared/permissions.mjs'

const SESSION_COOKIE = 'latam_session'
const STATE_COOKIE = 'latam_oauth'
const SESSION_SECONDS = 7 * 24 * 60 * 60
const DISCORD_ID = /^\d{5,25}$/
const SLUG = /^[a-z0-9][a-z0-9_-]*$/i
const VOID_ENFORCERS_ID = 'void-enforcers'

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
export function createHandler({ store, guideStore, eventStore, voidEnforcersStore, env, privateGuides = [], fetchImpl = fetch }) {
  const adminId = env.ADMIN_DISCORD_ID || DEFAULT_ADMIN_ID
  const publicUser = (user) => ({
    id: user.id,
    name: user.name,
    username: user.username,
    avatar: avatarUrl(user),
    roles: user.roles ?? [],
    canPublishPublicGuides: Boolean(user.canPublishPublicGuides),
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
    return { user, isAdmin: user.id === adminId }
  }

  const canAccess = async (session, role, permissions = null) =>
    canReadSection({ ...session.user, isAdmin: session.isAdmin }, role, permissions ?? await permissionRows(session))

  const canManage = (session) =>
    session.isAdmin || (session.user.roles ?? []).includes(SUBADMIN_ROLE_ID)

  const permissionRows = async (session) => {
    if (!guideStore || session.isAdmin || (session.user.roles ?? []).includes(SUBADMIN_ROLE_ID)) return []
    return (await guideStore.permissions(session.user.id)).map((row) => ({
      sectionId: row.section_id, canPublishGuides: row.can_publish_guides,
      canManageEvents: row.can_manage_events,
    }))
  }
  const isVoidEnforcersManager = async (session) => {
    if (!session) return false
    if (session.isAdmin) return true
    if (!(session.user.roles ?? []).includes(VOID_ENFORCERS_ID) || (session.user.roles ?? []).includes(SUBADMIN_ROLE_ID)) return false
    const settings = await voidEnforcersStore?.getSettings()
    return Boolean(settings?.admiral_user_id && settings.admiral_user_id === session.user.id)
  }
  const voidEnforcersMemberPayload = (member, admiralId = null) => member && ({
    ...member,
    avatar: avatarUrl({ id: member.id, avatar: member.avatar }),
    isAdmiral: member.id === admiralId,
  })
  const canPublish = async (session, sectionId) => {
    if (sectionId === VOID_ENFORCERS_ID) return isVoidEnforcersManager(session)
    const user = { ...session.user, isAdmin: session.isAdmin }
    return canPublishGuides(user, sectionId, await permissionRows(session))
  }
  const canManageEventSection = async (session, sectionId, permissions = null) => {
    if (sectionId === VOID_ENFORCERS_ID) return isVoidEnforcersManager(session)
    const user = { ...session.user, isAdmin: session.isAdmin }
    return canManageEvents(user, sectionId, permissions ?? await permissionRows(session))
  }
  const eventInput = async (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Datos inválidos' }
    const { title, description = '', location = '', starts_at: startsAt, capacity = null, section_id: sectionId = null } = body
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 200) return { error: 'El título debe tener entre 1 y 200 caracteres' }
    if (typeof description !== 'string' || description.length > 5000) return { error: 'La descripción no puede superar 5000 caracteres' }
    if (typeof location !== 'string' || location.length > 300) return { error: 'La ubicación no puede superar 300 caracteres' }
    const isoDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/
    const startDate = typeof startsAt === 'string' && isoDate.test(startsAt) ? new Date(startsAt) : null
    if (!startDate || !Number.isFinite(startDate.getTime())) return { error: 'La fecha de inicio debe ser ISO 8601 válida' }
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000)
    let parsedCapacity = null
    if (capacity !== null && capacity !== '') {
      parsedCapacity = Number(capacity)
      if (!Number.isSafeInteger(parsedCapacity) || parsedCapacity < 1) return { error: 'La capacidad debe ser un entero positivo o quedar vacía' }
    }
    if (sectionId !== null && (typeof sectionId !== 'string' || !(await guideStore.sections()).some((section) => section.id === sectionId))) return { error: 'Sección inválida' }
    return { values: { title: title.trim(), description: description.trim(), location: location.trim(), starts_at: startDate.toISOString(), ends_at: endDate.toISOString(), capacity: parsedCapacity, section_id: sectionId } }
  }
  const canSeeEvent = async (session, event, permissions = null) => Boolean(event && (event.sectionId === null || (session && await canAccess(session, event.sectionId, permissions))))
  const canManageEvent = async (session, event, permissions = null) => Boolean(session && event && await canManageEventSection(session, event.sectionId, permissions))
  const eventPayload = (event) => ({
    ...event,
    section_id: event.sectionId,
    starts_at: event.startsAt,
    ends_at: event.endsAt,
    rsvpClosed: event.cancelled || new Date(event.startsAt) <= new Date(),
    sectionLabel: event.sectionId ? ROLES.find((section) => section.id === event.sectionId)?.label ?? event.sectionId : 'Público',
  })
  const guidePayload = (guide) => ({ ...guide, section_id: guide.sectionId })
  const guideInput = async (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Datos inválidos' }
    const { slug, title, description = '', body: content, image = '', section_id: sectionId = null, status = 'draft' } = body
    if (typeof slug !== 'string' || !/^[A-Za-z0-9_-]+$/.test(slug)) return { error: 'Slug inválido' }
    if (typeof title !== 'string' || title.trim().length < 1 || title.trim().length > 200) return { error: 'El título debe tener entre 1 y 200 caracteres' }
    if (typeof description !== 'string' || description.length > 500) return { error: 'La descripción no puede superar 500 caracteres' }
    if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > 200 * 1024) return { error: 'El cuerpo es obligatorio y no puede superar 200 KB' }
    if (typeof image !== 'string' || (image && (!/^https:\/\//i.test(image) || image.length > 2048))) return { error: 'La imagen debe ser una URL HTTPS o quedar vacía' }
    if (sectionId !== null && typeof sectionId !== 'string') return { error: 'Sección inválida' }
    if (!['draft', 'published'].includes(status)) return { error: 'Estado inválido' }
    if (sectionId !== null && !(await guideStore.sections()).some((section) => section.id === sectionId)) return { error: 'Sección inválida' }
    return { values: { slug, title: title.trim(), description: description.trim(), body: content, image, section_id: sectionId, status } }
  }
  const canManageGuide = async (session, guide) => {
    if (!guide) return false
    if (guide.sectionId === VOID_ENFORCERS_ID) return isVoidEnforcersManager(session)
    if (session.isAdmin || (session.user.roles ?? []).includes(SUBADMIN_ROLE_ID)) return true
    if (guide.authorId !== session.user.id) return false
    if (guide.status === 'draft') return true
    return canPublish(session, guide.sectionId)
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
        if (!session) return json({ user: null, roles: [], isAdmin: false, isVoidEnforcersManager: false })
        const user = publicUser(session.user)
        const permissions = await permissionRows(session)
        const allSections = session.isAdmin || user.isSubadmin ? (guideStore ? await guideStore.sections() : []).map((item) => item.id) : null
        const isVoidManager = await isVoidEnforcersManager(session)
        const publishSections = allSections
          ? allSections.filter((sectionId) => session.isAdmin || !user.isSubadmin || sectionId !== VOID_ENFORCERS_ID)
          : permissions.filter((item) => item.canPublishGuides).map((item) => item.sectionId)
        const manageSections = allSections
          ? allSections.filter((sectionId) => session.isAdmin || !user.isSubadmin || sectionId !== VOID_ENFORCERS_ID)
          : permissions.filter((item) => item.canManageEvents).map((item) => item.sectionId)
        if (isVoidManager && !manageSections.includes(VOID_ENFORCERS_ID)) manageSections.push(VOID_ENFORCERS_ID)
        if (isVoidManager && !publishSections.includes(VOID_ENFORCERS_ID)) publishSections.push(VOID_ENFORCERS_ID)
        return json({
          user, roles: user.roles, isAdmin: session.isAdmin, isSubadmin: user.isSubadmin,
          isVoidEnforcersManager: isVoidManager,
          permissions: {
            publishGuides: publishSections,
            manageEvents: manageSections,
            publishPublicGuides: Boolean(user.canPublishPublicGuides || session.isAdmin || user.isSubadmin),
          },
        })
      }

      // ───────── Dashboard propio de Void Enforcers ─────────
      if (path.startsWith('/void-enforcers/')) {
        if (!voidEnforcersStore) return json({ error: 'Dashboard no disponible' }, 404)
        const session = await getSession(req)
        if (!session) return json({ error: 'Inicia sesión' }, 401)
        if (!session.isAdmin && (session.user.roles ?? []).includes(SUBADMIN_ROLE_ID)) return json({ error: 'Los subadmins no tienen acceso al dashboard de Void Enforcers' }, 403)
        const manager = await isVoidEnforcersManager(session)
        const isMember = (session.user.roles ?? []).includes(VOID_ENFORCERS_ID) || manager
        if (method === 'GET' && path === '/void-enforcers/dashboard') {
          if (!manager && !isMember) return json({ error: 'No tienes acceso a Void Enforcers' }, 403)
          const settings = await voidEnforcersStore.getSettings()
          if (manager) {
            await voidEnforcersStore.ensureDefaultRanks(VOID_ENFORCERS_RANKS)
            const [catalog, member] = await Promise.all([
              voidEnforcersStore.getDashboardCatalog([adminId, settings?.admiral_user_id].filter(Boolean)),
              isMember ? voidEnforcersStore.getMember(session.user.id) : Promise.resolve(null),
            ])
            return json({ isManager: true, isMember, admiralId: settings?.admiral_user_id ?? null, ...catalog, members: catalog.members.map((item) => voidEnforcersMemberPayload(item, settings?.admiral_user_id)), member: voidEnforcersMemberPayload(member, settings?.admiral_user_id) })
          }
          return json({ isManager: false, isMember: true, admiralId: settings?.admiral_user_id ?? null, member: voidEnforcersMemberPayload(await voidEnforcersStore.getMember(session.user.id), settings?.admiral_user_id) })
        }

        if (method === 'PUT' && path === '/void-enforcers/admiral') {
          if (!session.isAdmin) return json({ error: 'Solo el administrador principal puede designar al almirante' }, 403)
          if (!(req.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'Content-Type debe ser application/json' }, 415)
          let body
          try { body = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }
          if (body?.userId !== null && (typeof body?.userId !== 'string' || !DISCORD_ID.test(body.userId))) return json({ error: 'Usuario inválido' }, 400)
          if (body.userId) {
            const target = await store.get(body.userId)
            if (!target || !(target.roles ?? []).includes(VOID_ENFORCERS_ID) || (target.roles ?? []).includes(SUBADMIN_ROLE_ID)) return json({ error: 'El almirante debe ser miembro de Void Enforcers y no ser subadmin' }, 400)
          }
          const settings = await voidEnforcersStore.setAdmiral(body.userId, session.user.id)
          return json({ admiralId: settings.admiral_user_id })
        }

        if (!manager) return json({ error: 'No tienes permiso para administrar Void Enforcers' }, 403)

        const memberMatch = path.match(/^\/void-enforcers\/members\/([^/]+)$/)
        if (method === 'PUT' && memberMatch) {
          const userId = memberMatch[1]
          if (!DISCORD_ID.test(userId)) return json({ error: 'Usuario inválido' }, 400)
          if (!(req.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'Content-Type debe ser application/json' }, 415)
          let body
          try { body = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }
          const target = await store.get(userId)
          const settings = await voidEnforcersStore.getSettings()
          const isImplicitMember = userId === adminId || userId === settings?.admiral_user_id
          if (!target || (!(target.roles ?? []).includes(VOID_ENFORCERS_ID) && !isImplicitMember) || ((target.roles ?? []).includes(SUBADMIN_ROLE_ID) && userId !== adminId)) return json({ error: 'Miembro no encontrado' }, 404)
          if (body?.rankId !== null && (typeof body?.rankId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.rankId))) return json({ error: 'Rango inválido' }, 400)
          if (!Array.isArray(body?.certificationIds) || body.certificationIds.some((id) => typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) || new Set(body.certificationIds).size !== body.certificationIds.length) return json({ error: 'Certificaciones inválidas' }, 400)
          const catalog = await voidEnforcersStore.getDashboardCatalog()
          if (body.rankId && !catalog.ranks.some((rank) => rank.id === body.rankId && rank.active)) return json({ error: 'Rango no disponible' }, 400)
          if (body.rankId && catalog.ranks.some((rank) => rank.id === body.rankId && rank.name === 'Almirante') && userId !== settings?.admiral_user_id) return json({ error: 'Solo el almirante designado puede tener ese rango' }, 400)
          if (body.certificationIds.some((id) => !catalog.certifications.some((certification) => certification.id === id && certification.active))) return json({ error: 'Certificación no disponible' }, 400)
          await voidEnforcersStore.updateMemberAssignment(userId, body.rankId, body.certificationIds, session.user.id)
          return json({ member: voidEnforcersMemberPayload(await voidEnforcersStore.getMember(userId), settings?.admiral_user_id) })
        }

        const attendanceMatch = path.match(/^\/void-enforcers\/operations\/([^/]+)\/attendance$/)
        if (method === 'PUT' && attendanceMatch) {
          const eventId = attendanceMatch[1]
          if (!/^[0-9a-f-]{36}$/i.test(eventId)) return json({ error: 'Operación no encontrada' }, 404)
          if (!(req.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'Content-Type debe ser application/json' }, 415)
          let body
          try { body = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }
          if (!Array.isArray(body?.attendance) || body.attendance.length > 500 || body.attendance.some((item) => !item || typeof item.userId !== 'string' || !DISCORD_ID.test(item.userId) || typeof item.attended !== 'boolean') || new Set(body.attendance.map((item) => item.userId)).size !== body.attendance.length) return json({ error: 'Lista de asistencia inválida' }, 400)
          const event = await eventStore.getEvent(eventId)
          if (!event || event.sectionId !== VOID_ENFORCERS_ID || new Date(event.endsAt) > new Date()) return json({ error: 'Operación pasada no encontrada' }, 404)
          const settings = await voidEnforcersStore.getSettings()
          const members = await voidEnforcersStore.listMembers([adminId, settings?.admiral_user_id].filter(Boolean))
          const memberIds = new Set(members.map((member) => member.id))
          if (body.attendance.some((item) => !memberIds.has(item.userId))) return json({ error: 'La lista contiene personas ajenas a Void Enforcers' }, 400)
          await voidEnforcersStore.saveAttendance(eventId, body.attendance, session.user.id)
          return json({ ok: true })
        }

        const configMatch = path.match(/^\/void-enforcers\/config\/(ranks|certifications)(?:\/([^/]+))?$/)
        if (configMatch && ['POST', 'PUT', 'DELETE'].includes(method)) {
          const [, kind, id] = configMatch
          if (id && !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Identificador inválido' }, 400)
          if (method === 'DELETE') {
            if (!id) return json({ error: 'Identificador requerido' }, 400)
            if (kind === 'ranks') await voidEnforcersStore.deleteRank(id)
            else await voidEnforcersStore.deleteCertification(id)
            return json({ ok: true })
          }
          if (!(req.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'Content-Type debe ser application/json' }, 415)
          let body
          try { body = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }
          const maxName = kind === 'ranks' ? 100 : 120
          if (typeof body?.name !== 'string' || !body.name.trim() || body.name.trim().length > maxName || !Number.isSafeInteger(body.sort_order ?? 0) || typeof (body.active ?? true) !== 'boolean') return json({ error: 'Datos de configuración inválidos' }, 400)
          if (kind === 'certifications' && (typeof (body.description ?? '') !== 'string' || (body.description ?? '').length > 500)) return json({ error: 'Descripción inválida' }, 400)
          const values = { name: body.name.trim(), sort_order: body.sort_order ?? 0, active: body.active ?? true }
          if (kind === 'certifications') values.description = (body.description ?? '').trim()
          let saved
          try {
            saved = kind === 'ranks'
              ? id ? await voidEnforcersStore.updateRankDefinition(id, values) : await voidEnforcersStore.createRank(values)
              : id ? await voidEnforcersStore.updateCertification(id, values) : await voidEnforcersStore.createCertification(values)
          } catch (error) {
            if (error?.code === '23505') return json({ error: 'Ya existe un elemento con ese nombre' }, 409)
            throw error
          }
          return saved ? json({ item: saved }) : json({ error: 'Elemento no encontrado' }, 404)
        }
      }

      // ───────── Guías públicas y dashboard ─────────
      if (guideStore && method === 'GET' && path === '/guides') {
        const guides = (await guideStore.listPublishedPublic()).map(({ body: _body, ...item }) => guidePayload(item))
        return json({ guides })
      }
      const publicGuideMatch = path.match(/^\/guides\/([^/]+)$/)
      if (guideStore && method === 'GET' && publicGuideMatch) {
        const guide = await guideStore.getPublicBySlug(publicGuideMatch[1])
        return guide ? json({ guide: guidePayload(guide) }) : json({ error: 'No encontrada' }, 404)
      }
      if (guideStore && path.startsWith('/dashboard/guides')) {
        const session = await getSession(req)
        if (!session) return json({ error: 'Inicia sesión' }, 401)
        const permissions = await permissionRows(session)
        const elevated = session.isAdmin || (session.user.roles ?? []).includes(SUBADMIN_ROLE_ID)
        const voidManager = await isVoidEnforcersManager(session)
        const writable = elevated
          ? (await guideStore.sections()).map((item) => item.id).filter((sectionId) => session.isAdmin || !session.user.isSubadmin || sectionId !== VOID_ENFORCERS_ID)
          : permissions.filter((item) => item.canPublishGuides).map((item) => item.sectionId)
        if (voidManager && !writable.includes(VOID_ENFORCERS_ID)) writable.push(VOID_ENFORCERS_ID)
        const publicWriter = session.isAdmin || session.user.isSubadmin || Boolean(session.user.canPublishPublicGuides)
        if (method === 'GET' && path === '/dashboard/guides') {
          const guides = (await guideStore.listManaged(writable, publicWriter, session.user.id)).filter((guide) =>
            guide.sectionId === VOID_ENFORCERS_ID
              ? voidManager
              : elevated ||
              (guide.authorId === session.user.id &&
                (guide.status === 'draft' || (guide.sectionId === null ? publicWriter : writable.includes(guide.sectionId)))),
          )
          return json({ guides: guides.map(({ body: _body, ...item }) => guidePayload(item)) })
        }
        if (method === 'POST' && path === '/dashboard/guides') {
          if (!(req.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'Content-Type debe ser application/json' }, 415)
          let body
          try { body = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }
          const parsed = await guideInput(body)
          if (parsed.error) return json({ error: parsed.error }, 400)
          if (!(await canPublish(session, parsed.values.section_id))) return json({ error: 'No tienes permiso para publicar en esta sección' }, 403)
          const values = { ...parsed.values, author_id: session.user.id, published_at: parsed.values.status === 'published' ? new Date().toISOString() : null }
          const guide = await guideStore.insertGuide(values)
          return json({ guide: guidePayload(guide) }, 201)
        }
        const editMatch = path.match(/^\/dashboard\/guides\/([^/]+)$/)
        if (editMatch) {
          const id = editMatch[1]
          const existing = await guideStore.getGuide(id)
          if (!existing || !(await canManageGuide(session, existing))) return json({ error: 'No encontrada' }, 404)
          if (method === 'GET') return json({ guide: guidePayload(existing) })
          if (method === 'PUT') {
            if (!(req.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'Content-Type debe ser application/json' }, 415)
            let body
            try { body = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }
            const parsed = await guideInput(body)
            if (parsed.error) return json({ error: parsed.error }, 400)
            if (!(await canPublish(session, existing.sectionId)) || !(await canPublish(session, parsed.values.section_id))) return json({ error: 'No tienes permiso para publicar en esta sección' }, 403)
            const values = { ...parsed.values, published_at: parsed.values.status === 'published' ? existing.publishedAt ?? new Date().toISOString() : null }
            const guide = await guideStore.updateGuide(id, values)
            return guide ? json({ guide: guidePayload(guide) }) : json({ error: 'No encontrada' }, 404)
          }
          if (method === 'DELETE') {
            await guideStore.deleteGuide(id)
            return json({ ok: true })
          }
        }
        const publishMatch = path.match(/^\/dashboard\/guides\/([^/]+)\/publish$/)
        if (method === 'POST' && publishMatch) {
          const guide = await guideStore.getGuide(publishMatch[1])
          if (!guide || !(await canManageGuide(session, guide))) return json({ error: 'No encontrada' }, 404)
          if (!(await canPublish(session, guide.sectionId))) return json({ error: 'No tienes permiso para publicar en esta sección' }, 403)
          const status = guide.status === 'published' ? 'draft' : 'published'
          const updated = await guideStore.updateGuide(guide.id, { status, published_at: status === 'published' ? new Date().toISOString() : null })
          return json({ guide: guidePayload(updated) })
        }
      }

      // ───────── Eventos y confirmaciones ─────────
      if (eventStore && method === 'GET' && path === '/events') {
        const session = await getSession(req)
        const [permissions, upcomingEvents] = await Promise.all([
          session ? permissionRows(session) : Promise.resolve([]),
          eventStore.listUpcoming(new Date().toISOString()),
        ])
        let events = upcomingEvents
        events = (await Promise.all(events.map(async (event) => (await canSeeEvent(session, event, permissions)) ? event : null))).filter(Boolean)
        const requestedSection = url.searchParams.get('section')
        if (requestedSection === 'public') events = events.filter((event) => event.sectionId === null)
        else if (requestedSection) events = events.filter((event) => event.sectionId === requestedSection)
        const rsvps = await eventStore.getRsvps(events.map((event) => event.id))
        const summaries = new Map()
        for (const rsvp of rsvps) {
          const summary = summaries.get(rsvp.event_id) ?? { going: 0, maybe: 0, declined: 0, myRsvp: null }
          summary[rsvp.status] += 1
          if (session?.user.id === rsvp.user_id) summary.myRsvp = rsvp.status
          summaries.set(rsvp.event_id, summary)
        }
        return json({ events: events.map((event) => ({ ...eventPayload(event), ...(summaries.get(event.id) ?? { going: 0, maybe: 0, declined: 0, myRsvp: null }) })) })
      }

      const eventAttendeesMatch = path.match(/^\/events\/([^/]+)\/attendees$/)
      if (eventStore && method === 'GET' && eventAttendeesMatch) {
        const session = await getSession(req)
        if (!session) return json({ error: 'Inicia sesión' }, 401)
        const eventId = eventAttendeesMatch[1]
        if (!/^[0-9a-f-]{36}$/i.test(eventId)) return json({ error: 'Evento no encontrado' }, 404)
        const event = await eventStore.getEvent(eventId)
        if (!event || !(await canSeeEvent(session, event))) return json({ error: 'Evento no encontrado' }, 404)
        if (!(await canManageEvent(session, event))) return json({ error: 'No tienes permiso para ver asistentes' }, 403)
        return json({ attendees: await eventStore.attendees(event.id) })
      }

      const eventRsvpMatch = path.match(/^\/events\/([^/]+)\/rsvp$/)
      if (eventStore && eventRsvpMatch) {
        const session = await getSession(req)
        if (!session) return json({ error: 'Inicia sesión' }, 401)
        const eventId = eventRsvpMatch[1]
        if (!/^[0-9a-f-]{36}$/i.test(eventId)) return json({ error: 'Evento no encontrado' }, 404)
        const event = await eventStore.getEvent(eventId)
        if (!event || !(await canSeeEvent(session, event))) return json({ error: 'Evento no encontrado' }, 404)
        if (method === 'DELETE') {
          await eventStore.deleteRsvp(event.id, session.user.id)
          return json({ ok: true })
        }
        if (method === 'PUT') {
          if (!(req.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'Content-Type debe ser application/json' }, 415)
          let body
          try { body = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }
          if (!['going', 'maybe', 'declined'].includes(body?.status)) return json({ error: 'Respuesta RSVP inválida' }, 400)
          if (event.cancelled || new Date(event.startsAt) <= new Date()) return json({ error: 'Este evento ya no acepta confirmaciones' }, 409)
          const result = await eventStore.setRsvp({ eventId: event.id, userId: session.user.id, status: body.status })
          if (result === 'not_found') return json({ error: 'Evento no encontrado' }, 404)
          if (result === 'closed') return json({ error: 'Este evento ya no acepta confirmaciones' }, 409)
          if (result === 'full') return json({ error: 'El evento alcanzó su capacidad' }, 409)
          if (result !== 'ok') return json({ error: 'Respuesta RSVP inválida' }, 400)
          return json({ ok: true, status: body.status })
        }
      }

      const eventDetailMatch = path.match(/^\/events\/([^/]+)$/)
      if (eventStore && method === 'GET' && eventDetailMatch) {
        const session = await getSession(req)
        const eventId = eventDetailMatch[1]
        if (!/^[0-9a-f-]{36}$/i.test(eventId)) return json({ error: 'Evento no encontrado' }, 404)
        const [permissions, event] = await Promise.all([
          session ? permissionRows(session) : Promise.resolve([]),
          eventStore.getEvent(eventId),
        ])
        if (!event || !(await canSeeEvent(session, event, permissions))) return json({ error: 'Evento no encontrado' }, 404)
        const [rsvps, isManager] = await Promise.all([eventStore.getRsvps([event.id]), canManageEvent(session, event, permissions)])
        const summary = { going: 0, maybe: 0, declined: 0, myRsvp: null }
        for (const rsvp of rsvps) {
          summary[rsvp.status] += 1
          if (session?.user.id === rsvp.user_id) summary.myRsvp = rsvp.status
        }
        return json({ event: { ...eventPayload(event), ...summary }, isManager })
      }

      if (eventStore && path.startsWith('/dashboard/events')) {
        const session = await getSession(req)
        if (!session) return json({ error: 'Inicia sesión' }, 401)
        if (method === 'GET' && path === '/dashboard/events') {
          const [permissions, events] = await Promise.all([permissionRows(session), eventStore.listAll()])
          const manageable = (await Promise.all(events.map(async (event) => (await canManageEvent(session, event, permissions)) ? event : null))).filter(Boolean)
          const rsvps = await eventStore.getRsvps(manageable.map((event) => event.id))
          const summaries = new Map()
          for (const rsvp of rsvps) {
            const summary = summaries.get(rsvp.event_id) ?? { going: 0, maybe: 0, declined: 0 }
            summary[rsvp.status] += 1
            summaries.set(rsvp.event_id, summary)
          }
          return json({ events: manageable.map((event) => ({ ...eventPayload(event), ...(summaries.get(event.id) ?? { going: 0, maybe: 0, declined: 0 }) })) })
        }
        if (method === 'POST' && path === '/dashboard/events') {
          if (!(req.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'Content-Type debe ser application/json' }, 415)
          let body
          try { body = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }
          const parsed = await eventInput(body)
          if (parsed.error) return json({ error: parsed.error }, 400)
          if (!(await canManageEventSection(session, parsed.values.section_id))) return json({ error: 'No tienes permiso para gestionar eventos en esta sección' }, 403)
          const event = await eventStore.insertEvent({ ...parsed.values, created_by: session.user.id, cancelled: false })
          return json({ event: eventPayload(event) }, 201)
        }
        const cancelMatch = path.match(/^\/dashboard\/events\/([^/]+)\/cancel$/)
        const editMatch = path.match(/^\/dashboard\/events\/([^/]+)$/)
        const eventId = cancelMatch?.[1] ?? editMatch?.[1]
        if (eventId && /^(PUT|DELETE|POST)$/.test(method)) {
          if (!/^[0-9a-f-]{36}$/i.test(eventId)) return json({ error: 'Evento no encontrado' }, 404)
          const event = await eventStore.getEvent(eventId)
          if (!event || !(await canSeeEvent(session, event))) return json({ error: 'Evento no encontrado' }, 404)
          if (!(await canManageEvent(session, event))) return json({ error: 'No tienes permiso para gestionar este evento' }, 403)
          if (method === 'DELETE' && editMatch) {
            await eventStore.deleteEvent(event.id)
            return json({ ok: true })
          }
          if (method === 'POST' && cancelMatch) {
            const updated = await eventStore.updateEvent(event.id, { cancelled: true })
            return json({ event: eventPayload(updated) })
          }
          if (method === 'PUT' && editMatch) {
            if (!(req.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'Content-Type debe ser application/json' }, 415)
            let body
            try { body = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }
            const parsed = await eventInput(body)
            if (parsed.error) return json({ error: parsed.error }, 400)
            if (!(await canManageEventSection(session, parsed.values.section_id))) return json({ error: 'No tienes permiso para gestionar eventos en esta sección' }, 403)
            if (parsed.values.capacity !== null) {
              const going = (await eventStore.getRsvps([event.id])).filter((rsvp) => rsvp.status === 'going').length
              if (going > parsed.values.capacity) return json({ error: 'La capacidad no puede ser menor que las confirmaciones actuales' }, 409)
            }
            const updated = await eventStore.updateEvent(event.id, parsed.values)
            return json({ event: eventPayload(updated) })
          }
        }
      }

      // Concesión y revocación de permisos de edición por sección.
      const publicGuidePermissionMatch = path.match(/^\/admin\/users\/([^/]+)\/public-guides$/)
      if (publicGuidePermissionMatch && method === 'PUT') {
        const session = await getSession(req)
        if (!session) return json({ error: 'Inicia sesión' }, 401)
        if (!session.isAdmin) return json({ error: 'Solo el administrador principal puede otorgar este permiso' }, 403)
        const userId = publicGuidePermissionMatch[1]
        if (!DISCORD_ID.test(userId)) return json({ error: 'ID inválido' }, 400)
        if (userId === adminId) return json({ error: 'No puedes modificar al administrador principal' }, 403)
        if (!(req.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'Content-Type debe ser application/json' }, 415)
        let body
        try { body = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }
        if (typeof body?.canPublishPublicGuides !== 'boolean') return json({ error: 'Permiso inválido' }, 400)
        const target = await store.get(userId)
        if (!target) return json({ error: 'Usuario no encontrado' }, 404)
        const updated = await store.updatePublicGuidePermission(userId, body.canPublishPublicGuides)
        return json({ user: publicUser(updated) })
      }
      const permissionRoute = path.match(/^\/admin\/users\/([^/]+)\/permissions(?:\/([^/]+))?$/)
      if (guideStore && permissionRoute) {
        const session = await getSession(req)
        if (!session) return json({ error: 'Inicia sesión' }, 401)
        if (!canManageUsers({ ...session.user, isAdmin: session.isAdmin })) return json({ error: 'Solo administradores' }, 403)
        const [, userId, sectionId] = permissionRoute
        if (!DISCORD_ID.test(userId)) return json({ error: 'ID inválido' }, 400)
        if (userId === adminId || (!session.isAdmin && userId === session.user.id)) return json({ error: 'No puedes modificar este usuario' }, 403)
        if (method === 'GET' && !sectionId) {
          const target = await store.get(userId)
          if (!target) return json({ error: 'Usuario no encontrado' }, 404)
          const [permissions, sections] = await Promise.all([guideStore.permissions(userId), guideStore.sections()])
          return json({ permissions, sections, canPublishPublicGuides: Boolean(target.canPublishPublicGuides) })
        }
        if (!sectionId || !(await guideStore.sections()).some((item) => item.id === sectionId)) return json({ error: 'Sección inválida' }, 400)
        if (sectionId === VOID_ENFORCERS_ID && !session.isAdmin) return json({ error: 'Solo el administrador principal puede asignar permisos de Void Enforcers' }, 403)
        const target = await store.get(userId)
        if (!target) return json({ error: 'Usuario no encontrado' }, 404)
        if (method === 'DELETE') {
          await guideStore.revokePermission(userId, sectionId)
          return json({ ok: true })
        }
        if (method === 'PUT') {
          if (!(req.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'Content-Type debe ser application/json' }, 415)
          let body
          try { body = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }
          if (typeof body?.canPublishGuides !== 'boolean' || typeof body?.canManageEvents !== 'boolean') return json({ error: 'Permisos inválidos' }, 400)
          const permission = await guideStore.grantPermission({ userId, sectionId, canPublishGuides: body.canPublishGuides, canManageEvents: body.canManageEvents, grantedBy: session.user.id })
          if ((body.canPublishGuides || body.canManageEvents) && !target.roles.includes(sectionId)) await store.updateRoles(userId, [...target.roles, sectionId])
          return json({ permission })
        }
      }

      // ───────── Guías privadas ─────────
      if (method === 'GET' && path === '/private/guides') {
        const session = await getSession(req)
        if (!session) return json({ error: 'Inicia sesión' }, 401)
        const roles = ROLES
        if (guideStore) {
          const permissions = await permissionRows(session)
          const access = roles.filter((role) => canReadSection({ ...session.user, isAdmin: session.isAdmin }, role.id, permissions)).map((role) => role.id).filter((id) => id !== SUBADMIN_ROLE_ID)
          const guides = (await guideStore.listBySections(access)).map((guide) => ({
            ...guidePayload(guide), role: guide.sectionId,
            roleLabel: roles.find((role) => role.id === guide.sectionId)?.label ?? guide.sectionId,
          })).map(({ body: _body, ...meta }) => meta)
          return json({ guides })
        }
        const guides = privateGuides
          .filter((guide) => (session.isAdmin || (session.user.roles ?? []).includes(SUBADMIN_ROLE_ID) || (session.user.roles ?? []).includes(guide.role)))
          .map(({ body: _body, ...meta }) => ({
            ...meta,
            roleLabel: roles.find((role) => role.id === meta.role)?.label ?? meta.role,
          }))
        return json({ guides })
      }

      const guideMatch = path.match(/^\/private\/guides\/([^/]+)\/([^/]+)$/)
      if (method === 'GET' && guideMatch) {
        const [, role, slug] = guideMatch
        const session = await getSession(req)
        if (!session) return json({ error: 'Inicia sesión' }, 401)
        const roles = ROLES
        if (!roles.some((item) => item.id === role) || !SLUG.test(slug)) {
          return json({ error: 'No encontrada' }, 404)
        }
        if (!(await canAccess(session, role))) return json({ error: 'No tienes permiso' }, 403)
        if (guideStore) {
          const guide = (await guideStore.listBySections([role])).find((item) => item.slug === slug)
          if (!guide) return json({ error: 'No encontrada' }, 404)
          return json({ guide: { ...guidePayload(guide), role, roleLabel: roles.find((item) => item.id === role)?.label ?? role } })
        }
        const guide = privateGuides.find((item) => item.role === role && item.slug === slug)
        if (!guide) return json({ error: 'No encontrada' }, 404)
        return json({
          guide: { ...guide, roleLabel: roles.find((item) => item.id === role)?.label ?? role },
        })
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
          if (!session.isAdmin && roles.includes(VOID_ENFORCERS_ID) !== target.roles.includes(VOID_ENFORCERS_ID)) return json({ error: 'Solo el administrador principal puede modificar miembros de Void Enforcers' }, 403)
          const updated = await store.updateRoles(id, roles)
          return json({ user: publicUser(updated) })
        }

      }

      return json({ error: 'No encontrado' }, 404)
    } catch (error) {
      const technicalMessage =
        error instanceof Error
          ? error.message
          : typeof error?.message === 'string'
            ? error.message
            : String(error)
      console.error(technicalMessage)
      if (error?.code === '23505') return json({ error: 'Ya existe una guía con ese slug en la sección' }, 409)
      return json({ error: 'Error del servidor' }, 500)
    }
  }
}
