import {
  GLSL_COMPOSITE,
  GLSL_DOWN,
  GLSL_FULL_VS,
  GLSL_PART_FS,
  GLSL_PART_VS,
  GLSL_PREFILTER,
  GLSL_SCENE_FS,
  GLSL_UP,
  WGSL_PARTICLE_COMPUTE,
  WGSL_PARTICLE_RENDER,
  WGSL_POST,
  WGSL_SCENE,
} from './shaders'
import {
  PREFS_EVENT,
  START_EVENT,
  STATS_EVENT,
  loadPrefs,
  type Prefs,
  type Quality,
  type SceneStats,
} from '@lib/meridian-prefs'

/**
 * The homepage scene: one description, three backends. WebGPU first, then
 * WebGL2, then a painted Canvas 2D plate; whichever starts draws into a
 * canvas this module creates inside the island's host element.
 *
 * Lazily imported by `app/islands/scene.tsx` after first paint, so none of
 * it -- the shaders are most of the bytes -- is on any page's critical path
 * or on any page but `/`. It is a battery cost while it runs, so it stops
 * when the tab is hidden, drops to a third of the frame rate after a minute
 * without input, starts at Low on small screens and does not start at all
 * when the visitor has asked to save data.
 */

type Vec3 = [number, number, number]

const V3 = {
  add: (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  norm: (a: Vec3): Vec3 => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1
    return [a[0] / l, a[1] / l, a[2] / l]
  },
  lerp: (a: Vec3, b: Vec3, t: number): Vec3 => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ],
}

const SCENE = {
  planet: {
    c: [114, -30, -262] as Vec3,
    r: 95,
    axis: V3.norm([0.28, 1, -0.12]),
  },
  ring: {
    c: [0, 0, 0] as Vec3,
    axis: V3.norm([0.22, 1, 0.05]),
    R: 10,
    hw: 0.5,
    wallH: 0.06,
    hullT: 0.04,
  },
  sun: V3.norm([-0.844, 0.534, 0.06]),
  star2: V3.norm([0.01, 0.105, -0.994]),
  atmoH: 0.03,
}

interface Pose {
  pos: Vec3
  tgt: Vec3
  fov: number
}

/** Camera poses, in ring-radius units (R = 10). */
const POSES: Record<'title' | 'main', Pose> = {
  title: { pos: [3.5, 2.6, 22], tgt: [4, -1.5, -12], fov: 42 },
  main: { pos: [0, 3.2, 13.5], tgt: [1.5, -0.6, -6], fov: 44 },
}

interface Tier {
  shader: number
  maxScale: number
  minScale: number
  particles: number
  bloomLevels: number
}

const QUALITY: Record<Exclude<Quality, 'auto'>, Tier> = {
  low: {
    shader: 0,
    maxScale: 0.5,
    minScale: 0.3,
    particles: 1500,
    bloomLevels: 4,
  },
  medium: {
    shader: 1,
    maxScale: 0.7,
    minScale: 0.35,
    particles: 4000,
    bloomLevels: 5,
  },
  high: {
    shader: 2,
    maxScale: 0.9,
    minScale: 0.4,
    particles: 7000,
    bloomLevels: 6,
  },
  ultra: {
    shader: 3,
    maxScale: 1.0,
    minScale: 0.5,
    particles: 12000,
    bloomLevels: 6,
  },
}

interface Sizes {
  cw: number
  ch: number
  sw: number
  sh: number
}

interface Backend {
  info: string
  setParticles?: (count: number) => void
  frame: (U: Float32Array, C: Float32Array, sizes: Sizes, bloom: number) => void
  destroy?: () => void
}

interface Camera {
  pos: Vec3
  fwd: Vec3
  right: Vec3
  up: Vec3
  fov: number
  tanX: number
  tanY: number
}

type Kind = Exclude<SceneStats['kind'], 'none'>

/* ------------------------------------------------- occlusion, in JS -- */

function ringHit(ro: Vec3, rd: Vec3): boolean {
  const r = SCENE.ring
  const a = r.axis
  const o = V3.sub(ro, r.c)
  const oa = V3.dot(o, a)
  const op = V3.sub(o, V3.mul(a, oa))
  const da = V3.dot(rd, a)
  const dp = V3.sub(rd, V3.mul(a, da))
  const cylinder = (R: number): [number, number] => {
    const A = V3.dot(dp, dp)
    const B = V3.dot(op, dp)
    const C = V3.dot(op, op) - R * R
    const D = B * B - A * C
    if (D < 0 || A < 1e-9) return [-1, -1]
    const s = Math.sqrt(D)
    return [(-B - s) / A, (-B + s) / A]
  }
  const inner = cylinder(r.R)
  if (inner[1] > 0 && Math.abs(oa + inner[1] * da) < r.hw) return true
  const outer = cylinder(r.R + r.hullT)
  return outer[0] > 0 && Math.abs(oa + outer[0] * da) < r.hw
}

