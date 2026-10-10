// Build step for this prototype: embeds ../content.json into index.html and renders the
// static, no-JS fallback (a plain list of every post, note and project) into <main>.
import { readFileSync, writeFileSync } from 'node:fs'
const dir = new URL('.', import.meta.url)
let html = readFileSync(new URL('index.html', dir), 'utf8')
const data = JSON.parse(readFileSync(new URL('../content.json', dir), 'utf8'))
const json = JSON.stringify(data).replace(/</g, '\\u003c')
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const abs = h => /^https?:/.test(h) ? h : data.site.url + (h[0] === '/' ? h : '/' + h)
const li = o => `<li><a href="${esc(abs(o.href))}">${esc(o.title)}</a>${o.date ? ', ' + esc(o.date) : ''}${o.description ? ' — ' + esc(o.description) : ''}</li>`
const ext = data.projectsAndExternal.filter(p => p.href)
const sec = (id, name, items) => `<section aria-labelledby="s-${id}"><h2 id="s-${id}">${name}</h2><ul>${items.map(li).join('')}</ul></section>`
const stat = `<h1>${esc(data.site.name)}</h1><p>${esc(data.site.blurb)}</p>` +
  sec('blog', 'Blog', data.posts) + sec('notes', 'Notes', data.notes) + sec('projects', 'Projects and work', ext) +
  sec('about', 'Elsewhere', [{ title: 'GitHub', href: data.site.github }, { title: 'X', href: data.site.x }, { title: 'RSS feed', href: '/feed.xml' }])
html = html.replace(/(<script id="content" type="application\/json">)[\s\S]*?(<\/script>)/, (_, a, b) => a + json + b)
html = html.replace(/<!--STATIC-->[\s\S]*?<!--\/STATIC-->/, () => '<!--STATIC-->' + stat + '<!--/STATIC-->')
writeFileSync(new URL('index.html', dir), html)
console.log('embedded', json.length, 'bytes of content; static fallback', stat.length, 'bytes')
