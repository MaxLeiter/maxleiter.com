import { DesktopClient } from '@components/desktop/desktop-client'
import {
  getBlogPosts,
  getProjectsData,
  ABOUT_CONTENT,
} from '@lib/portfolio-data'
import getNotes from '@lib/get-notes'

function ClockInitScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(${(() => {
          const clock = document.getElementById('menubar-clock')
          if (!clock) {
            return
          }

          const time = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })

          window.__INITIAL_TIME__ = time

          clock.textContent = time
        }).toString()})()`,
      }}
    />
  )
}

export default async function Desktop() {
  const [blogPosts, projects, notes] = await Promise.all([
    getBlogPosts({ includeContent: false }),
    getProjectsData(),
    getNotes(),
  ])

  return (
    <>
      <DesktopClient blogPosts={blogPosts} projects={projects} notes={notes} />
      <ClockInitScript />
    </>
  )
}
