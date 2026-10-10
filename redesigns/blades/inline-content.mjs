// Inlines ../content.json into index.html: the JSON island the dashboard reads, plus a plain
// HTML index (posts, notes, projects, work) shown when JavaScript is off or the boot fails.
// Run: node inline-content.mjs
import { readFileSync, writeFileSync } from 'node:fs'
const dir = new URL('.', import.meta.url)
const c = JSON.parse(readFileSync(new URL('../content.json', dir), 'utf8'))
const SITE = 'https://maxleiter.com'
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]))
const abs = h => /^https?:/.test(h) ? h : SITE + (h.startsWith('/') ? h : '/' + h)
const li = x => `<li><div><a href="${esc(abs(x.href))}">${esc(x.title)}</a>${x.description ? `<p>${esc(x.description)}</p>` : ''}</div>${x.date ? `<span>${esc(x.date)}</span>` : ''}</li>`
const ext = c.projectsAndExternal.filter(x => x.href)
const sections = [
  ['blog', 'Blog', c.posts], ['notes', 'Notes', c.notes],
  ['projects', 'Projects', ext.filter(x => !x.date)], ['work', 'Work on the Vercel blog', ext.filter(x => x.date)],
]
const fallback = `<main id="fallback">
<h1>Max Leiter</h1>
<p class="lede">${esc(c.site.blurb)} <a href="${esc(c.site.github)}">GitHub</a> · <a href="${esc(c.site.x)}">X</a> · <a href="${SITE}">maxleiter.com</a></p>
${sections.map(([id, name, items]) => `<section aria-labelledby="fb-${id}"><h2 id="fb-${id}">${name}</h2><ul>${items.map(li).join('')}</ul></section>`).join('\n')}
</main>`
const json = JSON.stringify(c).replace(/</g, '\\u003c')
const p = new URL('index.html', dir)
let html = readFileSync(p, 'utf8')
html = html.replace(/(<script type="application\/json" id="content">)[\s\S]*?(<\/script>)/, (_, a, b) => a + json + b)
html = html.replace(/<!--FALLBACK-->[\s\S]*?<!--\/FALLBACK-->/, () => `<!--FALLBACK-->${fallback}<!--/FALLBACK-->`)
writeFileSync(p, html)
console.log('inlined', json.length, 'bytes of content,', fallback.length, 'bytes of fallback')
