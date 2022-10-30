import supabase from '@lib/supabase/private'
import IeOrCss from 'app/ie-or-css'

const fetchQuestions = async () => {
  let { data, error } = await supabase.from('Questions').select('id,question')

  if (error || !data) {
    console.error(error)
    return []
  }

  const randomized = data.sort(() => Math.random() - 0.5)
  return randomized
}

const IeQuiz = async () => {
  const questions = await fetchQuestions()
  return <IeOrCss questions={questions} />
}

export default IeQuiz

export const config = { runtime: 'experimental-edge' }
