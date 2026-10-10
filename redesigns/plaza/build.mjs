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

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const absu = (h) => (/^https?:/.test(h) ? h : 'https://maxleiter.com' + (h.startsWith('/') ? h : '/' + h))
const li = (x) => `<li><a href="${absu(x.href)}">${esc(x.t)}</a>${x.date ? ` <small>${esc(x.date)}</small>` : ''}${x.d ? ` &mdash; ${esc(x.d)}` : ''}</li>`
const fallback = `<h1>Max Leiter</h1><p>${esc(data.site.blurb)}</p>
<p>This is the plain version of the Plaza menu, shown when JavaScript is unavailable. <a href="${data.site.github}">GitHub</a> &middot; <a href="${data.site.x}">X</a> &middot; <a href="https://maxleiter.com/feed.xml">RSS</a></p>
<h2>Blog</h2><ul class="ul-reset">${data.posts.map(li).join('')}</ul>
<h2>Notes</h2><ul class="ul-reset">${data.notes.map(li).join('')}</ul>
<h2>Projects</h2><ul class="ul-reset">${data.projects.map(li).join('')}</ul>
<h2>Work</h2><ul class="ul-reset">${data.work.map(li).join('')}</ul>`
const html = src('shell.html')
  .replace('/*__CSS__*/', () => src('style.css'))
  .replace('/*__JS__*/', () => js)
  .replace('/*__FALLBACK__*/', () => fallback)

fs.writeFileSync(path.join(here, 'index.html'), html)
console.log('index.html', (html.length / 1024).toFixed(1) + ' KB')
