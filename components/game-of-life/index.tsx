import Badge from "@components/badge"
import Button from "@components/button"
import { useReducedMotion } from "@lib/media-query-hooks"
import useDocumentSize from "@lib/use-document-size"
import useGameOfLife from "@lib/use-game-of-life"
import { RefObject, useEffect, useRef, useState } from "react"
import styles from './gol.module.css'

const GoL = () => {
    const canvas = useRef() as RefObject<HTMLCanvasElement>
    const preferReducedMotion = useReducedMotion();
    const [running, setRunning] = useState(!preferReducedMotion)
    const [fps, setFps] = useState(35)
    const [spawnRate, setSpawnRate] = useState(0.06)
    const [resolution, setResolution] = useState(0)
    
    const { width, height } = useDocumentSize()
    useGameOfLife({ canvas, width, running, fps, spawnRate })

    // Disable on start if preferReducedMotion
    useEffect(() => {
        if (preferReducedMotion) {
            setRunning(false)
        }
    }, [preferReducedMotion])

    return (
        <>
            <div className={styles.controlsOverlay}>
                <h5 style={{margin:' var(--gap-half)'}}> Game of Life <Badge>Experimental</Badge> </h5>
                <Button onClick={() => setRunning(!running)}>{running ? 'Stop' : 'Start'}</Button>
                <span>Zoom: {resolution}%
                    <input type="range" step="10" min="0" max="100" value={resolution} onChange={(e) => setResolution(parseInt(e.target.value))} />
                </span>
                <span>FPS: {fps}
                    <input type="range" min="1" max="60" value={fps} onChange={(e) => setFps(parseInt(e.target.value))} />
                </span>
                <span>Living likelihood: {spawnRate}
                    <input type="range" step=".01" min="0" max="0.5" value={spawnRate} onChange={(e) => setSpawnRate(parseFloat(e.target.value))} />
                </span>
            </div>
            {running && width && height && <canvas
                ref={canvas}
                width={((100 - resolution)/100) * width}
                height={((100 - resolution)/100 )* height}
                className={styles.gameOfLife}
                style={{
                    width: `${width}px`,
                    height: `${height}px`,
                }}
            />}</>)
            

}

export default GoL