import Talks from '@components/talks'
import getTalks from '@lib/get-talks'
import { experimental_use as use } from 'react'

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

const TalksPage = () => {
  const talks = use(fetchTalks())
  return <Talks talks={talks} />
}

export default TalksPage
