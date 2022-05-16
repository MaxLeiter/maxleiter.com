import { NextMiddleware, NextResponse,  } from 'next/server'
const PUBLIC_FILE = /\.(.*)$/

export const middleware: NextMiddleware = async (req, event) => {
    const pathname = req.nextUrl.pathname
    const isPageRequest =
		!PUBLIC_FILE.test(pathname) &&
		!pathname.startsWith("/api")

        const userAgentsToIgnore = [
            'Googlebot',
            'Bingbot',
            'Slackbot',
            'Slurp',
            'DuckDuckBot',
            'Baiduspider',
            'YandexBot',
            'facebookexternalhit',
            'ia_archiver',
            'Vercel Edge Functions'
        ]

        const isBot =
            req.headers &&
            userAgentsToIgnore.some(ua => req.headers.get('user-agent')?.includes(ua))
            
    const sendAnalytics = async () => {
        if (isBot) {
            console.log('Bot/crawler detected, not sending analytics')
            return
        }

        const slug = pathname.slice(pathname.indexOf("/")) || "/"

        const URL = process.env.NODE_ENV === 'production' ? 'https://maxleiter.com/api/view' : 'http://localhost:3000/api/view'
        const res = await fetch(`${URL}?slug=${slug}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (res.status !== 200) {
            console.error('Failed to send analytics', res)
        }
    }

    if (isPageRequest) event.waitUntil(sendAnalytics())
    return NextResponse.next()
}
