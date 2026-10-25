import { createClient } from '@supabase/supabase-js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

const mapGuide = (row) =>
  row
    ? {
        id: row.id,
        sectionId: row.section_id,
        slug: row.slug,
        title: row.title,
        description: row.description ?? '',
        image: row.image ?? '',
        body: row.body ?? '',
        status: row.status,
        authorId: row.author_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        publishedAt: row.published_at,
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

    async listSections() {
      const { data, error } = await client.from('sections').select('id, label').order('label')
      if (error) throw error
      return data
    },

    async listPermissions(userId) {
      const { data, error } = await client
        .from('section_permissions')
        .select('user_id, section_id, can_publish_guides, can_manage_events, granted_by')
        .eq('user_id', userId)
      if (error) throw error
      return data
    },

    async listAllPermissions() {
      const { data, error } = await client
        .from('section_permissions')
        .select('user_id, section_id, can_publish_guides, can_manage_events, granted_by')
      if (error) throw error
      return data
    },

    async upsertPermission(userId, sectionId, values) {
      const { data, error } = await client
        .from('section_permissions')
        .upsert(
          {
            user_id: userId,
            section_id: sectionId,
            can_publish_guides: values.canPublishGuides,
            can_manage_events: values.canManageEvents,
            granted_by: values.grantedBy,
          },
          { onConflict: 'user_id,section_id' },
        )
        .select('user_id, section_id, can_publish_guides, can_manage_events, granted_by')
        .single()
      if (error) throw error
      return data
    },

    async deletePermission(userId, sectionId) {
      const { error } = await client
        .from('section_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('section_id', sectionId)
      if (error) throw error
    },

    async listGuides({ sectionId, status, authorId, includeBody = true } = {}) {
      const columns = includeBody ? '*' : 'id, section_id, slug, title, description, image, status, author_id, created_at, updated_at, published_at'
      let query = client.from('guides').select(columns).order('updated_at', { ascending: false })
      if (sectionId === null) query = query.is('section_id', null)
      else if (sectionId) query = query.eq('section_id', sectionId)
      if (status) query = query.eq('status', status)
      if (authorId) query = query.eq('author_id', authorId)
      const { data, error } = await query
      if (error) throw error
      return data.map(mapGuide)
    },

    async getGuide(idOrSlug, { sectionId, publishedOnly = false } = {}) {
      let query = client.from('guides').select('*')
      if (UUID.test(idOrSlug)) query = query.eq('id', idOrSlug)
      else query = query.eq('slug', idOrSlug)
      if (sectionId === null) query = query.is('section_id', null)
      else if (sectionId) query = query.eq('section_id', sectionId)
      if (publishedOnly) query = query.eq('status', 'published')
      const { data, error } = await query.maybeSingle()
      if (error) throw error
      return mapGuide(data)
    },

    async createGuide(values) {
      const { data, error } = await client.from('guides').insert(values).select('*').single()
      if (error) throw error
      return mapGuide(data)
    },

    async updateGuide(id, values) {
      const { data, error } = await client
        .from('guides')
        .update(values)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return mapGuide(data)
    },

    async deleteGuide(id) {
      const { error } = await client.from('guides').delete().eq('id', id)
      if (error) throw error
    },
  }
}
