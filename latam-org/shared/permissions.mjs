import { SUBADMIN_ROLE_ID } from './access.mjs'

const isSubadmin = (user) => (user?.roles ?? []).includes(SUBADMIN_ROLE_ID)

export function canReadSection(user, sectionId, permissions = []) {
  if (!sectionId) return true
  if (user?.isAdmin || isSubadmin(user)) return true
  return (user?.roles ?? []).includes(sectionId) || permissions.some((item) => item.sectionId === sectionId && (item.canPublishGuides || item.canManageEvents))
}

export function canPublishGuides(user, sectionId, permissions = []) {
  if (user?.isAdmin || isSubadmin(user)) return true
  if (!sectionId) return Boolean(user?.canPublishPublicGuides)
  return permissions.some((item) => item.sectionId === sectionId && item.canPublishGuides)
}

export function canManageEvents(user, sectionId, permissions = []) {
  if (user?.isAdmin || isSubadmin(user)) return true
  if (!sectionId) return false
  return permissions.some((item) => item.sectionId === sectionId && item.canManageEvents)
}

export function canManageUsers(user) {
  return Boolean(user?.isAdmin || isSubadmin(user))
}
