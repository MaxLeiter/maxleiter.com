import {
  clamp,
  lerp,
  linear,
  M4,
  type Mat4,
  sstep,
  Spring,
  type Vec3,
} from './math'

/**
 * The host who stands in the room: 37 lathe-mesh parts on a 17-bone
 * hierarchy, with blink, breathing, look-at, a wave and a point. The meshes
 * are built by the renderer; this file is the rig and its animation.
 */

export interface Mesh {
  vao: WebGLVertexArrayObject
  count: number
}

interface Bone {
  parent: Bone | null
  t: Vec3
  r: Vec3
  s: Vec3
  m: Mat4
}

export interface Part {
  bone: Bone
  mesh: Mesh
  col: Vec3
  local: Mat4
  m: Mat4
  /** Last frame's matrix, for the velocity buffer. */
  pm: Mat4
  /** Vertical squash for a blink; 1 is open. */
  blink: number
}

export interface Meshes {
  sphere: Mesh
  hairCap: Mesh
  tuft: Mesh
  torso: Mesh
  pocket: Mesh
  hood: Mesh
  string: Mesh
  neck: Mesh
  pelvis: Mesh
  cuff: Mesh
  upper: Mesh
  fore: Mesh
  thigh: Mesh
  shin: Mesh
}

const BONES = [
  ['root', '', [0, 0, 0]],
  ['hips', 'root', [0, 0.64, 0]],
  ['torso', 'hips', [0, 0.03, 0]],
  ['neck', 'torso', [0, 0.47, 0]],
  ['head', 'neck', [0, 0.05, 0]],
  ['shL', 'torso', [0.205, 0.41, 0]],
  ['elL', 'shL', [0, -0.235, 0]],
  ['haL', 'elL', [0, -0.215, 0]],
  ['shR', 'torso', [-0.205, 0.41, 0]],
  ['elR', 'shR', [0, -0.235, 0]],
  ['haR', 'elR', [0, -0.215, 0]],
  ['hipL', 'hips', [0.092, -0.02, 0]],
  ['knL', 'hipL', [0, -0.29, 0]],
  ['anL', 'knL', [0, -0.28, 0]],
  ['hipR', 'hips', [-0.092, -0.02, 0]],
  ['knR', 'hipR', [0, -0.29, 0]],
  ['anR', 'knR', [0, -0.28, 0]],
] as const

type BoneName = (typeof BONES)[number][0]

const COL = {
  skin: linear('#f0c09a'),
  skin2: linear('#e3a882'),
  hair: linear('#3b2a20'),
  hood: linear('#e2643a'),
  hood2: linear('#c24f2a'),
  pants: linear('#2c3a52'),
  shoe: linear('#eef0f2'),
  sole: linear('#7d848c'),
  eye: linear('#17191c'),
  white: linear('#ffffff'),
  mouth: linear('#7a3b33'),
  string: linear('#f3efe8'),
}

export class Avatar {
  bones = {} as Record<BoneName, Bone>
  parts: Part[] = []
  yaw = new Spring(-0.35, 6, 0.9)
  headY = new Spring(0, 7, 0.8)
  headX = new Spring(0, 7, 0.8)
  hop = new Spring(0, 9, 0.4)
  /** Start times of the two gestures, in scene seconds. */
  wave = -9
  present = -9
  private blinkIn = 2.5

