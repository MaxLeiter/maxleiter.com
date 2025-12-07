import { Tweet } from 'react-tweet'
import type { TwitterComponents } from 'react-tweet'
import Image from 'next/image'

const tweetComponents: TwitterComponents = {
  MediaImg: (props) => <Image {...props} fill unoptimized />,
}

interface TweetThreadProps {
  ids: string[]
}

export function TweetThread({ ids }: TweetThreadProps) {
  const isFirst = (index: number) => index === 0
  const isLast = (index: number) => index === ids.length - 1
  const isMiddle = (index: number) => !isFirst(index) && !isLast(index)

  const getRoundedClass = (index: number) => {
    if (ids.length === 1) return '' // single tweet keeps default
    if (isFirst(index)) return '[&_.react-tweet-theme]:rounded-b-none!'
    if (isLast(index)) return '[&_.react-tweet-theme]:rounded-t-none!'
    if (isMiddle(index)) return '[&_.react-tweet-theme]:rounded-none!'
    return ''
  }

  // Hide header and "replying to" for non-first tweets in thread
  const getHeaderClass = (index: number) => {
    if (!isFirst(index)) return '[&_[class*=header]]:hidden! [&_[class*=tweet-in-reply-to]]:hidden!'
    return ''
  }

  return (
    <div className="my-6 flex flex-col items-center not-prose">
      {ids.map((id, index) => (
        <div
          key={id}
          className={`relative w-full max-w-[550px] [&_.react-tweet-theme]:m-0! [&_.react-tweet-theme]:w-full! [&_.react-tweet-theme]:bg-transparent! [&_article]:bg-transparent! **:data-[theme=dark]:bg-transparent! [&_img]:m-0! ${getRoundedClass(index)} ${getHeaderClass(index)}`}
        >
          <Tweet id={id} components={tweetComponents} />
        </div>
      ))}
    </div>
  )
}
