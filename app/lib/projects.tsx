import type { Project } from './types'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'

const Projects: Project[] = [
  {
    title: 'X11 on iOS',
    description: 'Patched, compiled, and packaged X11 for iOS devices instead of studying for finals.',
    href: '/blog/X11',
    role: 'Creator',
    years: ['2020'],
    type: 'project',
  },
  {
    title: 'Drift',
    description:
      'A self-hostable and open-source alternative to GitHub Gist and Pastebin. Made as a testbed for the Next.js App Router and React Server Components.',
    href: 'https://github.com/maxleiter/drift',
    role: 'Creator',
    years: ['2022', '2023'],
    type: 'project',
  },
  {
    title: 'The Lounge',
    description:
      'Self-hosted, always-on IRC client built with Node.js, Vue, and other web technologies.',
    href: 'https://github.com/thelounge/thelounge',
    role: 'Maintainer',
    years: ['2016', '2024'],
    type: 'project',
  },
  {
    title: 'SortableJS-vue3',
    description: "A TypeScript wrapper for SortableJS built for Vue 3.",
    href: 'https://github.com/maxleiter/sortablejs-vue3/',
    role: 'Creator',
    years: ['2022', 'present'],
    type: 'project',
  },
  {
    title: 'KnightOS',
    description:
      'Open-source unix-like operating system for z80-based calculators written entirely in z80 asm. I wrote a significant portion of the libc and contribued to system libraries.',
    href: 'https://github.com/knightos/knightos',
    role: 'Maintainer',
    years: ['2017', 'present'],
    type: 'project',
  },
  {
    title: 'MSHW0184 driver for Linux kernel',
    description:
      'I finally found an excuse to contribute to the Linux kernel',
    href: 'blog/MSHW0184',
    role: 'Creator',
    years: ['2021'],
    type: 'project',
  },
  {
    title: 'jsonTree',
    description:
      'My first open-source project',
    href: 'https://github.com/maxleiter/jsontree',
    role: 'Creator',
    years: ['2015'],
    type: 'project',
  },
  {
    title: 'easyarty.com',
    description:
      'A tiny tool I made for a video game I like but it now gets 250,000+ visitors a year',
    href: 'https://easyarty.com',
    role: 'Creator',
    years: ['2021'],
    type: 'project',
  },
  {
    title: 'v0',
    description: 'I co-created v0.app with with Shu Ding, Jared Palmer, and shadcn while on the AI team at Vercel.',
    href: 'https://v0.app',
    role: 'Developer',
    years: ['2023', 'present'],
    type: 'project',
  },
  {
    title: 'AI SDK',
    description: 'I worked with Shu Ding and later Lars Grammel on the first three versions of the Vercel AI SDK. I implemented the Stream Data protocol for multiplexing streams to the client, added server-side function calling support, and generally helped maintain the library.',
    href: 'https://github.com/vercel/ai',
    role: 'Developer',
    years: ['2023', '2024'],
    type: 'project',
  },
  {
    title: 'Accuracy of computer-assisted vertical cup-to-disk ratio grading for glaucoma screening',
    description: 'I had the opportunity to work with the great Proctor Foundation at UCSF to write a Java program for helping medical practitioners estimtae vertical cup to disk ratios from retinal images.',
    href: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0220362',
    role: '',
    type: 'project',
    years: ['2017'],
  }
]

export const getProjects = cache(async (): Promise<Project[]> => {
  if (process.env.NODE_ENV === 'production' && !process.env.GITHUB_TOKEN) {
    throw new Error(
      'No GITHUB_TOKEN provided. Generate a personal use token on GitHub.',
    )
  }

  const withStars = unstable_cache(
    async () =>
      await Promise.all(
        Projects.map(async (proj) => {
          const split = proj.href?.split('/')
          if (!split) {
            return proj
          }

          //[ 'https:', '', 'github.com', 'maxleiter', 'jsontree' ]
          if (split[2] === 'github.com') {
            const user = split[3]
            const repo = split[4]
            const fetchUrl =
              process.env.NODE_ENV === 'production'
                ? `https://api.github.com/repos/${user}/${repo}`
                : 'http://localhost:3000/mock-stars-response.json'
            const { stargazers_count, message } = await (
              await fetch(fetchUrl, {
                headers: {
                  Authorization: process.env.GITHUB_TOKEN ?? '',
                },
                cache: 'force-cache',
              })
            ).json()

            // rate limited
            if (!stargazers_count && message) {
              console.warn(`Rate limited or error: ${message}`)
              return proj
            }

            return {
              ...proj,
              stars: stargazers_count,
            }
          }
          return proj
        }),
      ),
    ['projects'],
    {
      revalidate: 60 * 60 * 24, // 24 hours
    },
  )

  return await withStars()
})
