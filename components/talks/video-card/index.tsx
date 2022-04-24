import Badge from '@components/badge'
import FadeIn from '@components/fade-in'
import Info from '@components/icons/info'
import Play from '@components/icons/play'
import Link from '@components/link'
import Image from 'next/image'
import { Talk } from 'pages/talks'
import { useState } from 'react'
import styles from './video-card.module.css'

const VideoCard = (
    {
        talk: {
            title,
            description,
            date,
            id,
            thumbnail,
            myDescription,
            channel,
            views,
            likes
        }
    }: {
        talk: Talk,
    }) => {
    const EmbedCode = () => {
        const embedCode = `<iframe src="https://www.youtube-nocookie.com/embed/${id}" width="560" height="315" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen autoplay></iframe>`
        const [isClicked, setIsClicked] = useState(false)
        const handleClick = () => {
            setIsClicked(true)
        }

        if (isClicked) {
            return (
                // render as HTML
                <div
                    className={styles.embed}
                    dangerouslySetInnerHTML={{ __html: embedCode }}
                />
            )
        } else {
            return (
                <span className={styles.embed} onClick={handleClick}><span className={styles.playButton}><Play /></span><Image
                    src={thumbnail}
                    alt={title}
                    width={560}
                    height={315}

                /></span>
            )
        }
    }

    const getTrimmedDescription = () => {
        const maxLength = 250
        if (description.length > maxLength) {
            const trimmedDescription = description.substring(0, maxLength)
            const cleaned = trimmedDescription.substring(0, Math.min(trimmedDescription.length, trimmedDescription.lastIndexOf(' ')))
            return cleaned + '...'
        } else {
            return description
        }
    }

    return (
        <FadeIn className={styles.wrapper}>
            {myDescription && <aside>
                <div className={styles.icon}>
                    <Info />
                </div>
                <b style={{ display: 'block' }}>Max&apos;s note: </b>
                {myDescription}
            </aside>}
            <section className={styles.videoCard}>
                <Link external href={`https://www.youtube.com/watch?v=${id}`}>
                    <Badge>Published {date}</Badge>
                </Link>
                <Link external href={`https://www.youtube.com/${channel}`}>
                    <Badge>{channel}</Badge>
                </Link>
                {views ? <Badge>{(views).toLocaleString()} views</Badge> : ''}
                {likes ? <Badge>{(likes).toLocaleString()} likes</Badge> : ''}
                <div className={styles.content}>
                    <h2>{title}</h2>
                    <p>{getTrimmedDescription()}</p>
                </div>
                <EmbedCode />
            </section>
        </FadeIn>)
}

export default VideoCard;
