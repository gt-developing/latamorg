import { createClient } from '@supabase/supabase-js'

const mapUser = (row) =>
  row
    ? {
        id: row.id,
        username: row.username,
        name: row.name,
        avatar: row.avatar,
        roles: row.roles ?? [],
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
