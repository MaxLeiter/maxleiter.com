import { NextMiddleware, NextResponse, userAgent } from 'next/server'
const PUBLIC_FILE = /\.(.*)$/

export const middleware: NextMiddleware = async (req, event) => {
  const pathname = req.nextUrl.pathname
  const referer = req.headers.get('referer') || ''

  const isPageRequest =
    !PUBLIC_FILE.test(pathname) && !pathname.startsWith('/api')

  const { isBot, ua } = userAgent(req)
  const sendAnalytics = async () => {
    if (process.env.NODE_ENV !== 'production') {
      return
    }

    if (
      isBot ||
      referer.includes('mleiter.vercel.app') ||
      ua.includes('node-fetch')
    ) {
      console.log('Bot/crawler detected, not sending analytics')
      return
    }

    const slug = pathname.slice(pathname.indexOf('/')) || '/'

    const URL =
      process.env.NODE_ENV === 'production'
        ? 'https://maxleiter.com/api/view'
        : 'http://localhost:3000/api/view'
    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': process.env.SECRET_KEY || '',
      },
      body: JSON.stringify({
        slug,
        referer,
      }),
    })

    if (res.status !== 200) {
      console.error('Failed to send analytics', res)
    }
  }

  if (isPageRequest) event.waitUntil(sendAnalytics())
  return NextResponse.next()
}