  constructor(mk: Meshes) {
    for (const [name, parent, t] of BONES) {
      this.bones[name] = {
        parent: parent ? this.bones[parent] : null,
        t: [...t] as Vec3,
        r: [0, 0, 0],
        s: [1, 1, 1],
        m: new Float32Array(16),
      }
    }
    const P = (
      bone: BoneName,
      mesh: Mesh,
      col: Vec3,
      t: Vec3 = [0, 0, 0],
      s: Vec3 = [1, 1, 1],
      r: Vec3 = [0, 0, 0],
    ) => {
      this.parts.push({
        bone: this.bones[bone],
        mesh,
        col,
        local: M4.trs(t, r, s),
        m: new Float32Array(16),
        pm: new Float32Array(16),
        blink: 1,
      })
    }
    P('hips', mk.pelvis, COL.pants)
    P('torso', mk.torso, COL.hood)
    P('torso', mk.pocket, COL.hood2, [0, 0.14, 0.118], [1, 1, 1], [-0.12, 0, 0])
    P(
      'torso',
      mk.hood,
      COL.hood2,
      [0, 0.45, -0.025],
      [1, 1, 0.95],
      [-0.38, 0, 0],
    )
    P(
      'torso',
      mk.string,
      COL.string,
      [0.04, 0.42, 0.135],
      [1, 1, 1],
      [0.12, 0, 0],
    )
    P(
      'torso',
      mk.string,
      COL.string,
      [-0.04, 0.42, 0.135],
      [1, 1, 1],
      [0.12, 0, 0],
    )
    P('neck', mk.neck, COL.skin)
    P('head', mk.sphere, COL.skin, [0, 0.19, 0], [0.2, 0.215, 0.195])
    P('head', mk.hairCap, COL.hair, [0, 0.2, -0.012], [0.215, 0.23, 0.215])
    P(
      'head',
      mk.tuft,
      COL.hair,
      [0.05, 0.38, 0.07],
      [1, 1, 1],
      [0.75, 0.2, -0.35],
    )
    P(
      'head',
      mk.tuft,
      COL.hair,
      [-0.06, 0.385, 0.06],
      [1.1, 1, 1],
      [0.7, -0.3, 0.4],
    )
    P(
      'head',
      mk.tuft,
      COL.hair,
      [0, 0.405, -0.02],
      [1.3, 1.1, 1.3],
      [0.4, 0, 0],
    )
    P(
      'head',
      mk.sphere,
      COL.hair,
      [0, 0.315, 0.13],
      [0.17, 0.06, 0.07],
      [-0.3, 0, 0],
    )
    P('head', mk.sphere, COL.skin, [0.196, 0.19, 0], [0.032, 0.048, 0.024])
    P('head', mk.sphere, COL.skin, [-0.196, 0.19, 0], [0.032, 0.048, 0.024])
    for (const sx of [1, -1]) {
      P(
        'head',
        mk.sphere,
        COL.eye,
        [sx * 0.07, 0.2, 0.176],
        [0.03, 0.042, 0.02],
        [0, sx * 0.25, 0],
      )
      P(
        'head',
        mk.sphere,
        COL.white,
        [sx * 0.07 + 0.01, 0.212, 0.193],
        [0.009, 0.011, 0.006],
      )
      P(
        'head',
        mk.sphere,
        COL.hair,
        [sx * 0.075, 0.262, 0.178],
        [0.042, 0.009, 0.012],
        [-0.2, sx * 0.2, sx * -0.12],
      )
    }
    P('head', mk.sphere, COL.skin2, [0, 0.15, 0.2], [0.022, 0.026, 0.02])
    P(
      'head',
      mk.sphere,
      COL.mouth,
      [0, 0.098, 0.183],
      [0.036, 0.01, 0.012],
      [-0.2, 0, 0],
    )
    for (const side of ['L', 'R'] as const) {
      P(`sh${side}`, mk.upper, COL.hood)
      P(`el${side}`, mk.fore, COL.hood)
      P(`ha${side}`, mk.sphere, COL.skin, [0, -0.035, 0], [0.05, 0.062, 0.045])
      P(`el${side}`, mk.cuff, COL.hood2, [0, -0.22, 0])
      P(`hip${side}`, mk.thigh, COL.pants)
      P(`kn${side}`, mk.shin, COL.pants)
      P(
        `an${side}`,
        mk.sphere,
        COL.shoe,
        [0, -0.035, 0.045],
        [0.072, 0.058, 0.13],
      )
      P(
        `an${side}`,
        mk.sphere,
        COL.sole,
        [0, -0.075, 0.045],
        [0.078, 0.022, 0.138],
      )
    }
  }

