import { useState, useEffect, createRef } from 'react'
import PostsList from '@components/posts-list'
import Socials from '@components/socials'
import ProjectList from '@components/projects'
import Link from '@components/link'
import AboutMe from '@components/aboutme'
import Page from '@components/page'
import getPosts from '@lib/get-posts'
import getProjects from '@lib/projects'
import useWindowDimensions from '@lib/use-window-dimensions'
import {
  loadShader,
  createProgram,
  stateShader,
  textureShader,
} from '@lib/shaders'
// import RSS from '@components/icons/rss'
// import ShiftBy from '@components/ShiftBy'
const PROJECT_COUNT = 4

const roundUp = (numToRound, multiple) => {
  if (multiple === 0) return numToRound

  let remainder = numToRound % multiple
  if (remainder === 0) return numToRound

  return numToRound + multiple - remainder
}

const About = ({ posts, projects }) => {
  const canvas = createRef()
  const { width, height } = useWindowDimensions()

  useEffect(() => {
    const size = roundUp(width, 1024)

    console.log('Re-render')
    const reduceMotion = !window?.matchMedia('(prefers-reduced-motion: reduce)')
      ?.matches
    if (width && canvas.current && reduceMotion) {
      const gl = canvas.current.getContext('webgl')

      if (gl === null) {
        alert(
          'Unable to initialize WebGL. Your browser or machine may not support it.'
        )
        return
      }

      const vertexShader = loadShader(
        gl,
        gl.VERTEX_SHADER,
        'attribute vec2 coord; void main(void) { gl_Position = vec4(coord, 0.0, 1.0); }'
      )
      const fragShaderDisplay = loadShader(
        gl,
        gl.FRAGMENT_SHADER,
        stateShader(size)
      )
      const fragShaderStepper = loadShader(
        gl,
        gl.FRAGMENT_SHADER,
        textureShader(size)
      )

      const displayProg = createProgram(gl, vertexShader, fragShaderDisplay)
      const stepperProg = createProgram(gl, vertexShader, fragShaderStepper)

      gl.useProgram(stepperProg)

      const stepperProgCoordLoc = gl.getAttribLocation(stepperProg, 'coord')
      const stepperProgPreviousStateLoc = gl.getUniformLocation(
        stepperProg,
        'previousState'
      )

      const displayProgCoordLoc = gl.getAttribLocation(displayProg, 'coord')
      const displayProgStateLoc = gl.getUniformLocation(displayProg, 'state')

      const vertexBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
        gl.STATIC_DRAW
      )

      // Note we must bind ARRAY_BUFFER before running vertexAttribPointer!
      // This is confusing and deserves a blog post
      // https://stackoverflow.com/questions/7617668/glvertexattribpointer-needed-everytime-glbindbuffer-is-called
      gl.vertexAttribPointer(stepperProgCoordLoc, 2, gl.FLOAT, false, 0, 0)
      const elementBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer)
      gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint8Array([0, 1, 2, 3]),
        gl.STATIC_DRAW
      )
      gl.enable(gl.BLEND)
      gl.enable(gl.DEPTH_TEST)

      const startState = new Uint8Array(size * size * 3)
      for (let i = 0; i < size * size; i++) {
        const intensity = Math.random() < 0.06 ? 255 : 0
        startState[i * 3] = intensity
        startState[i * 3 + 1] = intensity
        startState[i * 3 + 2] = intensity
      }

      gl.clearColor(0.3, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)

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
        requestAnimationFrame(draw)
      }
      draw()
    }
  }, [canvas, width])

  return (
    <Page
      header={false}
      title=""
      description="Max Leiter's personal website and projects."
    >
      <article>
        <h1
          style={{ margin: 0, color: 'var(--link)', display: 'inline-block' }}
        >
          Max Leiter
        </h1>
        <h2 style={{ margin: 0, lineHeight: '2.7rem' }}>
          Full-stack developer and student
        </h2>
        <Socials />
        <h3>About me</h3>
        <AboutMe />
        <h3>My projects</h3>
        <ProjectList
          showYears={false}
          count={PROJECT_COUNT}
          projects={projects}
        />
        <h3>My posts</h3>
        <PostsList posts={posts} />
        <footer>
          <Link href="/about">About this site</Link>
          {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA && (
            <>
              {' '}
              &mdash;{' '}
              <Link
                external
                href={`https://github.com/maxleiter/maxleiter.com/commit/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA}`}
              >
                {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}
              </Link>
            </>
          )}
        </footer>
      </article>
      <canvas
        ref={canvas}
        style={{
          pointerEvents: 'none',
          imageRendering: 'pixelated',
          position: 'fixed',
          left: 0,
          top: 0,
          width: `${width}px`,
          height:  `${height}px`,
        }}
      />
    </Page>
  )
}

export const getStaticProps = async () => {
  const posts = getPosts()
  const projects = await getProjects()

  return {
    props: {
      posts,
      projects,
    },
  }
}

export const config = {
  // unstable_runtimeJS: false,
}

export default About
