import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canManageEvents,
  canManageUsers,
  canPublishGuides,
  canReadSection,
} from '../shared/permissions.mjs'

const visitor = { user: null, isAdmin: false, isSubadmin: false }
const member = { user: { roles: ['militar'] }, isAdmin: false, isSubadmin: false }
const editor = { user: { roles: ['militar'] }, isAdmin: false, isSubadmin: false }
const subadmin = { user: { roles: ['subadmins'] }, isAdmin: false, isSubadmin: true }
const admin = { user: { roles: [] }, isAdmin: true, isSubadmin: false }
const militarEditor = [
  { section_id: 'militar', can_publish_guides: true, can_manage_events: true },
]

test('administra todos los alcances el administrador', () => {
  assert.equal(canReadSection(admin, 'transporte'), true)
  assert.equal(canPublishGuides(admin, null), true)
  assert.equal(canManageEvents(admin, 'transporte'), true)
  assert.equal(canManageUsers(admin), true)
})

test('subadmin administra contenido pero no usuarios privilegiados por sí mismo', () => {
  assert.equal(canReadSection(subadmin, 'transporte'), true)
  assert.equal(canPublishGuides(subadmin, null), true)
  assert.equal(canManageEvents(subadmin, 'transporte'), true)
  assert.equal(canManageUsers(subadmin), true)
})

test('miembro solo lee su sección', () => {
  assert.equal(canReadSection(member, 'militar'), true)
  assert.equal(canReadSection(member, 'transporte'), false)
  assert.equal(canPublishGuides(member, 'militar'), false)
})

test('editor publica y gestiona eventos solo en su sección', () => {
  assert.equal(canPublishGuides(editor, 'militar', militarEditor), true)
  assert.equal(canManageEvents(editor, 'militar', militarEditor), true)
  assert.equal(canPublishGuides(editor, 'transporte', militarEditor), false)
  assert.equal(canManageUsers(editor), false)
})

test('visitante solo puede leer contenido público', () => {
  assert.equal(canReadSection(visitor, null), true)
  assert.equal(canReadSection(visitor, 'militar'), false)
  assert.equal(canPublishGuides(visitor, null), false)
  assert.equal(canManageEvents(visitor, null), false)
  assert.equal(canManageUsers(visitor), false)
})

test('un permiso de otra sección no permite escalar acceso', () => {
  const permissions = [{ section_id: 'militar', can_publish_guides: true, can_manage_events: false }]
  assert.equal(canPublishGuides(editor, 'transporte', permissions), false)
  assert.equal(canManageEvents(editor, 'transporte', permissions), false)
})
