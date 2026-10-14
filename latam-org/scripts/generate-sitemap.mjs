import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const contentRoot = join('src', 'content')
const siteUrl = (process.env.SITE_URL || 'https://latamorg.netlify.app').replace(/\/$/, '')
const escapeXml = (value) =>
  value.replace(
    /[<>&'"]/g,
    (character) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character],
  )

const urls = [
  ['/', '1.0'],
  ['/guias', '0.8'],
  ['/recursos', '0.8'],
  ['/comunidad', '0.8'],
  ['/nosotros', '0.6'],
]

function addContentUrls(directory) {
  if (!existsSync(directory)) return
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      addContentUrls(path)
      continue
    }
    if (!entry.name.endsWith('.md')) continue
    const section = relative(contentRoot, directory).split('\\')[0]
    const slug = entry.name.slice(0, -3)
    urls.push([`/${section}/${encodeURIComponent(slug)}`, '0.7'])
  }
}

addContentUrls(contentRoot)

const body = urls
  .map(
    ([path, priority]) =>
      `  <url><loc>${escapeXml(siteUrl + path)}</loc><priority>${priority}</priority></url>`,
  )
  .join('\n')

writeFileSync(
  join('public', 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
)
console.log(`Sitemap generado con ${urls.length} URLs`)
