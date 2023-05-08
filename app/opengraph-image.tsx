import { ImageResponse } from "next/server"

export const size = { width: 1200, height: 600 }
// TODO: update to support alt once nextjs has a solution for params
export const alt = ''
export const contentType = 'image/png'

export const runtime = 'edge'

// eslint-disable-next-line import/no-anonymous-default-export
export default async function (): Promise<ImageResponse> {
  const fontData = await fetch(
    new URL('./fonts/Inter-Medium.ttf', import.meta.url)
  ).then((res) => res.arrayBuffer())

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
            fontSize: 100,
          }}
        >
          Max Leiter&apos;s Website
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
