'use client'

import type React from 'react'
import {
  useState,
  useEffect,
  startTransition,
  useRef,
  ViewTransition,
  useMemo,
  useReducer,
  useCallback,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { track } from '@vercel/analytics'
import dynamic from 'next/dynamic'
import { Window } from '@components/desktop/window'
import { TerminalContent } from '@components/desktop/terminal-content'
import { WidgetRecentPosts } from '@components/desktop/widget-recent-posts'
import { WidgetTopProjects } from '@components/desktop/widget-top-projects'
import {
  AboutContentClient,
  ProjectsContentClient,
  BlogListContentClient,
  LabsContentClient,
  TalksContentClient,
  NotesContentClient,
} from '@components/page-content-client'
import type { BlogPost, Project } from '@lib/portfolio-data'
import type { Note } from '@lib/types'
import { ABOUT_CONTENT } from '@lib/about-content'
import { useIsMobile } from './use-is-mobile'
import { useEffects } from '@components/desktop/effects-context'
import { ThemeToggle } from '@components/theme-toggle'
import { windowStyles } from '@lib/window-styles'

const Calculator = dynamic(
  () =>
    import('@components/desktop/calculator').then((m) => ({
      default: m.Calculator,
    })),
  {
    ssr: false,
    loading: () => null,
  },
)

interface DesktopItem {
  id: string
  name: string
  type: 'folder' | 'app'
  icon: React.ReactNode
  href?: string
  onClick?: (e: React.MouseEvent) => void
  external?: boolean
  className?: string
}

export function FolderIconDefault({ className }: { className?: string }) {
  return (
    <svg
      height="48"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      width="48"
      className={className || 'text-foreground'}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.5 7.5V12.5C14.5 13.0523 14.0523 13.5 13.5 13.5H2.5C1.94772 13.5 1.5 13.0523 1.5 12.5V7.5H14.5ZM14.5 6V4H8.83333C8.29241 4 7.76607 3.82456 7.33333 3.5L6 2.5H1.5V6H14.5ZM0 1H1.5H6.16667C6.38304 1 6.59357 1.07018 6.76667 1.2L8.23333 2.3C8.40643 2.42982 8.61696 2.5 8.83333 2.5H14.5H16V4V12.5C16 13.8807 14.8807 15 13.5 15H2.5C1.11929 15 0 13.8807 0 12.5V2.5V1Z"
        fill="currentColor"
      />
    </svg>
  )
}

function TerminalIconDefault() {
  return (
    <svg
      height="48"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      width="48"
      className="text-foreground"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.53035 12.7804L1.00002 13.3108L-0.0606384 12.2501L0.469692 11.7198L4.18936 8.00011L0.469692 4.28044L-0.0606384 3.75011L1.00002 2.68945L1.53035 3.21978L5.60358 7.29301C5.9941 7.68353 5.9941 8.3167 5.60357 8.70722L1.53035 12.7804ZM8.75002 12.5001H8.00002V14.0001H8.75002H15.25H16V12.5001H15.25H8.75002Z"
        fill="currentColor"
      />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg
      height="40"
      width="40"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="text-foreground"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg
      height="40"
      width="40"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-foreground"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function TwitterIcon() {
  return (
    <svg
      height="40"
      width="40"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-foreground"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function V0Icon() {
  return (
    <svg
      height="48"
      width="48"
      viewBox="0 0 16 16"
      strokeLinejoin="round"
      className="text-foreground"
      style={{ transform: 'translateY(-2px)' }}
    >
      <path
        d="M6.0952 9.4643V5.5238H7.6190V10.5476C7.6190 11.1394 7.1394 11.6190 6.5476 11.6190C6.2651 11.6190 5.9862 11.5101 5.7857 11.3096L0 5.5238H2.1548L6.0952 9.4643Z M16 10.0952H14.4762V6.6071L10.9881 10.0952H14.4762V11.6190H10.5238C9.3403 11.6190 8.3810 10.6597 8.3810 9.4762V5.5238H9.9048V9.0238L13.4047 5.5238H9.9048V4H13.8571C15.0407 4 16 4.9594 16 6.1429V10.0952Z"
        fill="currentColor"
      />
    </svg>
  )
}

function AIIcon() {
  return (
    <svg
      height="40"
      width="40"
      viewBox="0 0 16 16"
      strokeLinejoin="round"
      className="text-foreground"
    >
      <path
        d="M2.5 0.5V0H3.5V0.5C3.5 1.60457 4.39543 2.5 5.5 2.5H6V3V3.5H5.5C4.39543 3.5 3.5 4.39543 3.5 5.5V6H3H2.5V5.5C2.5 4.39543 1.60457 3.5 0.5 3.5H0V3V2.5H0.5C1.60457 2.5 2.5 1.60457 2.5 0.5Z"
        fill="currentColor"
      />
      <path
        d="M14.5 4.5V5H13.5V4.5C13.5 3.94772 13.0523 3.5 12.5 3.5H12V3V2.5H12.5C13.0523 2.5 13.5 2.05228 13.5 1.5V1H14H14.5V1.5C14.5 2.05228 14.9477 2.5 15.5 2.5H16V3V3.5H15.5C14.9477 3.5 14.5 3.94772 14.5 4.5Z"
        fill="currentColor"
      />
      <path
        d="M8.40706 4.92939L8.5 4H9.5L9.59294 4.92939C9.82973 7.29734 11.7027 9.17027 14.0706 9.40706L15 9.5V10.5L14.0706 10.5929C11.7027 10.8297 9.82973 12.7027 9.59294 15.0706L9.5 16H8.5L8.40706 15.0706C8.17027 12.7027 6.29734 10.8297 3.92939 10.5929L3 10.5V9.5L3.92939 9.40706C6.29734 9.17027 8.17027 7.29734 8.40706 4.92939Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function ExternalLinkIcon() {
  return (
    <svg
      height="16"
      width="16"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      className="size-3"
      style={{ color: 'var(--gray)' }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.5 10.25V13.25C13.5 13.3881 13.3881 13.5 13.25 13.5H2.75C2.61193 13.5 2.5 13.3881 2.5 13.25L2.5 2.75C2.5 2.61193 2.61193 2.5 2.75 2.5H5.75H6.5V1H5.75H2.75C1.7835 1 1 1.7835 1 2.75V13.25C1 14.2165 1.7835 15 2.75 15H13.25C14.2165 15 15 14.2165 15 13.25V10.25V9.5H13.5V10.25ZM9 1H9.75H14.2495C14.6637 1 14.9995 1.33579 14.9995 1.75V6.25V7H13.4995V6.25V3.56066L8.53033 8.52978L8 9.06011L6.93934 7.99945L7.46967 7.46912L12.4388 2.5H9.75H9V1Z"
        fill="currentColor"
      />
    </svg>
  )
}

function CalculatorIcon() {
  return (
    <svg
      height="48"
      width="48"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      className="text-foreground"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13 1.5H3V4H13V1.5ZM3 13.5V5.25H13V13.5C13 14.0523 12.5523 14.5 12 14.5H4C3.44772 14.5 3 14.0523 3 13.5ZM3 0H1.5V1.5V13.5C1.5 14.8807 2.61929 16 4 16H12C13.3807 16 14.5 14.8807 14.5 13.5V1.5V0H13H3ZM5.25 8C5.66421 8 6 7.66421 6 7.25C6 6.83579 5.66421 6.5 5.25 6.5C4.83579 6.5 4.5 6.83579 4.5 7.25C4.5 7.66421 4.83579 8 5.25 8ZM5.25 10.5C5.66421 10.5 6 10.1642 6 9.75C6 9.33579 5.66421 9 5.25 9C4.83579 9 4.5 9.33579 4.5 9.75C4.5 10.1642 4.83579 10.5 5.25 10.5ZM6 12.5C6 12.9142 5.66421 13.25 5.25 13.25C4.83579 13.25 4.5 12.9142 4.5 12.5C4.5 12.0858 4.83579 11.75 5.25 11.75C5.66421 11.75 6 12.0858 6 12.5ZM8 8C8.41421 8 8.75 7.66421 8.75 7.25C8.75 6.83579 8.41421 6.5 8 6.5C7.58579 6.5 7.25 6.83579 7.25 7.25C7.25 7.66421 7.58579 8 8 8ZM8.75 9.75C8.75 10.1642 8.41421 10.5 8 10.5C7.58579 10.5 7.25 10.1642 7.25 9.75C7.25 9.33579 7.58579 9 8 9C8.41421 9 8.75 9.33579 8.75 9.75ZM8 13.25C8.41421 13.25 8.75 12.9142 8.75 12.5C8.75 12.0858 8.41421 11.75 8 11.75C7.58579 11.75 7.25 12.0858 7.25 12.5C7.25 12.9142 7.58579 13.25 8 13.25ZM11.5 7.25C11.5 7.66421 11.1642 8 10.75 8C10.3358 8 10 7.66421 10 7.25C10 6.83579 10.3358 6.5 10.75 6.5C11.1642 6.5 11.5 6.83579 11.5 7.25ZM10.75 10.5C11.1642 10.5 11.5 10.1642 11.5 9.75C11.5 9.33579 11.1642 9 10.75 9C10.3358 9 10 9.33579 10 9.75C10 10.1642 10.3358 10.5 10.75 10.5ZM11.5 12.5C11.5 12.9142 11.1642 13.25 10.75 13.25C10.3358 13.25 10 12.9142 10 12.5C10 12.0858 10.3358 11.75 10.75 11.75C11.1642 11.75 11.5 12.0858 11.5 12.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg
      height="14"
      width="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="6.5" cy="6.5" r="5" />
      <line x1="10" y1="10" x2="15" y2="15" />
    </svg>
  )
}

interface DesktopClientProps {
  blogPosts: BlogPost[]
  projects: Project[]
  notes?: Note[]
}

declare global {
  interface Window {
    __INITIAL_TIME__?: string
  }
}

type WindowId =
  | 'terminal'
  | 'calculator'
  | 'about'
  | 'projects'
  | 'blog-list'
  | 'labs'
  | 'talks'
  | 'notes'

interface WindowState {
  openWindows: Set<WindowId>
  blogPostSlug: string | null
  focusedWindow: string | null
  zIndexes: Record<string, number>
  nextZIndex: number
}

type WindowAction =
  | { type: 'OPEN_WINDOW'; id: WindowId }
  | { type: 'CLOSE_WINDOW'; id: WindowId }
  | { type: 'OPEN_BLOG_POST'; slug: string }
  | { type: 'CLOSE_BLOG_POST' }
  | { type: 'FOCUS'; id: string }

function windowReducer(state: WindowState, action: WindowAction): WindowState {
  switch (action.type) {
    case 'OPEN_WINDOW': {
      const newWindows = new Set(state.openWindows)
      newWindows.add(action.id)
      return {
        ...state,
        openWindows: newWindows,
        focusedWindow: action.id,
        zIndexes: { ...state.zIndexes, [action.id]: state.nextZIndex },
        nextZIndex: state.nextZIndex + 1,
      }
    }
    case 'CLOSE_WINDOW': {
      const newWindows = new Set(state.openWindows)
      newWindows.delete(action.id)
      return { ...state, openWindows: newWindows }
    }
    case 'OPEN_BLOG_POST': {
      const windowId = `blog-post-${action.slug}`
      return {
        ...state,
        blogPostSlug: action.slug,
        focusedWindow: windowId,
        zIndexes: { ...state.zIndexes, [windowId]: state.nextZIndex },
        nextZIndex: state.nextZIndex + 1,
      }
    }
    case 'CLOSE_BLOG_POST':
      return { ...state, blogPostSlug: null }
    case 'FOCUS': {
      return {
        ...state,
        focusedWindow: action.id,
        zIndexes: { ...state.zIndexes, [action.id]: state.nextZIndex },
        nextZIndex: state.nextZIndex + 1,
      }
    }
    default:
      return state
  }
}

const initialWindowState: WindowState = {
  openWindows: new Set(),
  blogPostSlug: null,
  focusedWindow: null,
  zIndexes: {},
  nextZIndex: 50,
}

function createFolderClickHandler(
  windowId: WindowId,
  route: string,
  isMobile: boolean,
  router: AppRouterInstance,
  dispatch: React.Dispatch<WindowAction>,
) {
  return (e: React.MouseEvent) => {
    e.preventDefault()
    track('nav_click', { section: windowId })
    if (isMobile) {
      startTransition(() => {
        router.push(route)
      })
    } else {
      dispatch({ type: 'OPEN_WINDOW', id: windowId })
    }
  }
}

const folderItems: Array<{
  id: string
  name: string
  windowId: WindowId
  route: string
}> = [
  { id: 'blog', name: 'blog', windowId: 'blog-list', route: '/blog' },
  { id: 'notes', name: 'notes', windowId: 'notes', route: '/notes' },
  {
    id: 'projects',
    name: 'projects',
    windowId: 'projects',
    route: '/projects',
  },
  { id: 'about', name: 'about', windowId: 'about', route: '/about' },
  { id: 'labs', name: 'labs', windowId: 'labs', route: '/labs' },
  { id: 'talks', name: 'talks', windowId: 'talks', route: '/talks' },
]

interface ContentWindowConfig {
  id: WindowId
  title: string
  pageType: string
  defaultX: number
  defaultY: number
}

const CONTENT_WINDOW_CONFIGS: ContentWindowConfig[] = [
  {
    id: 'about',
    title: 'about',
    pageType: 'about',
    defaultX: 200,
    defaultY: 100,
  },
  {
    id: 'projects',
    title: 'projects',
    pageType: 'projects',
    defaultX: 250,
    defaultY: 120,
  },
  {
    id: 'blog-list',
    title: 'blog',
    pageType: 'blog',
    defaultX: 300,
    defaultY: 140,
  },
  {
    id: 'notes',
    title: 'notes',
    pageType: 'notes',
    defaultX: 325,
    defaultY: 150,
  },
  { id: 'labs', title: 'labs', pageType: 'labs', defaultX: 350, defaultY: 160 },
  {
    id: 'talks',
    title: 'talks',
    pageType: 'talks',
    defaultX: 400,
    defaultY: 180,
  },
]

interface ContentWindowProps {
  config: ContentWindowConfig
  isOpen: boolean
  zIndex: number
  onClose: () => void
  onFocus: () => void
  children: React.ReactNode
}

function ContentWindow({
  config,
  isOpen,
  zIndex,
  onClose,
  onFocus,
  children,
}: ContentWindowProps) {
  if (!isOpen) return null

  return (
    <Window
      title={config.title}
      onClose={onClose}
      defaultWidth={800}
      defaultHeight={600}
      defaultX={config.defaultX}
      defaultY={config.defaultY}
      pageType={config.pageType as any}
      zIndex={zIndex}
      onFocus={onFocus}
    >
      <div className="overflow-auto h-full p-6">{children}</div>
    </Window>
  )
}

export function DesktopClient({
  blogPosts,
  projects,
  notes = [],
}: DesktopClientProps) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const { setShowCommandPalette } = useEffects()

  const [windowState, dispatch] = useReducer(windowReducer, initialWindowState)
  const [preloadedPost, setPreloadedPost] = useState<string | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Convenience accessors
  const isOpen = (id: WindowId) => windowState.openWindows.has(id)
  const getZIndex = (id: string) => windowState.zIndexes[id] || 50

  // Initialize time from the inline script to avoid hydration mismatch
  const [currentTime, setCurrentTime] = useState(() => {
    if (typeof window !== 'undefined' && window.__INITIAL_TIME__) {
      return window.__INITIAL_TIME__
    }
    return ''
  })

  useEffect(() => {
    const updateTime = () => {
      const time = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
      setCurrentTime(time)
    }

    updateTime()

    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  const currentBlogPost = windowState.blogPostSlug
    ? blogPosts.find((post) => post.slug === windowState.blogPostSlug)
    : null

  // Check for openPost URL parameter on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const postSlug = params.get('openPost')
      if (postSlug && blogPosts.find((p) => p.slug === postSlug)) {
        dispatch({ type: 'OPEN_BLOG_POST', slug: postSlug })
        window.history.replaceState({}, '', '/')
      }
    }
  }, [blogPosts])

  const handlePostClick = useCallback(
    (slug: string) => {
      track('blog_click', { slug })
      if (isMobile) {
        startTransition(() => {
          router.push(`/blog/${slug}`)
        })
      } else {
        dispatch({ type: 'OPEN_BLOG_POST', slug })
        setPreloadedPost(null)
      }
    },
    [isMobile, router],
  )

  const handlePostHover = useCallback(
    (slug: string) => {
      if (!isMobile && !windowState.blogPostSlug) {
        setPreloadedPost(slug)
      }
    },
    [isMobile, windowState.blogPostSlug],
  )

  const handlePostHoverEnd = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setPreloadedPost(null)
    }, 1000)
  }, [])

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  const renderWindowContent = useCallback(
    (windowId: WindowId) => {
      switch (windowId) {
        case 'about':
          return <AboutContentClient />
        case 'projects':
          return <ProjectsContentClient projects={projects} />
        case 'blog-list':
          return (
            <BlogListContentClient
              posts={blogPosts}
              onPostClick={handlePostClick}
              onPostHover={handlePostHover}
              onPostHoverEnd={handlePostHoverEnd}
            />
          )
        case 'labs':
          return <LabsContentClient />
        case 'talks':
          return <TalksContentClient />
        case 'notes':
          return <NotesContentClient notes={notes} />
        default:
          return null
      }
    },
    [
      blogPosts,
      projects,
      notes,
      handlePostClick,
      handlePostHover,
      handlePostHoverEnd,
    ],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault()
        dispatch({ type: 'OPEN_WINDOW', id: 'terminal' })
      }
      // Ctrl+W to close focused window (not Cmd since browser intercepts it)
      if (e.ctrlKey && !e.metaKey && e.key === 'w') {
        const focused = windowState.focusedWindow
        if (focused) {
          e.preventDefault()
          if (focused.startsWith('blog-post-')) {
            dispatch({ type: 'CLOSE_BLOG_POST' })
          } else if (windowState.openWindows.has(focused as WindowId)) {
            dispatch({ type: 'CLOSE_WINDOW', id: focused as WindowId })
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [windowState.focusedWindow, windowState.openWindows])

  const desktopItems: DesktopItem[] = useMemo(
    () => [
      // Folders - generated from config
      ...folderItems.map((folder) => ({
        id: folder.id,
        name: folder.name,
        type: 'folder' as const,
        icon: <FolderIconDefault />,
        href: folder.route,
        onClick: createFolderClickHandler(
          folder.windowId,
          folder.route,
          isMobile,
          router,
          dispatch,
        ),
      })),
      // Local apps
      {
        id: 'terminal',
        name: 'terminal',
        type: 'app',
        icon: <TerminalIconDefault />,
        onClick: () => {
          dispatch({ type: 'OPEN_WINDOW', id: 'terminal' })
        },
      },
      {
        id: 'calculator',
        name: 'calc',
        type: 'app',
        icon: <CalculatorIcon />,
        onClick: () => {
          dispatch({ type: 'OPEN_WINDOW', id: 'calculator' })
        },
      },
      // External links
      {
        id: 'github',
        name: 'github',
        type: 'app',
        icon: <GitHubIcon />,
        href: 'https://github.com/maxleiter',
        external: true,
      },
      {
        id: 'linkedin',
        name: 'linkedin',
        type: 'app',
        icon: <LinkedInIcon />,
        href: 'https://www.linkedin.com/in/MaxLeiter',
        external: true,
      },
      {
        id: 'twitter',
        name: 'X',
        type: 'app',
        icon: <TwitterIcon />,
        href: 'https://twitter.com/maxleiter',
        external: true,
      },
      {
        id: 'v0',
        name: 'v0',
        type: 'app',
        icon: <V0Icon />,
        href: 'https://v0.app',
        external: true,
      },
      {
        id: 'ai-sdk',
        name: 'AI SDK',
        type: 'app',
        icon: <AIIcon />,
        href: 'https://sdk.vercel.ai',
        external: true,
        className: 'hidden sm:block',
      },
    ],
    [isMobile, router],
  )

  return (
    <div className="h-screen bg-(--bg) text-(--fg) overflow-hidden flex flex-col">
      <h1 className="sr-only">Max Leiter's website</h1>
      <header
        className="h-10 3xl:h-12 border-b border-(--border-color) flex items-center px-4 3xl:px-6 gap-4 3xl:gap-6 text-xs 3xl:text-sm font-mono sticky top-0 z-10"
        style={windowStyles.translucentBg}
      >
        <span className="text-(--gray)" aria-hidden>
          ~
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ThemeToggle />
          <button
            onClick={() => setShowCommandPalette(true)}
            className="text-(--gray) hover:text-(--fg) transition-colors p-1"
            aria-label="Search (⌘K)"
            title="Search (⌘K)"
          >
            <SearchIcon />
          </button>
          <time id="menubar-clock" className="text-(--gray)">
            {currentTime}
          </time>
        </div>
      </header>

      <main className="flex-1 p-8 3xl:p-12 overflow-auto relative">
        <div className="flex flex-col lg:flex-row gap-8 3xl:gap-12">
          <nav className="shrink-0" aria-label="Desktop applications">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-8 3xl:gap-12 w-fit">
              {desktopItems.map((item) => (
                <DesktopIcon key={item.id} item={item} />
              ))}
            </div>
          </nav>

          <aside className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 3xl:gap-10 max-w-6xl 3xl:max-w-7xl items-start">
            <WidgetRecentPosts
              posts={blogPosts}
              recentLimit={3}
              onPostClick={handlePostClick}
              onPostHover={handlePostHover}
              onPostHoverEnd={handlePostHoverEnd}
            />
            <WidgetTopProjects projects={projects} limit={5} />
          </aside>
        </div>
      </main>

      {/* Hidden preload iframe */}
      {preloadedPost && (
        <iframe
          src={`/blog/${preloadedPost}?embed=true`}
          className="hidden"
          aria-hidden="true"
        />
      )}

      {isOpen('terminal') && (
        <Window
          title="terminal"
          onClose={() => dispatch({ type: 'CLOSE_WINDOW', id: 'terminal' })}
          defaultWidth={600}
          defaultHeight={400}
          zIndex={getZIndex('terminal')}
          onFocus={() => dispatch({ type: 'FOCUS', id: 'terminal' })}
        >
          <TerminalContent
            blogPosts={blogPosts}
            projects={projects}
            aboutContent={ABOUT_CONTENT}
            onClose={() => dispatch({ type: 'CLOSE_WINDOW', id: 'terminal' })}
          />
        </Window>
      )}

      {isOpen('calculator') && (
        <Window
          title="calculator"
          onClose={() => dispatch({ type: 'CLOSE_WINDOW', id: 'calculator' })}
          defaultWidth={500}
          defaultHeight={600}
          defaultX={200}
          defaultY={100}
          zIndex={getZIndex('calculator')}
          onFocus={() => dispatch({ type: 'FOCUS', id: 'calculator' })}
        >
          <Calculator />
        </Window>
      )}

      {windowState.blogPostSlug && currentBlogPost && (
        <Window
          title={currentBlogPost.title}
          onClose={() => dispatch({ type: 'CLOSE_BLOG_POST' })}
          defaultWidth={800}
          defaultHeight={600}
          defaultX={150}
          defaultY={80}
          blogSlug={windowState.blogPostSlug}
          zIndex={getZIndex(`blog-post-${windowState.blogPostSlug}`)}
          onFocus={() =>
            dispatch({
              type: 'FOCUS',
              id: `blog-post-${windowState.blogPostSlug}`,
            })
          }
        >
          <ViewTransition name={`blog-post-${windowState.blogPostSlug}`}>
            <iframe
              src={`/blog/${windowState.blogPostSlug}?embed=true`}
              className="w-full h-full border-0"
              title={currentBlogPost.title}
            />
          </ViewTransition>
        </Window>
      )}

      {/* Content windows - generated from config */}
      {CONTENT_WINDOW_CONFIGS.map((config) => (
        <ContentWindow
          key={config.id}
          config={config}
          isOpen={isOpen(config.id)}
          zIndex={getZIndex(config.id)}
          onClose={() => dispatch({ type: 'CLOSE_WINDOW', id: config.id })}
          onFocus={() => dispatch({ type: 'FOCUS', id: config.id })}
        >
          {renderWindowContent(config.id)}
        </ContentWindow>
      ))}
    </div>
  )
}

function DesktopIcon({ item }: { item: DesktopItem }) {
  const content = (
    <div
      className="flex flex-col items-center gap-2 3xl:gap-3 p-3 3xl:p-4 rounded-lg transition-colors duration-200 cursor-pointer relative"
      style={
        { '--hover-bg': 'rgba(255, 255, 255, 0.05)' } as React.CSSProperties
      }
    >
      <div
        className="h-12 3xl:h-16 flex items-center justify-center transition-colors 3xl:scale-125"
        style={{ color: 'var(--fg)', opacity: 0.8 }}
      >
        {item.icon}
      </div>
      <span
        className="text-xs 3xl:text-sm font-mono text-center truncate w-16 3xl:w-20"
        style={{ color: 'var(--fg)', opacity: 0.8 }}
      >
        {item.name}
      </span>
      {item.external && (
        <div className="absolute top-1 right-1 3xl:top-2 3xl:right-2">
          <ExternalLinkIcon />
        </div>
      )}
    </div>
  )

  if (item.href) {
    if (item.external) {
      return (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className={item.className}
        >
          {content}
        </a>
      )
    }

    // Internal link with progressive enhancement
    return (
      <Link href={item.href} onClick={item.onClick} className={item.className}>
        {content}
      </Link>
    )
  }

  return (
    <button
      onClick={item.onClick}
      aria-label={`Open ${item.name}`}
      className={item.className}
    >
      {content}
    </button>
  )
}
