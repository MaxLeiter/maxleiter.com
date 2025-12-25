import { ListCard } from '@components/desktop/list-card'

export interface Talk {
  id: string
  title: string
  channel: string
  duration: string
  videoId: string
}

const TALKS: Talk[] = [
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
    title: "Yesterday's Computer of Tomorrow: The Xerox Alto | Smalltalk-76 Demo",
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
    title: 'The Big OOPs: Anatomy of a Thirty-five-year Mistake - Casey Muratori',
    channel: 'Better Software Conference',
    duration: '2:27:34',
    videoId: 'wo84LFzx5nI',
  },
]

export function TalksContent() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-mono font-bold mb-8 text-[var(--fg)]">talks/</h1>

      <ul className="space-y-2">
        {TALKS.map((talk) => (
          <ListCard
            key={talk.id}
            href={`https://www.youtube.com/watch?v=${talk.videoId}`}
            title={talk.title}
            description={`${talk.channel} · ${talk.duration}`}
            external
            icon={false}
          />
        ))}
      </ul>
    </div>
  )
}
