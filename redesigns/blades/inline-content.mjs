// Inlines ../content.json into index.html (replaces the JSON island). Run: node inline-content.mjs
import { readFileSync, writeFileSync } from 'node:fs'
const dir = new URL('.', import.meta.url)
const c = JSON.parse(readFileSync(new URL('../content.json', dir), 'utf8'))
const json = JSON.stringify(c).replace(/</g, '\\u003c')
const p = new URL('index.html', dir)
const html = readFileSync(p, 'utf8').replace(/(<script type="application\/json" id="content">)[\s\S]*?(<\/script>)/, (_, a, b) => a + json + b)
writeFileSync(p, html)
console.log('inlined', json.length, 'bytes')
