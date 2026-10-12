import { AboutContent } from '@components/content/about-content'
import { LabsContent } from '@components/content/labs-content'
import { TalksContent } from '@components/content/talks-content'
import { ProjectsContent } from '@components/content/projects-content'
import { BlogListContent } from '@components/content/blog-list-content'
import { NotesContent } from '@components/content/notes-content'
import { BladePage, SidePanel } from '@components/blades/blade-page'
import { profileCardHTML, type ProfileCard } from '@lib/blades/items'
import { bladeById, type BladeId } from '@lib/blades/theme'
import type { ListEntry, ProjectCard } from '@lib/types'
import type { Note } from '@framework/shared/types'
import { transitionName } from '@framework/shared/transitions'

/**
 * The six list-and-prose routes, each one blade open in its section's colour
 * (see `BladePage`). About, labs and talks are the system blade's pages.
 *
 * All six take `toolbar` so the build can emit an `/embed` variant with no
 * chrome; it maps onto the blade page's `chrome`.
 */

export interface ContentPageProps {
  toolbar?: boolean
}

function page(blade: BladeId, name: string) {
  return {
    blade: bladeById(blade),
    title: name,
    vtName: transitionName('page', name),
  }
}

export function AboutPage({
  toolbar,
  card,
}: ContentPageProps & { card: ProfileCard }) {
  return (
    <BladePage
      {...page('system', 'about')}
      chrome={toolbar}
      side={
        <div
          dangerouslySetInnerHTML={{ __html: profileCardHTML(card, 'ab') }}
        />
      }
    >
      <AboutContent />
    </BladePage>
  )
}

export function LabsPage({ toolbar }: ContentPageProps) {
  return (
    <BladePage
      {...page('system', 'labs')}
      chrome={toolbar}
      side={
        <SidePanel kicker="Labs" title="Experiments and playthings">
          <p>
            Small tools and demos: some finished, some abandoned, all of them
            fun to build. Most open somewhere else.
          </p>
        </SidePanel>
      }
    >
      <LabsContent />
    </BladePage>
  )
}

export function TalksPage({ toolbar }: ContentPageProps) {
  return (
    <BladePage
      {...page('system', 'talks')}
      chrome={toolbar}
      side={
        <SidePanel kicker="Talks" title="Talks I like.">
          <p>
            Tech talks I enjoy from around the web. Every one opens on YouTube.
          </p>
        </SidePanel>
      }
    >
      <TalksContent />
    </BladePage>
  )
}

export function ProjectsPage({
  projects,
  toolbar,
}: ContentPageProps & { projects: ProjectCard[] }) {
  return (
    <BladePage
      {...page('projects', 'projects')}
      count={`${projects.length} projects`}
      chrome={toolbar}
    >
      <ProjectsContent projects={projects} />
    </BladePage>
  )
}

export function BlogIndexPage({
  posts,
  toolbar,
}: ContentPageProps & { posts: ListEntry[] }) {
  return (
    <BladePage
      {...page('blog', 'blog')}
      count={`${posts.length} entries`}
      chrome={toolbar}
      side={
        <SidePanel kicker="Subscribe" title="Every post, in your reader">
          <p>
            Posts, notes and articles on the Vercel blog, newest first. The{' '}
            <a href="/feed.xml">RSS feed</a> has all of them.
          </p>
        </SidePanel>
      }
    >
      <BlogListContent posts={posts} />
    </BladePage>
  )
}

export function NotesIndexPage({
  notes,
  toolbar,
}: ContentPageProps & { notes: Note[] }) {
  return (
    <BladePage
      {...page('notes', 'notes')}
      count={`${notes.length} notes`}
      chrome={toolbar}
      side={
        <SidePanel kicker="Tip" title="The short, practical stuff">
          <p>
            Scripts and fixes worth finding again. Short-form thoughts, code
            snippets, and tips.
          </p>
        </SidePanel>
      }
    >
      <NotesContent notes={notes} />
    </BladePage>
  )
}

export function NotFoundPage() {
  return (
    <BladePage {...page('system', '404')}>
      <div className="pb-prose">
        <p>
          That page does not exist. <a href="/">Go home</a>.
        </p>
      </div>
    </BladePage>
  )
}
