import { avatarSVG, coverSVG, glyphHTML, starsSVG } from './art'
import { hostOf, type BladeTheme } from './theme'

/**
 * One row in a blade's list, and the preview pane it opens.
 *
 * The build renders every row and the first preview of each blade; the
 * homepage island renders the next preview from the same `previewHTML` as the
 * selection moves, which is why it is a string function in a leaf module and
 * not a component.
 */

export type ItemKind =
  | 'post'
  | 'note'
  | 'project'
  | 'work'
  | 'about'
  | 'page'
  | 'link'
  | 'theme'
  | 'sound'
  | 'motion'
  | 'info'

export interface BladeItem {
  kind: ItemKind
  /** Stable per item; seeds the cover. */
  slug: string
  title: string
  /** The short right-hand column: `Sep '26`, a host, a setting's state. */
  sub: string
  /** Absent on the settings, which are buttons rather than links. */
  href?: string
  external?: boolean
  /** The full date, for the preview's meta line. */
  date?: string
  desc?: string
  /** Plain text from the start of the body, for the preview. */
  excerpt?: string
  /** `transitionName()` of the article this opens, for the morph. */
  vt?: string
}

/** What the system settings currently say, which the build cannot know. */
export interface PreviewState {
  sound: boolean
  reducedMotion: boolean
  /** null when the build renders it: the reader's theme is not known yet. */
  theme: 'light' | 'dark' | null
}

export const BUILD_STATE: PreviewState = {
  sound: false,
  reducedMotion: false,
  theme: null,
}

const KIND_LABEL: Record<ItemKind, string> = {
  post: 'Blog post',
  note: 'Note',
  project: 'Project',
  work: 'Vercel blog',
  about: 'Profile',
  page: 'Section',
  link: 'Link',
  theme: 'Setting',
  sound: 'Setting',
  motion: 'Setting',
  info: 'System',
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c])
}

export interface ProfileCard {
  tag: string
  score: number
  zone: string
}

/** The gamertag card: avatar, five stars, a score and a zone. */
export function profileCardHTML(card: ProfileCard, id: string): string {
  return (
    `<div class="gcard"><div class="avatar">${avatarSVG(id)}</div><div class="gmeta">` +
    `<p class="gtag">${esc(card.tag)}</p>` +
    `<p class="grow"><span class="k">Rep</span><span class="stars">${starsSVG(`${id}s`)}</span><span class="sr-only">5 out of 5</span></p>` +
    `<p class="grow"><span class="k">Score</span><span class="score">${card.score.toLocaleString('en-US')}</span></p>` +
    `<p class="grow"><span class="k">Zone</span><span>${esc(card.zone)}</span></p></div></div>`
  )
}

const target = (item: BladeItem) =>
  item.external ? ' target="_blank" rel="noopener noreferrer"' : ''

function primaryButton(label: string, inner: string): string {
  return `<span class="g">${inner}</span>${esc(label)}`
}

function actionsHTML(
  item: BladeItem,
  state: PreviewState,
): { html: string; hint: string } {
  const play = glyphHTML('play')
  switch (item.kind) {
    case 'post':
    case 'note':
      return {
        html: `<a class="btn" data-act="read" href="${esc(item.href ?? '/')}">${primaryButton(
          `Read ${item.kind}`,
          play,
        )}</a>`,
        hint: 'Enter to read',
      }
    case 'project':
    case 'work':
    case 'link':
      // A project written up on this site opens its post, like a post does.
      if (item.vt) {
        return {
          html: `<a class="btn" data-act="read" href="${esc(item.href ?? '/')}">${primaryButton(
            'Read the post',
            play,
          )}</a>`,
          hint: 'Enter to read',
        }
      }
      return {
        html: `<a class="btn" data-act="open" href="${esc(item.href ?? '/')}"${target(item)}>${primaryButton(
          `Open ${hostOf(item.href ?? '') || item.title}`,
          play,
        )}</a>`,
        hint: 'Enter to open',
      }
    case 'about':
    case 'page':
      return {
        html: `<a class="btn" data-act="open" href="${esc(item.href ?? '/')}">${primaryButton(
          `Open ${item.title.toLowerCase()}`,
          play,
        )}</a>`,
        hint: 'Enter to open',
      }
    case 'theme':
      return {
        html: `<button class="btn" type="button" data-theme-toggle>${primaryButton(
          state.theme === 'light'
            ? 'Use dark glass'
            : state.theme === 'dark'
              ? 'Use light glass'
              : 'Switch reading glass',
          glyphHTML('theme'),
        )}</button>`,
        hint: 'Enter to switch',
      }
    case 'sound':
      return {
        html: `<button class="btn" type="button" data-act="sound">${primaryButton(
          `Turn sound ${state.sound ? 'off' : 'on'}`,
          glyphHTML('sound'),
        )}</button>`,
        hint: 'Enter to toggle',
      }
    case 'motion':
      return {
        html: `<button class="btn" type="button" data-act="motion">${primaryButton(
          state.reducedMotion ? 'Use full motion' : 'Reduce motion',
          glyphHTML('motion'),
        )}</button>`,
        hint: 'Enter to toggle',
      }
    case 'info':
      return { html: '', hint: '' }
  }
}

function settingMeta(item: BladeItem, state: PreviewState): string {
  if (item.kind === 'sound')
    return state.sound ? 'Currently on' : 'Currently off'
  if (item.kind === 'motion') {
    return state.reducedMotion ? 'Currently reduced' : 'Currently full'
  }
  if (item.kind === 'theme' && state.theme) {
    return state.theme === 'light' ? 'Currently light' : 'Currently dark'
  }
  return ''
}

/** The current value a setting row shows in its right-hand column. */
export function settingSub(item: BladeItem, state: PreviewState): string {
  if (item.kind === 'sound') return state.sound ? 'On' : 'Off'
  if (item.kind === 'motion') return state.reducedMotion ? 'Reduced' : 'Full'
  if (item.kind === 'theme') {
    return state.theme === 'light' ? 'Light' : state.theme ? 'Dark' : 'Auto'
  }
  return item.sub
}

/** The inside of a blade's preview pane for one item. */
export function previewHTML(
  blade: BladeTheme,
  item: BladeItem,
  state: PreviewState,
  card: ProfileCard,
): string {
  const top =
    item.kind === 'about'
      ? `<div class="cover cover-card">${profileCardHTML(card, `pv${blade.id}`)}</div>`
      : `<div class="cover">${coverSVG(
          item.slug + blade.id,
          blade.c,
          item.kind === 'project' || item.kind === 'work',
        )}<span class="chip">${KIND_LABEL[item.kind]}</span></div>`
  const meta = [
    item.date ?? '',
    item.kind === 'project' || item.kind === 'link'
      ? hostOf(item.href ?? '')
      : '',
    settingMeta(item, state),
  ].filter(Boolean)
  const { html, hint } = actionsHTML(item, state)
  const metaLine = meta.length
    ? `<p class="pv-meta">${meta.map(esc).join('<span class="dot" aria-hidden="true"></span>')}</p>`
    : ''
  const desc = item.desc ? `<p class="pv-desc">${esc(item.desc)}</p>` : ''
  const excerpt = item.excerpt
    ? `<p class="pv-ex">${esc(item.excerpt)}</p>`
    : ''
  const hintSpan = hint
    ? `<span class="pv-hint" aria-hidden="true">${hint}</span>`
    : ''
  return `${top}<div class="pv-text"><h3 class="pv-title">${esc(item.title)}</h3>${metaLine}${desc}${excerpt}<div class="pv-actions">${html}${hintSpan}</div></div>`
}
