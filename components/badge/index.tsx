import { ReactNode } from 'react'
import styles from './badge.module.css'

type Props = {
    children: ReactNode | ReactNode[],
    className?: string,
}

const Badge = ({ children, className }: Props) => {
    return (<div className={`${styles.badge} ${className}`}>{children}</div>)
}

export default Badge
