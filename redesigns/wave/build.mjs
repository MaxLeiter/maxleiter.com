// Inlines redesigns/content.json into index.html so the page runs from file://,
// and renders the static no-JS index that shows when scripts are off or boot fails.
import { readFileSync, writeFileSync } from 'node:fs'
const here = new URL('.', import.meta.url)
const SITE = 'https://maxleiter.com'
const src = readFileSync(new URL('index.src.html', here), 'utf8')
const c = JSON.parse(readFileSync(new URL('../content.json', here), 'utf8'))
const data = {
  site: c.site,
  posts: c.posts.map(({ title, description, date, href, excerpt }) => ({ title, description, date, href, excerpt })),
  notes: c.notes.map(({ title, description, date, href, excerpt }) => ({ title, description, date, href, excerpt })),
  projects: c.projectsAndExternal.filter((p) => p.href && !p.date),
  work: c.projectsAndExternal.filter((p) => p.href && p.date),
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch])
const abs = (h) => (/^https?:/.test(h) ? h : SITE + (h.startsWith('/') ? h : '/' + h))
const list = (items) => `<ul>${items.map((i) => `<li><a href="${esc(abs(i.href))}">${esc(i.title)}</a>${i.date || i.description ? ` <small>${esc([i.date, i.description].filter(Boolean).join(' · '))}</small>` : ''}</li>`).join('')}</ul>`
const nojs = `<h1>${esc(c.site.name)}</h1><p>${esc(c.site.blurb)}</p>
<p><a href="${esc(c.site.github)}">GitHub</a> · <a href="${esc(c.site.x)}">X</a> · <a href="${SITE}">maxleiter.com</a></p>
<h2>Blog</h2>${list(data.posts)}<h2>Notes</h2>${list(data.notes)}<h2>Projects</h2>${list(data.projects)}<h2>Work</h2>${list(data.work)}`
const json = JSON.stringify(data).replace(/</g, '\\u003c')
writeFileSync(new URL('index.html', here), src.replace('__NOJS__', () => nojs).replace('__DATA__', () => json))
console.log('wrote index.html', (src.length + json.length + nojs.length) / 1024 | 0, 'KB')
