import { ReactNode } from 'react'
import styles from './badge.module.css'

type Props = {
    children: ReactNode | ReactNode[],
}

const Badge = ({ children }: Props) => {
    return (<div className={styles.badge}>{children}</div>)
}

export default Badge
