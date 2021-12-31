// @ts-nocheck

import { RefObject, useEffect } from "react"

// https://nullprogram.com/blog/2014/06/10/

type Props = {
    canvas: RefObject<HTMLCanvasElement>
    width?: number
    run: boolean
    fps?: number
    running: boolean
}
const useGol = ({ width, canvas, fps = 60, running }: Props) => {
    useEffect(() => {
        if (!width) return
        if (!canvas) return
        if (!running) return

        const size = 2048

        console.log('Re-render')
        const reduceMotion = window?.matchMedia(
            '(prefers-reduced-motion: reduce)'
        )?.matches
    })
}

export default useGol