function sphereHit(ro: Vec3, rd: Vec3, c: Vec3, radius: number): boolean {
  const oc = V3.sub(ro, c)
  const b = V3.dot(oc, rd)
  const h = b * b - (V3.dot(oc, oc) - radius * radius)
  return h >= 0 && -b - Math.sqrt(h) > 0
}

/** How much of the far star is visible, for the lens flare: 9 rays. */
function sunVisibility(c: Camera): { vis: number; ndc: [number, number] } {
  const s = SCENE.star2
  const z = V3.dot(s, c.fwd)
  if (z <= 0) return { vis: 0, ndc: [0, 0] }
  const ndc: [number, number] = [
    V3.dot(s, c.right) / z / c.tanX,
    V3.dot(s, c.up) / z / c.tanY,
  ]
  let vis = 0
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    const rr = i === 0 ? 0 : 0.006
    const dir = V3.norm(
      V3.add(
        s,
        V3.add(
          V3.mul(c.right, Math.cos(a) * rr),
          V3.mul(c.up, Math.sin(a) * rr),
        ),
      ),
    )
    const hit =
      ringHit(c.pos, dir) ||
      sphereHit(c.pos, dir, SCENE.planet.c, SCENE.planet.r * 1.004)
    if (!hit) vis++
  }
  const edge = Math.max(Math.abs(ndc[0]), Math.abs(ndc[1]))
  return {
    vis: (vis / 9) * Math.max(0, Math.min(1, (1.45 - edge) / 0.45)),
    ndc,
  }
}

/* ------------------------------------------------------------ webgpu -- */

/**
 * The WebGPU usage flags, by their spec values. lib.dom types the interfaces
 * but not these namespace objects, and the numbers are fixed by the spec.
 */
const BUFFER = { COPY_DST: 0x8, UNIFORM: 0x40, STORAGE: 0x80 } as const
const TEXTURE = { TEXTURE_BINDING: 0x4, RENDER_ATTACHMENT: 0x10 } as const
const FRAGMENT = 0x2

