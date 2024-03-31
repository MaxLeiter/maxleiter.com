// import { Talk } from 'app/(subpages)/talks/page-backup'
import { Client, Video } from 'youtubei'
import Talks from '@data/talks.json'
type Talk = any
const youtube = new Client()

const getTalks = async (): Promise<Array<Talk>> => {
  const promises = Talks.talks.map(({ url }) => youtube.getVideo<Video>(url))
  const results = await Promise.all(promises)
  const resultsWithDescription = results.map((video) => {
    const talk = Talks.talks.find(({ url }) => {
      const id = url.split('=')[1]
      return id === video?.id
    })
    if (!video) {
      console.log(`Could not find video`)
      return undefined
    }
    return {
      myDescription: talk?.description || '',
      ...video,
      // After video because we don't care about the youtube video tags, just ours and i'm lazy
      tags: talk?.tags || [],
    }
  })

  const filtered = resultsWithDescription
    .map((result) => {
      if (result) {
        return {
          url: `https://www.youtube.com/watch?v=${result.id}`,
          thumbnail: result.thumbnails[3].url || '',
          title: result.title || 'No title found',
          description: result.description || '',
          date: result.uploadDate || null,
          id: result.id,
          myDescription: result.myDescription || '',
          channel: result.channel.name,
          views: result.viewCount,
          likes: result.likeCount,
          tags: result.tags,
          lengthSeconds: result.duration,
        }
      }
      return null
    })
    .filter((result) => result !== null) as Array<Talk>

  return filtered
}

export default getTalks
