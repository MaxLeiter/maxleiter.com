import { Talk } from "pages/talks";
import { Client } from "youtubei";


const talks = [
    't_rzYnXEQlE',
    'fh9WXPu0hw8',
    '-C-JoyNuQJs',
    'X8k_4tZ16qU',
    '5N4b-rU-OAA',
    '_VHNTC67NR8',
    '0fpDlAEQio4',
    'uknEhXyZgsg',
    'NqKyHEJe9_w',
    '9CSjlZeqKOc',
    'A3AdN7U24iU',
    'pq1XqP4-qOo',
    'JvBT4XBdoUE',
    'xJbXk7NldnM',
    '8LGDM9exlZw',
    'z_dt7NG38V4',
    '6avJHaC3C2U',
    'kVD-sjtFoEI',
];

const youtube = new Client()

const getTalks = async (): Promise<Array<Talk>> => {
    const promises = talks.map(url => youtube.getVideo(url))
    const results = await Promise.all(promises)
    const filtered = results.map(result => {
        if (result) {
            return {
                url: `https://www.youtube.com/watch?v=${result.id}`,
                thumbnail: result.thumbnails[3].url || '',
                title: result.title || 'No title found',
                description: result.description || '',
                date: result.uploadDate || null,
                id: result.id,
            }
        }
        return null
    }).filter(result => result !== null) as Array<Talk>;

    return filtered;
}

export default getTalks;
