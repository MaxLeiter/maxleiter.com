import Talks from '@components/talks'
import getTalks from '@lib/get-talks'

export type Talk = {
  title: string
  description: string
  url: string
  date: string
  id: string
  thumbnail: string
  myDescription: string
  channel: string
  views?: number
  likes?: number
  tags: string[]
  lengthSeconds: number
}

const fetchTalks = async () => {
  const talks = await getTalks()
  return talks
}

const TalksPage = async () => {
  const talks = await fetchTalks()
  return <Talks talks={talks} />
}

export const dynamic = 'force-static'

export default TalksPage
