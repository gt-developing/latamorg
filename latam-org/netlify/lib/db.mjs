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
