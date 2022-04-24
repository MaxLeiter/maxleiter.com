import { Talk } from "pages/talks";
import { Client } from "youtubei";


const talks = [
    { description: 'A great channel for humorous in-depth explanations on N64 hacking and emulation.', url: 'https://www.youtube.com/watch?v=t_rzYnXEQlE' },
    { description: 'Lin Clark provides an excellent fun graphical explanation of WASI, the standardized WASM system interface.', url: 'https://www.youtube.com/watch?v=fh9WXPu0hw8' },
    { description: 'The creator of JSON (although he would argue "discoverer") walks through many of the original ideas and reasonings behind JSON. My personal favorite video in this list, I think.', url: 'https://www.youtube.com/watch?v=-C-JoyNuQJs' },
    { description: 'A high-level overview of the TypeScript compiler, covering type inference, ASTs, the flow graph, and more.', url: 'https://www.youtube.com/watch?v=X8k_4tZ16qU' },
    { description: 'Both an introduction to WebAssembly and clang\'s ability to compile C++ to WASM. Smith walks the viewer through compiling and running clang in the browser. ', url: 'https://www.youtube.com/watch?v=5N4b-rU-OAA' },
    { description: 'Koretskyi goes on a deep-dive into optimizations taken by frameworks in order to achieve maximum performance in Node and V8. Memory allocation, bloom filters, dependency injection; you name it, it\'s covered.', url: 'https://www.youtube.com/watch?v=_VHNTC67NR8' },
    { description: 'What can we learn from SQL, Prolog, ML, and Smalltalk? You might notice a trend on this page due to my interest in early programming languages... This video also has *great* charts of the introduction of language paradigms.', url: 'https://www.youtube.com/watch?v=0fpDlAEQio4' },
    { description: 'Dan Ingalls, the original implementor and designer of the Smalltalk virtual machine at Xerox PARC, demonstrates the power of Smalltalk on the Alto. Sprinkled with great Xerox PARC stories.', url: 'https://www.youtube.com/watch?v=uknEhXyZgsg' },
    { description: 'Dylan Beattie imagines if the web was created with an alternate history: no google, no FireFox, no WWW.', url: 'https://www.youtube.com/watch?v=9CSjlZeqKOc' },
    { description: 'Why is Rust a good investment for "future-proof" software?', url: 'https://www.youtube.com/watch?v=A3AdN7U24iU' },
    { description: 'Andrew Kelley demonstrates the flexibility and power of Zig by creating a portable Vulkan program with no libc dependency.', url: 'https://www.youtube.com/watch?v=pq1XqP4-qOo' },
    { description: 'A brilliant introduction to the BEAM virtual machine and its capabilities. ', url: 'https://www.youtube.com/watch?v=JvBT4XBdoUE' },
    { description: 'A talk focusing on the power of the collective, but with amazingly interesting tidbits related to CRISPR and bringing back extinct species.', url: 'https://www.youtube.com/watch?v=xJbXk7NldnM' },
    { description: 'It\'s frankly terrifying the length to which North Korea has gone to spy on their citizens.', url: 'https://www.youtube.com/watch?v=8LGDM9exlZw' },
    { description: 'Dylan Beattie is the best conference speaker I\'ve seen, and I feel like this is his best talk (it\'s definitely his most popular). In this, Beattie explores why code is beautiful, and he shows examples too.', url: 'https://www.youtube.com/watch?v=6avJHaC3C2U' },
    { description: 'A design-focused talk; Wichary explores the complexity behind typography, language, and a platform as complex as Figma.', url: 'https://www.youtube.com/watch?v=kVD-sjtFoEI' },
];

const youtube = new Client()

const getTalks = async (): Promise<Array<Talk>> => {
    const promises = talks.map(({ url }) => youtube.getVideo(url))
    const results = await Promise.all(promises)
    const resultsWithDescription = results.map((video) => {
        const descriptionOfId = talks.find(({ url }) => {
            const id = url.split('=')[1]
            return id === video?.id
        })?.description
        if (!video) {
            console.log(`Could not find video`)
            return undefined
        }
        return {
            myDescription: descriptionOfId,
            ...video,
        }
    })

    const filtered = resultsWithDescription.map(result => {
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
                likes: result.likeCount
            }
        }
        return null
    }).filter(result => result !== null) as Array<Talk>;

    return filtered;
}

export default getTalks;
