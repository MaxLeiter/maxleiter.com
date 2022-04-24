import React, { ReactNode } from 'react'
import styles from './badge.module.css'

type Props = React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
    children: ReactNode
}

const Badge = ({ children, className }: Props) => {
    return (<div className={`${styles.badge} ${className}`}>{children}</div>)
}

export default Badge