  update(
    dt: number,
    t: number,
    ctx: {
      pos: Vec3
      cam: Vec3
      tile: Vec3
      lastInput: number
      open: number
      mx: number
      my: number
      /** Which arm points: the one nearer the focused tile. */
      tileSide: number
      reduced: boolean
    },
  ): void {
    const B = this.bones
    const [ax, ay, az] = ctx.pos
    const toYaw = (tx: number, tz: number) => Math.atan2(tx - ax, tz - az)
    const camYaw = toYaw(ctx.cam[0], ctx.cam[2])
    const tileYaw = toYaw(ctx.tile[0], ctx.tile[2])
    const lookTile = t - ctx.lastInput < 3.5 || ctx.open > 0.01
    const towards = (a: number, b: number, k: number) =>
      a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k
    this.yaw.t = clamp(
      towards(camYaw, tileYaw, lookTile ? 0.3 : 0.12),
      camYaw - 0.75,
      camYaw + 0.75,
    )
    this.yaw.step(dt)
    const target = lookTile ? ctx.tile : ctx.cam
    let ly = toYaw(target[0], target[2]) - this.yaw.v
    ly = Math.atan2(Math.sin(ly), Math.cos(ly))
    const hx = target[0] - ax
    const hz = target[2] - az
    const hy = target[1] - (ay + 1.55)
    this.headY.t = clamp(ly + ctx.mx * 0.25, -0.85, 0.85)
    this.headX.t = clamp(
      -Math.atan2(hy, Math.hypot(hx, hz)) * 0.8 + ctx.my * 0.1,
      -0.4,
      0.45,
    )
    this.headY.step(dt)
    this.headX.step(dt)
    this.hop.step(dt)

    const ta = ctx.reduced ? 0 : t
    const breath = Math.sin(ta * 2.1)
    const sway = Math.sin(ta * 1.05)
    B.root.t = [ax, ay + Math.max(0, this.hop.v) * 0.12, az]
    B.root.r = [0, this.yaw.v, 0]
    B.hips.r = [0, this.headY.v * 0.12, sway * 0.02]
    B.hips.t = [0, 0.64 + sway * 0.004, 0]
    B.torso.r = [-0.02 + breath * 0.012, this.headY.v * 0.22, -sway * 0.015]
    B.torso.s = [1 + breath * 0.008, 1, 1 + breath * 0.01]
    B.head.r = [this.headX.v, this.headY.v * 0.6, Math.sin(ta * 0.7) * 0.04]
    B.head.s = [1.32, 1.32, 1.32]
    B.neck.r = [0, this.headY.v * 0.15, 0]

    let shL: Vec3 = [sway * 0.04, 0, 0.1]
    let shR: Vec3 = [-sway * 0.04, 0, -0.1]
    let elL: Vec3 = [-0.2, 0, 0]
    let elR: Vec3 = [-0.2, 0, 0]
    const wt = t - this.wave
    if (wt >= 0 && wt < 2.4) {
      const up = sstep(0, 0.35, wt) * (1 - sstep(1.95, 2.4, wt))
      const osc = Math.sin((wt - 0.3) * 11) * up
      shR = [lerp(shR[0], -0.25, up), 0, lerp(shR[2], -2.6, up)]
      elR = [lerp(-0.2, -0.1, up), 0, lerp(0, -0.25, up) + osc * 0.45]
      B.head.r[2] += up * 0.1
    }
    const pt = t - this.present
    if (pt >= 0 && pt < 1.6) {
      const up = sstep(0, 0.3, pt) * (1 - sstep(1.1, 1.6, pt))
      if (ctx.tileSide > 0) {
        shL = [lerp(shL[0], -0.9, up), 0, lerp(shL[2], 0.55, up)]
        elL = [lerp(-0.2, -0.25, up), 0, 0]
      } else {
        shR = [lerp(shR[0], -0.9, up), 0, lerp(shR[2], -0.55, up)]
        elR = [lerp(-0.2, -0.25, up), 0, 0]
      }
    }
    B.shL.r = shL
    B.shR.r = shR
    B.elL.r = elL
    B.elR.r = elR
    B.hipL.r = [0, 0, -0.02]
    B.hipR.r = [0, 0, 0.02]
    B.knL.r = [0.02, 0, 0]
    B.knR.r = [0.02, 0, 0]
    B.anL.r = [0, 0.12, 0]
    B.anR.r = [0, -0.12, 0]

    this.blinkIn -= dt
    let eye = 1
    if (this.blinkIn < 0) {
      eye = 0.12
      if (this.blinkIn < -0.12) this.blinkIn = 2.5 + Math.random() * 3
    }

    for (const name of Object.keys(B) as BoneName[]) {
      const bone = B[name]
      const local = M4.trs(bone.t, bone.r, bone.s)
      if (bone.parent) M4.mul(bone.parent.m, local, bone.m)
      else bone.m.set(local)
    }
    for (const part of this.parts) {
      part.pm.set(part.m)
      part.blink = part.col === COL.eye ? eye : 1
      const local =
        part.blink === 1
          ? part.local
          : M4.mul(part.local, M4.trs([0, 0, 0], [0, 0, 0], [1, part.blink, 1]))
      M4.mul(part.bone.m, local, part.m)
    }
  }
}
