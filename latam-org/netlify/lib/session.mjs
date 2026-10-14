import { createHmac, timingSafeEqual } from 'node:crypto'

// Firma un objeto con HMAC-SHA256. El resultado va en una cookie: el usuario no puede
// modificarlo sin conocer SESSION_SECRET.
export function sign(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${signature}`
}

// Devuelve el objeto si la firma es válida y no ha expirado; si no, null.
export function verify(token, secret) {
  if (typeof token !== 'string') return null
  const [body, signature, ...rest] = token.split('.')
  if (!body || !signature || rest.length) return null

  const expected = createHmac('sha256', secret).update(body).digest()
  const given = Buffer.from(signature, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (typeof payload.exp !== 'number' || payload.exp < Date.now() / 1000) return null
    return payload
  } catch {
    return null
  }
}

export function parseCookies(header = '') {
  const cookies = {}
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    cookies[part.slice(0, index).trim()] = part.slice(index + 1).trim()
  }
  return cookies
}

export function serializeCookie(name, value, { maxAge, secure }) {
  return [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}
