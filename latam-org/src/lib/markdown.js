export function safeMarkdownUrl(value) {
  const url = String(value ?? '').trim()
  if (!url || (url.startsWith('/') && !url.startsWith('//')) || url.startsWith('#')) return url
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : ''
  } catch {
    return ''
  }
}
