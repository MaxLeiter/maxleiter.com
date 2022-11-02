import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
export const config = {
  runtime: 'experimental-edge',
}

const font = fetch(
  new URL('../../fonts/Inter-Medium.ttf', import.meta.url)
).then((res) => res.arrayBuffer())

const handler = async (req: NextRequest) => {
  const fontData = await font
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title')
  const date = searchParams.get('date')

  if (!title || !date) {
    return new Response('Missing title or date', { status: 400 })
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          letterSpacing: '-.02em',
          fontWeight: 700,
          background: '#000',
        }}
      >
        <div
          style={{
            left: 35,
            top: 35,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
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
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            padding: '20px 50px',
            margin: '0 42px',
            fontSize: 40,
            width: 'auto',
            maxWidth: 700,
            textAlign: 'center',
            lineHeight: 1.3,
            color: 'white',
          }}
        >
          {title && (
            <div
              style={{
                fontSize: 65,
                fontWeight: 900,
                marginBottom: 40,
              }}
            >
              {title}
            </div>
          )}
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

export default handler