async function createWebGPU(
  canvas: HTMLCanvasElement,
): Promise<Backend | null> {
  if (!('gpu' in navigator)) return null
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: 'high-performance',
  })
  if (!adapter) return null
  const device = await adapter.requestDevice()
  const ctx = canvas.getContext('webgpu') as GPUCanvasContext | null
  if (!ctx) return null
  const format = navigator.gpu.getPreferredCanvasFormat()
  ctx.configure({ device, format, alphaMode: 'opaque' })
  let lost = false
  void device.lost.then(() => {
    lost = true
  })
  device.pushErrorScope('validation')

  const module = async (code: string, label: string) => {
    const m = device.createShaderModule({ code, label })
    const info = await m.getCompilationInfo()
    const errors = info.messages.filter((message) => message.type === 'error')
    if (errors.length) {
      throw new Error(
        `${label}: ${errors.map((e) => `${e.lineNum}:${e.linePos} ${e.message}`).join('\n')}`,
      )
    }
    return m
  }
  const sceneMod = await module(WGSL_SCENE, 'scene')
  const computeMod = await module(WGSL_PARTICLE_COMPUTE, 'particles-cs')
  const partMod = await module(WGSL_PARTICLE_RENDER, 'particles')
  const postMod = await module(WGSL_POST, 'post')
  const HDR: GPUTextureFormat = 'rgba16float'

  const ubuf = device.createBuffer({
    size: 52 * 4,
    usage: BUFFER.UNIFORM | BUFFER.COPY_DST,
  })
  const cbuf = device.createBuffer({
    size: 16 * 4,
    usage: BUFFER.UNIFORM | BUFFER.COPY_DST,
  })
  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
  })

  const scenePipe = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: sceneMod, entryPoint: 'vsFull' },
    fragment: {
      module: sceneMod,
      entryPoint: 'fsScene',
      targets: [{ format: HDR }],
    },
    primitive: { topology: 'triangle-list' },
  })
  const sceneBG = device.createBindGroup({
    layout: scenePipe.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: ubuf } }],
  })
  const computePipe = device.createComputePipeline({
    layout: 'auto',
    compute: { module: computeMod, entryPoint: 'cs' },
  })
  const premultiplied: GPUBlendState = {
    color: {
      srcFactor: 'one',
      dstFactor: 'one-minus-src-alpha',
      operation: 'add',
    },
    alpha: {
      srcFactor: 'one',
      dstFactor: 'one-minus-src-alpha',
      operation: 'add',
    },
  }
  const partPipe = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: partMod, entryPoint: 'vsPart' },
    fragment: {
      module: partMod,
      entryPoint: 'fsPart',
      targets: [{ format: HDR, blend: premultiplied }],
    },
    primitive: { topology: 'triangle-list' },
  })

  let pbuf: GPUBuffer | null = null
  let pcount = 0
  let computeBG: GPUBindGroup | null = null
  let partBG: GPUBindGroup | null = null
  const setParticles = (count: number) => {
    if (count === pcount) return
    pcount = count
    const data = new Float32Array(count * 8)
    const box = 1.4
    const [cx, cy, cz] = POSES.main.pos
    for (let i = 0; i < count; i++) {
      const debris = Math.random() < 0.035
      const size = debris
        ? 0.003 + 0.016 * Math.pow(Math.random(), 4)
        : 0.0012 + 0.0025 * Math.random()
      data.set(
        [
          (Math.random() - 0.5) * 2 * box + cx,
          (Math.random() - 0.5) * 2 * box + cy,
          (Math.random() - 0.5) * 2 * box + cz,
          debris ? size : -size,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          Math.random(),
        ],
        i * 8,
      )
    }
    pbuf?.destroy()
    pbuf = device.createBuffer({
      size: data.byteLength,
      usage: BUFFER.STORAGE | BUFFER.COPY_DST,
    })
    device.queue.writeBuffer(pbuf, 0, data)
    computeBG = device.createBindGroup({
      layout: computePipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: pbuf } },
        { binding: 1, resource: { buffer: ubuf } },
      ],
    })
    partBG = device.createBindGroup({
      layout: partPipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: ubuf } },
        { binding: 1, resource: { buffer: pbuf } },
      ],
    })
  }
  setParticles(QUALITY.high.particles)

  const postBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 1, visibility: FRAGMENT, sampler: { type: 'filtering' } },
      { binding: 2, visibility: FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 3, visibility: FRAGMENT, texture: { sampleType: 'float' } },
    ],
  })
  const postLayout = device.createPipelineLayout({
    bindGroupLayouts: [postBGL],
  })
  const additive: GPUBlendState = {
    color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
    alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
  }
  const postPipe = (
    entryPoint: string,
    target: GPUTextureFormat,
    blend?: GPUBlendState,
  ) =>
    device.createRenderPipeline({
      layout: postLayout,
      vertex: { module: postMod, entryPoint: 'vs' },
      fragment: {
        module: postMod,
        entryPoint,
        targets: [{ format: target, blend }],
      },
      primitive: { topology: 'triangle-list' },
    })
  const prePipe = postPipe('prefilter', HDR)
  const downPipe = postPipe('down', HDR)
  const upPipe = postPipe('up', HDR, additive)
  const compPipe = postPipe('composite', format)

  const scopeError = await device.popErrorScope()
  if (scopeError) throw new Error(`[webgpu] ${scopeError.message}`)

  interface Targets {
    w: number
    h: number
    levels: number
    all: GPUTexture[]
    hdrView: GPUTextureView
    mipViews: GPUTextureView[]
    preBG: GPUBindGroup
    downBG: GPUBindGroup[]
    compBG: GPUBindGroup
  }
  let rt: Targets | null = null
  const targets = (sw: number, sh: number, levels: number): Targets => {
    if (rt && rt.w === sw && rt.h === sh && rt.levels === levels) return rt
    for (const texture of rt?.all ?? []) texture.destroy()
    const make = (w: number, h: number) =>
      device.createTexture({
        size: [Math.max(1, w), Math.max(1, h)],
        format: HDR,
        usage: TEXTURE.RENDER_ATTACHMENT | TEXTURE.TEXTURE_BINDING,
      })
    const hdr = make(sw, sh)
    const mips: GPUTexture[] = []
    for (let i = 0; i < levels; i++)
      mips.push(make(sw >> (i + 1), sh >> (i + 1)))
    const group = (a: GPUTexture, b?: GPUTexture) =>
      device.createBindGroup({
        layout: postBGL,
        entries: [
          { binding: 0, resource: a.createView() },
          { binding: 1, resource: sampler },
          { binding: 2, resource: { buffer: cbuf } },
          { binding: 3, resource: (b ?? a).createView() },
        ],
      })
    rt = {
      w: sw,
      h: sh,
      levels,
      all: [hdr, ...mips],
      hdrView: hdr.createView(),
      mipViews: mips.map((m) => m.createView()),
      preBG: group(hdr),
      downBG: mips.map((m) => group(m)),
      compBG: group(hdr, mips[0]),
    }
    return rt
  }

  const pass = (
    enc: GPUCommandEncoder,
    view: GPUTextureView,
    pipe: GPURenderPipeline,
    group: GPUBindGroup,
    load = false,
  ) => {
    const p = enc.beginRenderPass({
      colorAttachments: [
        {
          view,
          loadOp: load ? 'load' : 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    })
    p.setPipeline(pipe)
    p.setBindGroup(0, group)
    p.draw(3)
    p.end()
  }

  const info = adapter.info
  return {
    info:
      [info.vendor, info.architecture, info.description]
        .filter(Boolean)
        .join(' · ') || 'WebGPU adapter',
    setParticles,
    frame(U, C, s, bloom) {
      if (lost) throw new Error('device lost')
      if (!computeBG || !partBG) return
      const t = targets(s.sw, s.sh, bloom)
      device.queue.writeBuffer(ubuf, 0, U)
      device.queue.writeBuffer(cbuf, 0, C)
      const enc = device.createCommandEncoder()
      const cp = enc.beginComputePass()
      cp.setPipeline(computePipe)
      cp.setBindGroup(0, computeBG)
      cp.dispatchWorkgroups(Math.ceil(pcount / 64))
      cp.end()
      const sp = enc.beginRenderPass({
        colorAttachments: [
          {
            view: t.hdrView,
            loadOp: 'clear',
            storeOp: 'store',
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
          },
        ],
      })
      sp.setPipeline(scenePipe)
      sp.setBindGroup(0, sceneBG)
      sp.draw(3)
      sp.setPipeline(partPipe)
      sp.setBindGroup(0, partBG)
      sp.draw(6, pcount)
      sp.end()
      pass(enc, t.mipViews[0], prePipe, t.preBG)
      for (let i = 1; i < t.levels; i++)
        pass(enc, t.mipViews[i], downPipe, t.downBG[i - 1])
      for (let i = t.levels - 1; i > 0; i--) {
        pass(enc, t.mipViews[i - 1], upPipe, t.downBG[i], true)
      }
      pass(enc, ctx.getCurrentTexture().createView(), compPipe, t.compBG)
      device.queue.submit([enc.finish()])
    },
    destroy() {
      try {
        device.destroy()
      } catch {
        // Already lost.
      }
    },
  }
}

/* ------------------------------------------------------------ webgl2 -- */

function createWebGL2(canvas: HTMLCanvasElement): Backend | null {
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
    depth: false,
    powerPreference: 'high-performance',
  })
  if (!gl) return null
  const hdr = Boolean(gl.getExtension('EXT_color_buffer_float'))
  gl.getExtension('OES_texture_float_linear')
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)
    if (!shader) throw new Error('createShader failed')
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) ?? 'compile failed')
    }
    return shader
  }
  const program = (vs: string, fs: string) => {
    const p = gl.createProgram()
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs))
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(p) ?? 'link failed')
    }
    return {
      p,
      U: gl.getUniformLocation(p, 'U'),
      C: gl.getUniformLocation(p, 'C'),
      src: gl.getUniformLocation(p, 'uSrc'),
      src2: gl.getUniformLocation(p, 'uSrc2'),
    }
  }
  type Program = ReturnType<typeof program>
  const sceneFS = hdr
    ? GLSL_SCENE_FS
    : GLSL_SCENE_FS.replace(
        'precision highp int;',
        'precision highp int;\n#define LDR 1',
      )
  const scene = program(GLSL_FULL_VS, sceneFS)
  const part = program(GLSL_PART_VS, GLSL_PART_FS)
  const post = hdr
    ? {
        pre: program(GLSL_FULL_VS, GLSL_PREFILTER),
        down: program(GLSL_FULL_VS, GLSL_DOWN),
        up: program(GLSL_FULL_VS, GLSL_UP),
        comp: program(GLSL_FULL_VS, GLSL_COMPOSITE),
      }
    : null
  const vao = gl.createVertexArray()
  let pcount = 4000

  interface Target {
    t: WebGLTexture
    f: WebGLFramebuffer
    w: number
    h: number
  }
  interface Targets {
    w: number
    h: number
    levels: number
    main: Target
    mips: Target[]
  }
  let rt: Targets | null = null
  const makeTarget = (w: number, h: number): Target => {
    const t = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA16F,
      w,
      h,
      0,
      gl.RGBA,
      gl.HALF_FLOAT,
      null,
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const f = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, f)
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      t,
      0,
    )
    return { t, f, w, h }
  }
  const targets = (sw: number, sh: number, levels: number): Targets => {
    if (rt && rt.w === sw && rt.h === sh && rt.levels === levels) return rt
    for (const x of rt ? [rt.main, ...rt.mips] : []) {
      gl.deleteTexture(x.t)
      gl.deleteFramebuffer(x.f)
    }
    const main = makeTarget(sw, sh)
    const mips: Target[] = []
    for (let i = 0; i < levels; i++) {
      mips.push(
        makeTarget(Math.max(1, sw >> (i + 1)), Math.max(1, sh >> (i + 1))),
      )
    }
    rt = { w: sw, h: sh, levels, main, mips }
    return rt
  }
  const draw = (
    prog: Program,
    target: WebGLFramebuffer | null,
    w: number,
    h: number,
    U: Float32Array | null,
    C: Float32Array | null,
    src?: WebGLTexture,
    src2?: WebGLTexture,
  ) => {
    gl.useProgram(prog.p)
    gl.bindFramebuffer(gl.FRAMEBUFFER, target)
    gl.viewport(0, 0, w, h)
    if (prog.U && U) gl.uniform4fv(prog.U, U)
    if (prog.C && C) gl.uniform4fv(prog.C, C)
    if (src) {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, src)
      gl.uniform1i(prog.src, 0)
    }
    if (src2) {
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, src2)
      gl.uniform1i(prog.src2, 1)
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  return {
    info: `WebGL2 · ${String(gl.getParameter(gl.RENDERER))}${hdr ? '' : ' · LDR'}`,
    setParticles(count) {
      pcount = count
    },
    frame(U, C, s, bloom) {
      gl.bindVertexArray(vao)
      gl.disable(gl.BLEND)
      if (!post) {
        draw(scene, null, s.cw, s.ch, U, null)
        return
      }
      const t = targets(s.sw, s.sh, bloom)
      draw(scene, t.main.f, t.w, t.h, U, null)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(part.p)
      gl.uniform4fv(part.U, U)
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, pcount)
      gl.disable(gl.BLEND)
      draw(post.pre, t.mips[0].f, t.mips[0].w, t.mips[0].h, null, C, t.main.t)
      for (let i = 1; i < t.levels; i++) {
        draw(
          post.down,
          t.mips[i].f,
          t.mips[i].w,
          t.mips[i].h,
          null,
          C,
          t.mips[i - 1].t,
        )
      }
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE)
      for (let i = t.levels - 1; i > 0; i--) {
        draw(
          post.up,
          t.mips[i - 1].f,
          t.mips[i - 1].w,
          t.mips[i - 1].h,
          null,
          C,
          t.mips[i].t,
        )
      }
      gl.disable(gl.BLEND)
      draw(post.comp, null, s.cw, s.ch, null, C, t.main.t, t.mips[0].t)
    },
    destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}

