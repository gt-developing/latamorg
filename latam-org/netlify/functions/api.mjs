import { getStore } from '@netlify/blobs'
import { createHandler } from '../lib/handler.mjs'
// Lo genera scripts/generate-private.mjs a partir de private-content/ (no se sube a git).
import privateGuides from '../lib/private-guides.generated.mjs'

// Usuarios y sus roles, guardados en Netlify Blobs (una entrada por ID de Discord).
const users = () => getStore({ name: 'users', consistency: 'strong' })

const store = {
  get: (id) => users().get(id, { type: 'json' }),
  set: (id, value) => users().setJSON(id, value),
  async list() {
    const db = users()
    const { blobs } = await db.list()
    const all = await Promise.all(blobs.map((blob) => db.get(blob.key, { type: 'json' })))
    return all.filter(Boolean)
  },
}

export default createHandler({ store, env: process.env, privateGuides })

export const config = { path: '/api/*' }
