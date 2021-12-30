import useDocumentSize from "@lib/use-document-size"
import useGameOfLife from "@lib/use-game-of-life"
import {  RefObject, useRef } from "react"
import styles from './gol.module.css'
type Props = {
    running: boolean
}

const GoL = ({ running }: Props) => {
    const canvas = useRef() as RefObject<HTMLCanvasElement>
    let { width, height } = useDocumentSize()

    useGameOfLife({ canvas, width, running, fps: 40, run: running })

    if (running) {
        return (
            <canvas
                ref={canvas}
                width={500}
                height={500}
                className={styles.gameOfLife}
                style={{
                    width: `${width}px`,
                    height: `${height}px`,
                }}
            />)
    } else {
        return (
            <></>
        )
    }
}

export default GoL