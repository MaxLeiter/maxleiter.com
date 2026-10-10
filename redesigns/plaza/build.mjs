// Inlines src/ into one self-contained index.html.
// node redesigns/plaza/build.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = (f) => fs.readFileSync(path.join(here, 'src', f), 'utf8')
const content = JSON.parse(
  fs.readFileSync(path.join(here, '..', 'content.json'), 'utf8'),
)

const pick = (x) => ({
  t: x.title,
  d: x.description || '',
  date: x.date || '',
  href: x.href || '',
  ex: x.excerpt || '',
})
const data = {
  site: content.site,
  posts: content.posts.map(pick),
  notes: content.notes.map(pick),
  work: content.projectsAndExternal.filter((x) => x.date && x.href).map(pick),
  projects: content.projectsAndExternal
    .filter((x) => !x.date && x.href)
    .map(pick),
}

const js = ['data.js', 'audio.js', 'renderers.js', 'app.js']
  .map((f) => `/* ---- ${f} ---- */\n` + src(f))
  .join('\n')
  .replace('/*__DATA__*/null', JSON.stringify(data).replace(/</g, '\\u003c'))

const html = src('shell.html')
  .replace('/*__CSS__*/', () => src('style.css'))
  .replace('/*__JS__*/', () => js)

fs.writeFileSync(path.join(here, 'index.html'), html)
console.log('index.html', (html.length / 1024).toFixed(1) + ' KB')
