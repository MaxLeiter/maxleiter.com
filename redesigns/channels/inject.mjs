// Re-embeds ../content.json into index.html (between the content script tags).
import { readFileSync, writeFileSync } from 'node:fs'
const dir = new URL('.', import.meta.url)
const html = readFileSync(new URL('index.html', dir), 'utf8')
const json = JSON.stringify(JSON.parse(readFileSync(new URL('../content.json', dir), 'utf8'))).replace(/</g, '\\u003c')
const out = html.replace(/(<script id="content" type="application\/json">)[\s\S]*?(<\/script>)/, (_, a, b) => a + json + b)
writeFileSync(new URL('index.html', dir), out)
console.log('embedded', json.length, 'bytes')
