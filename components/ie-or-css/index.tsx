'client'

import { useEffect, useState } from 'react'
import supabase from '@lib/supabase/public'
import Question from './question'
import styles from './ie-or-css.module.css'
import Link from '@components/link'
import Button from '@components/button'

export type QuestionType = {
  id: string
  question: string
  isCSS: boolean
}

export type QuestionWithVotes = QuestionType & {
  ie: number
  css: number
}

export type IEQuizProps = {
  questions: QuestionType[]
}

const UselessButton = ({ text }: { text: string }) => (
  <Button
    style={{ display: 'inline-block', width: '100px', margin: 2 }}
    onClick={() => alert("That's the idea!")}
  >
    {text}
  </Button>
)

const IeOrCss = ({ questions }: IEQuizProps) => {
  const [questionsWithVotes, setQuestionsWithVotes] = useState<
    QuestionWithVotes[]
  >([])

  // update questionsWithVotes on changes
  useEffect(() => {
    supabase
      .from('Votes')
      .on('*', (payload) => {
        const newObj = payload.new
        setQuestionsWithVotes((questionsWithVotes) => {
          const newQuestions = questionsWithVotes.map((q) => {
            if (q.id === newObj.id) {
              return {
                ...q,
                ...newObj,
              }
            }
            return q
          })

          return newQuestions
        })
      })
      .subscribe()

    return () => {
      supabase.removeAllSubscriptions()
    }
  }, [])

  // initially fetch votes
  useEffect(() => {
    const fetchVotes = async () => {
      const { data, error } = await supabase.from('Votes').select('id,ie,css')

      if (error || !data) {
        console.error(error)
        return
      }

      const newQuestions = questions.map((q) => {
        const vote = data.find((v) => v.id === q.id)
        if (vote) {
          return {
            ...q,
            ...vote,
          }
        }
        return q
      })

      setQuestionsWithVotes(newQuestions)
    }

    fetchVotes()
  }, [questions])

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
        <Link
          external
          href="https://github.com/MaxLeiter/maxleiter.com/blob/master/pages/ie-or-css3.tsx"
        >
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
      <p>Good luck!</p>
      <ul className={styles.list}>
        {questionsWithVotes.map((question, index) => (
          <Question question={question} key={index} />
        ))}
      </ul>
    </>
  )
}

export default IeOrCss
