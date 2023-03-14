'use client'

import Button from '@components/button'
import Highlight, { defaultProps } from 'prism-react-renderer'
import { useEffect, useState } from 'react'
import styles from './question.module.css'
import { QuestionWithVotes } from '..'
import FadeIn from '@components/fade-in'

const getLocalStorageKeyString = (id: string) => `question-${id}`

const Question = ({ question }: { question: QuestionWithVotes }) => {
  const { id, question: questionText, isCSS } = question
  const [voted, setVoted] = useState(false)
  const [votedFor, setVotedFor] = useState('')

  // check localStorage if voted
  useEffect(() => {
    if (localStorage.getItem(getLocalStorageKeyString(id))) {
      setVoted(true)
    }
  }, [id, isCSS])

  const voteForCss = async () => {
    if (voted) {
      return
    }

    setVoted(true)
    setVotedFor('css')
    fetch(`/api/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: id,
        vote: 'css',
      }),
    })

    localStorage.setItem(getLocalStorageKeyString(id), 'true')
  }

  const voteForIe = async () => {
    if (voted) {
      return
    }
    setVoted(true)
    setVotedFor('ie')
    fetch(`/api/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: id,
        vote: 'ie',
      }),
    })

    localStorage.setItem(getLocalStorageKeyString(id), 'true')
  }

  const cssPercentage = (question.css / (question.ie + question.css)) * 100
  const iePercentage = (question.ie / (question.ie + question.css)) * 100

  return (
    <li className={styles.wrapper}>
      <pre className={styles.pre}>
        <Highlight {...defaultProps} code={questionText} language={'css'}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <code className={className} style={{ ...style }}>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line, key: i })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token, key })} />
                  ))}
                </div>
              ))}
            </code>
          )}
        </Highlight>
      </pre>
      <div
        className={styles.buttons}
        style={{ display: 'flex', justifyContent: 'space-between' }}
      >
        <Button
          data-voted-for={votedFor === 'css' ? true : false}
          data-correct={isCSS ? 'true' : 'false'}
          disabled={voted}
          width={100}
          onClick={voteForCss}
        >
          CSS3
        </Button>
        <Button
          data-voted-for={votedFor === 'ie' ? true : false}
          data-correct={isCSS ? 'false' : 'true'}
          disabled={voted}
          width={100}
          onClick={voteForIe}
        >
          IE
        </Button>
      </div>
      {voted && (
        <FadeIn>
          {/* line showing vote margins */}
          <div className={styles.line}>
            <div
              className={styles.left}
              data-correct={isCSS ? 'true' : 'false'}
              style={{ width: `${cssPercentage}%` }}
            >
              {/* <span>CSS3 ({isCSS ? "correct" : "incorrect"})</span> */}
            </div>
            <div
              className={styles.right}
              data-correct={isCSS ? 'false' : 'true'}
              style={{ width: `${iePercentage}%` }}
            >
              {/* <span>IE ({!isCSS ? "correct" : "incorrect"})</span> */}
            </div>
          </div>
          <div className={styles.votes}>
            <div>
              Votes for CSS ({isCSS ? 'correct' : 'incorrect'}): {question.css}{' '}
              {!isNaN(cssPercentage) && `(${cssPercentage.toFixed(2)}%)`}
            </div>
            <div>
              Votes for IE ({!isCSS ? 'correct' : 'incorrect'}): {question.ie}{' '}
              {!isNaN(iePercentage) && `(${iePercentage.toFixed(2)}%)`}
            </div>
          </div>
        </FadeIn>
      )}
    </li>
  )
}

export default Question
