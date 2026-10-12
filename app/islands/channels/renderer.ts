import { coverLayout, COVER_H, COVER_W, TYPE } from '@lib/cover-art'
import { Avatar, type Mesh, type Meshes } from './avatar'
import {
  type Channel,
  FLOOR_Y,
  framing,
  type Item,
  OPEN_D,
  OPEN_Z,
  panelRect,
  rowLayout,
  type SceneState,
  type ScreenRect,
  TILE_D,
  TILE_H,
  TILE_R,
  TILE_W,
  tileLayout,
  type Viewport,
} from './layout'
import {
  clamp,
  easeIO,
  lerp,
  M4,
  type Mat4,
  PI,
  sstep,
  Spring3,
  type Vec3,
} from './math'
import * as SH from './shaders'

/**
 * The WebGL2 renderer: a 4x MSAA HDR target with a per-object velocity buffer,
 * a half-resolution mirrored pass for the floor, two-level bloom, and a
 * composite that adds the volumetric spotlight, motion blur, ACES and dither.
 *
 * Tile covers are the same SVG motifs the page shows, drawn into a canvas with
 * their type laid out by `coverLayout`, so a texture and its `<img>` agree.
 */

export interface Renderer {
  frame(dt: number, vp: Viewport, mode: 'page' | 'reader'): ScreenRect | null
  pick(px: number, py: number, vp: Viewport): number
  prepareBack(item: Item, vp: Viewport, mode: 'page' | 'reader'): void
  prime(): void
  /** Where the camera is headed, for tests that check nothing moved it. */
  cameraTarget(): Vec3
  avatar: Avatar
  dispose(): void
}

type Uniforms = Record<string, WebGLUniformLocation | null>
interface Program {
  p: WebGLProgram
  u: Uniforms
}

interface DrawItem {
  item: Item
  chan: number
  index: number
  m: Mat4
  pm: Mat4
  a: number
  focus: number
  sweep: number
  isOpen: boolean
  hover: number
  depth: number
  x: number
  y: number
  z: number
  ry: number
  sx: number
}

interface FrameInfo {
  fov: number
  floorY: number
  avatar: Vec3
  openSX: number
  openSY: number
  accent2: Vec3
  glowPulse: number
  shadows: Float32Array
  nShadow: number
}

interface Targets {
  ms: WebGLFramebuffer
  res: WebGLFramebuffer
  resV: WebGLFramebuffer | null
  scene: WebGLTexture
  depth: WebGLTexture
  vel: WebGLTexture
  refl: WebGLTexture
  reflF: WebGLFramebuffer
  rw: number
  rh: number
  b0: WebGLTexture
  b0t: WebGLTexture
  b1: WebGLTexture
  b1t: WebGLTexture
  fb0: WebGLFramebuffer
  fb0t: WebGLFramebuffer
  fb1: WebGLFramebuffer
  fb1t: WebGLFramebuffer
  bw: number
  bh: number
  cw: number
  ch: number
  textures: WebGLTexture[]
  framebuffers: WebGLFramebuffer[]
  renderbuffers: WebGLRenderbuffer[]
}

