import { createHandler } from '../lib/handler.mjs'
import { createSupabaseClient, createUserStore, createGuideStore, createEventStore } from '../lib/db.mjs'
// Lo genera scripts/generate-private.mjs a partir de private-content/ (no se sube a git).
import privateGuides from '../lib/private-guides.generated.mjs'

const supabase = createSupabaseClient(process.env)
const store = createUserStore(supabase)
const guideStore = createGuideStore(supabase)
const eventStore = createEventStore(supabase)

export default createHandler({ store, guideStore, eventStore, env: process.env, privateGuides })

export const config = { path: '/api/*' }
