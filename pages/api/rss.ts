import type { NextApiRequest, NextApiResponse } from 'next'
import Parser, { Item } from 'rss-parser'


type Feed = {
    url: string,
    org: string,
    name: string
}

type Result = {
    name: string,
    org: string,
    item: {
        pubDate: string,
        creator: string,
        link: string,
        description: string,
        guid?: string,
        title: string
    }
}

const feeds: Feed[] = [
    {
        url: "http://feeds.washingtonpost.com/rss/rss_the-fix?itid=lk_inline_manual_6",
        name: "The Fix",
        org: "The Washington Post"
    },
    {
        url: "http://www.axios.com/feeds/feed.rss",
        name: "",
        org: "Axios"
    },
    {
        url: "https://drewdevault.com/blog/index.xml",
        name: "",
        org: "Drew DeVault"
    },
    {
        url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
        name: "Home page",
        org: "The New York Times"
    },
]

const DESC_MAX = 300

export default async (req: NextApiRequest, res: NextApiResponse) => {
    const parser = new Parser()
    let items: Result[] = []

    const { start, stop } = req.query

    if (Array.isArray(start) || Array.isArray(stop)) {
        throw new Error("Start and stop invalid")
    }

    let startIndex = parseInt(start) || 0
    let stopIndex = parseInt(stop) || 30

    await Promise.all(feeds.map(async (feed) => {
        const parsed =  await parser.parseURL(feed.url)
        parsed.items.forEach(item => {
            items.push({
                name: feed.name,
                org: feed.org,
                item: {
                    pubDate: item.pubDate ?? "",
                    creator: item.creator ?? "",
                    link: item.link ?? "",
                    description: `${item.contentSnippet?.substring(0, DESC_MAX)}${item.contentSnippet && item.contentSnippet.length > DESC_MAX ? "..." : ""}` ?? "",
                    guid: item.title?.split(" ").join("_"),
                    title: item.title ?? ""
                }
            })
        });
    }))

    if (startIndex < 0 || startIndex > items.length || stopIndex < 0 || stopIndex > items.length) {
        startIndex = 0
        stopIndex = items.length <= 10 ? 10 : 0
    }

    items.sort((a, b) => {
        const { pubDate: aPubDate } = a.item
        const { pubDate: bPubDate } = b.item
    
        if (aPubDate && bPubDate) {
            const aDate = new Date(aPubDate)
            const bDate = new Date(bPubDate)
            return bDate.getTime() - aDate.getTime()
        } else {
            return 0
        }
    })
    items = items.splice(startIndex, stopIndex)

    res.setHeader('Cache-Control', `s-maxage=1, stale-while-revalidate`)
    res.status(200).json({ items })
}
