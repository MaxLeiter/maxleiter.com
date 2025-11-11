"use client"

import { ViewTransitionWrapper } from './view-transition-wrapper'
import { useRouter } from 'next/navigation'
import { startTransition } from 'react'
import type { BlogPost, Project } from '@lib/portfolio-data'

interface AboutContentProps {
  content: any
}

export function AboutContentClient({ content }: AboutContentProps) {
  const router = useRouter()

  return (
    <ViewTransitionWrapper name="page-about">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-mono font-bold mb-8 text-white/90">about/</h1>

        <div className="space-y-6 text-white/70 leading-relaxed">
          <section>
            <h2 className="text-xl font-mono font-bold mb-3 text-white/90">Max Leiter</h2>
            <p className="mb-4">{content.bio.content}</p>
          </section>
        </div>

        <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-lg">
          <button
            onClick={() => {
              startTransition(() => {
                router.push('/about')
              })
            }}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white/90 px-4 py-2 rounded-lg font-mono text-sm transition-colors"
          >
            View Full About Page →
          </button>
        </div>
      </div>
    </ViewTransitionWrapper>
  )
}

interface ProjectsContentProps {
  projects: Project[]
}

export function ProjectsContentClient({ projects }: ProjectsContentProps) {
  const router = useRouter()
  const previewProjects = projects.slice(0, 5)

  return (
    <ViewTransitionWrapper name="page-projects">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-mono font-bold mb-8 text-white/90">projects/</h1>

        <div className="space-y-3 mb-8">
          {previewProjects.map((project) => (
            <div key={project.id} className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <h3 className="text-lg font-mono font-bold text-white/90 mb-2">{project.name}</h3>
              <p className="text-white/70 text-sm">{project.description}</p>
            </div>
          ))}
        </div>

        <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
          <button
            onClick={() => router.push('/projects')}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white/90 px-4 py-2 rounded-lg font-mono text-sm transition-colors"
          >
            View All Projects →
          </button>
        </div>
      </div>
    </ViewTransitionWrapper>
  )
}

interface BlogListContentProps {
  posts: BlogPost[]
}

export function BlogListContentClient({ posts }: BlogListContentProps) {
  const router = useRouter()
  const previewPosts = posts.slice(0, 5)

  return (
    <ViewTransitionWrapper name="page-blog">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-mono font-bold mb-8 text-white/90">blog/</h1>

        <div className="space-y-3 mb-8">
          {previewPosts.map((post) => (
            <button
              key={post.slug}
              onClick={() => router.push(`/blog/${post.slug}`)}
              className="w-full text-left p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
            >
              <h3 className="text-lg font-mono font-bold text-white/90 mb-1">{post.title}</h3>
              <p className="text-white/50 text-sm mb-2">{post.date}</p>
              <p className="text-white/70 text-sm">{post.excerpt}</p>
            </button>
          ))}
        </div>

        <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
          <button
            onClick={() => router.push('/blog')}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white/90 px-4 py-2 rounded-lg font-mono text-sm transition-colors"
          >
            View All Posts →
          </button>
        </div>
      </div>
    </ViewTransitionWrapper>
  )
}
