import type { Project } from './types'
import { cache } from 'react'
import { unstable_cache } from 'next/cache';

const Projects: Project[] = [
  {
    title: 'X11 on iOS',
    description: 'Patched, compiled, and packaged X11 for iOS devices.',
    href: '/blog/X11',
    role: 'Creator',
    years: ['2020'],
    type: 'project'
  },
  {
    title: 'Drift',
    description:
      'A self-hostable and open-source alternative to GitHub Gist and Pastebin.',
    href: 'https://github.com/maxleiter/drift',
    role: 'Creator',
    years: ['2022', 'present'],
    type: 'project'
  },
  {
    title: 'The Lounge',
    description:
      'Self-hosted, always-on IRC client built with Node.js, Vue, and other web technologies.',
    href: 'https://github.com/thelounge/thelounge',
    role: 'Maintainer',
    years: ['2016', 'present'],
    type: 'project'

  },
  {
    title: 'SortableJS-vue3',
    description: "A TypeScript wrapper for SortableJS that's built for Vue 3.",
    href: 'https://github.com/maxleiter/sortablejs-vue3/',
    role: 'Creator',
    years: ['2022 - present'], type: 'project'

  },
  {
    title: 'KnightOS',
    description:
      'Open-source unix-like operating system for z80-based calculators written entirely in z80 asm.',
    href: 'https://github.com/knightos/knightos',
    role: 'Maintainer',
    years: ['2017', 'present'], type: 'project'

  },
  {
    title: 'thelounge-bot',
    description: "A helper IRC bot for The Lounge's IRC channel.",
    href: 'https://github.com/thelounge/thelounge-bot',
    role: 'Creator',
    years: ['2016', '2021'], type: 'project'

  },
  {
    title: 'MSHW0184 driver for Linux kernel',
    description:
      'Support for the MSHW0184 device (used in Microsoft Surfaces) in the Linux kernel.',
    href: 'blog/MSHW0184',
    role: 'Creator',
    years: ['2021'], type: 'project'

  },
  {
    title: 'jsonTree',
    description:
      'A 2kb JavaScript library for generating HTML trees from JSON.',
    href: 'https://github.com/maxleiter/jsontree',
    role: 'Creator',
    years: ['2015'], type: 'project'

  },
  {
    title: 'Annie',
    description:
      "Annie is the official app for the University of Southern California's Annenberg Media Center. Annie placed second place in the AEJMC Best of Digital Competition in August 2020.",
    href: 'https://www.uscannenbergmedia.com',
    role: 'Past developer',
    years: ['2019', '2020'], type: 'project'

  },
  {
    title: 'easyarty.com',
    description:
      'A web app for calculating artillery distances in the video game Hell Let Loose.',
    href: 'https://easyarty.com',
    role: 'Creator',
    years: ['2021'], type: 'project'

  },
  {
    title: 'Vercel Raycast',
    description: 'A Raycast extension for managing Vercel via its REST API.',
    href: 'https://github.com/MaxLeiter/vercel-raycast',
    role: 'Creator',
    years: ['2022'], type: 'project'

  },
  {
    title: 'gitkv',
    description: 'A simple key-value store using Git as the backend.',
    href: 'https://github.com/maxleiter/gitkv',
    role: 'Creator',
    years: ['2024'], type: 'project'

  }
]

export const getProjects = cache(async (): Promise<Project[]> => {
  if (process.env.NODE_ENV === 'production' && !process.env.GITHUB_TOKEN) {
    throw new Error(
      'No GITHUB_TOKEN provided. Generate a personal use token on GitHub.'
    )
  }

  const withStars = unstable_cache(async () => await Promise.all(
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
            cache: 'force-cache'
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
    })
  ),
    ['projects'],
    {
      revalidate: 60 * 60 * 24 // 24 hours
    }
  )

  return await withStars()
})
