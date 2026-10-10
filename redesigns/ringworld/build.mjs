// Inlines src/* and ../content.json into a single self-contained index.html.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const here = dirname(fileURLToPath(import.meta.url))
const src = (f) => readFileSync(join(here, 'src', f), 'utf8')
const content = JSON.parse(readFileSync(join(here, '..', 'content.json'), 'utf8'))
const js = ['shaders.js', 'render.js', 'audio.js', 'art.js', 'app.js'].map(src).join('\n')
const html = src('template.html')
  .replace('/*CSS*/', () => src('style.css'))
  .replace('/*DATA*/', () => JSON.stringify(content).replace(/</g, '\\u003c'))
  .replace('/*JS*/', () => js)
writeFileSync(join(here, 'index.html'), html)
console.log('index.html', (html.length / 1024).toFixed(1) + ' KB')
