// Inlines redesigns/content.json into index.html so the page runs from file://
import { readFileSync, writeFileSync } from 'node:fs'
const here = new URL('.', import.meta.url)
const src = readFileSync(new URL('index.src.html', here), 'utf8')
const c = JSON.parse(readFileSync(new URL('../content.json', here), 'utf8'))
const data = {
  site: c.site,
  posts: c.posts.map(({ title, description, date, href, excerpt }) => ({ title, description, date, href, excerpt })),
  notes: c.notes.map(({ title, description, date, href, excerpt }) => ({ title, description, date, href, excerpt })),
  projects: c.projectsAndExternal.filter((p) => p.href && !p.date),
  work: c.projectsAndExternal.filter((p) => p.href && p.date),
}
const json = JSON.stringify(data).replace(/</g, '\\u003c')
writeFileSync(new URL('index.html', here), src.replace('__DATA__', () => json))
console.log('wrote index.html', (src.length + json.length) / 1024 | 0, 'KB')
