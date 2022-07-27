import supabase from '@lib/supabase/private'
import { PostgrestError } from '@supabase/supabase-js'
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'

const vote: NextApiHandler = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    res.status(405).end('Method Not Allowed')
    return
  }

  const { id, vote: unprocessedVote } = req.body

  const validVotes = ['css', 'ie']
  if (!validVotes.includes(unprocessedVote as string)) {
    res.status(400).json({ error: 'Invalid vote' })
    return
  }

  const vote = unprocessedVote as 'css' | 'ie'

  let {
    data,
    error,
  }: {
    data: any
    error: PostgrestError | null
  } = {
    data: null,
    error: null,
  }

  switch (vote) {
    case 'css': {
      const resp = await supabase.rpc('vote_css', { row_id: id })
      data = resp.data
      error = resp.error
      break
    }
    case 'ie': {
      const resp = await supabase.rpc('vote_ie', { row_id: id })
      data = resp.data
      error = resp.error
      break
    }
    default:
      res.status(400).json({ error: 'Invalid vote' })
      return
  }

  if (!error) {
    res.status(200).json({ success: true, response: data })
  } else {
    console.error(error)
  }
}

export default vote
