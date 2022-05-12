import Page from '@components/page'
import supabase from '@lib/supabase/private'
import IeOrCss, { IEQuizProps } from '@components/ie-or-css'

const IeQuiz = ({ questions }: IEQuizProps) => {
  return (
    <Page
      title="IE or CSS3?"
      description="A short quiz wondering if given code snippers are for internet explorer or CSS3"
    >
      <IeOrCss questions={questions} />
    </Page>
  )
}

export const getStaticProps = async () => {
  let { data, error } = await supabase.from('Questions')
  // .select('id,question')

  if (error || !data) {
    console.error(error)
    return {
      props: {
        questions: [],
      },
    }
  }

  const randomized = data.sort(() => Math.random() - 0.5)
  return {
    props: {
      questions: randomized,
    },
  }
}

export default IeQuiz
