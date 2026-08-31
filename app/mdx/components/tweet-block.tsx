import { Tweet, type TweetProps } from 'react-tweet'

// Server module loaded through next/dynamic from the MDX component map, so
// react-tweet's CSS and client pieces stay out of posts without tweets.
export default function TweetBlock(props: TweetProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Tweet {...props} />
    </div>
  )
}
