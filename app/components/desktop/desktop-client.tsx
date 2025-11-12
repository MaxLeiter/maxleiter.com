'use client'

import type React from 'react'
import { useState, useEffect, startTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Window } from '@components/desktop/window'
import { TerminalContent } from '@components/desktop/terminal-content'
import { WidgetRecentPosts } from '@components/desktop/widget-recent-posts'
import { WidgetTopProjects } from '@components/desktop/widget-top-projects'
import {
  AboutContentClient,
  ProjectsContentClient,
  BlogListContentClient,
} from '@components/page-content-client'
import type { BlogPost, Project } from '@lib/portfolio-data'
import { ABOUT_CONTENT } from '@lib/about-content'

const Calculator = dynamic(
  () =>
    import('@components/desktop/calculator').then((m) => ({
      default: m.Calculator,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-white/60 font-mono">Loading calculator...</div>
    ),
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

function ExternalLinkIcon() {
  return (
    <svg
      height="16"
      width="16"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      className="text-white/30 size-3"
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

interface DesktopClientProps {
  blogPosts: BlogPost[]
  projects: Project[]
}

export function DesktopClient({ blogPosts, projects }: DesktopClientProps) {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [openTerminal, setOpenTerminal] = useState(false)
  const [openCalculator, setOpenCalculator] = useState(false)
  const [openBlogPost, setOpenBlogPost] = useState<string | null>(null)
  const [openAbout, setOpenAbout] = useState(false)
  const [openProjects, setOpenProjects] = useState(false)
  const [openBlogList, setOpenBlogList] = useState(false)
  const [focusedWindow, setFocusedWindow] = useState<string | null>(null)
  const [windowZIndexes, setWindowZIndexes] = useState<Record<string, number>>(
    {},
  )
  const [nextZIndex, setNextZIndex] = useState(50)
  const [preloadedPost, setPreloadedPost] = useState<string | null>(null)

  const currentBlogPost = openBlogPost
    ? blogPosts.find((post) => post.slug === openBlogPost)
    : null

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const bringToFront = (windowId: string) => {
    setFocusedWindow(windowId)
    setWindowZIndexes((prev) => ({
      ...prev,
      [windowId]: nextZIndex,
    }))
    setNextZIndex((prev) => prev + 1)
  }

  const handlePostClick = (slug: string) => {
    if (isMobile) {
      startTransition(() => {
        router.push(`/blog/${slug}`)
      })
    } else {
      setOpenBlogPost(slug)
      setPreloadedPost(null) // Clear preload when opening
    }
  }

  const handlePostHover = (slug: string) => {
    if (!isMobile && !openBlogPost) {
      setPreloadedPost(slug)
    }
  }

  const handlePostHoverEnd = () => {
    // Keep the preloaded iframe for a bit in case they click
    setTimeout(() => {
      setPreloadedPost(null)
    }, 1000)
  }

  // Bring new windows to front automatically
  useEffect(() => {
    if (openTerminal) bringToFront('terminal')
  }, [openTerminal])

  useEffect(() => {
    if (openCalculator) bringToFront('calculator')
  }, [openCalculator])

  useEffect(() => {
    if (openBlogPost) bringToFront(`blog-post-${openBlogPost}`)
  }, [openBlogPost])

  useEffect(() => {
    if (openAbout) bringToFront('about')
  }, [openAbout])

  useEffect(() => {
    if (openProjects) bringToFront('projects')
  }, [openProjects])

  useEffect(() => {
    if (openBlogList) bringToFront('blog-list')
  }, [openBlogList])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault()
        setOpenTerminal(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const desktopItems: DesktopItem[] = [
    // Folders first
    {
      id: 'blog',
      name: 'blog',
      type: 'folder',
      icon: <FolderIconDefault />,
      href: '/blog',
      onClick: (e) => {
        e.preventDefault()
        if (isMobile) {
          startTransition(() => {
            router.push('/blog')
          })
        } else {
          setOpenBlogList(true)
        }
      },
    },
    {
      id: 'projects',
      name: 'projects',
      type: 'folder',
      icon: <FolderIconDefault />,
      href: '/projects',
      onClick: (e) => {
        e.preventDefault()
        if (isMobile) {
          startTransition(() => {
            router.push('/projects')
          })
        } else {
          setOpenProjects(true)
        }
      },
    },
    {
      id: 'about',
      name: 'about',
      type: 'folder',
      icon: <FolderIconDefault />,
      href: '/about',
      onClick: (e) => {
        e.preventDefault()
        if (isMobile) {
          startTransition(() => {
            router.push('/about')
          })
        } else {
          setOpenAbout(true)
        }
      },
    },
    // Local apps
    {
      id: 'terminal',
      name: 'terminal',
      type: 'app',
      icon: <TerminalIconDefault />,
      onClick: () => setOpenTerminal(true),
    },
    {
      id: 'calculator',
      name: 'calculator',
      type: 'app',
      icon: <CalculatorIcon />,
      onClick: () => setOpenCalculator(true),
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
      href: 'https://twitter.com/max_leiter',
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
    },
  ]

  return (
    <div className="h-screen bg-black text-white/90 overflow-hidden flex flex-col">
      <div className="h-10 bg-white/5 border-b border-white/10 flex items-center px-4 gap-4 text-xs font-mono sticky top-0 z-10">
        <span className="text-white/50">~/</span>
        <span className="ml-auto text-white/40">
          {new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      <div className="flex-1 p-8 overflow-auto relative">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-shrink-0">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 gap-8 w-fit">
              {desktopItems.map((item) => (
                <DesktopIcon key={item.id} item={item} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-6xl items-start">
            <WidgetRecentPosts
              posts={blogPosts}
              limit={5}
              onPostClick={handlePostClick}
              onPostHover={handlePostHover}
              onPostHoverEnd={handlePostHoverEnd}
            />
            <WidgetTopProjects projects={projects} limit={5} />
          </div>
        </div>
      </div>

      {/* Hidden preload iframe */}
      {preloadedPost && (
        <iframe
          src={`/blog/${preloadedPost}?embed=true`}
          className="hidden"
          aria-hidden="true"
        />
      )}

      {openTerminal && (
        <Window
          title="terminal"
          onClose={() => setOpenTerminal(false)}
          defaultWidth={600}
          defaultHeight={400}
          zIndex={windowZIndexes['terminal'] || 50}
          onFocus={() => bringToFront('terminal')}
        >
          <TerminalContent
            blogPosts={blogPosts}
            projects={projects}
            aboutContent={ABOUT_CONTENT}
            onClose={() => setOpenTerminal(false)}
          />
        </Window>
      )}

      {openCalculator && (
        <Window
          title="calculator"
          onClose={() => setOpenCalculator(false)}
          defaultWidth={500}
          defaultHeight={600}
          defaultX={200}
          defaultY={100}
          zIndex={windowZIndexes['calculator'] || 50}
          onFocus={() => bringToFront('calculator')}
        >
          <Calculator />
        </Window>
      )}

      {openBlogPost && currentBlogPost && (
        <Window
          title={currentBlogPost.title}
          onClose={() => setOpenBlogPost(null)}
          defaultWidth={800}
          defaultHeight={600}
          defaultX={150}
          defaultY={80}
          blogSlug={openBlogPost}
          zIndex={windowZIndexes[`blog-post-${openBlogPost}`] || 50}
          onFocus={() => bringToFront(`blog-post-${openBlogPost}`)}
        >
          <iframe
            src={`/blog/${openBlogPost}?embed=true`}
            className="w-full h-full border-0"
            title={currentBlogPost.title}
          />
        </Window>
      )}

      {openAbout && (
        <Window
          title="about"
          onClose={() => setOpenAbout(false)}
          defaultWidth={800}
          defaultHeight={600}
          defaultX={200}
          defaultY={100}
          pageType="about"
          zIndex={windowZIndexes['about'] || 50}
          onFocus={() => bringToFront('about')}
        >
          <div className="overflow-auto h-full p-6">
            <AboutContentClient />
          </div>
        </Window>
      )}

      {openProjects && (
        <Window
          title="projects"
          onClose={() => setOpenProjects(false)}
          defaultWidth={800}
          defaultHeight={600}
          defaultX={250}
          defaultY={120}
          pageType="projects"
          zIndex={windowZIndexes['projects'] || 50}
          onFocus={() => bringToFront('projects')}
        >
          <div className="overflow-auto h-full p-6">
            <ProjectsContentClient projects={projects} />
          </div>
        </Window>
      )}

      {openBlogList && (
        <Window
          title="blog"
          onClose={() => setOpenBlogList(false)}
          defaultWidth={800}
          defaultHeight={600}
          defaultX={300}
          defaultY={140}
          pageType="blog"
          zIndex={windowZIndexes['blog-list'] || 50}
          onFocus={() => bringToFront('blog-list')}
        >
          <div className="overflow-auto h-full p-6">
            <BlogListContentClient
              posts={blogPosts}
              onPostClick={handlePostClick}
              onPostHover={handlePostHover}
              onPostHoverEnd={handlePostHoverEnd}
            />
          </div>
        </Window>
      )}
    </div>
  )
}

function DesktopIcon({ item }: { item: DesktopItem }) {
  const content = (
    <div className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-white/5 transition-colors duration-200 cursor-pointer relative">
      <div className="h-12 flex items-center justify-center text-white/80 hover:text-white/90 transition-colors">
        {item.icon}
      </div>
      <span className="text-xs font-mono text-white/80 text-center truncate w-16">
        {item.name}
      </span>
      {item.external && (
        <div className="absolute top-1 right-1">
          <ExternalLinkIcon />
        </div>
      )}
    </div>
  )

  if (item.href) {
    if (item.external) {
      return (
        <a href={item.href} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      )
    }

    // Internal link with progressive enhancement
    return (
      <Link href={item.href} onClick={item.onClick}>
        {content}
      </Link>
    )
  }

  return (
    <button onClick={item.onClick} aria-label={`Open ${item.name}`}>
      {content}
    </button>
  )
}
