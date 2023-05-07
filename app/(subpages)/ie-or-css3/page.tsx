import supabase from '@lib/supabase/private'
import Link from '@components/link'
import { UselessButton } from '@components/ie-or-css'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'IE or CSS3?',
  description: 'Test your knowledge on CSS3 and Internet Explorer.',
  alternates: {
    canonical: 'https://maxleiter.com/ie-or-css3',
  },
}

const fetchQuestions = async () => {
  const { data, error } = await supabase
    .from('Questions')
    .select('id,question,isCSS')

  if (error || !data) {
    console.error(error)
    return []
  }

  const randomized = data.sort(() => Math.random() - 0.5)
  return randomized
}

const IeQuiz = async () => {
  const questions = (await fetchQuestions()) as {
    id: string
    question: string
    isCSS: boolean
  }[]

  return (
    <>
      <p>
        Welcome! This quiz is inspired by the{' '}
        <Link href="https://youtu.be/Ck-e3hd3pKw?t=22032" external>
          syntax.fm live session
        </Link>{' '}
        at Reactathon 2022. You can test your knowledge of new CSS features by
        voting below, and your results will be saved to a database and updated
        in realtime for all other visitors using Supabase. You can view the
        source{' '}
        <Link external href="https://github.com/MaxLeiter/maxleiter.com">
          here
        </Link>
        .
      </p>
      <p>
        If you think the feature displayed is new, vote for CSS by clicking{' '}
        <UselessButton text={'CSS3'} />
      </p>
      <p>
        If you think the feature is Internet Explorer specific or was used to
        target IE, click <UselessButton text={'IE'} />
      </p>
      <h3>
        This page is currently on pause until I migrate to the latest supabase
        Supabase.
      </h3>
    </>
  )
}

export default IeQuiz