/* --------------------------------------------------------- canvas 2d -- */

/** No GPU: a painted plate, drifted slowly. */
function create2D(canvas: HTMLCanvasElement): Backend | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  let plate: HTMLCanvasElement | null = null
  let pw = 0
  let ph = 0
  const paint = (w: number, h: number) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')
    if (!g) return c
    const sky = g.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#02040a')
    sky.addColorStop(1, '#071322')
    g.fillStyle = sky
    g.fillRect(0, 0, w, h)
    let seed = 7
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < 26; i++) {
      const x = rnd() * w
      const y = rnd() * h * 0.7
      const r = (0.15 + rnd() * 0.35) * w
      const n = g.createRadialGradient(x, y, 0, x, y, r)
      n.addColorStop(
        0,
        rnd() > 0.5 ? 'rgba(40,90,140,0.06)' : 'rgba(120,40,100,0.05)',
      )
      n.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = n
      g.fillRect(0, 0, w, h)
    }
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(220,230,255,${Math.pow(rnd(), 3)})`
      g.fillRect(rnd() * w, rnd() * h, 1.2, 1.2)
    }
    const px = w * 0.78
    const py = h * 1.02
    const pr = h * 0.62
    const limb = g.createRadialGradient(px, py, pr * 0.96, px, py, pr * 1.08)
    limb.addColorStop(0, 'rgba(140,200,255,0.5)')
    limb.addColorStop(1, 'rgba(140,200,255,0)')
    g.fillStyle = limb
    g.beginPath()
    g.arc(px, py, pr * 1.1, 0, 7)
    g.fill()
    g.save()
    g.beginPath()
    g.arc(px, py, pr, 0, 7)
    g.clip()
    const bands = ['#6b4a30', '#c08a55', '#e6d2a8', '#9a6a44', '#d9c6a0']
    for (let i = 0; i < 40; i++) {
      g.fillStyle = bands[i % 5]
      g.globalAlpha = 0.9
      g.fillRect(
        px - pr,
        py - pr + (i / 40) * pr * 2,
        pr * 2,
        (pr * 2) / 40 + 1,
      )
    }
    g.globalAlpha = 1
    const term = g.createLinearGradient(
      px - pr,
      py - pr,
      px + pr * 0.6,
      py + pr * 0.2,
    )
    term.addColorStop(0, 'rgba(0,0,0,0.97)')
    term.addColorStop(0.55, 'rgba(0,0,0,0.9)')
    term.addColorStop(0.85, 'rgba(0,0,0,0.25)')
    term.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = term
    g.fillRect(px - pr, py - pr, pr * 2, pr * 2)
    g.restore()
    g.save()
    g.translate(w * 0.58, h * 0.6)
    g.rotate(-0.08)
    g.strokeStyle = 'rgba(110,150,170,0.9)'
    g.lineWidth = h * 0.012
    g.beginPath()
    g.ellipse(0, 0, w * 0.62, h * 0.2, 0, Math.PI * 1.02, Math.PI * 1.98)
    g.stroke()
    g.strokeStyle = 'rgba(20,24,30,1)'
    g.lineWidth = h * 0.05
    g.beginPath()
    g.ellipse(0, 0, w * 0.62, h * 0.2, 0, Math.PI * 0.05, Math.PI * 0.95)
    g.stroke()
    g.restore()
    const sx = w * 0.86
    const sy = h * 0.16
    const sun = g.createRadialGradient(sx, sy, 0, sx, sy, h * 0.5)
    sun.addColorStop(0, 'rgba(255,250,235,1)')
    sun.addColorStop(0.03, 'rgba(255,240,210,0.8)')
    sun.addColorStop(0.2, 'rgba(160,200,255,0.12)')
    sun.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = sun
    g.fillRect(0, 0, w, h)
    return c
  }
  return {
    info: 'Canvas 2D fallback',
    frame(U, _C, s) {
      const w = s.cw
      const h = s.ch
      if (!plate || pw !== w || ph !== h) {
        plate = paint(Math.round(w * 1.06), Math.round(h * 1.06))
        pw = w
        ph = h
      }
      const t = U[3]
      ctx.drawImage(
        plate,
        -w * 0.03 + Math.sin(t * 0.05) * w * 0.02,
        -h * 0.03 + Math.cos(t * 0.04) * h * 0.01,
      )
    },
  }
}

/* -------------------------------------------------------------- loop -- */

const ORDER: Kind[] = ['webgpu', 'webgl2', '2d']

function saveData(): boolean {
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection
  return Boolean(connection?.saveData)
}

/**
 * Starts the scene in `host` and returns its teardown. The host fades the
 * canvas in (`mx-live`) once the first frame is on screen, so until then the
 * painted sky underneath is what shows.
 */
export function startScene(host: HTMLElement): () => void {
  if (saveData()) return () => undefined

  const forced = new URLSearchParams(location.search).get('renderer')
  let prefs: Prefs = loadPrefs()
  const small = matchMedia('(max-width: 720px), (pointer: coarse)').matches
  let canvas: HTMLCanvasElement | null = null
  let backend: Backend | null = null
  let kind: Kind | null = null
  let adapter = ''
  let tier = QUALITY.high
  let scale = 0.7
  let reduced = prefs.motion === 'reduced'
  let disposed = false
  let running = false
  let frame = 0
  let lastT = 0
  let simTime = 0
  let frameTimes: number[] = []
  let lastAdjust = 0
  let upHold = 0
  let fps = 0
  let fpsAcc = 0
  let fpsN = 0
  let fpsLast = 0
  let shown = false
  let lastInput = performance.now()
  let tick = 0
  const cam: {
    from: Pose | null
    to: Pose
    t0: number
    dur: number
    cur: Pose | null
  } = {
    from: null,
    to: POSES.main,
    t0: 0,
    dur: 1,
    cur: null,
  }

  const setPose = (pose: Pose, instant = false) => {
    const cur = cam.cur ?? pose
    cam.from = { pos: [...cur.pos], tgt: [...cur.tgt], fov: cur.fov }
    cam.to = pose
    cam.t0 = performance.now() / 1000
    cam.dur = instant || reduced ? 0.001 : 4.2
    if (!cam.cur || instant)
      cam.cur = { pos: [...pose.pos], tgt: [...pose.tgt], fov: pose.fov }
  }
  setPose(
    document.documentElement.hasAttribute('data-title')
      ? POSES.title
      : POSES.main,
    true,
  )

  const camera = (now: number, w: number, h: number): Camera => {
    let u = Math.min(1, (now - cam.t0) / cam.dur)
    u = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
    const f = cam.from ?? cam.to
    const pos = V3.lerp(f.pos, cam.to.pos, u)
    const tgt = V3.lerp(f.tgt, cam.to.tgt, u)
    const fov = f.fov + (cam.to.fov - f.fov) * u
    cam.cur = { pos, tgt, fov }
    const t = simTime
    const d = reduced ? 0 : 1
    const p = V3.add(pos, [
      Math.sin(t * 0.045) * 0.35 * d,
      Math.sin(t * 0.031 + 1) * 0.12 * d,
      Math.cos(t * 0.038) * 0.3 * d,
    ])
    const target = V3.add(tgt, [
      Math.sin(t * 0.027) * 0.4 * d,
      Math.sin(t * 0.021) * 0.15 * d,
      0,
    ])
    const fwd = V3.norm(V3.sub(target, p))
    const roll = Math.sin(t * 0.02) * 0.012 * d - 0.03
    const right = V3.norm(V3.cross(fwd, [0, 1, 0]))
    const up = V3.cross(right, fwd)
    const cr = Math.cos(roll)
    const sr = Math.sin(roll)
    const tanY = Math.tan((fov * Math.PI) / 360)
    return {
      pos: p,
      fwd,
      right: V3.add(V3.mul(right, cr), V3.mul(up, sr)),
      up: V3.sub(V3.mul(up, cr), V3.mul(right, sr)),
      fov,
      tanY,
      tanX: tanY * (w / h),
    }
  }

  const uniforms = (c: Camera, w: number, h: number, dt: number) => {
    const U = new Float32Array(52)
    const r = SCENE.ring
    const ru = V3.norm(V3.cross(r.axis, [0, 0, 1]))
    const set = (i: number, v: Vec3, w4: number) => {
      U[i * 4] = v[0]
      U[i * 4 + 1] = v[1]
      U[i * 4 + 2] = v[2]
      U[i * 4 + 3] = w4
    }
    set(0, c.pos, simTime)
    set(1, c.right, c.tanX)
    set(2, c.up, c.tanY)
    set(3, c.fwd, 1.0)
    set(4, SCENE.sun, tier.shader)
    set(5, SCENE.planet.c, SCENE.planet.r)
    set(6, r.c, r.R)
    set(7, r.axis, r.hw)
    set(8, ru, simTime * 0.0035)
    U[36] = w
    U[37] = h
    U[38] = r.wallH
    U[39] = SCENE.atmoH
    set(10, SCENE.planet.axis, r.hullT)
    U[44] = dt
    U[45] = 1.4
    U[46] = 1
    U[47] = 0.035
    set(12, SCENE.star2, 0)
    return U
  }

  const applyQuality = () => {
    const key =
      prefs.quality === 'auto'
        ? small
          ? 'low'
          : kind === 'webgpu'
            ? 'high'
            : 'medium'
        : prefs.quality
    tier = QUALITY[key]
    if (small) {
      tier = {
        ...tier,
        maxScale: Math.min(tier.maxScale, 0.55),
        particles: Math.min(tier.particles, 3000),
      }
    }
    scale =
      prefs.quality === 'auto'
        ? Math.min(tier.maxScale, Math.max(tier.minScale, scale))
        : tier.maxScale
    backend?.setParticles?.(tier.particles)
  }

  const report = () => {
    const detail: SceneStats = { kind: kind ?? 'none', adapter, fps, scale }
    dispatchEvent(new CustomEvent<SceneStats>(STATS_EVENT, { detail }))
  }

  const adjustScale = (ms: number, now: number) => {
    if (prefs.quality !== 'auto') return
    frameTimes.push(ms)
    if (frameTimes.length < 40) return
    const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
    frameTimes = []
    if (avg > 19 && scale > tier.minScale) {
      scale = Math.max(tier.minScale, scale * 0.86)
      lastAdjust = now
      upHold = Math.min(upHold + 2, 12)
    } else if (
      avg < 17.6 &&
      scale < tier.maxScale &&
      now - lastAdjust > 2 + upHold
    ) {
      scale = Math.min(tier.maxScale, scale * 1.06)
      lastAdjust = now
    }
  }

  const loop = (ts: number) => {
    if (!running || !canvas || !backend) return
    frame = requestAnimationFrame(loop)
    // A minute without input: draw every third frame. The drift is slow
    // enough that nobody watching an idle menu can tell, and the GPU can.
    if (ts - lastInput > 60_000 && tick++ % 3 !== 0) return
    const now = ts / 1000
    const dt = lastT ? Math.min(0.1, now - lastT) : 0.016
    lastT = now
    const motion = reduced ? 0.12 : 1
    simTime += dt * motion
    fpsAcc += dt
    fpsN++
    if (now - fpsLast > 0.5) {
      fps = fpsN / fpsAcc
      fpsAcc = 0
      fpsN = 0
      fpsLast = now
      report()
    }
    adjustScale(dt * 1000, now)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cw = Math.max(2, Math.round(canvas.clientWidth * dpr))
    const ch = Math.max(2, Math.round(canvas.clientHeight * dpr))
    const sizes: Sizes = {
      cw,
      ch,
      sw: Math.max(2, Math.round(cw * scale)),
      sh: Math.max(2, Math.round(ch * scale)),
    }
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw
      canvas.height = ch
    }
    const c = camera(now, sizes.sw, sizes.sh)
    const U = uniforms(c, sizes.sw, sizes.sh, dt * motion)
    const sun = sunVisibility(c)
    const C = new Float32Array([
      sun.ndc[0],
      sun.ndc[1],
      sun.vis,
      1.0,
      1.1,
      0.2,
      simTime % 100,
      cw / ch,
      0.55,
      0.018,
      0.012,
      0,
      0.62,
      0.55,
      0,
      0,
    ])
    try {
      backend.frame(U, C, sizes, tier.bloomLevels)
    } catch {
      running = false
      void fallbackFrom(kind)
      return
    }
    if (!shown) {
      shown = true
      host.classList.add('mx-live')
    }
  }

  // A canvas that has handed out one context type cannot hand out another.
  const freshCanvas = () => {
    canvas?.remove()
    const next = document.createElement('canvas')
    next.className = 'mx-canvas'
    next.setAttribute('aria-hidden', 'true')
    host.appendChild(next)
    canvas = next
    return next
  }

  const start = async (from: Kind) => {
    for (const k of ORDER.slice(ORDER.indexOf(from))) {
      if (disposed) return
      try {
        const surface = freshCanvas()
        const made =
          k === 'webgpu'
            ? await createWebGPU(surface)
            : k === 'webgl2'
              ? createWebGL2(surface)
              : create2D(surface)
        if (!made) continue
        if (disposed) {
          made.destroy?.()
          return
        }
        backend = made
        adapter = made.info
        kind = k
        break
      } catch {
        // The next backend down.
      }
    }
    if (!backend) return
    applyQuality()
    running = !document.hidden
    lastT = 0
    if (running) frame = requestAnimationFrame(loop)
    report()
  }

  const fallbackFrom = async (k: Kind | null) => {
    backend?.destroy?.()
    backend = null
    const next = k ? ORDER[ORDER.indexOf(k) + 1] : undefined
    if (next) await start(next)
  }

  const onPrefs = (event: Event) => {
    const next = (event as CustomEvent<Prefs>).detail
    const qualityChanged = next.quality !== prefs.quality
    prefs = next
    reduced = next.motion === 'reduced'
    if (qualityChanged) {
      frameTimes = []
      applyQuality()
    }
  }
  const onStart = () => setPose(POSES.main)
  const onVisibility = () => {
    if (document.hidden) {
      running = false
      cancelAnimationFrame(frame)
    } else if (backend && !running && !disposed) {
      running = true
      lastT = 0
      frame = requestAnimationFrame(loop)
    }
  }
  const onInput = () => {
    lastInput = performance.now()
  }
  // A followed link is about to be swapped in by the router, under a view
  // transition that has to capture this page first. A saturated GPU makes
  // that capture wait on the next frame, so the scene stands down the
  // moment a same-tab link is clicked. If no navigation follows, it resumes.
  let resumeTimer: ReturnType<typeof setTimeout> | undefined
  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null
    const link = target?.closest<HTMLAnchorElement>('a[href]')
    if (!link || link.target === '_blank' || !running) return
    running = false
    cancelAnimationFrame(frame)
    clearTimeout(resumeTimer)
    resumeTimer = setTimeout(onVisibility, 1500)
  }

  addEventListener(PREFS_EVENT, onPrefs)
  addEventListener(START_EVENT, onStart)
  document.addEventListener('visibilitychange', onVisibility)
  addEventListener('pointermove', onInput, { passive: true })
  addEventListener('keydown', onInput)
  document.addEventListener('click', onClick, true)

  const valid = (value: string | null): value is Kind =>
    value !== null && (ORDER as string[]).includes(value)
  void start(valid(forced) ? forced : 'gpu' in navigator ? 'webgpu' : 'webgl2')

  return () => {
    disposed = true
    running = false
    cancelAnimationFrame(frame)
    removeEventListener(PREFS_EVENT, onPrefs)
    removeEventListener(START_EVENT, onStart)
    document.removeEventListener('visibilitychange', onVisibility)
    removeEventListener('pointermove', onInput)
    removeEventListener('keydown', onInput)
    document.removeEventListener('click', onClick, true)
    clearTimeout(resumeTimer)
    backend?.destroy?.()
    backend = null
    canvas?.remove()
    host.classList.remove('mx-live')
  }
}
