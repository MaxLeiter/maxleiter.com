// NIGHTRUN scene: a zero-dependency WebGL2 renderer for the menu backdrop.
// HDR (RGBA16F, MSAA) main pass, planar floor reflection with mip blur,
// instanced GPU rain, bloom chain, lens dirt, CA (masked off text), grain.
;(function () {
  'use strict'
  const S = {}
  let gl, cv, hdrOK = false
  let W = 0, H = 0, RW = 0, RH = 0
  const P = {}, M = {}, T = {}
  const st = {
    t: 0, ang: 0.6, spin: 0.22, reduced: false, quality: 'auto', scale: 1, maxScale: 1, msaa: 4,
    paintA: [0.75, 0.04, 0.06], paintB: [0.75, 0.04, 0.06], vinA: [0.05, 0.05, 0.06], vinB: [0.05, 0.05, 0.06], sweep: 1,
    glow: [0.1, 0.75, 1.0], glowT: [0.1, 0.75, 1.0], rain: 5200, rainOn: 1, dim: 0, dimT: 0,
    shot: null, cam: null, rects: new Float32Array(24), nrect: 0, fixed: false, frameMs: [],
  }
  // ---------------------------------------------------------------- math
  const v3 = {
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sc: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l] },
  }
  function persp(fy, asp, n, f, sx, sy) {
    const t = 1 / Math.tan(fy / 2), m = new Float32Array(16)
    m[0] = t / asp; m[5] = t; m[8] = sx; m[9] = sy; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = (2 * f * n) / (n - f)
    return m
  }
  function lookAt(e, c, up) {
    const z = v3.norm(v3.sub(e, c)), x = v3.norm(v3.cross(up, z)), y = v3.cross(z, x)
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -v3.dot(x, e), -v3.dot(y, e), -v3.dot(z, e), 1])
  }
  function mul(a, b) {
    const o = new Float32Array(16)
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]
      o[c * 4 + r] = s
    }
    return o
  }
  const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]) }
  const rotZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) }
  const ID = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
  const MIRROR = new Float32Array([1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])

  // ---------------------------------------------------------------- geometry
  function Geo() { return { d: [] } }
  function vtx(G, p, n, m) { G.d.push(p[0], p[1], p[2], n[0], n[1], n[2], m) }
  function triN(G, a, b, c, m, n) {
    n = n || v3.norm(v3.cross(v3.sub(b, a), v3.sub(c, a)))
    vtx(G, a, n, m); vtx(G, b, n, m); vtx(G, c, n, m)
  }
  // flat quad, normal forced to point away from `ctr`
  function quad(G, a, b, c, d, m, ctr) {
    let n = v3.norm(v3.cross(v3.sub(b, a), v3.sub(d, a)))
    if (ctr) { const mid = v3.sc(v3.add(a, c), 0.5); if (v3.dot(n, v3.sub(mid, ctr)) < 0) n = v3.sc(n, -1) }
    triN(G, a, b, c, m, n); triN(G, a, c, d, m, n)
  }
  function box(G, c, s, m) {
    const [x, y, z] = c, [a, b, e] = [s[0] / 2, s[1] / 2, s[2] / 2]
    const p = (i, j, k) => [x + i * a, y + j * b, z + k * e]
    quad(G, p(-1, -1, 1), p(1, -1, 1), p(1, 1, 1), p(-1, 1, 1), m, c)
    quad(G, p(-1, -1, -1), p(-1, 1, -1), p(1, 1, -1), p(1, -1, -1), m, c)
    quad(G, p(1, -1, -1), p(1, 1, -1), p(1, 1, 1), p(1, -1, 1), m, c)
    quad(G, p(-1, -1, -1), p(-1, -1, 1), p(-1, 1, 1), p(-1, 1, -1), m, c)
    quad(G, p(-1, 1, -1), p(-1, 1, 1), p(1, 1, 1), p(1, 1, -1), m, c)
    quad(G, p(-1, -1, -1), p(1, -1, -1), p(1, -1, 1), p(-1, -1, 1), m, c)
  }
  // square prism tube from a to b
  function tube(G, a, b, r, m) {
    const ax = v3.norm(v3.sub(b, a))
    const up = Math.abs(ax[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]
    const u = v3.sc(v3.norm(v3.cross(ax, up)), r), w = v3.sc(v3.norm(v3.cross(ax, u)), r)
    const c = v3.sc(v3.add(a, b), 0.5)
    const cs = [v3.add(u, w), v3.sub(u, w), v3.sc(v3.add(u, w), -1), v3.sub(w, u)]
    for (let i = 0; i < 4; i++) {
      const o1 = cs[i], o2 = cs[(i + 1) % 4]
      quad(G, v3.add(a, o1), v3.add(a, o2), v3.add(b, o2), v3.add(b, o1), m, c)
    }
  }
  // cylinder along x
  function cylX(G, cx, cy, cz, r, x0, x1, seg, m, cap, capM) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2
      const p = (x, a) => [x, cy + Math.cos(a) * r, cz + Math.sin(a) * r]
      const n0 = [0, Math.cos(a0), Math.sin(a0)], n1 = [0, Math.cos(a1), Math.sin(a1)]
      vtx(G, p(x0, a0), n0, m); vtx(G, p(x1, a0), n0, m); vtx(G, p(x1, a1), n1, m)
      vtx(G, p(x0, a0), n0, m); vtx(G, p(x1, a1), n1, m); vtx(G, p(x0, a1), n1, m)
      if (cap) {
        const nx = [Math.sign(x1 - x0) || 1, 0, 0]
        triN(G, [x1, cy, cz], p(x1, a0), p(x1, a1), capM, nx)
      }
    }
  }
  function ring(G, x, cy, cz, r0, r1, seg, m, nx) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2
      const p = (r, a) => [x, cy + Math.cos(a) * r, cz + Math.sin(a) * r]
      const n = [nx, 0, 0]
      triN(G, p(r0, a0), p(r1, a0), p(r1, a1), m, n); triN(G, p(r0, a0), p(r1, a1), p(r0, a1), m, n)
    }
  }
  // loft: stations [{z, pts:[[x,y]...]}], half profile x>=0, mirrored. Hard creases
  // between profile points, smooth along length (classic clean low-poly look).
  function loft(G, sts, matFn, caps) {
    const S = sts.length, K = sts[0].pts.length
    for (const sg of [1, -1]) {
      for (let k = 0; k < K - 1; k++) {
        const qn = []
        const P3 = (s, kk) => [sts[s].pts[kk][0] * sg, sts[s].pts[kk][1], sts[s].z]
        for (let s = 0; s < S - 1; s++) {
          const A = P3(s, k), B = P3(s, k + 1), C = P3(s + 1, k + 1), D = P3(s + 1, k)
          let n = v3.norm(v3.cross(v3.sub(C, A), v3.sub(B, D)))
          const yc = (sts[s].pts[0][1] + sts[s].pts[K - 1][1]) / 2
          const mid = v3.sc(v3.add(A, C), 0.5)
          if (v3.dot(n, v3.sub(mid, [0, yc, mid[2]])) < 0) n = v3.sc(n, -1)
          qn.push(n)
        }
        const vn = []
        for (let s = 0; s < S; s++) {
          const a = qn[Math.max(0, s - 1)], b = qn[Math.min(S - 2, s)]
          vn.push(v3.dot(a, b) > 0.75 ? v3.norm(v3.add(a, b)) : (s === 0 ? b : a))
        }
        for (let s = 0; s < S - 1; s++) {
          const m = matFn(k, s)
          const A = P3(s, k), B = P3(s, k + 1), C = P3(s + 1, k + 1), D = P3(s + 1, k)
          // break smoothing at segment start/end where creased
          const na = (s > 0 && v3.dot(qn[s - 1], qn[s]) <= 0.75) ? qn[s] : vn[s]
          const nb = (s < S - 2 && v3.dot(qn[s], qn[s + 1]) <= 0.75) ? qn[s] : vn[s + 1]
          vtx(G, A, na, m); vtx(G, B, na, m); vtx(G, C, nb, m)
          vtx(G, A, na, m); vtx(G, C, nb, m); vtx(G, D, nb, m)
        }
      }
    }
    if (caps) for (const [s, nz] of [[0, -1], [S - 1, 1]]) {
      const st = sts[s], pts = st.pts, cy = (pts[0][1] + pts[K - 1][1]) / 2
      const c = [0, cy, st.z], n = [0, 0, nz]
      for (const sg of [1, -1]) for (let k = 0; k < K - 1; k++)
        triN(G, c, [pts[k][0] * sg, pts[k][1], st.z], [pts[k + 1][0] * sg, pts[k + 1][1], st.z], caps(s), n)
    }
  }

  function buildCar() {
    const G = Geo()
    // z, w, yb, ysk, ych, ybelt, ytop, hood
    const BODY = [
      [-2.25, 0.84, 0.32, 0.40, 0.58, 0.79, 0.85, 0.0],
      [-2.18, 0.91, 0.26, 0.36, 0.58, 0.84, 0.90, 0.01],
      [-1.95, 0.96, 0.22, 0.33, 0.58, 0.85, 0.93, 0.01],
      [-1.70, 0.985, 0.20, 0.32, 0.57, 0.845, 0.935, 0.01],
      [-1.05, 0.98, 0.19, 0.31, 0.56, 0.82, 0.90, 0.01],
      [-0.60, 0.95, 0.18, 0.30, 0.55, 0.79, 0.86, 0.01],
      [0.20, 0.94, 0.18, 0.30, 0.54, 0.76, 0.82, 0.0],
      [0.80, 0.95, 0.18, 0.30, 0.53, 0.72, 0.78, -0.01],
      [1.20, 0.97, 0.19, 0.31, 0.52, 0.69, 0.745, -0.035],
      [1.60, 0.965, 0.20, 0.31, 0.50, 0.64, 0.685, -0.04],
      [1.95, 0.91, 0.20, 0.30, 0.47, 0.565, 0.60, -0.03],
      [2.15, 0.84, 0.21, 0.29, 0.42, 0.49, 0.525, -0.02],
      [2.27, 0.73, 0.23, 0.29, 0.37, 0.43, 0.46, -0.01],
    ].map(([z, w, yb, ysk, ych, ybelt, ytop, hood]) => ({
      z, pts: [[0, yb], [w - 0.08, yb], [w, ysk], [w + 0.015, ych], [w - 0.012, ybelt], [w - 0.11, ytop], [w * 0.45, ytop + hood], [0, ytop + hood * 1.1]],
    }))
    loft(G, BODY, (k) => (k <= 1 ? 6 : 0), (s) => 0)
    // greenhouse: z, wb, yb, wm, ym, wr, yr
    const CAB = [
      [-1.62, 0.80, 0.915, 0.78, 0.93, 0.72, 0.94],
      [-1.10, 0.815, 0.885, 0.76, 1.00, 0.63, 1.105],
      [-0.55, 0.83, 0.86, 0.75, 1.08, 0.60, 1.215],
      [0.05, 0.84, 0.82, 0.76, 1.06, 0.61, 1.235],
      [0.45, 0.85, 0.79, 0.78, 1.0, 0.64, 1.17],
      [1.08, 0.885, 0.745, 0.86, 0.755, 0.82, 0.765],
    ].map(([z, wb, yb, wm, ym, wr, yr]) => ({ z, pts: [[wb, yb], [wm, ym], [wr, yr], [0, yr + 0.02]] }))
    loft(G, CAB, (k, s) => (k === 2 && s >= 1 && s <= 3 ? 0 : 1), null)
    // spoiler
    box(G, [0, 1.10, -2.0], [1.78, 0.045, 0.34], 0)
    box(G, [0.9, 1.06, -2.0], [0.035, 0.2, 0.4], 6); box(G, [-0.9, 1.06, -2.0], [0.035, 0.2, 0.4], 6)
    box(G, [0.55, 0.99, -2.0], [0.05, 0.2, 0.1], 6); box(G, [-0.55, 0.99, -2.0], [0.05, 0.2, 0.1], 6)
    // mirrors
    box(G, [0.95, 0.84, 0.74], [0.1, 0.06, 0.12], 0); box(G, [-0.95, 0.84, 0.74], [0.1, 0.06, 0.12], 0)
    // front splitter + rear diffuser
    box(G, [0, 0.215, 2.2], [1.5, 0.03, 0.22], 6)
    box(G, [0, 0.27, -2.2], [1.4, 0.08, 0.12], 6)
    // exhausts
    for (const x of [-0.36, 0.36]) {
      // along z: build from cylinder along x by swapping: do quick ring of tubes
      const r = 0.06, seg = 12
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2
        const p = (z, a) => [x + Math.cos(a) * r, 0.3 + Math.sin(a) * r, z]
        const n0 = [Math.cos(a0), Math.sin(a0), 0], n1 = [Math.cos(a1), Math.sin(a1), 0]
        vtx(G, p(-2.12, a0), n0, 3); vtx(G, p(-2.33, a0), n0, 3); vtx(G, p(-2.33, a1), n1, 3)
        vtx(G, p(-2.12, a0), n0, 3); vtx(G, p(-2.33, a1), n1, 3); vtx(G, p(-2.12, a1), n1, 3)
        triN(G, [x, 0.3, -2.3], p(-2.3, a0), p(-2.3, a1), 6, [0, 0, -1])
      }
    }
    // wheels
    for (const [zc, s] of [[1.32, 1], [1.32, -1], [-1.38, 1], [-1.38, -1]]) {
      const xo = s * 0.975, xi = s * 0.72, R = 0.345, yc = 0.345
      cylX(G, 0, yc, zc, R, xi, xo, 28, 2)
      // tyre shoulder bevel to sidewall
      ring(G, xo, yc, zc, 0.25, R, 28, 2, s)
      ring(G, xi, yc, zc, 0.0, R, 18, 2, -s)
      // rim barrel (dark) and spokes (chrome)
      const xr = xo - s * 0.035
      cylX(G, 0, yc, zc, 0.25, xr, xo, 24, 6)
      ring(G, xr - s * 0.05, yc, zc, 0.0, 0.25, 20, 6, s)
      // brake disc + caliper
      ring(G, xr - s * 0.04, yc, zc, 0.04, 0.2, 20, 3, s)
      box(G, [xr - s * 0.03, yc + 0.12, zc - 0.1], [0.05, 0.1, 0.12], 8)
      const spokes = 6
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2 + 0.3
        const da = 0.13
        const pt = (r, aa, x) => [x, yc + Math.cos(aa) * r, zc + Math.sin(aa) * r]
        const x1 = xr + s * 0.01, x2 = xr - s * 0.03
        // spoke: tapered wedge (Y split twin spoke look)
        quad(G, pt(0.06, a - 0.25, x1), pt(0.24, a - da, x2 + s * 0.02), pt(0.24, a + da, x2 + s * 0.02), pt(0.06, a + 0.25, x1), 3, [xr - s, yc, zc])
      }
      ring(G, xr + s * 0.012, yc, zc, 0.0, 0.07, 12, 3, s)
      ring(G, xr + s * 0.004, yc, zc, 0.235, 0.255, 24, 3, s)
    }
    // underglow tube (emits downward; seen in floor reflection)
    box(G, [0, 0.17, 0], [1.5, 0.02, 3.6], 7)
    return new Float32Array(G.d)
  }

  function buildProps() {
    const G = Geo()
    // concrete pillars with neon tubes
    const pil = [[-6.6, -5.2, 10], [7.2, -7.4, 11]]
    for (const [x, z, m] of pil) {
      box(G, [x, 5, z], [0.9, 10, 0.9], 9)
      box(G, [x, 0.12, z], [1.15, 0.24, 1.15], 9)
      tube(G, [x + 0.47 * Math.sign(-x), 0.5, z + 0.47], [x + 0.47 * Math.sign(-x), 7.5, z + 0.47], 0.03, m)
      tube(G, [x - 0.47 * Math.sign(-x), 0.5, z + 0.47], [x - 0.47 * Math.sign(-x), 7.5, z + 0.47], 0.03, m)
    }
    // jersey barriers
    for (let i = -7; i <= 7; i++) {
      const x = i * 2.05
      box(G, [x, 0.42, -10.5], [1.95, 0.84, 0.5], 9)
      box(G, [x, 0.08, -10.5], [1.95, 0.16, 0.75], 9)
    }
    // overhead light rig (two long strips + frame)
    const y = 5.2
    for (const x of [-1.1, 1.1]) tube(G, [x, y, -2.8], [x, y, 2.8], 0.05, 13)
    tube(G, [-1.6, y + 0.12, -3.0], [1.6, y + 0.12, -3.0], 0.06, 6)
    tube(G, [-1.6, y + 0.12, 3.0], [1.6, y + 0.12, 3.0], 0.06, 6)
    for (const x of [-1.6, 1.6]) tube(G, [x, y + 0.12, -3.0], [x, y + 0.12, 3.0], 0.06, 6)
    for (const x of [-1.4, 1.4]) for (const z of [-2.6, 2.6]) tube(G, [x, y + 0.12, z], [x * 1.4, 16, z * 1.2], 0.015, 6)
    // neon chevron sign on far left wall
    const cx = -3.8, cy = 3.4, cz = -11.6
    for (let i = 0; i < 3; i++) {
      const ox = cx + i * 0.9
      tube(G, [ox, cy + 0.8, cz], [ox + 0.7, cy, cz], 0.045, 10 + (i === 2 ? 1 : 0))
      tube(G, [ox + 0.7, cy, cz], [ox, cy - 0.8, cz], 0.045, 10 + (i === 2 ? 1 : 0))
    }
    // backing wall for the sign
    box(G, [-2.6, 3.4, -12.0], [7.0, 6.8, 0.4], 9)
    tube(G, [-6.0, 6.6, -11.75], [0.8, 6.6, -11.75], 0.04, 12)
    // sodium lamp posts
    for (const x of [-12, 12, 20, -21]) {
      const z = x > 15 || x < -15 ? -16 : -13.5
      tube(G, [x, 0, z], [x, 7.5, z], 0.09, 6)
      tube(G, [x, 7.5, z], [x - Math.sign(x) * 1.4, 7.7, z], 0.06, 6)
      box(G, [x - Math.sign(x) * 1.5, 7.62, z], [0.6, 0.1, 0.25], 12)
    }
    return new Float32Array(G.d)
  }

  // ---------------------------------------------------------------- GLSL
  const HDR = `#version 300 es
precision highp float;
`
  const NOISE = `
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+1.7; a*=.5; } return s; }
`
  // shared environment: what the glossy car paint sees
  const ENV = `
uniform vec3 uGlow;
vec3 env(vec3 d){
  float el=d.y, az=atan(d.x,-d.z);
  vec3 c=mix(vec3(.012,.01,.03), vec3(.16,.05,.22), exp(-abs(el)*5.));
  c+=vec3(.35,.14,.05)*exp(-abs(el-.02)*22.);
  // distant city glow band with lit windows
  float band=step(-.01,el)*step(el,.06+.07*h21(vec2(floor(az*22.),3.)));
  c+=band*(vec3(.05,.04,.07)+vec3(.9,.6,.3)*step(.72,h21(floor(vec2(az*260.,el*120.))))*.6);
  if(el>0.){
    vec2 p=d.xz/max(d.y,.04)*4.2;
    float s1=smoothstep(.16,.07,abs(abs(p.x)-1.1))*smoothstep(3.2,2.7,abs(p.y));
    c+=vec3(1.,1.02,1.1)*s1*7.;
    c+=vec3(.6,.7,1.)*smoothstep(1.,0.,length(p)*.18)*.25;
  }
  // wall softbox band + broken strip lights at eye level
  float seg=step(.25,fract(az*3.1831));
  c+=vec3(.85,.9,1.)*2.2*smoothstep(.035,.0,abs(el-.17))*seg;
  c+=vec3(.5,.6,.9)*.5*smoothstep(.12,.0,abs(el-.17));
  c+=vec3(.9,.95,1.)*1.6*smoothstep(.02,.0,abs(el-.32))*step(.5,fract(az*1.2+.2));
  // neon pillars
  c+=vec3(1.,.12,.55)*6.*smoothstep(.025,.0,abs(az+.9))*step(-.03,el)*step(el,.7);
  c+=vec3(.12,.7,1.)*6.*smoothstep(.025,.0,abs(az-.75))*step(-.03,el)*step(el,.6);
  c+=vec3(1.,.12,.55)*3.*smoothstep(.02,.0,abs(az-2.6))*step(-.03,el)*step(el,.4);
  c+=vec3(1.,.55,.15)*5.*smoothstep(.04,.0,abs(az-.2))*smoothstep(.04,.0,abs(el-.2));
  if(el<0.){ c=mix(vec3(.006,.007,.01)+uGlow*.25*exp(el*6.), c*.3, exp(el*14.)); }
  return c;
}
`
  const MESH_VS = HDR + `
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in float aM;
uniform mat4 uVP, uM; out vec3 vW, vN, vO; out float vM;
void main(){ vO=aP; vec4 w=uM*vec4(aP,1.); vW=w.xyz; vN=mat3(uM)*aN; vM=aM; gl_Position=uVP*w; }`
  const MESH_FS = HDR + NOISE + ENV + `
in vec3 vW, vN, vO; in float vM; out vec4 o;
uniform vec3 uEye, uPaintA, uPaintB, uVinA, uVinB; uniform float uSweep, uFlip, uTime, uIsCar;
vec3 Lp[4]; vec3 Lc[4];
float aces1(float x){return x;}
void main(){
  int m=int(vM+.5);
  vec3 N=normalize(vN);
  vec3 fn=normalize(cross(dFdx(vW),dFdy(vW)))*uFlip;
  bool back=dot(fn,N)<0.;
  if(uIsCar>.5 && m==0){
    vec2 w1=vec2(vO.z-1.32,vO.y-.345), w2=vec2(vO.z+1.38,vO.y-.345);
    if(abs(vO.x)>.6 && (length(w1)<.405 || length(w2)<.405)) discard;
    if(back){ o=vec4(.004,.004,.006,1.); return; }
  }
  if(back) N=-N;
  vec3 V=normalize(uEye-vW);
  Lp[0]=vec3(0.,5.2,0.); Lc[0]=vec3(1.,1.,1.1)*2.2;
  Lp[1]=vec3(-6.,3.,-4.5); Lc[1]=vec3(1.,.15,.6)*3.2;
  Lp[2]=vec3(6.6,3.,-6.6); Lc[2]=vec3(.15,.7,1.)*3.2;
  Lp[3]=vec3(1.5,2.2,9.); Lc[3]=vec3(.3,.35,.55)*1.4;
  vec3 col=vec3(0.);
  vec3 base=vec3(.5); float metal=0., gloss=40., coat=0., emis=0.; vec3 E=vec3(0.);
  float NdV=max(dot(N,V),0.);
  if(m==0){
    float zb=mix(2.6,-2.6,uSweep);
    bool nw=vO.z>zb;
    base=nw?uPaintB:uPaintA; vec3 vin=nw?uVinB:uVinA;
    // vinyl: twin hood/roof stripes + slashing side graphic
    float top=smoothstep(.45,.6,N.y);
    float stripe=top*step(abs(abs(vO.x)-.2),.075)*step(abs(abs(vO.x)-.2),.075);
    float side=smoothstep(.55,.75,abs(N.x));
    float zz=vO.z+.9;
    float sl=0.;
    for(int i=0;i<3;i++){ float fi=float(i); float y0=.42+fi*.075+zz*.07;
      float taper=smoothstep(-2.2,.6,vO.z-fi*.35)*smoothstep(1.9,.9,vO.z-fi*.2);
      sl=max(sl,step(abs(vO.y-y0),.022*taper)); }
    float vmask=max(stripe,side*sl);
    base=mix(base,vin,vmask);
    metal=.25; gloss=60.; coat=1.;
    if(uSweep<.999) E+=vec3(.9,.95,1.)*4.*smoothstep(.06,0.,abs(vO.z-zb));
    // flakes
    float fl=h21(floor(vO.xy*420.)+floor(vO.z*420.));
    base*=.9+.2*fl;
    // panel seams
    float seam=side*(smoothstep(.006,.0,abs(vO.z-.78))+smoothstep(.006,.0,abs(vO.z+.62)))*step(vO.y,.8);
    base*=1.-seam*.85;
    // headlights
    float ax=abs(vO.x);
    if(vO.z>1.86 && ax>.38 && ax<.86 && vO.y>.40 && vO.y<.62 && vO.z+(.86-ax)*.32>2.0 && N.y>-.2){
      vec2 q=vec2(ax-.62,vO.z-2.06);
      E=vec3(.75,.85,1.)*.35+vec3(2.2,2.4,3.)*smoothstep(.07,.03,length(vec2(ax-.53,vO.y-.5)))+vec3(1.8,2.,2.6)*smoothstep(.06,.02,length(vec2(ax-.73,vO.y-.46)));
      E+=vec3(.2,.6,1.)*1.5*smoothstep(.012,.0,abs(vO.y-.43-(.86-ax)*.1));
      base=vec3(.02); coat=1.; metal=0.;
    }
    // tail lights
    if(vO.z<-2.12 && vO.y>.6 && vO.y<.77 && ax<.88 && ax>.12){
      float seg=step(.35,fract(ax*14.));
      E=vec3(4.,.15,.25)*(.55+.45*seg)*(ax>.55?1.:.6);
      base=vec3(.05,0.,0.);
    }
    // grille + side intake
    if(vO.z>2.1 && vO.y<.37 && ax<.62){ base=vec3(.008); coat=.4; float hx=step(.5,fract(vO.x*30.+step(.5,fract(vO.y*30.))*.5)); base+=hx*.01; }
    if(side>.5 && vO.z>-1.05 && vO.z<-.6 && vO.y>.42 && vO.y<.64 && vO.y-.42<(vO.z+1.05)*.6){ base=vec3(.006); coat=.3; }
  } else if(m==1){ base=vec3(.004,.006,.01); coat=1.6; gloss=200.; col+=env(reflect(-V,N))*.06;
  } else if(m==2){ base=vec3(.025); gloss=12.; metal=0.; float lt=step(abs(length(vec2(vO.z-sign(vO.z)*1.35,vO.y-.345))-.29),.006)*step(.9,abs(N.x)); base+=lt*.15;
  } else if(m==3){ base=vec3(.75,.77,.8); metal=1.; gloss=120.;
  } else if(m==6){ base=vec3(.018); gloss=40.; coat=.25;
  } else if(m==7){ E=uGlow*7.;
  } else if(m==8){ base=vec3(.7,.06,.04); gloss=80.; coat=.6;
  } else if(m==9){ float n=fbm(vW.xy*1.3+vW.zx*.9); base=vec3(.045,.045,.05)*(.6+.8*n); gloss=8.;
    base*=1.-.5*smoothstep(1.2,0.,vW.y)*0.;
  } else if(m==10){ E=vec3(1.,.1,.55)*9.;
  } else if(m==11){ E=vec3(.1,.72,1.)*9.;
  } else if(m==12){ E=vec3(1.,.5,.12)*8.;
  } else if(m==13){ E=vec3(.95,.97,1.)*12.;
  }
  if(m<7||m==8||m==9){
    for(int i=0;i<4;i++){
      vec3 L=Lp[i]-vW; float d2=dot(L,L); L=normalize(L);
      float att=1./(1.+d2*.03);
      float nl=max(dot(N,L),0.);
      vec3 Hh=normalize(L+V);
      float sp=pow(max(dot(N,Hh),0.),gloss)*(gloss+8.)/25.;
      col+=Lc[i]*att*(base*nl*(1.-metal)*(m==0?.32:1.)+sp*mix(vec3(.04),base,metal));
    }
    // underglow bounce from the floor
    float ug=max(-N.y,0.)*1.4+.35*(1.-smoothstep(.1,.6,vW.y));
    col+=uGlow*ug*exp(-max(vW.y,0.)*2.2)*base*1.6*uIsCar;
    col+=base*vec3(.03,.03,.05);
    vec3 R=reflect(-V,N);
    float F=.04+.96*pow(1.-NdV,5.);
    vec3 en=env(R);
    col+=en*(metal*base*.9+coat*F*(m==1?1.:.9));
    if(m==3){ col=base*en*.9+col*.3; }
  }
  col+=E;
  if(uFlip<0.) col*=.75;
  o=vec4(col,1.);
}`
  const FLOOR_VS = HDR + `
layout(location=0) in vec3 aP; uniform mat4 uVP; out vec3 vW;
void main(){ vW=aP; gl_Position=uVP*vec4(aP,1.); }`
  const FLOOR_FS = HDR + NOISE + `
in vec3 vW; out vec4 o;
uniform sampler2D uRefl; uniform vec2 uRes; uniform vec3 uEye, uGlow; uniform float uTime, uAng, uRip;
vec2 ripples(vec2 p, float t){
  vec2 acc=vec2(0.);
  for(int k=0;k<2;k++){
    vec2 q=p*1.7+float(k)*7.31;
    vec2 i=floor(q), f=fract(q)-.5;
    float h=h21(i+float(k)*3.1);
    vec2 off=(vec2(h21(i+1.7),h21(i+5.3))-.5)*.5;
    float ph=fract(t*.8+h);
    vec2 d=f-off; float r=length(d);
    float rr=ph*.42, w=.035;
    float e=(1.-ph)*(1.-ph)*smoothstep(w,0.,abs(r-rr));
    acc+=d/(r+1e-3)*cos((r-rr)/w*3.1416)*e;
  }
  return acc;
}
float sdBox(vec2 p, vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }
void main(){
  vec2 p=vW.xz; float r=length(p);
  float dist=length(uEye-vW);
  bool tt=r<3.15;
  float puddle=smoothstep(.44,.58,fbm(p*.2+vec2(3.1,1.3)));
  if(tt) puddle=.55;
  float n1=fbm(p*3.5), n2=vn(p*22.);
  vec2 g=vec2(fbm(p*3.5+vec2(.05,0.))-n1, fbm(p*3.5+vec2(0.,.05))-n1)*20.;
  g*=(1.-puddle)*.06*smoothstep(30.,6.,dist);
  vec2 rip=ripples(p,uTime)*uRip*smoothstep(25.,4.,dist)*(.35+puddle);
  vec3 N=normalize(vec3(-g.x-rip.x*.5,1.,-g.y-rip.y*.5));
  vec3 V=normalize(uEye-vW);
  float F=mix(.03,1.,pow(1.-max(dot(N,V),0.),5.));
  // albedo
  vec3 alb=vec3(.035,.036,.04)*(.55+.7*n1)*(.85+.3*n2);
  float lane=step(abs(abs(p.x)-5.2),.08)*step(fract(p.y*.22),.55)*(1.-.6*vn(p*6.));
  alb=mix(alb,vec3(.33,.28,.06),lane);
  float bay=step(abs(p.y-6.5),.06)*step(abs(p.x),5.2)*(1.-.5*vn(p*5.));
  alb=mix(alb,vec3(.3,.3,.3),bay);
  vec3 E=vec3(0.);
  float rough=mix(.75,.05,puddle);
  if(tt){
    float a=atan(p.y,p.x)-uAng;
    alb=vec3(.03,.032,.036)*(.8+.2*sin(r*160.))*(1.+.3*step(.985,fract(a*8./6.2832)));
    rough=.28;
    float ringE=smoothstep(.06,.0,abs(r-3.08));
    float dots=step(.6,fract(a*48./6.2832))*smoothstep(.04,.0,abs(r-2.88));
    E+=vec3(.15,.75,1.)*ringE*3.+vec3(.7,.9,1.)*dots*1.4;
    alb*=1.-smoothstep(.03,.0,abs(r-3.0))*.7;
  }
  float rim=smoothstep(.12,.0,abs(r-3.2))*.6;
  alb*=1.-rim;
  // lights on the floor
  vec3 L=vec3(.55,.6,.75)*1.6*exp(-r*r/14.);
  L+=vec3(1.,.15,.6)*1.2*exp(-dot(p-vec2(-6.,-4.6),p-vec2(-6.,-4.6))/7.);
  L+=vec3(.15,.7,1.)*1.2*exp(-dot(p-vec2(6.6,-6.7),p-vec2(6.6,-6.7))/8.);
  for(int i=0;i<4;i++){ vec2 lp=i==0?vec2(-10.5,-13.5):i==1?vec2(10.5,-13.5):i==2?vec2(18.5,-16.):vec2(-19.5,-16.);
    L+=vec3(1.,.5,.15)*1.6*exp(-dot(p-lp,p-lp)/18.); }
  // car: contact shadow + underglow
  float ca=uAng, cs=cos(ca), sn=sin(ca);
  vec2 lp=vec2(cs*p.x-sn*p.y, sn*p.x+cs*p.y);
  float sd=sdBox(lp,vec2(.82,2.05));
  float occ=mix(.15,1.,smoothstep(-.2,.6,sd));
  L*=occ;
  vec3 ug=uGlow*(1.9*exp(-max(sd,0.)*3.)+.35*exp(-max(sd,0.)*1.1))*smoothstep(-.9,.0,sd+.5);
  vec3 col=alb*L+alb*ug*2.;
  E+=ug*.35*puddle;
  // reflection
  vec2 suv=gl_FragCoord.xy/uRes+N.xz*vec2(.06,.06)+rip*.012;
  vec3 R=textureLod(uRefl,suv,rough*5.5).rgb;
  float rs=mix(.25,1.,puddle);
  col+=R*mix(.22,1.,F)*rs*1.25;
  col+=E;
  col=mix(col,vec3(.03,.015,.05),1.-exp(-max(dist-12.,0.)*.03));
  o=vec4(col,1.);
}`
  const SKY_VS = HDR + `
layout(location=0) in vec3 aP; uniform mat4 uVP; out vec3 vW;
void main(){ vW=aP; gl_Position=uVP*vec4(aP,1.); }`
  const SKY_FS = HDR + NOISE + `
in vec3 vW; out vec4 o; uniform float uTime;
vec4 city(float az, float y, float K, float hmin, float hmax, float seed, float lit){
  float u=az*K/6.2832; float id=floor(u); float fx=fract(u);
  float h1=h21(vec2(id,seed));
  float wpad=.06+.12*h21(vec2(id,seed+1.));
  float hh=hmin+(hmax-hmin)*pow(h1,1.6);
  if(fx<wpad||fx>1.-wpad) hh=hmin*.6+(hmax-hmin)*.2*h21(vec2(id,seed+9.));
  if(y>hh) return vec4(0.);
  vec3 c=vec3(.012,.012,.02);
  // windows
  vec2 wg=vec2((fx-wpad)/(1.-2.*wpad)*(6.+floor(h21(vec2(id,seed+4.))*6.)), y*1.6);
  vec2 wi=floor(wg), wf=fract(wg);
  float on=step(.8-lit*.1,h21(wi+id*7.13+seed))*step(.2,wf.x)*step(wf.x,.8)*step(.25,wf.y)*step(wf.y,.75)*step(.03,fx-wpad)*step(fx,1.-wpad);
  vec3 wc=mix(vec3(1.,.72,.38),vec3(.55,.75,1.),step(.6,h21(wi+3.3)));
  c+=wc*on*(.25+.4*h21(wi*1.7))*lit;
  // signage
  float sg=h21(vec2(id,seed+12.));
  if(sg>.7){ float sy=hh*.55+hh*.3*h21(vec2(id,seed+13.));
    vec3 sc=sg>.9?vec3(1.,.1,.5):sg>.8?vec3(.1,.8,1.):vec3(1.,.45,.1);
    float m=step(abs(fx-.5),.2)*step(abs(y-sy),.5*(.4+lit*.6));
    c+=sc*m*(2.2+.4*sin(uTime*1.3+id))*lit; }
  // rooftop beacon (slow blink, < 1Hz)
  if(h1>.85){ float b=smoothstep(.35,0.,length(vec2((fx-.5)*6.,y-hh-.3)))*step(.5,fract(uTime*.45+id*.37)); c+=vec3(3.,.1,.05)*b; }
  return vec4(c,1.);
}
void main(){
  vec3 d=normalize(vW-vec3(0.,1.5,0.));
  float az=atan(vW.x,-vW.z); float y=vW.y;
  vec3 sky=mix(vec3(.07,.025,.09),vec3(.004,.004,.012),smoothstep(0.,22.,y));
  sky+=vec3(.4,.12,.06)*exp(-max(y,0.)*.35)*.22;
  float cl=fbm(vec2(az*3.,y*.12)+vec2(uTime*.004,0.));
  sky+=vec3(.12,.04,.14)*smoothstep(.45,.85,cl)*smoothstep(4.,18.,y)*.7;
  vec3 col=sky;
  vec4 far=city(az,y,90.,3.,14.,1.,.55);
  if(far.a>0.) col=mix(far.rgb,sky,.45);
  vec4 nr=city(az+.013,y,46.,1.,22.,7.,1.);
  if(nr.a>0.) col=mix(nr.rgb,sky*.6,.22);
  col=mix(col,vec3(.07,.03,.06),exp(-max(y,0.)*.6)*.5);
  o=vec4(col,1.);
}`
  const RAIN_VS = HDR + `
layout(location=0) in vec2 aC; layout(location=1) in vec4 aS;
uniform mat4 uVP; uniform float uTime; uniform vec2 uPx; uniform vec3 uBox;
out float vA; out vec3 vCol;
void main(){
  vec3 vel=vec3(-1.2,-15.,-.6)*(.85+.3*aS.w);
  vec3 p=vec3(aS.x*2.-1., 0., aS.z*2.-1.)*uBox;
  float H=uBox.y*2.;
  float yy=mod(aS.y*H+uTime*vel.y,H);
  p.y=yy; p.x+= (yy/H)*vel.x*.3; p.z+=1.5;
  vec3 tail=p-normalize(vel)*(.32+.2*aS.w);
  vec4 c0=uVP*vec4(p,1.), c1=uVP*vec4(tail,1.);
  vec2 s0=c0.xy/c0.w, s1=c1.xy/c1.w;
  vec2 dir=normalize((s1-s0)/uPx+1e-5);
  vec2 perp=vec2(-dir.y,dir.x)*uPx;
  vec4 c=mix(c0,c1,aC.x);
  c.xy+=perp*aC.y*c.w*.9;
  gl_Position=c;
  float dcam=c0.w;
  vA=(1.-aC.x)*(.09+.08*aS.w)*smoothstep(.5,2.5,dcam)*smoothstep(30.,8.,dcam);
  vec3 lit=vec3(.35,.4,.55)+vec3(1.,.4,.8)*1.2*exp(-dot(p.xz-vec2(-6.,-4.6),p.xz-vec2(-6.,-4.6))/10.)
    +vec3(.3,.8,1.)*1.2*exp(-dot(p.xz-vec2(6.6,-6.7),p.xz-vec2(6.6,-6.7))/10.)
    +vec3(1.)*1.6*exp(-dot(p.xz,p.xz)/6.)*step(p.y,5.2);
  vCol=lit;
}`
  const RAIN_FS = HDR + `in float vA; in vec3 vCol; out vec4 o; void main(){ o=vec4(vCol*vA,1.); }`
  const STREAK_VS = HDR + `
layout(location=0) in vec2 aC; layout(location=1) in vec4 aS;
uniform mat4 uVP; uniform float uTime; out vec2 vC; out vec3 vCol;
void main(){
  float lane=floor(aS.x*4.); float dir=lane<2.?1.:-1.;
  float sp=(16.+aS.y*10.)*dir; float L=7.+aS.z*6.;
  float x=mod(aS.w*140.+uTime*sp,140.)-70.;
  vec3 p=vec3(x - dir*aC.x*L, 1.05+lane*.06+aC.y*.05, -26.-lane*1.6);
  vC=aC; vCol=dir>0.?vec3(4.,.25,.12):vec3(3.,2.5,1.6);
  gl_Position=uVP*vec4(p,1.);
}`
  const STREAK_FS = HDR + `in vec2 vC; in vec3 vCol; out vec4 o;
void main(){ float a=pow(1.-vC.x,2.)*(1.-abs(vC.y)); o=vec4(vCol*a*.9,1.); }`
  const CONE_VS = HDR + `
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; uniform mat4 uVP; out vec3 vW; out vec3 vN;
void main(){ vW=aP; vN=aN; gl_Position=uVP*vec4(aP,1.); }`
  const CONE_FS = HDR + NOISE + `in vec3 vW; in vec3 vN; out vec4 o; uniform vec3 uEye; uniform float uTime;
void main(){ vec3 V=normalize(uEye-vW); float f=abs(dot(normalize(vN),V)); f=pow(f,3.);
  float h=smoothstep(0.,1.5,vW.y)*smoothstep(5.2,3.5,vW.y);
  float n=.75+.5*fbm(vec2(atan(vW.x,vW.z)*3.,vW.y*.5-uTime*.6));
  o=vec4(vec3(.55,.62,.85)*f*h*n*.11,1.); }`
  const FS_VS = HDR + `out vec2 vUV; void main(){ vec2 p=vec2((gl_VertexID<<1)&2, gl_VertexID&2); vUV=p; gl_Position=vec4(p*2.-1.,0.,1.); }`
  const DOWN_FS = HDR + `in vec2 vUV; out vec4 o; uniform sampler2D uT; uniform vec2 uTx; uniform float uThr;
void main(){ vec3 c=vec3(0.);
  c+=texture(uT,vUV+uTx*vec2(-1,-1)).rgb; c+=texture(uT,vUV+uTx*vec2(1,-1)).rgb;
  c+=texture(uT,vUV+uTx*vec2(-1,1)).rgb; c+=texture(uT,vUV+uTx*vec2(1,1)).rgb; c*=.25;
  if(uThr>0.){ float l=max(c.r,max(c.g,c.b)); c*=max(l-uThr,0.)/max(l,1e-4); c=min(c,vec3(40.)); }
  o=vec4(c,1.); }`
  const UP_FS = HDR + `in vec2 vUV; out vec4 o; uniform sampler2D uT; uniform vec2 uTx; uniform float uK;
void main(){ vec3 c=vec3(0.);
  c+=texture(uT,vUV+uTx*vec2(-1,-1)).rgb; c+=texture(uT,vUV+uTx*vec2(0,-1)).rgb*2.; c+=texture(uT,vUV+uTx*vec2(1,-1)).rgb;
  c+=texture(uT,vUV+uTx*vec2(-1,0)).rgb*2.; c+=texture(uT,vUV).rgb*4.; c+=texture(uT,vUV+uTx*vec2(1,0)).rgb*2.;
  c+=texture(uT,vUV+uTx*vec2(-1,1)).rgb; c+=texture(uT,vUV+uTx*vec2(0,1)).rgb*2.; c+=texture(uT,vUV+uTx*vec2(1,1)).rgb;
  o=vec4(c/16.*uK,1.); }`
  const POST_FS = HDR + `in vec2 vUV; out vec4 o;
uniform sampler2D uScene, uBloom, uSmall, uDirt; uniform float uTime, uCA, uGrain, uDim, uRain; uniform vec2 uRes;
uniform vec4 uRects[6]; uniform int uNR;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
void main(){
  vec2 uv=vUV, c=uv-.5;
  float ca=uCA;
  vec2 fp=vec2(uv.x,1.-uv.y);
  for(int i=0;i<6;i++){ if(i>=uNR) break; vec4 r=uRects[i];
    vec2 q=step(r.xy-.02,fp)*step(fp,r.zw+.02); ca*=1.-q.x*q.y; }
  vec2 off=c*dot(c,c)*ca;
  vec3 col=vec3(texture(uScene,uv-off).r, texture(uScene,uv).g, texture(uScene,uv+off).b);
  vec3 b=texture(uBloom,uv).rgb;
  vec3 st=vec3(0.);
  for(int i=-7;i<=7;i++){ float w=exp(-abs(float(i))*.35); st+=texture(uSmall,uv+vec2(float(i)*.018,0.)).rgb*w; }
  vec3 dirt=texture(uDirt,uv).rgb;
  col+=b*.3+b*dirt*1.1+st*vec3(.35,.55,1.)*.04;
  col=aces(col*1.05);
  col=pow(col,vec3(1./2.2));
  col=mix(col,col*vec3(.92,1.,1.08),.5);
  float vg=smoothstep(1.05,.25,length(c*vec2(1.15,1.)));
  col*=mix(.45,1.,vg);
  col*=1.-uDim;
  col+=(h(uv*uRes+fract(uTime*7.3)*91.)-.5)*uGrain;
  o=vec4(col,1.);
}`

  // ---------------------------------------------------------------- GL helpers
  function sh(type, src) {
    const s = gl.createShader(type)
    gl.shaderSource(s, src); gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => i + 1 + ': ' + l).join('\n').slice(0, 4000))
    return s
  }
  function prog(vs, fs) {
    const p = gl.createProgram()
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p))
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name) }
    return { p, u }
  }
  function meshVAO(data, stride, attrs) {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao)
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
    for (const [loc, size, off] of attrs) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, off * 4) }
    gl.bindVertexArray(null)
    return { vao, n: data.length / stride }
  }
  function tex(w, h, fmt, mip) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t)
    const f = hdrOK ? [gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT] : [gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE]
    if (mip) {
      const lv = Math.floor(Math.log2(Math.max(w, h))) + 1
      gl.texStorage2D(gl.TEXTURE_2D, lv, f[0], w, h)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, f[0], w, h, 0, f[1], f[2], null)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }
  function fbo(t, depth) {
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
    if (depth) gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth)
    return f
  }
  function rb(fmt, w, h, samples) {
    const r = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, r)
    if (samples > 1) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, fmt, w, h)
    else gl.renderbufferStorage(gl.RENDERBUFFER, fmt, w, h)
    return r
  }
  const freeList = []
  function alloc() {
    for (const x of freeList) { if (x instanceof WebGLTexture) gl.deleteTexture(x); else if (x instanceof WebGLFramebuffer) gl.deleteFramebuffer(x); else gl.deleteRenderbuffer(x) }
    freeList.length = 0
    const w = RW, h = RH, keep = (x) => (freeList.push(x), x)
    const cfmt = hdrOK ? gl.RGBA16F : gl.RGBA8
    const ms = st.msaa
    T.msColor = keep(rb(cfmt, w, h, ms)); T.msDepth = keep(rb(gl.DEPTH_COMPONENT24, w, h, ms))
    T.msFbo = keep(gl.createFramebuffer()); gl.bindFramebuffer(gl.FRAMEBUFFER, T.msFbo)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, T.msColor)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, T.msDepth)
    T.scene = keep(tex(w, h)); T.sceneFbo = keep(fbo(T.scene))
    const rw = Math.max(2, w >> 1), rh = Math.max(2, h >> 1)
    T.rw = rw; T.rh = rh
    T.refl = keep(tex(rw, rh, 0, true)); T.reflDepth = keep(rb(gl.DEPTH_COMPONENT24, rw, rh, 1)); T.reflFbo = keep(fbo(T.refl, T.reflDepth))
    T.bloom = []
    let bw = rw, bh = rh
    for (let i = 0; i < 6; i++) {
      const t = keep(tex(bw, bh)); T.bloom.push({ t, f: keep(fbo(t)), w: bw, h: bh })
      bw = Math.max(1, bw >> 1); bh = Math.max(1, bh >> 1)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }
  function dirtTexture() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 288
    const x = c.getContext('2d')
    x.fillStyle = '#000'; x.fillRect(0, 0, 512, 288)
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    x.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 90; i++) {
      const px = rnd() * 512, py = rnd() * 288, r = 4 + rnd() * rnd() * 46, a = 0.04 + rnd() * 0.14
      const g = x.createRadialGradient(px, py, 0, px, py, r)
      g.addColorStop(0, `rgba(255,250,240,${a})`); g.addColorStop(0.7, `rgba(255,250,240,${a * 0.6})`); g.addColorStop(1, 'rgba(255,255,255,0)')
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill()
    }
    for (let i = 0; i < 14; i++) { // hex bokeh
      const px = rnd() * 512, py = rnd() * 288, r = 10 + rnd() * 18
      x.fillStyle = `rgba(200,230,255,${0.05 + rnd() * 0.06})`; x.beginPath()
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.3; x.lineTo(px + Math.cos(a) * r, py + Math.sin(a) * r) }
      x.fill()
    }
    x.lineCap = 'round'
    for (let i = 0; i < 10; i++) { // smudges
      x.strokeStyle = `rgba(255,255,255,${0.03 + rnd() * 0.05})`; x.lineWidth = 6 + rnd() * 16
      x.beginPath(); const sx = rnd() * 512, sy = rnd() * 288; x.moveTo(sx, sy)
      x.quadraticCurveTo(sx + rnd() * 120 - 60, sy + rnd() * 60 - 30, sx + rnd() * 180 - 90, sy + rnd() * 80 - 40); x.stroke()
    }
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }
  function cone() {
    const d = [], seg = 32, y0 = 5.15, y1 = 0.0, r0 = 1.25, r1 = 3.4
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2
      const p = (a, y, r) => [Math.cos(a) * r * 1.3, y, Math.sin(a) * r * 1.6]
      const n = (a) => v3.norm([Math.cos(a), (r1 - r0) / (y0 - y1), Math.sin(a)])
      const A = p(a0, y0, r0), B = p(a1, y0, r0), C = p(a1, y1, r1), D = p(a0, y1, r1)
      for (const [q, nn] of [[A, n(a0)], [B, n(a1)], [C, n(a1)], [A, n(a0)], [C, n(a1)], [D, n(a0)]]) d.push(...q, ...nn)
    }
    return new Float32Array(d)
  }

  // ---------------------------------------------------------------- init
  S.init = function (canvas, opts) {
    cv = canvas
    gl = cv.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!(opts && opts.preserve) })
    if (!gl) return false
    hdrOK = !!gl.getExtension('EXT_color_buffer_float')
    gl.getExtension('OES_texture_float_linear')
    st.msaa = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 1)
    try {
      P.mesh = prog(MESH_VS, MESH_FS); P.floor = prog(FLOOR_VS, FLOOR_FS); P.sky = prog(SKY_VS, SKY_FS)
      P.rain = prog(RAIN_VS, RAIN_FS); P.streak = prog(STREAK_VS, STREAK_FS); P.cone = prog(CONE_VS, CONE_FS)
      P.down = prog(FS_VS, DOWN_FS); P.up = prog(FS_VS, UP_FS); P.post = prog(FS_VS, POST_FS)
    } catch (e) { console.error(e); return false }
    M.car = meshVAO(buildCar(), 7, [[0, 3, 0], [1, 3, 3], [2, 1, 6]])
    M.props = meshVAO(buildProps(), 7, [[0, 3, 0], [1, 3, 3], [2, 1, 6]])
    const F = 90
    M.floor = meshVAO(new Float32Array([-F, 0, -F, F, 0, -F, F, 0, F, -F, 0, -F, F, 0, F, -F, 0, F]), 3, [[0, 3, 0]])
    // sky cylinder
    const sk = [], R = 44, seg = 96
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2
      const p = (a, y) => [Math.sin(a) * R, y, -Math.cos(a) * R]
      sk.push(...p(a0, -1), ...p(a1, -1), ...p(a1, 60), ...p(a0, -1), ...p(a1, 60), ...p(a0, 60))
    }
    M.sky = meshVAO(new Float32Array(sk), 3, [[0, 3, 0]])
    M.cone = meshVAO(cone(), 6, [[0, 3, 0], [1, 3, 3]])
    // instanced quads (rain + streaks)
    const quadBuf = new Float32Array([0, -1, 1, -1, 1, 1, 0, -1, 1, 1, 0, 1])
    const inst = (count) => {
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao)
      const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.bufferData(gl.ARRAY_BUFFER, quadBuf, gl.STATIC_DRAW)
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0)
      const sd = new Float32Array(count * 4); let s = 1
      for (let i = 0; i < sd.length; i++) { s = (s * 16807) % 2147483647; sd[i] = s / 2147483647 }
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferData(gl.ARRAY_BUFFER, sd, gl.STATIC_DRAW)
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 16, 0); gl.vertexAttribDivisor(1, 1)
      gl.bindVertexArray(null)
      return { vao, count }
    }
    M.rain = inst(9000); M.streak = inst(18)
    M.fs = gl.createVertexArray()
    T.dirt = dirtTexture()
    S.resize()
    return true
  }

  S.resize = function () {
    if (!gl) return
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const w = Math.max(2, Math.round(cv.clientWidth * dpr)), h = Math.max(2, Math.round(cv.clientHeight * dpr))
    if (w !== W || h !== H) { W = w; H = h; cv.width = W; cv.height = H; setRes() }
  }
  function setRes() {
    const rw = Math.max(2, Math.round(W * st.scale)), rh = Math.max(2, Math.round(H * st.scale))
    if (rw !== RW || rh !== RH) { RW = rw; RH = rh; alloc() }
  }

  // ---------------------------------------------------------------- shots
  const SHOTS = {
    title: { r: 7.6, h: 1.25, yaw: 0.55, ty: 0.5, fov: 34, sx: 0, sy: 0.42, tx: 0 },
    menu: { r: 8.4, h: 1.45, yaw: 0.42, ty: 0.55, fov: 33, sx: -0.3, sy: 0.02, tx: 0 },
    garage: { r: 6.0, h: 1.3, yaw: 0.25, ty: 0.55, fov: 32, sx: -0.3, sy: 0.12, tx: 0 },
    side: { r: 8.4, h: 2.4, yaw: 0.85, ty: 0.6, fov: 34, sx: -0.62, sy: 0.25, tx: 0 },
    reader: { r: 9.5, h: 1.2, yaw: 1.2, ty: 1.2, fov: 40, sx: 0, sy: 0, tx: 0 },
  }
  const SHOTS_M = {
    title: { r: 7.6, h: 1.4, yaw: 0.55, ty: 0.55, fov: 58, sx: 0, sy: 0.5, tx: 0 },
    menu: { r: 7.2, h: 1.7, yaw: 0.42, ty: 0.5, fov: 54, sx: 0, sy: -0.48, tx: 0 },
    garage: { r: 6.6, h: 1.6, yaw: 0.3, ty: 0.5, fov: 52, sx: 0, sy: -0.52, tx: 0 },
    side: { r: 8.2, h: 2.5, yaw: 0.85, ty: 0.6, fov: 56, sx: 0, sy: -0.55, tx: 0 },
    reader: { r: 9.5, h: 1.2, yaw: 1.2, ty: 1.2, fov: 60, sx: 0, sy: 0, tx: 0 },
  }
  S.custom = function (o) { SHOTS.custom = SHOTS_M.custom = o; st.shot = 'custom'; st.cam = Object.assign({}, o) }
  S.setAngle = function (a) { st.ang = a }
  S.setShot = function (name, snap) {
    st.shot = name
    if (snap || !st.cam) st.cam = Object.assign({}, curShot())
  }
  function curShot() { const asp = W / H; return (asp < 0.8 ? SHOTS_M : SHOTS)[st.shot || 'title'] }
  S.setPaint = function (paint, vinyl, glow) {
    // finish any in-flight sweep, then start a new one
    if (st.sweep < 1) { st.paintA = st.paintB; st.vinA = st.vinB }
    else { st.paintA = st.paintB; st.vinA = st.vinB }
    st.paintB = paint; st.vinB = vinyl || [0.04, 0.04, 0.05]; st.sweep = st.reduced ? 1 : 0
    if (glow) st.glowT = glow
    if (st.reduced) { st.paintA = paint; st.vinA = st.vinB; st.glow = st.glowT.slice() }
  }
  S.setReduced = function (r) { st.reduced = r }
  S.setDim = function (d) { st.dimT = d }
  S.setQuality = function (q) {
    st.quality = q
    st.maxScale = q === 'low' ? 0.6 : q === 'med' ? 0.8 : 1
    st.rain = q === 'low' ? 2500 : q === 'med' ? 4500 : 6500
    if (q !== 'auto') st.scale = st.maxScale
    else st.scale = Math.min(st.scale, 1)
    if (gl) setRes()
  }
  S.setFixed = function (f) { st.fixed = f; if (f) { st.scale = 1; setRes() } }
  S.setTextRects = function (rects) {
    st.nrect = Math.min(6, rects.length)
    for (let i = 0; i < st.nrect; i++) st.rects.set(rects[i], i * 4)
  }
  S.info = () => ({ scale: st.scale, w: RW, h: RH, hdr: hdrOK, msaa: st.msaa })

  // ---------------------------------------------------------------- frame
  S.frame = function (t, dt, realDt) {
    if (!gl) return
    st.t = t
    // dynamic resolution
    if (!st.fixed && st.quality === 'auto' && realDt > 0) {
      st.frameMs.push(realDt)
      if (st.frameMs.length >= 40) {
        const avg = st.frameMs.reduce((a, b) => a + b, 0) / st.frameMs.length
        st.frameMs.length = 0
        const steps = [0.5, 0.6, 0.7, 0.85, 1]
        let i = steps.indexOf(st.scale); if (i < 0) i = 4
        if (avg > 21 && i > 0) i--
        else if (avg < 13 && i < 4) i++
        if (steps[i] !== st.scale) { st.scale = steps[i]; setRes() }
      }
    }
    const k = 1 - Math.exp(-dt * (st.reduced ? 6 : 2.6))
    const tgt = curShot()
    if (!st.cam) st.cam = Object.assign({}, tgt)
    for (const key in tgt) st.cam[key] += (tgt[key] - st.cam[key]) * k
    st.dim += (st.dimT - st.dim) * k
    if (!st.reduced) st.ang += dt * st.spin
    if (st.sweep < 1) st.sweep = Math.min(1, st.sweep + dt / 0.85)
    for (let i = 0; i < 3; i++) st.glow[i] += (st.glowT[i] - st.glow[i]) * Math.min(1, dt * 3)
    const c = st.cam, asp = RW / RH
    // handheld sway (off under reduced motion)
    const sw = st.reduced ? 0 : 1
    const n1 = Math.sin(t * 0.61) * 0.6 + Math.sin(t * 1.37 + 1.3) * 0.3 + Math.sin(t * 2.9 + 0.2) * 0.1
    const n2 = Math.sin(t * 0.47 + 2.1) * 0.6 + Math.sin(t * 1.13 + 0.4) * 0.3 + Math.sin(t * 3.3 + 1.1) * 0.1
    const n3 = Math.sin(t * 0.33 + 0.7) * 0.7 + Math.sin(t * 0.9) * 0.3
    const yaw = c.yaw + n3 * 0.02 * sw
    const eye = [Math.sin(yaw) * c.r + n1 * 0.06 * sw, c.h + n2 * 0.045 * sw, Math.cos(yaw) * c.r]
    const tg = [c.tx + n2 * 0.02 * sw, c.ty + n1 * 0.02 * sw, 0]
    let V = lookAt(eye, tg, [0, 1, 0])
    V = mul(rotZ(n3 * 0.006 * sw), V)
    const Pm = persp((c.fov * Math.PI) / 180, asp, 0.1, 200, c.sx, c.sy)
    const VP = mul(Pm, V)
    const VPr = mul(VP, MIRROR)
    const eyeR = [eye[0], -eye[1], eye[2]]
    const carM = rotY(st.ang)

    gl.disable(gl.CULL_FACE)
    // ---- reflection pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.reflFbo); gl.viewport(0, 0, T.rw, T.rh)
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND)
    drawSky(VPr); drawMeshes(VPr, eyeR, carM, -1)
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false)
    drawStreaks(VPr)
    gl.disable(gl.BLEND); gl.depthMask(true)
    gl.bindTexture(gl.TEXTURE_2D, T.refl); gl.generateMipmap(gl.TEXTURE_2D)

    // ---- main pass (MSAA)
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.msFbo); gl.viewport(0, 0, RW, RH)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    drawSky(VP)
    // floor
    gl.useProgram(P.floor.p); const fu = P.floor.u
    gl.uniformMatrix4fv(fu.uVP, false, VP); gl.uniform2f(fu.uRes, RW, RH); gl.uniform3fv(fu.uEye, eye)
    gl.uniform3fv(fu.uGlow, st.glow); gl.uniform1f(fu.uTime, t); gl.uniform1f(fu.uAng, st.ang); gl.uniform1f(fu.uRip, st.reduced ? 0 : 1)
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.refl); gl.uniform1i(fu.uRefl, 0)
    gl.bindVertexArray(M.floor.vao); gl.drawArrays(gl.TRIANGLES, 0, M.floor.n)
    drawMeshes(VP, eye, carM, 1)
    // additive volumetrics
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false)
    gl.useProgram(P.cone.p); gl.uniformMatrix4fv(P.cone.u.uVP, false, VP); gl.uniform3fv(P.cone.u.uEye, eye); gl.uniform1f(P.cone.u.uTime, t)
    gl.bindVertexArray(M.cone.vao); gl.drawArrays(gl.TRIANGLES, 0, M.cone.n)
    drawStreaks(VP)
    if (st.rainOn) {
      gl.useProgram(P.rain.p); const ru = P.rain.u
      gl.uniformMatrix4fv(ru.uVP, false, VP); gl.uniform1f(ru.uTime, st.reduced ? 0 : t)
      gl.uniform2f(ru.uPx, 1.6 / RW, 1.6 / RH); gl.uniform3f(ru.uBox, 11, 6, 9)
      gl.bindVertexArray(M.rain.vao); gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, st.reduced ? Math.floor(st.rain * 0.4) : st.rain)
    }
    gl.disable(gl.BLEND); gl.depthMask(true); gl.disable(gl.DEPTH_TEST)
    // resolve
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, T.msFbo); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, T.sceneFbo)
    gl.blitFramebuffer(0, 0, RW, RH, 0, 0, RW, RH, gl.COLOR_BUFFER_BIT, gl.NEAREST)
    // ---- bloom
    gl.bindVertexArray(M.fs)
    let src = T.scene, sw0 = RW, sh0 = RH
    gl.useProgram(P.down.p)
    for (let i = 0; i < T.bloom.length; i++) {
      const b = T.bloom[i]
      gl.bindFramebuffer(gl.FRAMEBUFFER, b.f); gl.viewport(0, 0, b.w, b.h)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); gl.uniform1i(P.down.u.uT, 0)
      gl.uniform2f(P.down.u.uTx, 0.5 / sw0, 0.5 / sh0); gl.uniform1f(P.down.u.uThr, i === 0 ? 1.3 : 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      src = b.t; sw0 = b.w; sh0 = b.h
    }
    gl.useProgram(P.up.p); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE)
    for (let i = T.bloom.length - 1; i > 0; i--) {
      const s = T.bloom[i], d = T.bloom[i - 1]
      gl.bindFramebuffer(gl.FRAMEBUFFER, d.f); gl.viewport(0, 0, d.w, d.h)
      gl.bindTexture(gl.TEXTURE_2D, s.t); gl.uniform1i(P.up.u.uT, 0); gl.uniform2f(P.up.u.uTx, 1 / s.w, 1 / s.h); gl.uniform1f(P.up.u.uK, 0.62)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    gl.disable(gl.BLEND)
    // ---- post to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H)
    gl.useProgram(P.post.p); const pu = P.post.u
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.scene); gl.uniform1i(pu.uScene, 0)
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, T.bloom[0].t); gl.uniform1i(pu.uBloom, 1)
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, T.bloom[3].t); gl.uniform1i(pu.uSmall, 2)
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, T.dirt); gl.uniform1i(pu.uDirt, 3)
    gl.uniform1f(pu.uTime, t); gl.uniform1f(pu.uCA, st.reduced ? 0 : 0.028); gl.uniform1f(pu.uGrain, st.reduced ? 0 : 0.045)
    gl.uniform1f(pu.uDim, st.dim); gl.uniform2f(pu.uRes, W, H)
    gl.uniform4fv(pu.uRects, st.rects); gl.uniform1i(pu.uNR, st.nrect)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.activeTexture(gl.TEXTURE0)
  }
  function drawSky(VP) {
    gl.useProgram(P.sky.p); gl.uniformMatrix4fv(P.sky.u.uVP, false, VP); gl.uniform1f(P.sky.u.uTime, st.t)
    gl.bindVertexArray(M.sky.vao); gl.drawArrays(gl.TRIANGLES, 0, M.sky.n)
  }
  function drawStreaks(VP) {
    if (st.reduced) return
    gl.useProgram(P.streak.p); gl.uniformMatrix4fv(P.streak.u.uVP, false, VP); gl.uniform1f(P.streak.u.uTime, st.t)
    gl.bindVertexArray(M.streak.vao); gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, M.streak.count)
  }
  function drawMeshes(VP, eye, carM, flip) {
    gl.useProgram(P.mesh.p); const u = P.mesh.u
    gl.uniformMatrix4fv(u.uVP, false, VP); gl.uniform3fv(u.uEye, eye); gl.uniform1f(u.uFlip, flip); gl.uniform1f(u.uTime, st.t)
    gl.uniform3fv(u.uGlow, st.glow)
    gl.uniform3fv(u.uPaintA, st.paintA); gl.uniform3fv(u.uPaintB, st.paintB); gl.uniform3fv(u.uVinA, st.vinA); gl.uniform3fv(u.uVinB, st.vinB)
    gl.uniform1f(u.uSweep, st.sweep)
    gl.uniformMatrix4fv(u.uM, false, ID); gl.uniform1f(u.uIsCar, 0)
    gl.bindVertexArray(M.props.vao); gl.drawArrays(gl.TRIANGLES, 0, M.props.n)
    gl.uniformMatrix4fv(u.uM, false, carM); gl.uniform1f(u.uIsCar, 1)
    gl.bindVertexArray(M.car.vao); gl.drawArrays(gl.TRIANGLES, 0, M.car.n)
  }
  window.NRScene = S
})()
