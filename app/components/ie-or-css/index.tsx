'use client'

import { useEffect, useState } from 'react'
import supabase from '@lib/supabase/public'
import Question from './question'
import styles from './ie-or-css.module.css'
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

export const UselessButton = ({ text }: { text: string }) => (
  <Button
    style={{ display: 'inline-block' }}
    onClick={() => alert("That's the idea!")}
  >
    {text}
  </Button>
)

const IeOrCss = ({ questions }: IEQuizProps) => {
  const [questionsWithVotes] = useState<QuestionWithVotes[]>([])

  console.log('questions', questions)

  useEffect(() => {
    // supabase.channel('votes').on('*', (payload) => {
    //     const newObj = payload.new
    //     setQuestionsWithVotes((questionsWithVotes) => {
    //       const newQuestions = questionsWithVotes.map((q) => {
    //         if (q.id === newObj.id) {
    //           return {
    //             ...q,
    //             ...newObj,
    //           }
    //         }
    //         return q
    //       })

    //       return newQuestions
    //     })
    //   })
    //   .subscribe()

    return () => {
      supabase.removeAllChannels()
    }
  }, [])

  // initially fetch votes
  useEffect(() => {
    const fetchVotes = async () => {
      const { data, error } = await supabase.from('Votes').select('id,ie,css')

      if (error || !data) {
        console.error(error)
      }

      // const newQuestions = questions.map((q) => {
      //   const vote = data.find((v) => v.id === q.id)
      //   if (vote) {
      //     return {
      //       ...q,
      //       ...vote,
      //     }
      //   }
      //   return q
      // })

      // setQuestionsWithVotes(newQuestions)
    }

    fetchVotes()
  }, [questions])

  return (
    <>
      <p>Good luck!</p>
      <ul className={styles.list}>
        {questionsWithVotes.map((question, index) => (
          <Question question={question} key={index}>
            {question.question}
          </Question>
        ))}
      </ul>
    </>
  )
}

export default IeOrCss
