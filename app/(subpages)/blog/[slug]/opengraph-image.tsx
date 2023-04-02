import { ImageResponse } from '@vercel/og'
import * as htmlparser2 from 'htmlparser2'

export const size = { width: 1200, height: 600 }
// TODO: update to support alt once nextjs has a solution for params
export const alt = ''
export const contentType = 'image/png'

export const config = {
  runtime: 'edge',
}

// eslint-disable-next-line import/no-anonymous-default-export
export default async function (): Promise<ImageResponse> {
  // const post = (await getPosts()).find((p) => p?.slug === params.slug)
  // instead of getPosts, lets fetch VERCEL_URL/sitemap.xml and parse it with htmlparser2
  // then we can get the post data from there
  const post = await fetch(
    `https://${process.env.VERCEL_URL}/sitemap.xml`
  ).then((res) => res.text())

  // extract the /blog/{post} data from the sitemap
  const parser = new htmlparser2.Parser(
    {
      onopentag(name, attribs) {
        if (name === 'loc' && attribs.href.includes('/blog/')) {
          console.log(attribs.href)
        }
      },
      ontext(text) {
        console.log('-->', text)
      },
      onclosetag(tagname) {
        if (tagname === 'loc') {
          console.log("That's it?")
        }
      },
    },
    { decodeEntities: true }
  )
  parser.write(post)
  parser.end()

  if (!post) {
    return new Response('Not found', { status: 404 })
  }

  const fontData = await fetch(
    new URL('../../../fonts/Inter-Medium.ttf', import.meta.url)
  ).then((res) => res.arrayBuffer())

  const title = post.title
  const date = post.date

  if (!title) {
    return new Response('Missing title', { status: 400 })
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          letterSpacing: '-.02em',
          fontWeight: 700,
          background: '#000',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            width: '100%',
            padding: '10px 50px',
          }}
        >
          <span
            style={{
              fontSize: 25,
              fontWeight: 700,
              background: 'white',
              color: 'black',
              padding: '4px 10px',
            }}
          >
            maxleiter.com
          </span>
          {date && (
            <div
              style={{
                fontSize: 25,
                background: 'white',
                color: 'black',
                padding: '4px 10px',
              }}
            >
              {date}
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '0 50px',
            color: 'white',
            textAlign: 'center',
            height: 630 - 50 - 50,
            maxWidth: 1000,
          }}
        >
          {title && (
            <div
              style={{
                fontSize: 65,
                fontWeight: 900,
                marginBottom: 40,
                lineHeight: 1.1,
              }}
            >
              {title}
            </div>
          )}
        </div>
      </div>
    ),
    {
      fonts: [
        {
          name: 'Inter',
          data: fontData,
          weight: 500,
        },
      ],
      width: 1200,
      height: 630,
    }
  )
}
