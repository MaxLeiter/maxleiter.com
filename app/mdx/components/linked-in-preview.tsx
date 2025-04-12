import Image from 'next/image'
import styles from './linked-in-preview.module.css'
import Linkedin from '../../components/icons/linkedin'
import Button from '@components/button'
import { ReactNode } from 'react'

export default function LinkedInCard({ children }: { children: ReactNode }) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.content}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.profileImgContainer}>
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-LEyDQ5lGMjVgpEAmcSDdL4KJ1pSPqo.png"
                alt="Profile picture"
                width={48}
                height={48}
              />
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userText}>
                <h2 className={styles.userName}>David Wurtz</h2>
                <p className={styles.userPosition}>VP Product @ Shopify</p>
                <div className={styles.userMeta}>
                  <span>1w</span>
                  <span className={styles.separator}>•</span>
                  <span>Edited</span>
                </div>
              </div>
              <a
                className={styles.linkedinIcon}
                href="https://www.linkedin.com/feed/update/urn:li:activity:7288606784368320512/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin />
              </a>
            </div>
          </div>

          {/* Content */}
          <div className={styles.contentText}>{children}</div>

          {/* Video Thumbnail */}
          <a
            className={styles.videoThumbnail}
            href="https://www.linkedin.com/feed/update/urn:li:activity:7288606784368320512/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/CleanShot%202025-02-02%20at%2014.57.25@2x-orLTbj8emuAxdYlV9a5u5vyhyX7GnY.png"
              alt="Video thumbnail showing v0 interface"
              fill
              className={styles.videoImage}
            />
          </a>

          {/* Engagement */}
          <div className={styles.engagement}>
            <div className={styles.reactions}>
              <span>500 reactions</span>
            </div>
            <div className={styles.comments}>
              <span>48 comments</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
