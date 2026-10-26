import test from 'node:test'
import assert from 'node:assert/strict'
import { canManageEvents, canManageUsers, canPublishGuides, canReadSection } from '../shared/permissions.mjs'

const section = 'militar'
const admin = { id: 'admin', isAdmin: true, roles: [] }
const subadmin = { id: 'subadmin', isAdmin: false, roles: ['subadmins'] }
const editor = { id: 'editor', roles: [section] }
const member = { id: 'member', roles: [section] }
const visitor = { id: 'visitor', roles: [] }
const editPermission = [{ sectionId: section, canPublishGuides: true, canManageEvents: false }]

test('admin y subadmin tienen acceso global, pero solo admin gestiona usuarios con escalada', () => {
  for (const user of [admin, subadmin]) {
    assert.equal(canReadSection(user, section), true)
    assert.equal(canPublishGuides(user, null), true)
    assert.equal(canManageEvents(user, section), true)
  }
  assert.equal(canManageUsers(admin), true)
  assert.equal(canManageUsers(subadmin), true)
  assert.equal(canManageUsers({ ...subadmin, roles: [] }), false)
})

test('editor con permiso publica guías en su sección y no en otras ni en público', () => {
  assert.equal(canPublishGuides(editor, section, editPermission), true)
  assert.equal(canReadSection(editor, section, editPermission), true)
  assert.equal(canPublishGuides(editor, 'transporte', editPermission), false)
  assert.equal(canPublishGuides(editor, null, editPermission), false)
  assert.equal(canManageEvents(editor, section, editPermission), false)
  assert.equal(canPublishGuides({ ...editor, canPublishPublicGuides: true }, null, editPermission), true)
})

test('miembro lee su sección, visitante solo lee contenido público', () => {
  assert.equal(canReadSection(member, section), true)
  assert.equal(canPublishGuides(member, section), false)
  assert.equal(canReadSection(visitor, section), false)
  assert.equal(canReadSection(visitor, null), true)
  assert.equal(canPublishGuides(visitor, null), false)
})

test('una fila sin privilegios no concede lectura ni permite escalar', () => {
  const emptyPermission = [{ sectionId: section, canPublishGuides: false, canManageEvents: false }]
  assert.equal(canReadSection(visitor, section, emptyPermission), false)
  assert.equal(canPublishGuides(visitor, section, emptyPermission), false)
  assert.equal(canManageEvents(visitor, section, emptyPermission), false)
  assert.equal(canManageUsers(visitor), false)
})
