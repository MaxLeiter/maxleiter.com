import Badge from '@components/badge'
import Button from '@components/button'
// import { useReducedMotion } from "@lib/media-query-hooks"
import useDocumentSize from '@lib/hooks/use-document-size'
import useGameOfLife from '@lib/hooks/use-game-of-life'
import Link from 'next/link'
import { RefObject, useRef, useState } from 'react'
import styles from './gol.module.css'

const GoL = () => {
  const canvas = useRef() as RefObject<HTMLCanvasElement>
  // const preferReducedMotion = useReducedMotion();
  const [running, setRunning] = useState(false)
  // const [fps, setFps] = useState(35)
  const [spawnRate] = useState(0.06)
  const [resolution, setResolution] = useState(0)

  const { width, height } = useDocumentSize()
  useGameOfLife({ canvas, width, running, spawnRate })

  // // Disable on start if preferReducedMotion
  // useEffect(() => {
  //     if (preferReducedMotion) {
  //         setRunning(false)
  //     }
  // }, [preferReducedMotion])

  return (
    <>
      <div className={styles.controlsOverlay}>
        <h5 style={{ margin: ' var(--gap-half)' }}> Game of Life </h5>
        <Badge className={styles.badge}>Experimental</Badge>
        <Button onClick={() => setRunning(!running)}>
          {running ? 'Stop' : 'Start'}
        </Button>
        <span>
          Zoom: {resolution}%
          <input
            disabled={!running}
            type="range"
            step="10"
            min="0"
            max="100"
            value={resolution}
            onChange={(e) => setResolution(parseInt(e.target.value))}
          />
        </span>
        {/* <span>FPS: {fps}
                    <input disabled={!running} type="range" min="1" max="60" value={fps} onChange={(e) => setFps(parseInt(e.target.value))} />
                </span> */}
        <p>
          The{' '}
          <Link href="https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life">
            <a>game of life</a>
          </Link>{' '}
          simulation runs entirely on your GPU using WebGL via shaders. Inspired
          by <a href="https://nullprogram.com/blog/2014/06/10/">nullprogram</a>{' '}
          and some others.
        </p>
      </div>
      {running && width && height && (
        <canvas
          ref={canvas}
          width={((100 - resolution) / 100) * width}
          height={((100 - resolution) / 100) * height}
          className={styles.gameOfLife}
          style={{
            width: `${width}px`,
            height: `${height}px`,
          }}
        />
      )}
    </>
  )
}

export default GoL
