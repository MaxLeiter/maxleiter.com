import Talks from '@components/talks'
import getTalks from '@lib/get-talks'
import type { GetStaticProps, InferGetStaticPropsType, NextPage } from 'next'

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

type TalkPage = NextPage<InferGetStaticPropsType<typeof getStaticProps>>

const TalksPage: TalkPage = ({ talks }) => {
  return <Talks talks={talks} />
}

export default TalksPage

export const getStaticProps: GetStaticProps<{
  talks: Array<Talk>
}> = async () => {
  const talks = await getTalks()
  return {
    props: {
      talks,
    },
  }
}