function hueRgb(h: number, s: number, l: number): Vec3 {
  h = ((h % 360) + 360) % 360
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)].map((v) => Math.pow(v, 2.2)) as Vec3
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  gl: WebGL2RenderingContext,
  channels: Channel[],
  S: SceneState,
  options: { font: string; maxDpr: () => number },
): Renderer {
  const extF = gl.getExtension('EXT_color_buffer_float')
  const extA = gl.getExtension('EXT_texture_filter_anisotropic')
  const HDR = Boolean(extF)
  const MRT = HDR
  const maxAniso = extA
    ? Math.min(
        8,
        gl.getParameter(extA.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number,
      )
    : 0
  const SAMPLES = Math.min(4, (gl.getParameter(gl.MAX_SAMPLES) as number) || 0)

  /* ------------------------------------------------------- programs -- */

  const programs: WebGLProgram[] = []
  const shaders: WebGLShader[] = []
  function shader(type: number, src: string): WebGLShader {
    const s = gl.createShader(type)
    if (!s) throw new Error('channels: createShader failed')
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(`channels: shader: ${gl.getShaderInfoLog(s) ?? ''}`)
    }
    shaders.push(s)
    return s
  }
  function program(vs: string, fs: string): Program {
    const p = gl.createProgram()
    if (!p) throw new Error('channels: createProgram failed')
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vs))
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(`channels: link: ${gl.getProgramInfoLog(p) ?? ''}`)
    }
    programs.push(p)
    const u: Uniforms = {}
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i)
      if (info) {
        u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name)
      }
    }
    return { p, u }
  }
  const P = {
    tile: program(SH.VS_MESH, SH.FS_TILE),
    av: program(SH.VS_MESH, SH.FS_AV),
    glow: program(SH.VS_MESH, SH.FS_GLOW),
    bg: program(SH.VS_FS, SH.FS_BG),
    floor: program(SH.VS_FLOOR, SH.FS_FLOOR),
    pt: program(SH.VS_PT, SH.FS_PT),
    bright: program(SH.VS_FS, SH.FS_BRIGHT),
    blur: program(SH.VS_FS, SH.FS_BLUR),
    comp: program(SH.VS_FS, SH.FS_COMP),
  }

  /* ------------------------------------------------------- geometry -- */

  const buffers: WebGLBuffer[] = []
  const vaos: WebGLVertexArrayObject[] = []
  function mesh(data: number[], stride = 9): Mesh {
    const vao = gl.createVertexArray()
    const buf = gl.createBuffer()
    if (!vao || !buf) throw new Error('channels: buffer allocation failed')
    vaos.push(vao)
    buffers.push(buf)
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)
    if (stride === 9) {
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 36, 12)
      gl.enableVertexAttribArray(2)
      gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 36, 24)
    } else {
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, stride, gl.FLOAT, false, stride * 4, 0)
    }
    gl.bindVertexArray(null)
    return { vao, count: data.length / stride }
  }

  /** A rounded slab; uv.z marks the face: 0 front, 1 back, 2 the rim. */
  function roundedBox(w: number, h: number, d: number, r: number, seg = 8) {
    const out: number[] = []
    const ring: [number, number, number, number][] = []
    const corners: [number, number, number][] = [
      [w / 2 - r, h / 2 - r, 0],
      [-w / 2 + r, h / 2 - r, PI / 2],
      [-w / 2 + r, -h / 2 + r, PI],
      [w / 2 - r, -h / 2 + r, PI * 1.5],
    ]
    for (const [cx, cy, a0] of corners) {
      for (let i = 0; i <= seg; i++) {
        const a = a0 + ((i / seg) * PI) / 2
        ring.push([
          cx + Math.cos(a) * r,
          cy + Math.sin(a) * r,
          Math.cos(a),
          Math.sin(a),
        ])
      }
    }
    const V = (
      x: number,
      y: number,
      z: number,
      nx: number,
      ny: number,
      nz: number,
      f: number,
    ) => out.push(x, y, z, nx, ny, nz, x / w + 0.5, 0.5 - y / h, f)
    const z1 = d / 2
    const z0 = -d / 2
    const M = ring.length
    for (let i = 0; i < M; i++) {
      const a = ring[i]
      const b = ring[(i + 1) % M]
      V(0, 0, z1, 0, 0, 1, 0)
      V(a[0], a[1], z1, 0, 0, 1, 0)
      V(b[0], b[1], z1, 0, 0, 1, 0)
    }
    for (let i = 0; i < M; i++) {
      const a = ring[i]
      const b = ring[(i + 1) % M]
      V(0, 0, z0, 0, 0, -1, 1)
      V(b[0], b[1], z0, 0, 0, -1, 1)
      V(a[0], a[1], z0, 0, 0, -1, 1)
    }
    for (let i = 0; i < M; i++) {
      const a = ring[i]
      const b = ring[(i + 1) % M]
      V(a[0], a[1], z1, a[2], a[3], 0, 2)
      V(a[0], a[1], z0, a[2], a[3], 0, 2)
      V(b[0], b[1], z0, b[2], b[3], 0, 2)
      V(a[0], a[1], z1, a[2], a[3], 0, 2)
      V(b[0], b[1], z0, b[2], b[3], 0, 2)
      V(b[0], b[1], z1, b[2], b[3], 0, 2)
    }
    return out
  }

  /** A surface of revolution around y, smooth- or flat-shaded. */
  function lathe(prof: [number, number][], seg: number, smooth = true) {
    const out: number[] = []
    if (smooth) {
      const normals = prof.map((_, i) => {
        const a = prof[Math.max(0, i - 1)]
        const b = prof[Math.min(prof.length - 1, i + 1)]
        const dr = b[0] - a[0]
        const dy = b[1] - a[1]
        const l = Math.hypot(dr, dy) || 1
        return [dy / l, -dr / l]
      })
      const V = (i: number, a: number) => {
        const [r, y] = prof[i]
        const [nr, ny] = normals[i]
        out.push(
          r * Math.sin(a),
          y,
          r * Math.cos(a),
          nr * Math.sin(a),
          ny,
          nr * Math.cos(a),
          0,
          0,
          3,
        )
      }
      for (let i = 0; i < prof.length - 1; i++) {
        for (let j = 0; j < seg; j++) {
          const a0 = (j / seg) * 2 * PI
          const a1 = ((j + 1) / seg) * 2 * PI
          if (prof[i][0] > 1e-6) {
            V(i, a0)
            V(i, a1)
            V(i + 1, a1)
          }
          if (prof[i + 1][0] > 1e-6) {
            V(i, a0)
            V(i + 1, a1)
            V(i + 1, a0)
          }
        }
      }
      return out
    }
    const tri = (a: Vec3, b: Vec3, c: Vec3) => {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
      let nx = u[1] * v[2] - u[2] * v[1]
      let ny = u[2] * v[0] - u[0] * v[2]
      let nz = u[0] * v[1] - u[1] * v[0]
      const l = Math.hypot(nx, ny, nz)
      if (l < 1e-9) return
      nx /= l
      ny /= l
      nz /= l
      for (const p of [a, b, c]) out.push(p[0], p[1], p[2], nx, ny, nz, 0, 0, 3)
    }
    for (let i = 0; i < prof.length - 1; i++) {
      const [r0, y0] = prof[i]
      const [r1, y1] = prof[i + 1]
      for (let j = 0; j < seg; j++) {
        const a0 = (j / seg) * 2 * PI
        const a1 = ((j + 1) / seg) * 2 * PI
        const p = (r: number, y: number, a: number): Vec3 => [
          r * Math.sin(a),
          y,
          r * Math.cos(a),
        ]
        tri(p(r0, y0, a0), p(r0, y0, a1), p(r1, y1, a1))
        tri(p(r0, y0, a0), p(r1, y1, a1), p(r1, y1, a0))
      }
    }
    return out
  }
  const sphereProf = (n: number) => {
    const a: [number, number][] = []
    for (let i = 0; i <= n; i++) {
      const t = -PI / 2 + (i / n) * PI
      a.push([Math.cos(t), Math.sin(t)])
    }
    return a
  }
  const capProf = (r: number, L: number): [number, number][] => [
    [0, -L - r * 0.5],
    [r * 0.72, -L - r * 0.25],
    [r, -L + r * 0.2],
    [r, -r * 0.1],
    [r * 0.78, r * 0.35],
    [0, r * 0.5],
  ]
  const torusProf = (R0: number, r: number, n: number) => {
    const a: [number, number][] = []
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * 2 * PI
      a.push([R0 + Math.cos(t) * r, Math.sin(t) * r])
    }
    return a
  }
  /** Squashes z on a lathe's positions (every 9th float from index 2). */
  const flattenZ = (data: number[], k: number) =>
    data.map((v, i) => (i % 9 === 2 ? v * k : v))

  const G = {
    tile: mesh(roundedBox(TILE_W, TILE_H, TILE_D, TILE_R, 8)),
    floor: mesh(
      [
        -300, 0, -300, 300, 0, 40, 300, 0, -300, -300, 0, -300, -300, 0, 40,
        300, 0, 40,
      ],
      3,
    ),
    glow: mesh([
      -2.4, -1.7, 0, 0, 0, 1, 0, 0, 0, 2.4, -1.7, 0, 0, 0, 1, 0, 0, 0, 2.4, 1.7,
      0, 0, 0, 1, 0, 0, 0, -2.4, -1.7, 0, 0, 0, 1, 0, 0, 0, 2.4, 1.7, 0, 0, 0,
      1, 0, 0, 0, -2.4, 1.7, 0, 0, 0, 1, 0, 0, 0,
    ]),
    pts: (() => {
      const data: number[] = []
      let seed = 99
      const R = () => {
        seed = (seed * 16807) % 2147483647
        return seed / 2147483647
      }
      for (let i = 0; i < 90; i++)
        data.push(-3 + R() * 9, R() * 5.6, -3 + R() * 6.5, R())
      return mesh(data, 4)
    })(),
  }
  const meshes: Meshes = {
    sphere: mesh(lathe(sphereProf(10), 14)),
    hairCap: mesh(
      lathe(
        sphereProf(10).filter((p) => p[1] > -0.2),
        14,
      ),
    ),
    tuft: mesh(
      lathe(
        [
          [0.075, 0],
          [0.05, 0.06],
          [0, 0.12],
        ],
        6,
        false,
      ),
    ),
    torso: mesh(
      flattenZ(
        lathe(
          [
            [0.125, -0.02],
            [0.15, 0.06],
            [0.162, 0.2],
            [0.178, 0.33],
            [0.16, 0.42],
            [0.1, 0.48],
            [0, 0.495],
          ],
          12,
        ),
        0.76,
      ),
    ),
    pocket: mesh(
      flattenZ(
        lathe(
          [
            [0, -0.04],
            [0.09, -0.035],
            [0.095, 0.035],
            [0, 0.04],
          ],
          4,
        ),
        0.25,
      ),
    ),
    hood: mesh(lathe(torusProf(0.105, 0.042, 8), 12)),
    string: mesh(
      lathe(
        [
          [0.006, -0.11],
          [0.006, 0],
        ],
        4,
      ),
    ),
    neck: mesh(
      lathe(
        [
          [0.058, -0.02],
          [0.055, 0.1],
        ],
        8,
      ),
    ),
    pelvis: mesh(
      flattenZ(
        lathe(
          [
            [0.1, -0.06],
            [0.135, -0.02],
            [0.14, 0.06],
            [0.128, 0.1],
          ],
          10,
        ),
        0.8,
      ),
    ),
    cuff: mesh(lathe(torusProf(0.047, 0.014, 5), 8)),
    upper: mesh(lathe(capProf(0.054, 0.22), 10)),
    fore: mesh(lathe(capProf(0.048, 0.19), 10)),
    thigh: mesh(lathe(capProf(0.072, 0.27), 10)),
    shin: mesh(lathe(capProf(0.062, 0.25), 10)),
  }
  const avatar = new Avatar(meshes)

  /* -------------------------------------------------------- targets -- */

  const CF: [number, number, number] = HDR
    ? [gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT]
    : [gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE]
  let T: Targets | null = null
  let W = 0
  let H = 0

  function makeTargets(w: number, h: number): Targets {
    const textures: WebGLTexture[] = []
    const framebuffers: WebGLFramebuffer[] = []
    const renderbuffers: WebGLRenderbuffer[] = []
    const tex = (
      tw: number,
      th: number,
      fmt: [number, number, number],
      filter: number = gl.LINEAR,
      mip = false,
    ) => {
      const t = gl.createTexture()
      if (!t) throw new Error('channels: texture allocation failed')
      textures.push(t)
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texImage2D(gl.TEXTURE_2D, 0, fmt[0], tw, th, 0, fmt[1], fmt[2], null)
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        mip ? gl.LINEAR_MIPMAP_LINEAR : filter,
      )
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      if (mip) gl.generateMipmap(gl.TEXTURE_2D)
      return t
    }
    const rb = (fmt: number, rw: number, rh: number, samples: number) => {
      const r = gl.createRenderbuffer()
      if (!r) throw new Error('channels: renderbuffer allocation failed')
      renderbuffers.push(r)
      gl.bindRenderbuffer(gl.RENDERBUFFER, r)
      if (samples > 0)
        gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, fmt, rw, rh)
      else gl.renderbufferStorage(gl.RENDERBUFFER, fmt, rw, rh)
      return r
    }
    const fbo = (
      colors: (WebGLTexture | { rb: WebGLRenderbuffer })[],
      depth?: WebGLTexture | { rb: WebGLRenderbuffer },
    ) => {
      const f = gl.createFramebuffer()
      if (!f) throw new Error('channels: framebuffer allocation failed')
      framebuffers.push(f)
      gl.bindFramebuffer(gl.FRAMEBUFFER, f)
      colors.forEach((c, i) => {
        if ('rb' in c) {
          gl.framebufferRenderbuffer(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0 + i,
            gl.RENDERBUFFER,
            c.rb,
          )
        } else {
          gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0 + i,
            gl.TEXTURE_2D,
            c,
            0,
          )
        }
      })
      if (depth) {
        if ('rb' in depth) {
          gl.framebufferRenderbuffer(
            gl.FRAMEBUFFER,
            gl.DEPTH_ATTACHMENT,
            gl.RENDERBUFFER,
            depth.rb,
          )
        } else {
          gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.DEPTH_ATTACHMENT,
            gl.TEXTURE_2D,
            depth,
            0,
          )
        }
      }
      gl.drawBuffers(colors.map((_, i) => gl.COLOR_ATTACHMENT0 + i))
      return f
    }
    const msC = { rb: rb(CF[0], w, h, SAMPLES) }
    const msD = { rb: rb(gl.DEPTH_COMPONENT24, w, h, SAMPLES) }
    const msV = MRT ? { rb: rb(gl.RG16F, w, h, SAMPLES) } : null
    const ms = fbo(msV ? [msC, msV] : [msC], msD)
    const scene = tex(w, h, CF)
    const depth = tex(
      w,
      h,
      [gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT],
      gl.NEAREST,
    )
    const res = fbo([scene], depth)
    const vel = MRT
      ? tex(w, h, [gl.RG16F, gl.RG, gl.HALF_FLOAT])
      : tex(1, 1, [gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE])
    const resV = MRT ? fbo([vel]) : null
    const rw = Math.max(2, w >> 1)
    const rh = Math.max(2, h >> 1)
    const refl = tex(rw, rh, CF, gl.LINEAR, true)
    const reflF = fbo([refl], { rb: rb(gl.DEPTH_COMPONENT16, rw, rh, 0) })
    const bw = Math.max(1, w >> 2)
    const bh = Math.max(1, h >> 2)
    const cw = Math.max(1, w >> 3)
    const ch = Math.max(1, h >> 3)
    const b0 = tex(bw, bh, CF)
    const b0t = tex(bw, bh, CF)
    const b1 = tex(cw, ch, CF)
    const b1t = tex(cw, ch, CF)
    const t: Targets = {
      ms,
      res,
      resV,
      scene,
      depth,
      vel,
      refl,
      reflF,
      rw,
      rh,
      b0,
      b0t,
      b1,
      b1t,
      fb0: fbo([b0]),
      fb0t: fbo([b0t]),
      fb1: fbo([b1]),
      fb1t: fbo([b1t]),
      bw,
      bh,
      cw,
      ch,
      textures,
      framebuffers,
      renderbuffers,
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return t
  }

  function freeTargets(): void {
    if (!T) return
    for (const t of T.textures) gl.deleteTexture(t)
    for (const f of T.framebuffers) gl.deleteFramebuffer(f)
    for (const r of T.renderbuffers) gl.deleteRenderbuffer(r)
    T = null
  }

  function resize(): Targets {
    const dpr = Math.min(devicePixelRatio || 1, options.maxDpr())
    const w = Math.max(2, Math.round(innerWidth * dpr))
    const h = Math.max(2, Math.round(innerHeight * dpr))
    if (T && w === W && h === H) return T
    W = w
    H = h
    canvas.width = w
    canvas.height = h
    freeTargets()
    T = makeTargets(w, h)
    return T
  }

  /* --------------------------------------------------------- covers -- */

  function upload(
    source: TexImageSource,
    old?: WebGLTexture | null,
  ): WebGLTexture {
    const t = old ?? gl.createTexture()
    if (!t) throw new Error('channels: texture allocation failed')
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.SRGB8_ALPHA8,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      source,
    )
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR,
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    if (extA && maxAniso) {
      gl.texParameterf(gl.TEXTURE_2D, extA.TEXTURE_MAX_ANISOTROPY_EXT, maxAniso)
    }
    return t
  }

  const placeholder = (() => {
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 40
    const g = c.getContext('2d')
    if (g) {
      const gr = g.createLinearGradient(0, 0, 64, 40)
      gr.addColorStop(0, '#1d242c')
      gr.addColorStop(1, '#0b0e12')
      g.fillStyle = gr
      g.fillRect(0, 0, 64, 40)
    }
    return upload(c)
  })()

  const covW = innerWidth < 700 ? 512 : 640
  const covH = (covW * COVER_H) / COVER_W
  const font = options.font
  // Covers are composed once; with a fallback face they would stay wrong.
  const fontsReady: Promise<unknown> = document.fonts
    ? Promise.all(
        [`700 40px ${font}`, `600 30px ${font}`].map((spec) =>
          document.fonts.load(spec),
        ),
      ).catch(() => undefined)
    : Promise.resolve()

  /** The cover as the page draws it: motif, then `coverLayout`'s type. */
  function composeCover(
    item: Item,
    art: HTMLImageElement | null,
  ): HTMLCanvasElement {
    const c = document.createElement('canvas')
    c.width = covW
    c.height = covH
    const g = c.getContext('2d')
    if (!g) return c
    g.scale(covW / COVER_W, covH / COVER_H)
    if (art) g.drawImage(art, 0, 0, COVER_W, COVER_H)
    else {
      g.fillStyle = '#10151b'
      g.fillRect(0, 0, COVER_W, COVER_H)
    }
    const L = coverLayout({
      seed: item.seed,
      title: item.title,
      meta: item.meta,
      chip: item.chip,
    })
    const spacing = (px: number) => {
      if ('letterSpacing' in g) g.letterSpacing = `${px}px`
    }
    g.save()
    g.translate(L.kw.x, L.kw.y)
    if (L.kw.skew) g.transform(1, 0, -0.1, 1, 0, 0)
    g.font = `700 ${L.kw.size}px ${font}`
    spacing(L.kw.spacing)
    g.shadowColor = 'rgba(0,0,0,.55)'
    g.shadowBlur = 20
    g.shadowOffsetY = 6
    g.globalAlpha = L.kind === 'huge' ? 0.92 : 1
    g.fillStyle = '#fff'
    g.fillText(L.keyword, 0, 0)
    g.shadowColor = 'transparent'
    g.globalAlpha = 1
    g.lineWidth = 2
    g.strokeStyle = 'rgba(255,255,255,.35)'
    g.strokeText(L.keyword, 0, 0)
    g.restore()
    spacing(0)
    g.shadowColor = 'rgba(0,0,0,.55)'
    g.shadowBlur = 8
    g.shadowOffsetY = 3
    g.font = `${TYPE.title.weight} ${TYPE.title.size}px ${font}`
    g.fillStyle = '#fff'
    for (const line of L.lines) g.fillText(line.text, line.x, line.y)
    g.font = `${TYPE.meta.weight} ${TYPE.meta.size}px ${font}`
    spacing(TYPE.meta.spacing)
    g.fillStyle = 'rgba(255,255,255,.72)'
    g.fillText(L.meta.text, L.meta.x, L.meta.y)
    g.shadowColor = 'transparent'
    const { chip } = L
    g.beginPath()
    g.roundRect(chip.x, chip.y, chip.w, 30, 15)
    g.fillStyle = 'rgba(0,0,0,.5)'
    g.fill()
    g.strokeStyle = 'rgba(255,255,255,.3)'
    g.lineWidth = 1.5
    g.stroke()
    g.font = `${TYPE.chip.weight} ${TYPE.chip.size}px ${font}`
    spacing(TYPE.chip.spacing)
    g.fillStyle = '#fff'
    g.fillText(chip.text, chip.x + 13, chip.y + 20)
    spacing(0)
    g.beginPath()
    g.roundRect(2, 2, COVER_W - 4, COVER_H - 4, 26)
    g.strokeStyle = 'rgba(255,255,255,.22)'
    g.lineWidth = 2.5
    g.stroke()
    return c
  }

  interface CoverEntry {
    tex: WebGLTexture | null
    used: number
    art: HTMLImageElement | null
    canvas: HTMLCanvasElement | null
    state: 'loading' | 'ready' | 'done' | 'failed'
  }
  const covers = new Map<Item, CoverEntry>()
  let frameNo = 0

  function request(item: Item): CoverEntry {
    let entry = covers.get(item)
    if (entry) return entry
    entry = {
      tex: null,
      used: frameNo,
      art: null,
      canvas: null,
      state: 'loading',
    }
    covers.set(item, entry)
    const img = new Image()
    img.decoding = 'async'
    img.src = item.art
    const done = entry
    Promise.all([img.decode(), fontsReady])
      .then(() => {
        done.art = img
        done.state = 'ready'
      })
      .catch(() => {
        done.state = 'ready'
      })
    return entry
  }

  function coverTex(item: Item): WebGLTexture {
    const entry = request(item)
    entry.used = frameNo
    return entry.tex ?? placeholder
  }

  /** Uploads what has decoded, nearest first, inside a time budget. */
  function pumpCovers(budgetMs: number): void {
    const t0 = performance.now()
    for (const [item, entry] of covers) {
      if (performance.now() - t0 > budgetMs) break
      if (entry.state !== 'ready') continue
      entry.canvas = composeCover(item, entry.art)
      entry.tex = upload(entry.canvas)
      entry.state = 'done'
    }
    // Keep at most ~44 textures (about 50 MB at the desktop size).
    if (covers.size > 44) {
      let oldest: [Item, CoverEntry] | null = null
      for (const pair of covers) {
        if (
          pair[1].used < frameNo - 2 &&
          (!oldest || pair[1].used < oldest[1].used)
        )
          oldest = pair
      }
      if (oldest) {
        if (oldest[1].tex) gl.deleteTexture(oldest[1].tex)
        covers.delete(oldest[0])
      }
    }
  }

  let backTex: WebGLTexture | null = null
  let backFor: Item | null = null

  /** The tile's back face: the glass panel it flips into. */
  function prepareBack(
    item: Item,
    vp: Viewport,
    mode: 'page' | 'reader',
  ): void {
    const rect = panelRect(vp, mode)
    const w = 1024
    const h = Math.min(2048, Math.round(w / (rect.w / rect.h)))
    const s = w / rect.w
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')
    if (!g) return
    const bg = g.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#1d2631')
    bg.addColorStop(Math.min(1, (160 * s) / h), '#0c1015')
    bg.addColorStop(1, '#0a0d12')
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    const ch = channels[item.chan]
    const glow = g.createRadialGradient(w * 0.8, 0, 0, w * 0.8, 0, w * 0.7)
    glow.addColorStop(0, `hsla(${ch.hue},80%,50%,.18)`)
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = glow
    g.fillRect(0, 0, w, h)
    const bar = 64 * s
    g.fillStyle = 'rgba(255,255,255,.08)'
    g.fillRect(0, bar, w, Math.max(1, s))
    g.font = `700 ${12 * s}px ${font}`
    if ('letterSpacing' in g) g.letterSpacing = `${2.4 * s}px`
    g.fillStyle = `hsl(${ch.hue},95%,70%)`
    const kicker =
      mode === 'page' ? `HOME  /  ${ch.name.toUpperCase()}` : item.meta
    g.fillText(kicker, 28 * s, 37 * s)
    if ('letterSpacing' in g) g.letterSpacing = '0px'
    const pad = vp.w <= 700 ? 16 : 44
    const col = Math.min(768, rect.w - pad * 2)
    const x0 = (rect.w - col) / 2
    const top = bar + 30 * s
    const cover = covers.get(item)?.canvas
    let tx = x0 * s
    if (mode === 'page' && cover) {
      const cw = (vp.w <= 700 ? col : Math.min(300, col * 0.4)) * s
      g.save()
      g.beginPath()
      g.roundRect(x0 * s, top, cw, cw * 0.625, cw * 0.042)
      g.clip()
      g.drawImage(cover, x0 * s, top, cw, cw * 0.625)
      g.restore()
      if (vp.w > 700) tx = x0 * s + cw + 28 * s
    }
    g.font = `400 ${40 * s}px ${font}`
    g.fillStyle = '#fff'
    const maxW = (x0 + col) * s - tx
    const words = item.title.split(/\s+/)
    const lines: string[] = []
    let line = ''
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      if (g.measureText(next).width > maxW && line) {
        lines.push(line)
        line = word
      } else line = next
    }
    if (line) lines.push(line)
    const titleTop =
      mode === 'page' && vp.w <= 700 && cover
        ? top + col * s * 0.625 + 60 * s
        : top + 70 * s
    lines
      .slice(0, 3)
      .forEach((l, i) => g.fillText(l, tx, titleTop + i * 46 * s))
    g.fillStyle = 'rgba(255,255,255,.07)'
    const linesTop = Math.max(titleTop + 3 * 46 * s, top + 260 * s)
    let seed = item.title.length
    for (let i = 0; i < 18; i++) {
      seed = (seed * 16807) % 2147483647
      g.fillRect(
        x0 * s,
        linesTop + i * 30 * s,
        col * s * (0.6 + (seed / 2147483647) * 0.4),
        9 * s,
      )
    }
    g.beginPath()
    g.roundRect(2, 2, w - 4, h - 4, 20 * s)
    g.strokeStyle = 'rgba(255,255,255,.2)'
    g.lineWidth = 3
    g.stroke()
    backTex = upload(c, backTex)
    backFor = item
  }

  /* ---------------------------------------------------------- frame -- */

  const cam = {
    eye: new Spring3([0, 4, 22], 4.2, 0.95),
    at: new Spring3([1, 0, 0], 4.6, 0.95),
  }
  const prevModels = new Map<string, Mat4>()
  let firstFrame = true
  let floorY = FLOOR_Y
  const SPOT = {
    pos: [1.6, 7.2, 5.2] as Vec3,
    dir: [0, 0, 0] as Vec3,
    col: [1.0, 0.94, 0.86] as Vec3,
    cos: Math.cos((25 * PI) / 180),
  }
  {
    const d: Vec3 = [
      0.3 - SPOT.pos[0],
      FLOOR_Y - SPOT.pos[1],
      -0.2 - SPOT.pos[2],
    ]
    const l = Math.hypot(...d)
    SPOT.dir = d.map((x) => x / l) as Vec3
  }
  const SPOT2 = {
    pos: [-4, 9, -8] as Vec3,
    dir: (() => {
      const d: Vec3 = [3.8, -9.5, 4]
      const l = Math.hypot(...d)
      return d.map((x) => x / l) as Vec3
    })(),
  }
  const accent = new Spring3(hueRgb(205, 0.9, 0.6), 3, 1)
  let lastVP: Mat4 | null = null

  function setCommon(
    p: Program,
    refl: boolean,
    camPos: Vec3,
    vp: Mat4 | null,
    pvp: Mat4 | null,
  ): void {
    const u = p.u
    gl.useProgram(p.p)
    gl.uniform3fv(u.uCam, camPos)
    gl.uniform3fv(u.uSpotPos, SPOT.pos)
    gl.uniform3fv(u.uSpotDir, SPOT.dir)
    gl.uniform3fv(u.uSpotCol, SPOT.col)
    gl.uniform1f(u.uSpotCos, SPOT.cos)
    gl.uniform3fv(u.uAccent, accent.v)
    gl.uniform1f(u.uTime, S.reduced ? 0 : S.t)
    gl.uniform1f(u.uFloorY, floorY)
    gl.uniform1f(u.uRefl, refl ? 1 : 0)
    if (u.uVP && vp) gl.uniformMatrix4fv(u.uVP, false, vp)
    if (u.uPrevVP && pvp) gl.uniformMatrix4fv(u.uPrevVP, false, pvp)
  }

  /** Computed once a frame and drawn twice: the reflection, then the room. */
  function buildDrawList(
    vp: Mat4,
    fr: FrameInfo,
    portrait: boolean,
  ): DrawItem[] {
    const list: DrawItem[] = []
    const chanPos = S.chanS.v
    const o = S.openT
    const oe = easeIO(o)
    for (let ci = 0; ci < channels.length; ci++) {
      const d = ci - chanPos
      if (Math.abs(d) >= 1) continue
      const row = rowLayout(d)
      const items = channels[ci].items
      const fp = S.rowS[ci].v
      for (let i = 0; i < items.length; i++) {
        const k = i - fp
        if (k < -3.2 || k > 7.5) continue
        const L = tileLayout(k, portrait)
        const isOpen = S.open === items[i]
        let x = L.x
        let y = row.y
        let z = L.z + row.z
        let ry = L.ry
        let sx = row.s
        let sy = row.s
        let a = L.a * row.a
        const focus =
          clamp(1 - Math.abs(k) * 1.4, 0, 1) *
          (ci === S.chan ? 1 : 0.4) *
          clamp(1 - Math.abs(d) * 2, 0, 1)
        if (isOpen) {
          x = lerp(x, 0, oe)
          y = lerp(y, 0, oe)
          z = lerp(z, OPEN_Z, oe)
          ry = lerp(
            ry,
            S.reduced ? 0 : PI,
            easeIO(clamp(o * 1.25 - 0.12, 0, 1)),
          )
          sx = lerp(sx, fr.openSX, oe)
          sy = lerp(sy, fr.openSY, oe)
        } else if (o > 0) {
          a *= 1 - oe * 0.9
          z -= oe * 2
        }
        if (a < 0.01) continue
        const item = items[i]
        const m = M4.trs([x, y, z], [0, ry, 0], [sx, sy, 1])
        const key = `${ci}:${i}`
        const pm = (!firstFrame && prevModels.get(key)) || m
        const sw = S.sweep.get(item)
        list.push({
          item,
          chan: ci,
          index: i,
          m,
          pm,
          a,
          focus,
          sweep: sw === undefined ? -1 : (S.t - sw) / 1.05,
          isOpen,
          hover: S.hover === i && ci === S.chan ? 1 : 0,
          depth: M4.apply(vp, x, y, z)[3],
          x,
          y,
          z,
          ry,
          sx,
        })
      }
    }
    list.sort((p, q) => q.depth - p.depth)
    return list
  }

  function drawScene(
    list: DrawItem[],
    refl: boolean,
    vp: Mat4,
    pvp: Mat4,
    camPos: Vec3,
    fr: FrameInfo,
    t: Targets,
  ): void {
    gl.disable(gl.DEPTH_TEST)
    gl.depthMask(false)
    gl.disable(gl.BLEND)
    setCommon(P.bg, refl, camPos, null, null)
    gl.uniformMatrix4fv(P.bg.u.uInvVP, false, M4.invert(vp))
    gl.uniformMatrix4fv(P.bg.u.uPrevVP, false, pvp)
    gl.uniform3fv(P.bg.u.uAccent2, fr.accent2)
    gl.bindVertexArray(null)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.enable(gl.DEPTH_TEST)
    gl.depthMask(true)
    gl.depthFunc(gl.LEQUAL)
    if (!refl) {
      setCommon(P.floor, false, camPos, vp, pvp)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, t.refl)
      gl.uniform1i(P.floor.u.uReflT, 0)
      gl.uniform2f(P.floor.u.uRes, W, H)
      gl.uniform4fv(P.floor.u.uShadow, fr.shadows)
      gl.uniform1i(P.floor.u.uNShadow, fr.nShadow)
      gl.uniform3fv(P.floor.u.uAvatar, fr.avatar)
      gl.bindVertexArray(G.floor.vao)
      gl.drawArrays(gl.TRIANGLES, 0, G.floor.count)
    }
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)
    gl.frontFace(refl ? gl.CW : gl.CCW)
    setCommon(P.av, refl, camPos, vp, pvp)
    gl.uniform1f(P.av.u.uAlpha, 1)
    for (const part of avatar.parts) {
      gl.uniformMatrix4fv(P.av.u.uModel, false, part.m)
      gl.uniformMatrix4fv(
        P.av.u.uPrevModel,
        false,
        firstFrame ? part.m : part.pm,
      )
      gl.uniform3fv(P.av.u.uColor, part.col)
      gl.bindVertexArray(part.mesh.vao)
      gl.drawArrays(gl.TRIANGLES, 0, part.mesh.count)
    }
    gl.enable(gl.BLEND)
    for (const d of list) {
      if ((d.focus > 0.02 && !refl) || (refl && d.focus > 0.2)) {
        gl.disable(gl.CULL_FACE)
        gl.depthMask(false)
        gl.blendFunc(gl.ONE, gl.ONE)
        setCommon(P.glow, refl, camPos, vp, pvp)
        const gm = M4.mul(d.m, M4.trs([0, 0, -0.09], [0, 0, 0], [1, 1, 1]))
        gl.uniformMatrix4fv(P.glow.u.uModel, false, gm)
        gl.uniformMatrix4fv(P.glow.u.uPrevModel, false, gm)
        gl.uniform2f(P.glow.u.uHalf, TILE_W / 2, TILE_H / 2)
        gl.uniform1f(P.glow.u.uRad, TILE_R)
        gl.uniform1f(
          P.glow.u.uInt,
          d.focus * d.a * (1 - S.openT) * 0.2 * fr.glowPulse,
        )
        gl.bindVertexArray(G.glow.vao)
        gl.drawArrays(gl.TRIANGLES, 0, G.glow.count)
        gl.depthMask(true)
        gl.enable(gl.CULL_FACE)
      }
      gl.blendFuncSeparate(
        gl.SRC_ALPHA,
        gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA,
      )
      // The reflection pass stores height above the floor in alpha.
      if (refl) gl.disable(gl.BLEND)
      setCommon(P.tile, refl, camPos, vp, pvp)
      const u = P.tile.u
      gl.uniformMatrix4fv(u.uModel, false, d.m)
      gl.uniformMatrix4fv(u.uPrevModel, false, d.pm)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, coverTex(d.item))
      gl.uniform1i(u.uTex, 0)
      const hasBack = d.isOpen && backTex !== null && backFor === d.item
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, hasBack ? backTex : placeholder)
      gl.uniform1i(u.uBack, 1)
      gl.uniform1f(u.uHasBack, hasBack ? 1 : 0)
      gl.uniform1f(u.uAlpha, d.a)
      gl.uniform1f(u.uFocus, d.focus)
      gl.uniform1f(u.uSweep, S.reduced ? -1 : d.sweep)
      gl.uniform1f(u.uHover, d.hover)
      gl.uniform2f(u.uHalf, TILE_W / 2, TILE_H / 2)
      gl.uniform1f(u.uRad, TILE_R)
      gl.disable(gl.CULL_FACE)
      gl.bindVertexArray(G.tile.vao)
      gl.drawArrays(gl.TRIANGLES, 0, G.tile.count)
      if (refl) gl.enable(gl.BLEND)
    }
    gl.disable(gl.CULL_FACE)
    if (!refl) {
      gl.depthMask(false)
      gl.blendFunc(gl.ONE, gl.ONE)
      setCommon(P.pt, false, camPos, vp, pvp)
      gl.uniform1f(P.pt.u.uPx, H * 0.012)
      gl.bindVertexArray(G.pts.vao)
      gl.drawArrays(gl.POINTS, 0, G.pts.count)
      gl.depthMask(true)
    }
    gl.disable(gl.BLEND)
    gl.bindVertexArray(null)
  }

  function fullscreen(
    p: Program,
    target: WebGLFramebuffer | null,
    w: number,
    h: number,
  ): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target)
    gl.viewport(0, 0, w, h)
    gl.useProgram(p.p)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  function bindTex(
    p: Program,
    name: string,
    t: WebGLTexture,
    unit: number,
  ): void {
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.uniform1i(p.u[name], unit)
  }

  let lastList: DrawItem[] = []
  let lastVPForPick: Mat4 | null = null

  function frame(
    dt: number,
    vp: Viewport,
    mode: 'page' | 'reader',
  ): ScreenRect | null {
    frameNo++
    const t = resize()
    const base = framing(vp)
    floorY = base.floorY
    const asp = W / H
    const oe = easeIO(S.openT)
    const pr = panelRect(vp, mode)
    const visH = 2 * OPEN_D * Math.tan(base.fov / 2)
    const pcy = ((pr.y + pr.h / 2 - vp.h / 2) / vp.h) * visH
    const ch = channels[S.chan]
    accent.target = hueRgb(ch.hue, 0.9, 0.6)
    accent.step(dt)
    const fr: FrameInfo = {
      fov: base.fov,
      floorY: base.floorY,
      avatar: base.avatar,
      openSY: ((pr.h / vp.h) * visH) / TILE_H,
      openSX: ((pr.w / vp.w) * visH * asp) / TILE_W,
      accent2: hueRgb(ch.hue + 40, 0.7, 0.5),
      glowPulse: S.reduced ? 1 : 0.85 + 0.15 * Math.sin(S.t * 2.4),
      shadows: new Float32Array(40),
      nShadow: 0,
    }
    const drift = S.reduced
      ? [0, 0]
      : [Math.sin(S.t * 0.21) * 0.07, Math.sin(S.t * 0.17) * 0.05]
    const par = S.reduced ? [0, 0] : [S.mx * 0.35, -S.my * 0.18]
    const be: Vec3 = [
      base.eye[0] + drift[0] + par[0],
      base.eye[1] + drift[1] + par[1],
      base.eye[2],
    ]
    // Both panels are centred horizontally, so only the height differs.
    const oeye: Vec3 = [0, pcy, OPEN_Z + OPEN_D]
    const oat: Vec3 = [0, pcy, OPEN_Z]
    cam.eye.target = [
      lerp(be[0], oeye[0], oe),
      lerp(be[1], oeye[1], oe),
      lerp(be[2], oeye[2], oe),
    ]
    cam.at.target = [
      lerp(base.at[0], oat[0], oe),
      lerp(base.at[1], oat[1], oe),
      lerp(base.at[2], oat[2], oe),
    ]
    // The first frame is the resting frame: no fly-in, because the page
    // under the canvas is already showing this view.
    if (frameNo === 1) {
      cam.eye.snap(cam.eye.s.map((s) => s.t) as Vec3)
      cam.at.snap(cam.at.s.map((s) => s.t) as Vec3)
    }
    cam.eye.step(dt)
    cam.at.step(dt)
    if ((S.openT > 0.001 && S.openT < 0.999) || S.open) {
      // Once open, the panel must sit exactly where the page's will.
      const k = sstep(0.7, 1, S.openT)
      for (const s of [...cam.eye.s, ...cam.at.s]) s.v = lerp(s.v, s.t, k)
    }
    const eye = cam.eye.v
    const at = cam.at.v
    const viewProj = M4.mul(
      M4.perspective(base.fov, asp, 0.1, 120),
      M4.lookAt(eye, at),
    )
    const pvp = lastVP ?? viewProj

    avatar.update(dt, S.t, {
      pos: base.avatar,
      cam: eye,
      tile: S.open ? [0, 0, OPEN_Z] : [0, 0, 0],
      lastInput: S.lastInput,
      open: S.openT,
      mx: S.mx,
      my: S.my,
      tileSide: base.avatar[0] > 0 ? -1 : 1,
      reduced: S.reduced,
    })

    const list = buildDrawList(viewProj, fr, vp.portrait)
    let ns = 0
    for (const d of list) {
      if (ns >= 10 || d.a < 0.1 || d.isOpen) continue
      const k = ((floorY - d.y) / SPOT.dir[1]) * 0.35
      fr.shadows.set(
        [
          d.x + SPOT.dir[0] * k,
          d.z + SPOT.dir[2] * k - 0.2,
          TILE_W * 0.5 * Math.abs(Math.cos(d.ry)) * d.sx + 0.1,
          d.a * 0.9,
        ],
        ns * 4,
      )
      ns++
    }
    fr.nShadow = ns

    // Reflection.
    const mirror = M4.trs([0, 2 * floorY, 0], [0, 0, 0], [1, -1, 1])
    const rvp = M4.mul(viewProj, mirror)
    const rpvp = M4.mul(pvp, mirror)
    const reye: Vec3 = [eye[0], 2 * floorY - eye[1], eye[2]]
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.reflF)
    gl.viewport(0, 0, t.rw, t.rh)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    drawScene(list, true, rvp, rpvp, reye, fr, t)
    gl.bindTexture(gl.TEXTURE_2D, t.refl)
    gl.generateMipmap(gl.TEXTURE_2D)

    // The room, multisampled.
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.ms)
    gl.viewport(0, 0, W, H)
    gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 1])
    if (MRT) gl.clearBufferfv(gl.COLOR, 1, [0, 0, 0, 0])
    gl.clear(gl.DEPTH_BUFFER_BIT)
    drawScene(list, false, viewProj, pvp, eye, fr, t)

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, t.ms)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, t.res)
    gl.readBuffer(gl.COLOR_ATTACHMENT0)
    gl.blitFramebuffer(
      0,
      0,
      W,
      H,
      0,
      0,
      W,
      H,
      gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT,
      gl.NEAREST,
    )
    if (t.resV) {
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, t.resV)
      gl.readBuffer(gl.COLOR_ATTACHMENT1)
      gl.blitFramebuffer(
        0,
        0,
        W,
        H,
        0,
        0,
        W,
        H,
        gl.COLOR_BUFFER_BIT,
        gl.NEAREST,
      )
      gl.readBuffer(gl.COLOR_ATTACHMENT0)
    }
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)

    // Bloom.
    gl.disable(gl.DEPTH_TEST)
    gl.bindVertexArray(null)
    gl.useProgram(P.bright.p)
    bindTex(P.bright, 'uT', t.scene, 0)
    gl.uniform2f(P.bright.u.uTx, 1 / W, 1 / H)
    fullscreen(P.bright, t.fb0, t.bw, t.bh)
    const blur = (
      src: WebGLTexture,
      dx: number,
      dy: number,
      dst: WebGLFramebuffer,
      w: number,
      h: number,
    ) => {
      gl.useProgram(P.blur.p)
      bindTex(P.blur, 'uT', src, 0)
      gl.uniform2f(P.blur.u.uDir, dx, dy)
      fullscreen(P.blur, dst, w, h)
    }
    blur(t.b0, 1 / t.bw, 0, t.fb0t, t.bw, t.bh)
    blur(t.b0t, 0, 1 / t.bh, t.fb0, t.bw, t.bh)
    blur(t.b0, 2 / t.bw, 0, t.fb1t, t.cw, t.ch)
    blur(t.b1t, 0, 1.5 / t.ch, t.fb1, t.cw, t.ch)
    blur(t.b1, 1.5 / t.cw, 0, t.fb1t, t.cw, t.ch)
    blur(t.b1t, 0, 1.5 / t.ch, t.fb1, t.cw, t.ch)

    // Composite.
    const pc = P.comp
    gl.useProgram(pc.p)
    setCommon(pc, false, eye, null, null)
    bindTex(pc, 'uScene', t.scene, 0)
    bindTex(pc, 'uVel', t.vel, 1)
    bindTex(pc, 'uDepth', t.depth, 2)
    bindTex(pc, 'uB0', t.b0, 3)
    bindTex(pc, 'uB1', t.b1, 4)
    gl.uniformMatrix4fv(pc.u.uInvVP, false, M4.invert(viewProj))
    const mb =
      S.reduced || firstFrame ? 0 : clamp(1 / 40 / Math.max(dt, 1e-3), 0, 1.6)
    gl.uniform1f(pc.u.uMB, mb)
    gl.uniform1f(pc.u.uFrame, frameNo % 64)
    gl.uniform1f(pc.u.uFade, 1)
    gl.uniform1f(pc.u.uVolI, 1)
    gl.uniform1f(pc.u.uBloomI, 1)
    gl.uniform2f(pc.u.uGVel, 0, 0)
    gl.uniform2f(pc.u.uRes, W, H)
    gl.uniform3fv(pc.u.uSpot2Pos, SPOT2.pos)
    gl.uniform3fv(pc.u.uSpot2Dir, SPOT2.dir)
    gl.uniform3fv(
      pc.u.uSpot2Col,
      accent.v.map((x) => x * 0.9 + 0.05),
    )
    fullscreen(pc, null, W, H)

    lastVP = viewProj
    firstFrame = false
    prevModels.clear()
    for (const d of list) prevModels.set(`${d.chan}:${d.index}`, d.m)
    // Warm the neighbouring rows so a channel change has art waiting.
    for (const ci of [S.chan + 1, S.chan - 1]) {
      const row = channels[ci]
      if (!row) continue
      const from = Math.max(0, S.idx[ci] - 1)
      for (const item of row.items.slice(from, S.idx[ci] + 5)) request(item)
    }
    pumpCovers(frameNo < 3 ? 400 : 7)

    lastList = list
    lastVPForPick = viewProj
    const project = (x: number, y: number, z: number): [number, number] => {
      const c = M4.apply(viewProj, x, y, z)
      return [
        ((c[0] / c[3]) * 0.5 + 0.5) * vp.w,
        (1 - ((c[1] / c[3]) * 0.5 + 0.5)) * vp.h,
      ]
    }
    const current = channels[S.chan].items[S.idx[S.chan]]
    const focus =
      list.find((d) => d.item === current && !d.isOpen) ??
      list.find((d) => d.item === current)
    if (!focus) return null
    const corners = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([sx, sy]) => {
      const p = M4.apply(
        focus.m,
        (sx * TILE_W) / 2,
        (sy * TILE_H) / 2,
        TILE_D / 2,
      )
      return project(p[0], p[1], p[2])
    })
    const xs = corners.map((c) => c[0])
    const ys = corners.map((c) => c[1])
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    }
  }

  /** The index of the current row's tile under a screen point, or -1. */
  function pick(px: number, py: number, vp: Viewport): number {
    if (!lastVPForPick) return -1
    const inv = M4.invert(lastVPForPick)
    const nx = (px / vp.w) * 2 - 1
    const ny = 1 - (py / vp.h) * 2
    const a = M4.apply(inv, nx, ny, -1)
    const b = M4.apply(inv, nx, ny, 1)
    const o = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]
    const e = [b[0] / b[3], b[1] / b[3], b[2] / b[3]]
    let best = -1
    let bestT = 1e9
    for (const d of lastList) {
      if (d.a < 0.25 || d.chan !== S.chan) continue
      const im = M4.invert(d.m)
      const lo = M4.apply(im, o[0], o[1], o[2])
      const le = M4.apply(im, e[0], e[1], e[2])
      const dz = le[2] - lo[2]
      if (Math.abs(dz) < 1e-6) continue
      const k = (TILE_D / 2 - lo[2]) / dz
      if (k < 0 || k > 1) continue
      const x = lo[0] + (le[0] - lo[0]) * k
      const y = lo[1] + (le[1] - lo[1]) * k
      if (Math.abs(x) < TILE_W / 2 && Math.abs(y) < TILE_H / 2 && k < bestT) {
        bestT = k
        best = d.index
      }
    }
    return best
  }

  /**
   * Before the first frame: the current row, and the head of every other
   * one, so a quick channel change still lands on finished art.
   */
  function prime(): void {
    channels.forEach((row, ci) => {
      const from = ci === S.chan ? Math.max(0, S.idx[ci] - 1) : 0
      const count = ci === S.chan ? 8 : 3
      for (const item of row.items.slice(from, from + count)) request(item)
    })
  }

  function dispose(): void {
    freeTargets()
    for (const entry of covers.values())
      if (entry.tex) gl.deleteTexture(entry.tex)
    covers.clear()
    if (backTex) gl.deleteTexture(backTex)
    gl.deleteTexture(placeholder)
    for (const v of vaos) gl.deleteVertexArray(v)
    for (const b of buffers) gl.deleteBuffer(b)
    for (const p of programs) gl.deleteProgram(p)
    for (const s of shaders) gl.deleteShader(s)
  }

  const cameraTarget = (): Vec3 => cam.at.s.map((spring) => spring.t) as Vec3

  return { frame, pick, prepareBack, prime, cameraTarget, avatar, dispose }
}
