import { createClient } from '@supabase/supabase-js'

const mapUser = (row) =>
  row
    ? {
        id: row.id,
        username: row.username,
        name: row.name,
        avatar: row.avatar,
        roles: row.roles ?? [],
        canPublishPublicGuides: Boolean(row.can_publish_public_guides),
        firstSeen: row.first_seen,
        lastLogin: row.last_login,
      }
    : null

export function createSupabaseClient(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY')
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export function createUserStore(client) {
  return {
    async get(id) {
      const { data, error } = await client.from('users').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return mapUser(data)
    },

    async list() {
      const { data, error } = await client.from('users').select('*')
      if (error) throw error
      return data.map(mapUser)
    },

    async updateRoles(id, roles) {
      const { data, error } = await client
        .from('users')
        .update({ roles })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return mapUser(data)
    },

    async updatePublicGuidePermission(id, allowed) {
      const { data, error } = await client
        .from('users')
        .update({ can_publish_public_guides: allowed })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return mapUser(data)
    },

    async upsertLogin({ id, username, name, avatar, lastLogin }) {
      const { data, error } = await client
        .from('users')
        .upsert(
          {
            id,
            username,
            name,
            avatar,
            last_login: lastLogin,
          },
          { onConflict: 'id' },
        )
        .select('*')
        .single()
      if (error) throw error
      return mapUser(data)
    },
  }
}

const mapGuide = (row) => ({
  id: row.id,
  sectionId: row.section_id,
  slug: row.slug,
  title: row.title,
  description: row.description ?? '',
  image: row.image ?? '',
  body: row.body,
  status: row.status,
  authorId: row.author_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  publishedAt: row.published_at,
})

export function createGuideStore(client) {
  const checked = ({ data, error }) => {
    if (error) throw error
    return data
  }
  return {
    async sections() {
      return checked(await client.from('sections').select('id,label').order('label')) ?? []
    },
    async permissions(userId) {
      const rows = checked(await client.from('section_permissions').select('*').eq('user_id', userId)) ?? []
      return rows
    },
    async grantPermission({ userId, sectionId, canPublishGuides, canManageEvents, grantedBy }) {
      return checked(await client.from('section_permissions').upsert({
        user_id: userId, section_id: sectionId, can_publish_guides: canPublishGuides,
        can_manage_events: canManageEvents, granted_by: grantedBy,
      }, { onConflict: 'user_id,section_id' }).select('*').single())
    },
    async revokePermission(userId, sectionId) {
      return checked(await client.from('section_permissions').delete().eq('user_id', userId).eq('section_id', sectionId))
    },
    async listPublishedPublic() {
      const rows = checked(await client.from('guides').select('*').is('section_id', null).eq('status', 'published').order('published_at', { ascending: false })) ?? []
      return rows.map(mapGuide)
    },
    async getPublicBySlug(slug) {
      const row = checked(await client.from('guides').select('*').is('section_id', null).eq('slug', slug).eq('status', 'published').maybeSingle())
      return mapGuide(row)
    },
    async listBySections(sectionIds, includePublic = false) {
      let query = client.from('guides').select('*')
      if (!sectionIds.length && !includePublic) return []
      if (sectionIds.length && includePublic) query = query.or(`section_id.in.(${sectionIds.join(',')}),section_id.is.null`)
      else if (sectionIds.length) query = query.in('section_id', sectionIds)
      else query = query.is('section_id', null)
      const rows = checked(await query.eq('status', 'published').order('title')) ?? []
      return rows.map(mapGuide)
    },
    async listManaged(sectionIds, includePublic, userId) {
      let query = client.from('guides').select('*')
      const filters = []
      if (sectionIds.length) filters.push(`section_id.in.(${sectionIds.join(',')})`)
      if (includePublic) filters.push('section_id.is.null')
      if (filters.length) query = query.or(`${filters.join(',')},author_id.eq.${userId}`)
      else query = query.eq('author_id', userId)
      const rows = checked(await query.order('updated_at', { ascending: false })) ?? []
      return rows.map(mapGuide)
    },
    async getGuide(id) {
      return mapGuide(checked(await client.from('guides').select('*').eq('id', id).maybeSingle()))
    },
    async insertGuide(values) {
      return mapGuide(checked(await client.from('guides').insert(values).select('*').single()))
    },
    async updateGuide(id, values) {
      return mapGuide(checked(await client.from('guides').update(values).eq('id', id).select('*').maybeSingle()))
    },
    async deleteGuide(id) {
      return checked(await client.from('guides').delete().eq('id', id))
    },
  }
}

const mapEvent = (row) => row && ({
  id: row.id,
  sectionId: row.section_id,
  title: row.title,
  description: row.description ?? '',
  location: row.location ?? '',
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  capacity: row.capacity,
  cancelled: Boolean(row.cancelled),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export function createEventStore(client) {
  const checked = ({ data, error }) => {
    if (error) throw error
    return data
  }
  return {
    async listUpcoming(now) {
      const rows = checked(await client.from('events').select('id,section_id,title,description,location,starts_at,ends_at,capacity,cancelled').gte('ends_at', now).order('starts_at')) ?? []
      return rows.map(mapEvent)
    },
    async listAll() {
      const rows = checked(await client.from('events').select('id,section_id,title,description,location,starts_at,ends_at,capacity,cancelled').order('starts_at', { ascending: false })) ?? []
      return rows.map(mapEvent)
    },
    async getEvent(id) {
      return mapEvent(checked(await client.from('events').select('*').eq('id', id).maybeSingle()))
    },
    async getRsvps(eventIds) {
      if (!eventIds.length) return []
      return checked(await client.from('event_rsvps').select('event_id,user_id,status').in('event_id', eventIds)) ?? []
    },
    async setRsvp({ eventId, userId, status }) {
      return checked(await client.rpc('set_event_rsvp_atomic', {
        p_event_id: eventId,
        p_user_id: userId,
        p_status: status,
      }))
    },
    async deleteRsvp(eventId, userId) {
      return checked(await client.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', userId))
    },
    async attendees(eventId) {
      const rsvps = checked(await client.from('event_rsvps').select('user_id,status,responded_at').eq('event_id', eventId).eq('status', 'going').order('responded_at')) ?? []
      if (!rsvps.length) return []
      const users = checked(await client.from('users').select('id,name,username,avatar').in('id', rsvps.map((item) => item.user_id))) ?? []
      const byId = new Map(users.map((user) => [user.id, user]))
      return rsvps.map((rsvp) => {
        const user = byId.get(rsvp.user_id)
        return user ? { name: user.name, username: user.username, status: rsvp.status, respondedAt: rsvp.responded_at } : null
      }).filter(Boolean)
    },
    async insertEvent(values) {
      return mapEvent(checked(await client.from('events').insert(values).select('*').single()))
    },
    async updateEvent(id, values) {
      return mapEvent(checked(await client.from('events').update(values).eq('id', id).select('*').maybeSingle()))
    },
    async deleteEvent(id) {
      checked(await client.from('event_rsvps').delete().eq('event_id', id))
      return checked(await client.from('events').delete().eq('id', id))
    },
  }
}

export function createVoidEnforcersStore(client) {
  const checked = ({ data, error }) => {
    if (error) throw error
    return data
  }
  const listRanks = async () => checked(await client.from('void_enforcers_ranks').select('*').order('sort_order').order('name')) ?? []
  const listCertifications = async () => checked(await client.from('void_enforcers_certifications').select('*').order('sort_order').order('name')) ?? []

  async function sharedDashboardData(userIds) {
    const [ranks, certifications, profileRows, pastOperations] = await Promise.all([
      listRanks(),
      listCertifications(),
      userIds.length
        ? client.from('void_enforcers_member_profiles').select('*').in('user_id', userIds).then(checked)
        : Promise.resolve([]),
      client.from('events').select('id,title,location,starts_at,ends_at,cancelled').eq('section_id', 'void-enforcers').lte('ends_at', new Date().toISOString()).order('starts_at', { ascending: false }).then(checked),
    ])
    const operationIds = pastOperations.map((operation) => operation.id)
    const [certificationRows, attendanceRows] = await Promise.all([
      userIds.length
        ? client.from('void_enforcers_member_certifications').select('*').in('user_id', userIds).then(checked)
        : Promise.resolve([]),
      operationIds.length && userIds.length
        ? client.from('void_enforcers_operation_attendance').select('*').in('event_id', operationIds).in('user_id', userIds).then(checked)
        : Promise.resolve([]),
    ])
    return { ranks, certifications, profileRows, pastOperations, certificationRows, attendanceRows }
  }

  function formatMember(user, data) {
    const profile = data.profileRows.find((row) => row.user_id === user.id)
    const rank = data.ranks.find((row) => row.id === profile?.rank_id) ?? null
    const memberCertifications = data.certificationRows
      .filter((row) => row.user_id === user.id)
      .map((row) => data.certifications.find((certification) => certification.id === row.certification_id))
      .filter(Boolean)
    const attendance = data.pastOperations.map((operation) => {
      const record = data.attendanceRows.find((row) => row.event_id === operation.id && row.user_id === user.id)
      return { ...operation, attended: Boolean(record?.attended), attendanceRecorded: Boolean(record) }
    })
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      rank,
      certifications: memberCertifications,
      operations: attendance,
    }
  }

  return {
    async getSettings() {
      return checked(await client.from('void_enforcers_settings').select('*').eq('id', 1).maybeSingle())
    },
    async setAdmiral(userId, updatedBy) {
      return checked(await client.from('void_enforcers_settings').upsert({ id: 1, admiral_user_id: userId, updated_by: updatedBy }, { onConflict: 'id' }).select('*').single())
    },
    async ensureDefaultRanks(rankNames) {
      const existing = await listRanks()
      const normalizeName = (name) => name.toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
      const existingNames = new Set(existing.map((rank) => normalizeName(rank.name)))
      const missing = rankNames
        .map((name, index) => ({ name, sort_order: index, active: true }))
        .filter((rank) => !existingNames.has(normalizeName(rank.name)))
      if (!missing.length) return existing
      try {
        checked(await client.from('void_enforcers_ranks').insert(missing))
      } catch (error) {
        if (error?.code !== '23505') throw error
      }
      return listRanks()
    },
    async listMembers(extraMemberIds = []) {
      const [roleMembers, extraMembers] = await Promise.all([
        client.from('users').select('id,name,username,avatar,roles').contains('roles', ['void-enforcers']).order('name').then(checked),
        extraMemberIds.length
          ? client.from('users').select('id,name,username,avatar,roles').in('id', extraMemberIds).order('name').then(checked)
          : Promise.resolve([]),
      ])
      const membersById = new Map()
      for (const member of roleMembers ?? []) {
        if (!(member.roles ?? []).includes('subadmins')) membersById.set(member.id, member)
      }
      for (const member of extraMembers ?? []) {
        membersById.set(member.id, member)
      }
      const members = [...membersById.values()]
      if (!members.length) return []
      const data = await sharedDashboardData(members.map((member) => member.id))
      return members.map((member) => formatMember(member, data))
    },
    async getMember(userId) {
      const user = checked(await client.from('users').select('id,name,username,avatar,roles').eq('id', userId).maybeSingle())
      if (!user) return null
      const data = await sharedDashboardData([userId])
      return formatMember(user, data)
    },
    async getDashboardCatalog(extraMemberIds = []) {
      const [ranks, certifications] = await Promise.all([listRanks(), listCertifications()])
      const members = await this.listMembers(extraMemberIds)
      const pastOperations = checked(await client.from('events').select('id,title,location,starts_at,ends_at,cancelled').eq('section_id', 'void-enforcers').lte('ends_at', new Date().toISOString()).order('starts_at', { ascending: false })) ?? []
      return { ranks, certifications, members, operations: pastOperations }
    },
    async updateMemberAssignment(userId, rankId, certificationIds, assignedBy) {
      return checked(await client.rpc('set_void_enforcers_member_assignment', {
        p_user_id: userId,
        p_rank_id: rankId,
        p_certification_ids: certificationIds,
        p_assigned_by: assignedBy,
      }))
    },
    async saveAttendance(eventId, attendance, markedBy) {
      if (!attendance.length) return []
      return checked(await client.from('void_enforcers_operation_attendance').upsert(attendance.map(({ userId, attended }) => ({ event_id: eventId, user_id: userId, attended, marked_by: markedBy, updated_at: new Date().toISOString() })), { onConflict: 'event_id,user_id' }).select('*'))
    },
    async createRank(values) {
      return checked(await client.from('void_enforcers_ranks').insert(values).select('*').single())
    },
    async updateRankDefinition(id, values) {
      return checked(await client.from('void_enforcers_ranks').update(values).eq('id', id).select('*').maybeSingle())
    },
    async deleteRank(id) {
      return checked(await client.from('void_enforcers_ranks').delete().eq('id', id))
    },
    async createCertification(values) {
      return checked(await client.from('void_enforcers_certifications').insert(values).select('*').single())
    },
    async updateCertification(id, values) {
      return checked(await client.from('void_enforcers_certifications').update(values).eq('id', id).select('*').maybeSingle())
    },
    async deleteCertification(id) {
      return checked(await client.from('void_enforcers_certifications').delete().eq('id', id))
    },
  }
}
