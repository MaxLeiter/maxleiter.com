// Inlines src/* and ../content.json into a single self-contained index.html.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const here = dirname(fileURLToPath(import.meta.url))
const src = (f) => readFileSync(join(here, 'src', f), 'utf8')
const content = JSON.parse(readFileSync(join(here, '..', 'content.json'), 'utf8'))
const js = ['shaders.js', 'render.js', 'audio.js', 'art.js', 'app.js'].map(src).join('\n')
const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const url = (h) => (/^https?:/.test(h) ? h : 'https://maxleiter.com' + (h.startsWith('/') ? h : '/' + h))
const item = (x) => `<li><a href="${esc(url(x.href))}">${esc(x.title)}</a>${x.date ? ` <small>${esc(x.date)}</small>` : ''}${x.description ? `<br><small>${esc(x.description)}</small>` : ''}</li>`
const noscript = `<noscript><style>#bg,#app{display:none}</style><main class="nojs"><h1>Meridian · ${esc(content.site.name)}</h1><p>${esc(content.site.blurb)}</p>
<p><a href="${esc(content.site.github)}">GitHub</a> · <a href="${esc(content.site.x)}">X</a> · <a href="${esc(content.site.url)}">maxleiter.com</a></p>
<h2>Posts</h2><ul>${content.posts.map(item).join('')}</ul>
<h2>Notes</h2><ul>${content.notes.map(item).join('')}</ul>
<h2>Projects &amp; work</h2><ul>${content.projectsAndExternal.filter((x) => x.href).map(item).join('')}</ul></main></noscript>`
const html = src('template.html')
  .replace('/*CSS*/', () => src('style.css'))
  .replace('/*DATA*/', () => JSON.stringify(content).replace(/</g, '\\u003c'))
  .replace('/*JS*/', () => js)
  .replace('<!--NOSCRIPT-->', () => noscript)
writeFileSync(join(here, 'index.html'), html)
console.log('index.html', (html.length / 1024).toFixed(1) + ' KB')
