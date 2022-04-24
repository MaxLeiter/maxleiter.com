import Badge from '@components/badge'
import FadeIn from '@components/fade-in'
import Youtube from '@components/icons/youtube'
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
        thumbnail
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
               <span className={styles.embed} onClick={handleClick}><Image
                    src={thumbnail}
                    alt={title}
                    width={560}
                    height={315}
                    
                /><span className={styles.playButton}><Youtube /></span></span> 
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
        <FadeIn><div className={styles.videoCard}>
            <Badge>{date}</Badge>
            <div className={styles.content}>
                <h2>{title}</h2>
                <p>{getTrimmedDescription()}</p>
            </div>
            <EmbedCode />
        </div></FadeIn>)
}

export default VideoCard;
