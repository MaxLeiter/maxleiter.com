/**
 * The two hand-kept lists that are not content files: the labs (`/labs`,
 * shown as Custom Games) and the talks (`/talks`, shown as Broadcasts).
 */

export interface Lab {
  id: string
  name: string
  description: string
  url: string
}

export const LABS: Lab[] = [
  {
    id: 'md-viewer',
    name: 'md-viewer',
    description:
      'A minimal, native-feeling markdown editor and viewer for macOS',
    url: 'https://github.com/MaxLeiter/md-viewer',
  },
  {
    id: 'vcup',
    name: 'vcup',
    description: 'A dead-simple CLI for uploading files to Vercel Blob',
    url: 'https://github.com/MaxLeiter/vcup',
  },
  {
    id: 'HFSViewer',
    name: 'HFS Viewer',
    description: 'A Swift UI app for opening HFS disk images',
    url: '/blog/HFSViewer',
  },
  {
    id: 'rsc-llm-edge',
    name: 'RSC LLM on the Edge',
    description:
      'Streaming LLM responses with React Server Components at the edge',
    url: 'https://rsc-llm-on-the-edge.vercel.app/',
  },
  {
    id: 'pip-playground',
    name: 'v0 PIP Playground',
    description: 'Picture-in-picture mode playground',
    url: 'https://v0-pip-playground.vercel.app/',
  },
  {
    id: 'storybook-creator',
    name: 'AI Storybook Creator',
    description: "Generate illustrated children's ABC books with AI",
    url: 'https://v0-ai-story-book-creator.vercel.app/',
  },
  {
    id: 'gitkv',
    name: 'GitKV',
    description: 'A key-value store backed by a git repository',
    url: 'https://github.com/MaxLeiter/gitkv',
  },
  {
    id: 'gboy-ts',
    name: 'gboy.ts',
    description: 'A GameBoy emulator written in TypeScript',
    url: 'https://gboy-ts.vercel.app/',
  },
]

export interface Talk {
  id: string
  title: string
  channel: string
  duration: string
  videoId: string
}

export const TALKS: Talk[] = [
  {
    id: 'GMyg5ohTsVY',
    title: 'The Graphing Calculator Story',
    channel: 'GoogleTalksArchive',
    duration: '54:27',
    videoId: 'GMyg5ohTsVY',
  },
  {
    id: '6avJHaC3C2U',
    title: 'The Art of Code - Dylan Beattie',
    channel: 'NDC Conferences',
    duration: '1:01:49',
    videoId: '6avJHaC3C2U',
  },
  {
    id: 'gd5uJ7Nlvvo',
    title: 'Plain Text - Dylan Beattie - NDC Copenhagen 2022',
    channel: 'NDC Conferences',
    duration: '59:20',
    videoId: 'gd5uJ7Nlvvo',
  },
  {
    id: 'M3BM9TB-8yA',
    title: '10 Things I Regret About Node.js - Ryan Dahl - JSConf EU',
    channel: 'JSConf',
    duration: '26:42',
    videoId: 'M3BM9TB-8yA',
  },
  {
    id: '-C-JoyNuQJs',
    title: 'Douglas Crockford: The JSON Saga',
    channel: 'YUI Library',
    duration: '49:26',
    videoId: '-C-JoyNuQJs',
  },
  {
    id: 'JvBT4XBdoUE',
    title: 'The Soul of Erlang and Elixir - Sasa Juric - GOTO 2019',
    channel: 'GOTO Conferences',
    duration: '42:03',
    videoId: 'JvBT4XBdoUE',
  },
  {
    id: 'B1J2RMorJXM',
    title: 'Light Years Ahead | The 1969 Apollo Guidance Computer',
    channel: 'TNMoC',
    duration: '1:21:22',
    videoId: 'B1J2RMorJXM',
  },
  {
    id: 'XrlrbfGZo2k',
    title: '37C3 - Breaking "DRM" in Polish trains',
    channel: 'media.ccc.de',
    duration: '1:01:46',
    videoId: 'XrlrbfGZo2k',
  },
  {
    id: '8LGDM9exlZw',
    title: 'Lifting the Fog on Red Star OS - Florian Grunow, Niklaus Schiess',
    channel: 'media.ccc.de',
    duration: '56:52',
    videoId: '8LGDM9exlZw',
  },
  {
    id: 'NqKyHEJe9_w',
    title:
      "Yesterday's Computer of Tomorrow: The Xerox Alto | Smalltalk-76 Demo",
    channel: 'Computer History Museum',
    duration: '16:48',
    videoId: 'NqKyHEJe9_w',
  },
  {
    id: 'CtnX1EJHbC0',
    title: 'Internal NeXT video (1991)',
    channel: 'all about Steve Jobs.com',
    duration: '18:49',
    videoId: 'CtnX1EJHbC0',
  },
  {
    id: 'pq1XqP4-qOo',
    title: '2021: Year of the Linux Gaming Desktop - Andrew Kelley',
    channel: 'Zig SHOWTIME',
    duration: '42:38',
    videoId: 'pq1XqP4-qOo',
  },
  {
    id: 'eQgxFuw8f1U',
    title: 'Spatial programming without escape',
    channel: 'TodePond',
    duration: '35:54',
    videoId: 'eQgxFuw8f1U',
  },
  {
    id: '0mCsluv5FXA',
    title: 'TypeScript types can run DOOM',
    channel: 'Michigan TypeScript',
    duration: '6:59',
    videoId: '0mCsluv5FXA',
  },
  {
    id: 'P4Um97AUqp4',
    title: "'FTL: Faster Than Light' Postmortem: Designing Without a Pitch",
    channel: 'GDC',
    duration: '1:01:27',
    videoId: 'P4Um97AUqp4',
  },
  {
    id: '-VuXIgp9S7o',
    title: 'Twilio demo at the New York Tech Meetup',
    channel: 'John Britton',
    duration: '9:58',
    videoId: '-VuXIgp9S7o',
  },
  {
    id: 'fks3PBodyiE',
    title: 'How I Made A Laptop From Scratch',
    channel: 'Byran',
    duration: '23:31',
    videoId: 'fks3PBodyiE',
  },
  {
    id: 'wo84LFzx5nI',
    title:
      'The Big OOPs: Anatomy of a Thirty-five-year Mistake - Casey Muratori',
    channel: 'Better Software Conference',
    duration: '2:27:34',
    videoId: 'wo84LFzx5nI',
  },
]
