import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
export const config = {
  runtime: 'experimental-edge',
}

const font = fetch(new URL('./fonts/Inter-Medium.ttf', import.meta.url)).then(
  (res) => res.arrayBuffer()
)

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

export default handler
