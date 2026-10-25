export const canReadSection = (session, sectionId) =>
  !sectionId ||
  Boolean(
    session?.isAdmin ||
      session?.isSubadmin ||
      (session?.user?.roles ?? []).includes(sectionId),
  )

export const canPublishGuides = (session, sectionId, permissions = []) =>
  Boolean(
    session?.isAdmin ||
      session?.isSubadmin ||
      permissions.some(
        (permission) => permission.section_id === sectionId && permission.can_publish_guides,
      ),
  )

export const canManageEvents = (session, sectionId, permissions = []) =>
  Boolean(
    session?.isAdmin ||
      session?.isSubadmin ||
      (sectionId === null && session?.user) ||
      permissions.some(
        (permission) => permission.section_id === sectionId && permission.can_manage_events,
      ),
  )

export const canManageUsers = (session) =>
  Boolean(session?.isAdmin || session?.isSubadmin)
