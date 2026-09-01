import type { BlogPost, Project } from '@lib/blog-post'
import { Island } from '../../framework/islands'
import { DesktopChrome } from '../islands/desktop/chrome'
import type { DesktopPost, DesktopProject } from '../islands/desktop/data'
import { CommandPalette } from './shell'

/**
 * The desktop homepage, server-rendered.
 *
 * The markup is `DesktopChrome`, which the `desktop` island renders again as
 * its first hydration pass; sharing the component is what keeps the two trees
 * identical. Every folder is a real anchor to its page, so the homepage works
 * with JavaScript disabled -- today those are dead `onClick` handlers.
 *
 * The clock script and the command palette sit outside the island wrapper.
 * Preact would otherwise own that DOM, and the palette is a separate island
 * that the runtime unhides and mounts on its own.
 */

/**
 * Writes the clock before first paint so the menubar does not flash empty.
 * Replaces the `window.__INITIAL_TIME__` handshake, which existed only to seed
 * a `useState` without a hydration mismatch; the island now seeds from the
 * element's own text instead.
 */
const CLOCK_SCRIPT =
  `var c=document.getElementById('menubar-clock');` +
  `if(c)c.textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})`

/**
 * Only the fields the homepage renders. `excerpt` and `content` are dead weight
 * here, and island props are serialized into the HTML alongside the markup that
 * already carries them.
 */
function toDesktopPost(post: BlogPost): DesktopPost {
  return {
    slug: post.slug,
    title: post.title,
    date: post.date,
    type: post.type,
    ...(post.href ? { href: post.href } : null),
    ...(post.isThirdParty ? { isThirdParty: true } : null),
  }
}

function toDesktopProject(project: Project): DesktopProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    link: project.link,
    tech: project.tech,
  }
}

export interface HomePageProps {
  posts: BlogPost[]
  projects: Project[]
}

export function HomePage({ posts, projects }: HomePageProps) {
  const desktopPosts = posts.map(toDesktopPost)
  const desktopProjects = projects.map(toDesktopProject)

  return (
    <>
      <Island
        name="desktop"
        on="load"
        props={{ posts: desktopPosts, projects: desktopProjects }}
      >
        <DesktopChrome posts={desktopPosts} projects={desktopProjects} />
      </Island>
      <script dangerouslySetInnerHTML={{ __html: CLOCK_SCRIPT }} />
      <CommandPalette />
    </>
  )
}
