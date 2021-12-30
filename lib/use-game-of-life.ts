import { RefObject, useEffect } from "react"
import { createProgram, loadShader, stateShader, textureShader } from "./shaders"

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
        if (width && canvas.current && !reduceMotion) {
            const gl = canvas.current.getContext('webgl', { premultipliedAlpha: false,  })

            if (gl === null) {
                return
            }

            const vertexShader = loadShader(
                gl,
                gl.VERTEX_SHADER,
                `attribute vec2 coord; 
                    void main(void) {
                        gl_Position = vec4(coord, 0.0, 0.1);
                    }`
            )
            
            const fragShaderDisplay = loadShader(
                gl,
                gl.FRAGMENT_SHADER,
                stateShader(size)
            )

            const fragShaderLogic = loadShader(
                gl,
                gl.FRAGMENT_SHADER,
                textureShader(size)
            )

            if (!vertexShader || !fragShaderDisplay || !fragShaderLogic) {
                return
            }

            const displayProg = createProgram(gl, vertexShader, fragShaderDisplay)
            const stepperProg = createProgram(gl, vertexShader, fragShaderLogic)

            if (!displayProg || !stepperProg) {
                return
            }

            gl.useProgram(stepperProg)
  
            const stepperProgCoordLoc = gl.getAttribLocation(stepperProg, 'coord')
            const stepperProgPreviousStateLoc = gl.getUniformLocation(
                stepperProg,
                'previousState'
            )

            // const displayProgCoordLoc = gl.getAttribLocation(displayProg, 'coord')
            const displayProgStateLoc = gl.getUniformLocation(displayProg, 'state')


            const vertexBuffer = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)

            gl.vertexAttribPointer(stepperProgCoordLoc, 2, gl.FLOAT, false, 0, 0)

            const positions = [-1, -1, 1, -1, 1, 1, -1, 1]
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)
            // set clearColor to white, fully transparent
    
            const elementBuffer = gl.createBuffer()
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer)
            gl.bufferData(
                gl.ELEMENT_ARRAY_BUFFER,
                new Uint8Array([0, 1, 2, 3]),
                gl.STATIC_DRAW
            )

            const startState = new Uint8Array(size * size * 3)
            for (let i = 0; i < size * size; i++) {
                const intensity = Math.random() < 0.05 ? 255 : 0
                startState[i] = intensity
                startState[i + 1] = intensity
                startState[i + 2] = intensity
            }

            const texture0 = gl.createTexture()
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, texture0)
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGB,
                size,
                size,
                0,
                gl.RGB,
                gl.UNSIGNED_BYTE,
                startState
            )
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
            gl.generateMipmap(gl.TEXTURE_2D)

            const texture1 = gl.createTexture()
            gl.activeTexture(gl.TEXTURE0 + 1)
            gl.bindTexture(gl.TEXTURE_2D, texture1)
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGB,
                size,
                size,
                0,
                gl.RGB,
                gl.UNSIGNED_BYTE,
                startState
            )
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
            gl.generateMipmap(gl.TEXTURE_2D)
            const framebuffers = [gl.createFramebuffer(), gl.createFramebuffer()]

            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[0])
            gl.framebufferTexture2D(
                gl.FRAMEBUFFER,
                gl.COLOR_ATTACHMENT0,
                gl.TEXTURE_2D,
                texture0,
                0
            )

            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[1])
            gl.framebufferTexture2D(
                gl.FRAMEBUFFER,
                gl.COLOR_ATTACHMENT0,
                gl.TEXTURE_2D,
                texture1,
                0
            )

            let nextStateIndex = 0
            let animFrameId = -1;
            const draw = () => {
                const previousStateIndex = 1 - nextStateIndex

                gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[nextStateIndex])
                gl.useProgram(stepperProg)
                gl.enableVertexAttribArray(stepperProgCoordLoc)
                gl.uniform1i(stepperProgPreviousStateLoc, previousStateIndex)
                gl.drawElements(gl.TRIANGLE_FAN, 4, gl.UNSIGNED_BYTE, 0)

                gl.bindFramebuffer(gl.FRAMEBUFFER, null)
                gl.useProgram(displayProg)
                gl.uniform1i(displayProgStateLoc, nextStateIndex)

                gl.drawElements(gl.TRIANGLE_FAN, 4, gl.UNSIGNED_BYTE, 0)

                nextStateIndex = previousStateIndex
                setTimeout(() => {
                    animFrameId = requestAnimationFrame(draw);
                }, 1000 / fps);
            }
            draw()
            return () => {
                if (animFrameId > 0)
                    cancelAnimationFrame(animFrameId)
            }
        }
    }, [canvas, fps, running, width])
}

export default useGol