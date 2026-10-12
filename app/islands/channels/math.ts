/**
 * The scene's arithmetic: column-major 4x4 matrices in `Float32Array`s, the
 * way WebGL reads them, and critically-dampable springs.
 */

export type Vec3 = [number, number, number]
export type Mat4 = Float32Array

export const PI = Math.PI

export const clamp = (x: number, a: number, b: number) =>
  x < a ? a : x > b ? b : x
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const sstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
export const easeIO = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export const M4 = {
  identity(): Mat4 {
    const m = new Float32Array(16)
    m[0] = m[5] = m[10] = m[15] = 1
    return m
  },

  mul(a: Mat4, b: Mat4, out: Mat4 = new Float32Array(16)): Mat4 {
    const r = new Float32Array(16)
    for (let c = 0; c < 4; c++) {
      for (let w = 0; w < 4; w++) {
        r[c * 4 + w] =
          a[w] * b[c * 4] +
          a[4 + w] * b[c * 4 + 1] +
          a[8 + w] * b[c * 4 + 2] +
          a[12 + w] * b[c * 4 + 3]
      }
    }
    out.set(r)
    return out
  },

  perspective(fovY: number, aspect: number, near: number, far: number): Mat4 {
    const t = 1 / Math.tan(fovY / 2)
    const m = new Float32Array(16)
    m[0] = t / aspect
    m[5] = t
    m[10] = (far + near) / (near - far)
    m[11] = -1
    m[14] = (2 * far * near) / (near - far)
    return m
  },

  lookAt(eye: Vec3, at: Vec3, up: Vec3 = [0, 1, 0]): Mat4 {
    let zx = eye[0] - at[0]
    let zy = eye[1] - at[1]
    let zz = eye[2] - at[2]
    let l = Math.hypot(zx, zy, zz)
    zx /= l
    zy /= l
    zz /= l
    let xx = up[1] * zz - up[2] * zy
    let xy = up[2] * zx - up[0] * zz
    let xz = up[0] * zy - up[1] * zx
    l = Math.hypot(xx, xy, xz)
    xx /= l
    xy /= l
    xz /= l
    const yx = zy * xz - zz * xy
    const yy = zz * xx - zx * xz
    const yz = zx * xy - zy * xx
    return new Float32Array([
      xx,
      yx,
      zx,
      0,
      xy,
      yy,
      zy,
      0,
      xz,
      yz,
      zz,
      0,
      -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
      -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
      -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
      1,
    ])
  },

  invert(a: Mat4): Mat4 {
    const o = new Float32Array(16)
    const b00 = a[0] * a[5] - a[1] * a[4]
    const b01 = a[0] * a[6] - a[2] * a[4]
    const b02 = a[0] * a[7] - a[3] * a[4]
    const b03 = a[1] * a[6] - a[2] * a[5]
    const b04 = a[1] * a[7] - a[3] * a[5]
    const b05 = a[2] * a[7] - a[3] * a[6]
    const b06 = a[8] * a[13] - a[9] * a[12]
    const b07 = a[8] * a[14] - a[10] * a[12]
    const b08 = a[8] * a[15] - a[11] * a[12]
    const b09 = a[9] * a[14] - a[10] * a[13]
    const b10 = a[9] * a[15] - a[11] * a[13]
    const b11 = a[10] * a[15] - a[11] * a[14]
    let d =
      b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06
    if (!d) return o
    d = 1 / d
    o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * d
    o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * d
    o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * d
    o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * d
    o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * d
    o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * d
    o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * d
    o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * d
    o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * d
    o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * d
    o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * d
    o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * d
    o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * d
    o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * d
    o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * d
    o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * d
    return o
  },

  /** T * Ry * Rx * Rz * S. */
  trs(t: Vec3, r: Vec3, s: Vec3, out: Mat4 = new Float32Array(16)): Mat4 {
    const cx = Math.cos(r[0])
    const snx = Math.sin(r[0])
    const cy = Math.cos(r[1])
    const sny = Math.sin(r[1])
    const cz = Math.cos(r[2])
    const snz = Math.sin(r[2])
    const a00 = cy
    const a01 = sny * snx
    const a02 = sny * cx
    const a11 = cx
    const a12 = -snx
    const a20 = -sny
    const a21 = cy * snx
    const a22 = cy * cx
    out[0] = (a00 * cz + a01 * snz) * s[0]
    out[1] = a11 * snz * s[0]
    out[2] = (a20 * cz + a21 * snz) * s[0]
    out[3] = 0
    out[4] = (-a00 * snz + a01 * cz) * s[1]
    out[5] = a11 * cz * s[1]
    out[6] = (-a20 * snz + a21 * cz) * s[1]
    out[7] = 0
    out[8] = a02 * s[2]
    out[9] = a12 * s[2]
    out[10] = a22 * s[2]
    out[11] = 0
    out[12] = t[0]
    out[13] = t[1]
    out[14] = t[2]
    out[15] = 1
    return out
  },

  /** `m * [x, y, z, w]`. */
  apply(
    m: Mat4,
    x: number,
    y: number,
    z: number,
    w = 1,
  ): [number, number, number, number] {
    return [
      m[0] * x + m[4] * y + m[8] * z + m[12] * w,
      m[1] * x + m[5] * y + m[9] * z + m[13] * w,
      m[2] * x + m[6] * y + m[10] * z + m[14] * w,
      m[3] * x + m[7] * y + m[11] * z + m[15] * w,
    ]
  },
}

/**
 * A damped spring toward `t`. Substepped at 6 ms so a stiff spring stays
 * stable at any frame rate.
 */
export class Spring {
  v: number
  t: number
  vel = 0
  w: number
  z: number

  constructor(v: number, w = 9, z = 0.82) {
    this.v = v
    this.t = v
    this.w = w
    this.z = z
  }

  step(dt: number): number {
    const n = Math.max(1, Math.ceil(dt / 0.006))
    const h = dt / n
    for (let i = 0; i < n; i++) {
      const a =
        -this.w * this.w * (this.v - this.t) - 2 * this.z * this.w * this.vel
      this.vel += a * h
      this.v += this.vel * h
    }
    return this.v
  }

  snap(v: number): void {
    this.v = this.t = v
    this.vel = 0
  }

  get settled(): boolean {
    return Math.abs(this.v - this.t) < 1e-3 && Math.abs(this.vel) < 1e-3
  }
}

export class Spring3 {
  s: [Spring, Spring, Spring]

  constructor(v: Vec3, w: number, z: number) {
    this.s = [
      new Spring(v[0], w, z),
      new Spring(v[1], w, z),
      new Spring(v[2], w, z),
    ]
  }

  set target(v: Vec3) {
    this.s[0].t = v[0]
    this.s[1].t = v[1]
    this.s[2].t = v[2]
  }

  get v(): Vec3 {
    return [this.s[0].v, this.s[1].v, this.s[2].v]
  }

  step(dt: number): void {
    for (const s of this.s) s.step(dt)
  }

  snap(v: Vec3): void {
    this.s.forEach((s, i) => s.snap(v[i]))
  }

  get settled(): boolean {
    return this.s.every((s) => s.settled)
  }
}

/** `#rrggbb` to linear RGB, for colours that go into a shader. */
export function linear(hex: string): Vec3 {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.pow(v / 255, 2.2),
  ) as Vec3
}
