import { DesktopClient } from '@components/desktop/desktop-client'
import {
  getBlogPosts,
  getProjectsData,
  ABOUT_CONTENT,
} from '@lib/portfolio-data'

export default async function Desktop() {
  const [blogPosts, projects] = await Promise.all([
    getBlogPosts({ includeContent: false }),
    getProjectsData(),
  ])

  return (
    <DesktopClient
      blogPosts={blogPosts}
      projects={projects}
    />
  )
}
