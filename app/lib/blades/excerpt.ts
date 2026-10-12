/**
 * The first few sentences of an MDX body as plain text, for a preview pane.
 *
 * Deliberately crude: it only has to read well for the start of a post, and a
 * markdown parser here would be a second pipeline to keep in step with the
 * real one. JSX blocks, imports, code fences, images and tables are dropped;
 * links keep their text; emphasis and heading marks go.
 */
export function excerptOf(body: string, max = 160): string {
  const lines: string[] = []
  let fence = false
  let jsxDepth = 0
  for (const raw of body.split('\n')) {
    const line = raw.trim()
    if (/^(```|~~~)/.test(line)) {
      fence = !fence
      continue
    }
    if (fence) continue
    if (/^(import|export)\s/.test(line)) continue
    // A JSX block opens on a line starting with a capitalised tag and runs
    // until its depth returns to zero; self-closing tags close themselves.
    if (jsxDepth > 0 || /^<[A-Za-z]/.test(line)) {
      const opens = (line.match(/<[A-Za-z][^>]*[^/]>|<[A-Za-z]>/g) ?? []).length
      const closes = (line.match(/<\/[A-Za-z][^>]*>/g) ?? []).length
      jsxDepth = Math.max(0, jsxDepth + opens - closes)
      continue
    }
    if (/^[|{}]/.test(line) || /^-{3,}$/.test(line)) continue
    lines.push(line)
    if (lines.join(' ').length > max * 2) break
  }
  const text = lines
    .join(' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/[*_`#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.]$/, '')}…`
}
