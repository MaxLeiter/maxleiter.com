import type { ReactNode } from 'react'
import styles from './tooltip.module.css'

const Tooltip = ({ children, text, ...otherProps }: { text: string, children: ReactNode | ReactNode[] }) => {
    return (<span aria-label={text} className={styles.tooltip} {...otherProps}>{children}</span>)
}

export default Tooltip