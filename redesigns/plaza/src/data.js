const DATA = /*__DATA__*/null
const SITE = 'https://maxleiter.com'

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

/** "Sept 1, 2026" / "July 30, 2022" -> Date (local midnight), or null. */
function parseDate(s) {
  const m = /^([A-Za-z]+)\.?\s+(\d{1,2}),\s*(\d{4})$/.exec((s || '').trim())
  if (!m) return null
  const mi = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase())
  if (mi < 0) return null
  return new Date(+m[3], mi, +m[2])
}

function abs(href) {
  if (!href) return SITE
  if (/^https?:/.test(href)) return href
  return SITE + (href.startsWith('/') ? href : '/' + href)
}

function slugOf(href) {
  return (href || '').split('/').filter(Boolean).pop() || ''
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

// Every dated thing on the site, newest first, for the message board.
const ITEMS = []
for (const p of DATA.posts) ITEMS.push({ ...p, kind: 'post', slug: slugOf(p.href), when: parseDate(p.date) })
for (const p of DATA.notes) ITEMS.push({ ...p, kind: 'note', slug: slugOf(p.href), when: parseDate(p.date) })
for (const p of DATA.work) ITEMS.push({ ...p, kind: 'work', slug: slugOf(p.href), when: parseDate(p.date) })
ITEMS.sort((a, b) => (b.when || 0) - (a.when || 0))

/* ---------- a deliberately small markdown -> HTML for excerpts ---------- */
function inline(s) {
  s = esc(s)
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  s = s.replace(/\[\^[^\]]+\]/g, '')
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (_, t, u) => {
    const url = u.startsWith('/') ? SITE + u : u
    return `<a href="${url}" target="_blank" rel="noopener">${t}</a>`
  })
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
  return s
}

function md(src, truncated) {
  const lines = src.replace(/\r/g, '').split('\n')
  const out = []
  let para = [], list = null, code = null
  const flushP = () => { if (para.length) out.push('<p>' + inline(para.join(' ')) + '</p>'); para = [] }
  const flushL = () => { if (list) out.push(`<${list.t}>` + list.items.map((i) => '<li>' + inline(i) + '</li>').join('') + `</${list.t}>`); list = null }
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    if (code) {
      if (/^\s*```/.test(line)) { out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>'); code = null } else code.push(raw)
      continue
    }
    if (/^\s*```/.test(line)) { flushP(); flushL(); code = []; continue }
    if (!line.trim()) { flushP(); flushL(); continue }
    if (/^\s*(<|import |export |\{\/\*)/.test(line)) { flushP(); continue }
    const img = /^!\[([^\]]*)\]\(([^)]+)\)/.exec(line.trim())
    if (img) { flushP(); flushL(); if (img[1]) out.push(`<p class="img-note">Image: ${esc(img[1])}</p>`); continue }
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) { flushP(); flushL(); const n = Math.min(4, h[1].length + 1); out.push(`<h${n}>${inline(h[2])}</h${n}>`); continue }
    const li = /^\s*(?:([-*])|(\d+)\.)\s+(.*)$/.exec(line)
    if (li) { flushP(); const t = li[2] ? 'ol' : 'ul'; if (!list || list.t !== t) { flushL(); list = { t, items: [] } } list.items.push(li[3]); continue }
    if (/^>\s?/.test(line)) { flushP(); flushL(); out.push('<blockquote>' + inline(line.replace(/^>\s?/, '')) + '</blockquote>'); continue }
    flushL(); para.push(line.trim())
  }
  if (code) out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>')
  flushP(); flushL()
  let html = out.join('\n')
  if (truncated) html = html.replace(/(<\/(p|li|blockquote)>)(?![\s\S]*<\/(p|li|blockquote)>)/, '&hellip;$1')
  return html
}
