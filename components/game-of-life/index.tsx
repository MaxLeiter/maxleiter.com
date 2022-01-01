import Button from "@components/button"
import useDocumentSize from "@lib/use-document-size"
import useGameOfLife from "@lib/use-game-of-life"
import { RefObject, useRef, useState } from "react"
import styles from './gol.module.css'

const GoL = () => {
    const canvas = useRef() as RefObject<HTMLCanvasElement>
    const [running, setRunning] = useState(true)
    const [fps, setFps] = useState(35)
    const { width, height } = useDocumentSize()
    console.log("GoL re-render")
    useGameOfLife({ canvas, width, running, fps })

    return (
        <>
            <div className={styles.controlsOverlay}>
                <h5 style={{margin:' var(--gap-half)'}}> Game of Life </h5>
                <Button onClick={() => setRunning(!running)}>{running ? 'Stop' : 'Start'}</Button>
                <span>FPS: {fps}
                <input type="range" min="1" max="60" value={fps} onChange={(e) => setFps(parseInt(e.target.value))} />
                </span>
            </div>
            {running && <canvas
                ref={canvas}
                width={500}
                height={500}
                className={styles.gameOfLife}
                style={{
                    width: `${width}px`,
                    height: `${height}px`,
                }}
            />}</>)
            

}

export default GoL