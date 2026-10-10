// ---------------------------------------------------------------------------
// Renderer: one scene description, three backends (WebGPU, WebGL2, Canvas2D).
// ---------------------------------------------------------------------------
const V3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l] },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
}

const SCENE = {
  planet: { c: [114, -30, -262], r: 95, axis: V3.norm([0.28, 1, -0.12]) },
  ring: { c: [0, 0, 0], axis: V3.norm([0.22, 1, 0.05]), R: 10, hw: 0.5, wallH: 0.06, hullT: 0.04 },
  sun: V3.norm([-0.844, 0.534, 0.06]),
  star2: V3.norm([0.01, 0.105, -0.994]),
  atmoH: 0.03,
}

// Camera poses per screen. Positions in ring radii-ish units (ring R = 10).
const POSES = {
  title: { pos: [3.5, 2.6, 22], tgt: [4, -1.5, -12], fov: 42 },
  main: { pos: [0, 3.2, 13.5], tgt: [1.5, -0.6, -6], fov: 44 },
  campaign: { pos: [-7.2, 0.62, 9.2], tgt: [2, -0.2, -10], fov: 46 },
  theater: { pos: [6.5, 0.9, 13.5], tgt: [-2, -0.5, -9], fov: 44 },
  forge: { pos: [2.5, 4.2, 14.5], tgt: [3.5, -1.5, -4], fov: 46 },
  matchmaking: { pos: [-2.5, 0.4, 16.5], tgt: [12, -3.5, -30], fov: 40 },
  service: { pos: [-4, 3.5, 26], tgt: [5, -2, -16], fov: 40 },
  settings: { pos: [0.5, 1.8, 17], tgt: [3, -1.6, -8], fov: 44 },
}

// Dev overrides (?cam=x,y,z&tgt=x,y,z&fov=..&sun=..&pc=..&pr=..&hw=..&ax=..) for composing shots.
;(() => {
  const q = new URLSearchParams(location.search)
  const v = (k) => q.get(k)?.split(',').map(Number)
  if (q.has('sun')) SCENE.sun = V3.norm(v('sun'))
  if (q.has('s2')) SCENE.star2 = V3.norm(v('s2'))
  if (q.has('pc')) SCENE.planet.c = v('pc')
  if (q.has('pr')) SCENE.planet.r = +q.get('pr')
  if (q.has('hw')) SCENE.ring.hw = +q.get('hw')
  if (q.has('ax')) SCENE.ring.axis = V3.norm(v('ax'))
  if (q.has('cam')) {
    const pose = POSES[q.get('pose') || 'main']
    pose.pos = v('cam'); if (q.has('tgt')) pose.tgt = v('tgt'); if (q.has('fov')) pose.fov = +q.get('fov')
  }
})()

const QUALITY = {
  low: { shader: 0, maxScale: 0.5, minScale: 0.3, particles: 1500, bloomLevels: 4 },
  medium: { shader: 1, maxScale: 0.7, minScale: 0.35, particles: 4000, bloomLevels: 5 },
  high: { shader: 2, maxScale: 0.9, minScale: 0.4, particles: 7000, bloomLevels: 6 },
  ultra: { shader: 3, maxScale: 1.0, minScale: 0.5, particles: 12000, bloomLevels: 6 },
}

function ringHitJS(ro, rd) {
  const r = SCENE.ring, a = r.axis
  const o = V3.sub(ro, r.c), oa = V3.dot(o, a), op = V3.sub(o, V3.mul(a, oa))
  const da = V3.dot(rd, a), dp = V3.sub(rd, V3.mul(a, da))
  const cyl = (R) => {
    const A = V3.dot(dp, dp), B = V3.dot(op, dp), C = V3.dot(op, op) - R * R, D = B * B - A * C
    if (D < 0 || A < 1e-9) return [-1, -1]
    const s = Math.sqrt(D); return [(-B - s) / A, (-B + s) / A]
  }
  const ti = cyl(r.R)
  if (ti[1] > 0 && Math.abs(oa + ti[1] * da) < r.hw) return true
  const to = cyl(r.R + r.hullT)
  if (to[0] > 0 && Math.abs(oa + to[0] * da) < r.hw) return true
  return false
}
function sphereHitJS(ro, rd, c, rad) {
  const oc = V3.sub(ro, c), b = V3.dot(oc, rd), cc = V3.dot(oc, oc) - rad * rad, h = b * b - cc
  return h >= 0 && -b - Math.sqrt(h) > 0
}

const Render = (() => {
  const params = new URLSearchParams(location.search)
  let canvas, backend = null, kind = 'none', adapterInfo = ''
  let quality = 'auto', qual = QUALITY.high, scale = 0.7, lockScale = null
  let reducedMotion = false, motionScale = 1
  let lastT = 0, simTime = 0, frameTimes = [], lastAdjust = 0, upHold = 0
  const fixedTime = params.has('t') ? parseFloat(params.get('t')) : null
  let fps = 0, fpsAcc = 0, fpsN = 0, fpsLast = 0
  const cam = { from: null, to: POSES.title, t0: 0, dur: 1, cur: null }
  let running = false, sunVis = 0
  const listeners = []

  function setPose(name, instant) {
    const p = POSES[name] || POSES.main
    const cur = cam.cur || p
    cam.from = { pos: cur.pos.slice(), tgt: cur.tgt.slice(), fov: cur.fov }
    cam.to = p
    cam.t0 = performance.now() / 1000
    cam.dur = instant || reducedMotion ? 0.001 : 4.2
    if (!cam.cur || instant) cam.cur = { pos: p.pos.slice(), tgt: p.tgt.slice(), fov: p.fov }
  }

  function camState(now) {
    let u = Math.min(1, (now - cam.t0) / cam.dur)
    u = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
    const f = cam.from || cam.to
    const pos = V3.lerp(f.pos, cam.to.pos, u), tgt = V3.lerp(f.tgt, cam.to.tgt, u)
    const fov = f.fov + (cam.to.fov - f.fov) * u
    cam.cur = { pos, tgt, fov }
    const t = simTime
    const d = reducedMotion ? 0 : 1
    const drift = [Math.sin(t * 0.045) * 0.35 * d, Math.sin(t * 0.031 + 1) * 0.12 * d, Math.cos(t * 0.038) * 0.3 * d]
    const p = V3.add(pos, drift)
    const tg = V3.add(tgt, [Math.sin(t * 0.027) * 0.4 * d, Math.sin(t * 0.021) * 0.15 * d, 0])
    const fwd = V3.norm(V3.sub(tg, p))
    const roll = Math.sin(t * 0.02) * 0.012 * d - 0.03
    let right = V3.norm(V3.cross(fwd, [0, 1, 0]))
    let up = V3.cross(right, fwd)
    const cr = Math.cos(roll), sr = Math.sin(roll)
    const r2 = V3.add(V3.mul(right, cr), V3.mul(up, sr)), u2 = V3.sub(V3.mul(up, cr), V3.mul(right, sr))
    return { pos: p, fwd, right: r2, up: u2, fov }
  }

  function computeSunVis(c) {
    const s = SCENE.star2
    const z = V3.dot(s, c.fwd)
    if (z <= 0) return { vis: 0, ndc: [0, 0] }
    const ndc = [V3.dot(s, c.right) / z / c.tanX, V3.dot(s, c.up) / z / c.tanY]
    // 9 rays across the disk for partial occlusion
    const rad = 0.006
    let vis = 0
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, rr = i === 0 ? 0 : rad
      const dir = V3.norm(V3.add(s, V3.add(V3.mul(c.right, Math.cos(a) * rr), V3.mul(c.up, Math.sin(a) * rr))))
      const hit = ringHitJS(c.pos, dir) || sphereHitJS(c.pos, dir, SCENE.planet.c, SCENE.planet.r * 1.004)
      if (!hit) vis++
    }
    vis /= 9
    const edge = Math.max(Math.abs(ndc[0]), Math.abs(ndc[1]))
    vis *= Math.max(0, Math.min(1, (1.45 - edge) / 0.45))
    return { vis, ndc }
  }

  function buildUniforms(c, w, h) {
    const U = new Float32Array(52)
    const tanY = Math.tan((c.fov * Math.PI) / 360), tanX = tanY * (w / h)
    c.tanX = tanX; c.tanY = tanY
    const r = SCENE.ring
    const ru = V3.norm(V3.cross(r.axis, [0, 0, 1]))
    const set = (i, v, w4) => { U[i * 4] = v[0]; U[i * 4 + 1] = v[1]; U[i * 4 + 2] = v[2]; U[i * 4 + 3] = w4 }
    set(0, c.pos, simTime)
    set(1, c.right, tanX)
    set(2, c.up, tanY)
    set(3, c.fwd, 1.0)
    set(4, SCENE.sun, qual.shader)
    set(5, SCENE.planet.c, SCENE.planet.r)
    set(6, r.c, r.R)
    set(7, r.axis, r.hw)
    set(8, ru, simTime * 0.0035)
    U[36] = w; U[37] = h; U[38] = r.wallH; U[39] = SCENE.atmoH
    set(10, SCENE.planet.axis, r.hullT)
    set(12, SCENE.star2, 0)
    return U
  }

  function compositeUniforms(sv, aspect) {
    return new Float32Array([
      sv.ndc[0], sv.ndc[1], sv.vis, 1.0,
      1.1, 0.2, simTime % 100, aspect,
      0.55, 0.018, 0.012, 0,
      0.62, 0.55, 0, 0,
    ])
  }

  function applyQuality() {
    const key = quality === 'auto' ? (kind === 'webgpu' ? 'high' : 'medium') : quality
    qual = QUALITY[key] || QUALITY.high
    if (matchMedia('(max-width: 720px)').matches) qual = { ...qual, maxScale: Math.min(qual.maxScale, 0.55), particles: Math.min(qual.particles, 3000) }
    scale = lockScale ?? Math.min(qual.maxScale, Math.max(qual.minScale, scale))
    if (quality !== 'auto' && lockScale == null) scale = qual.maxScale
    backend?.setParticles?.(qual.particles)
  }

  function sizes() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cw = Math.max(2, Math.round(canvas.clientWidth * dpr)), ch = Math.max(2, Math.round(canvas.clientHeight * dpr))
    const sw = Math.max(2, Math.round(cw * scale)), sh = Math.max(2, Math.round(ch * scale))
    return { cw, ch, sw, sh }
  }

  function adjustScale(dt, now) {
    if (lockScale != null || quality !== 'auto') return
    frameTimes.push(dt)
    if (frameTimes.length < 40) return
    const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
    frameTimes = []
    if (avg > 19 && scale > qual.minScale) { scale = Math.max(qual.minScale, scale * 0.86); lastAdjust = now; upHold = Math.min(upHold + 2, 12) }
    else if (avg < 17.6 && scale < qual.maxScale && now - lastAdjust > 2 + upHold) { scale = Math.min(qual.maxScale, scale * 1.06); lastAdjust = now }
  }

  const maxFrames = params.has('frames') ? parseInt(params.get('frames')) : Infinity
  let frameCount = 0
  function loop(ts) {
    if (!running) return
    if (++frameCount > maxFrames) { window.__framesDone = true; return }
    requestAnimationFrame(loop)
    const now = ts / 1000
    const dt = lastT ? Math.min(0.1, now - lastT) : 0.016
    lastT = now
    simTime = fixedTime ?? simTime + dt * motionScale
    fpsAcc += dt; fpsN++
    if (now - fpsLast > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; fpsLast = now; listeners.forEach((f) => f({ fps, scale, kind })) }
    adjustScale(dt * 1000, now)
    const s = sizes()
    if (canvas.width !== s.cw || canvas.height !== s.ch) { canvas.width = s.cw; canvas.height = s.ch }
    const c = camState(now)
    const U = buildUniforms(c, s.sw, s.sh)
    U[44] = fixedTime != null ? 0 : dt * motionScale; U[45] = 1.4; U[46] = 1; U[47] = 0.035
    sunVis = computeSunVis(c)
    const C = compositeUniforms(sunVis, s.cw / s.ch)
    try { backend.frame(U, C, s, c) } catch (e) { console.error(e); running = false; fallbackFrom(kind) }
  }

  async function fallbackFrom(k) {
    backend?.destroy?.()
    const order = ['webgpu', 'webgl2', '2d']
    const next = order[order.indexOf(k) + 1]
    if (next) { await start(next); }
  }

  async function start(prefer) {
    const order = ['webgpu', 'webgl2', '2d']
    for (const k of order.slice(order.indexOf(prefer))) {
      try {
        if (k === 'webgpu') { const r = await createWebGPU(canvas); if (!r) continue; backend = r; adapterInfo = r.info }
        else if (k === 'webgl2') { canvas = freshCanvas(); const r = createWebGL2(canvas); if (!r) continue; backend = r; adapterInfo = r.info }
        else { canvas = freshCanvas(); backend = create2D(canvas); adapterInfo = 'Canvas 2D' }
        kind = k
        break
      } catch (e) { console.warn('[renderer] ' + k + ' failed', e) }
    }
    document.documentElement.dataset.renderer = kind
    applyQuality()
    running = true
    requestAnimationFrame(loop)
    listeners.forEach((f) => f({ fps, scale, kind }))
  }

  // A canvas that has handed out one context type cannot hand out another.
  function freshCanvas() {
    if (!canvas.dataset.used) { canvas.dataset.used = '1'; return canvas }
    const c = canvas.cloneNode(false); delete c.dataset.used
    canvas.replaceWith(c); c.dataset.used = '1'; return c
  }

  return {
    async init(el, opts = {}) {
      canvas = el
      reducedMotion = !!opts.reducedMotion
      motionScale = reducedMotion ? 0.25 : 1
      quality = opts.quality || 'auto'
      if (params.has('scale')) lockScale = parseFloat(params.get('scale'))
      setPose(opts.pose || 'title', true)
      const forced = params.get('renderer')
      let prefer = forced || (navigator.gpu ? 'webgpu' : 'webgl2')
      if (prefer === 'webgpu') canvas.dataset.used = '1'
      await start(prefer)
    },
    setPose,
    setQuality(q) { quality = q; frameTimes = []; applyQuality() },
    setReducedMotion(r) { reducedMotion = r; motionScale = r ? 0.25 : 1 },
    onStats(f) { listeners.push(f) },
    get info() { return { kind, adapterInfo, scale, fps, quality, tier: qual } },
  }
})()

// ---------------------------------------------------------------------------
// WebGPU backend
// ---------------------------------------------------------------------------
async function createWebGPU(canvas) {
  if (!navigator.gpu) return null
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })
  if (!adapter) return null
  const device = await adapter.requestDevice()
  const ctx = canvas.getContext('webgpu')
  if (!ctx) return null
  const format = navigator.gpu.getPreferredCanvasFormat()
  ctx.configure({ device, format, alphaMode: 'opaque' })
  let lost = false
  device.lost.then((i) => { lost = true; console.warn('[webgpu] device lost', i.message) })
  device.pushErrorScope('validation')

  const mod = async (code, label) => {
    const m = device.createShaderModule({ code, label })
    const info = await m.getCompilationInfo()
    const errs = info.messages.filter((x) => x.type === 'error')
    if (errs.length) throw new Error(label + ': ' + errs.map((e) => `${e.lineNum}:${e.linePos} ${e.message}`).join('\n'))
    return m
  }
  const dbgSrc = new URLSearchParams(location.search).has('dbg') ? WGSL_SCENE.replace('return vec4f(col, 1.0);\n}', 'if (H.kind > 0 && H.t < tp) { return vec4f(f32(H.kind == 1), f32(H.kind == 2), f32(H.kind == 3), 1.0) * (0.3 + 0.7 * max(dot(H.n, u.sun.xyz), 0.0)); }\n  return vec4f(col * 0.2, 1.0);\n}') : WGSL_SCENE
  const sceneMod = await mod(dbgSrc, 'scene')
  const compMod = await mod(WGSL_PARTICLE_COMPUTE, 'particles-cs')
  const partMod = await mod(WGSL_PARTICLE_RENDER, 'particles')
  const postMod = await mod(WGSL_POST, 'post')
  const HDR = 'rgba16float'

  const ubuf = device.createBuffer({ size: 52 * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
  const cbuf = device.createBuffer({ size: 16 * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
  const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' })

  const scenePipe = device.createRenderPipeline({
    layout: 'auto', label: 'scene',
    vertex: { module: sceneMod, entryPoint: 'vsFull' },
    fragment: { module: sceneMod, entryPoint: 'fsScene', targets: [{ format: HDR }] },
    primitive: { topology: 'triangle-list' },
  })
  const sceneBG = device.createBindGroup({ layout: scenePipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: ubuf } }] })

  const computePipe = device.createComputePipeline({ layout: 'auto', compute: { module: compMod, entryPoint: 'cs' } })
  const partPipe = device.createRenderPipeline({
    layout: 'auto', label: 'particles',
    vertex: { module: partMod, entryPoint: 'vsPart' },
    fragment: {
      module: partMod, entryPoint: 'fsPart',
      targets: [{ format: HDR, blend: { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } } }],
    },
    primitive: { topology: 'triangle-list' },
  })

  let pbuf = null, pcount = 0, computeBG = null, partBG = null
  function setParticles(n) {
    if (n === pcount) return
    pcount = n
    const data = new Float32Array(n * 8)
    const box = 1.4
    for (let i = 0; i < n; i++) {
      const debris = Math.random() < 0.035
      const size = debris ? 0.003 + 0.016 * Math.pow(Math.random(), 4) : 0.0012 + 0.0025 * Math.random()
      data.set([(Math.random() - 0.5) * 2 * box + POSES.main.pos[0], (Math.random() - 0.5) * 2 * box + POSES.main.pos[1], (Math.random() - 0.5) * 2 * box + POSES.main.pos[2], debris ? size : -size,
        (Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01, Math.random()], i * 8)
    }
    pbuf?.destroy()
    pbuf = device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })
    device.queue.writeBuffer(pbuf, 0, data)
    computeBG = device.createBindGroup({ layout: computePipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: pbuf } }, { binding: 1, resource: { buffer: ubuf } }] })
    partBG = device.createBindGroup({ layout: partPipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: ubuf } }, { binding: 1, resource: { buffer: pbuf } }] })
  }
  setParticles(QUALITY.high.particles)

  const postBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
    ],
  })
  const postLayout = device.createPipelineLayout({ bindGroupLayouts: [postBGL] })
  const postPipe = (entry, format, additive) => device.createRenderPipeline({
    layout: postLayout, label: entry,
    vertex: { module: postMod, entryPoint: 'vs' },
    fragment: { module: postMod, entryPoint: entry, targets: [{ format, blend: additive ? { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' } } : undefined }] },
    primitive: { topology: 'triangle-list' },
  })
  const prePipe = postPipe('prefilter', HDR), downPipe = postPipe('down', HDR), upPipe = postPipe('up', HDR, true), compPipe = postPipe('composite', format)

  const errs = await device.popErrorScope()
  if (errs) throw new Error('[webgpu] ' + errs.message)

  let rt = null
  function targets(sw, sh, levels) {
    if (rt && rt.w === sw && rt.h === sh && rt.levels === levels) return rt
    rt?.all.forEach((t) => t.destroy())
    const mk = (w, h) => device.createTexture({ size: [Math.max(1, w), Math.max(1, h)], format: HDR, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING })
    const hdr = mk(sw, sh)
    const mips = []
    for (let i = 0; i < levels; i++) mips.push(mk(sw >> (i + 1), sh >> (i + 1)))
    const bg = (a, b) => device.createBindGroup({ layout: postBGL, entries: [{ binding: 0, resource: a.createView() }, { binding: 1, resource: sampler }, { binding: 2, resource: { buffer: cbuf } }, { binding: 3, resource: (b || a).createView() }] })
    rt = {
      w: sw, h: sh, levels, hdr, mips, all: [hdr, ...mips],
      hdrView: hdr.createView(), mipViews: mips.map((m) => m.createView()),
      preBG: bg(hdr), downBG: mips.map((m) => bg(m)), compBG: bg(hdr, mips[0]),
    }
    return rt
  }

  const pass = (enc, view, pipe, bg, load) => {
    const p = enc.beginRenderPass({ colorAttachments: [{ view, loadOp: load ? 'load' : 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }] })
    p.setPipeline(pipe); p.setBindGroup(0, bg); p.draw(3); p.end()
  }

  return {
    info: (adapter.info && [adapter.info.vendor, adapter.info.architecture, adapter.info.description].filter(Boolean).join(' · ')) || 'WebGPU adapter',
    setParticles,
    frame(U, C, s) {
      if (lost) throw new Error('device lost')
      const t = targets(s.sw, s.sh, Render.info.tier.bloomLevels || 6)
      device.queue.writeBuffer(ubuf, 0, U)
      device.queue.writeBuffer(cbuf, 0, C)
      const enc = device.createCommandEncoder()
      const cp = enc.beginComputePass(); cp.setPipeline(computePipe); cp.setBindGroup(0, computeBG); cp.dispatchWorkgroups(Math.ceil(pcount / 64)); cp.end()
      const sp = enc.beginRenderPass({ colorAttachments: [{ view: t.hdrView, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }] })
      sp.setPipeline(scenePipe); sp.setBindGroup(0, sceneBG); sp.draw(3)
      sp.setPipeline(partPipe); sp.setBindGroup(0, partBG); sp.draw(6, pcount)
      sp.end()
      pass(enc, t.mipViews[0], prePipe, t.preBG)
      for (let i = 1; i < t.levels; i++) pass(enc, t.mipViews[i], downPipe, t.downBG[i - 1])
      for (let i = t.levels - 1; i > 0; i--) pass(enc, t.mipViews[i - 1], upPipe, t.downBG[i], true)
      pass(enc, ctx.getCurrentTexture().createView(), compPipe, t.compBG)
      device.queue.submit([enc.finish()])
    },
    destroy() { try { device.destroy() } catch {} },
  }
}

// ---------------------------------------------------------------------------
// WebGL2 backend
// ---------------------------------------------------------------------------
function createWebGL2(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' })
  if (!gl) return null
  const hdr = !!gl.getExtension('EXT_color_buffer_float')
  gl.getExtension('OES_texture_float_linear')
  const compile = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
    return s
  }
  const program = (vs, fs) => {
    const p = gl.createProgram()
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p))
    return { p, U: gl.getUniformLocation(p, 'U'), C: gl.getUniformLocation(p, 'C'), src: gl.getUniformLocation(p, 'uSrc'), src2: gl.getUniformLocation(p, 'uSrc2') }
  }
  const sceneFS = hdr ? GLSL_SCENE_FS : GLSL_SCENE_FS.replace('precision highp int;', 'precision highp int;\n#define LDR 1')
  const P = {
    scene: program(GLSL_FULL_VS, sceneFS),
    part: program(GLSL_PART_VS, GLSL_PART_FS),
  }
  if (hdr) Object.assign(P, {
    pre: program(GLSL_FULL_VS, GLSL_PREFILTER), down: program(GLSL_FULL_VS, GLSL_DOWN),
    up: program(GLSL_FULL_VS, GLSL_UP), comp: program(GLSL_FULL_VS, GLSL_COMPOSITE),
  })
  const vao = gl.createVertexArray()
  let pcount = 4000
  let rt = null
  const mkTex = (w, h) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
    return { t, f, w, h }
  }
  function targets(sw, sh, levels) {
    if (rt && rt.w === sw && rt.h === sh && rt.levels === levels) return rt
    if (rt) rt.all.forEach((x) => { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.f) })
    const main = mkTex(sw, sh), mips = []
    for (let i = 0; i < levels; i++) mips.push(mkTex(Math.max(1, sw >> (i + 1)), Math.max(1, sh >> (i + 1))))
    rt = { w: sw, h: sh, levels, main, mips, all: [main, ...mips] }
    return rt
  }
  const draw = (prog, target, w, h, U, C, src, src2) => {
    gl.useProgram(prog.p)
    gl.bindFramebuffer(gl.FRAMEBUFFER, target)
    gl.viewport(0, 0, w, h)
    if (prog.U && U) gl.uniform4fv(prog.U, U)
    if (prog.C && C) gl.uniform4fv(prog.C, C)
    if (src) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); gl.uniform1i(prog.src, 0) }
    if (src2) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, src2); gl.uniform1i(prog.src2, 1) }
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  const dbg = gl.getExtension('WEBGL_debug_renderer_info')
  return {
    info: 'WebGL2 · ' + (dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) + (hdr ? '' : ' · LDR'),
    setParticles(n) { pcount = n },
    frame(U, C, s) {
      gl.bindVertexArray(vao)
      gl.disable(gl.BLEND)
      if (!hdr) {
        draw(P.scene, null, s.cw, s.ch, U)
        return
      }
      const t = targets(s.sw, s.sh, Render.info.tier.bloomLevels || 6)
      draw(P.scene, t.main.f, t.w, t.h, U)
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(P.part.p); gl.uniform4fv(P.part.U, U)
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, pcount)
      gl.disable(gl.BLEND)
      draw(P.pre, t.mips[0].f, t.mips[0].w, t.mips[0].h, null, C, t.main.t)
      for (let i = 1; i < t.levels; i++) draw(P.down, t.mips[i].f, t.mips[i].w, t.mips[i].h, null, C, t.mips[i - 1].t)
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE)
      for (let i = t.levels - 1; i > 0; i--) draw(P.up, t.mips[i - 1].f, t.mips[i - 1].w, t.mips[i - 1].h, null, C, t.mips[i].t)
      gl.disable(gl.BLEND)
      draw(P.comp, null, s.cw, s.ch, null, C, t.main.t, t.mips[0].t)
    },
    destroy() { gl.getExtension('WEBGL_lose_context')?.loseContext() },
  }
}

// ---------------------------------------------------------------------------
// Canvas 2D fallback: a painted plate, drifted slowly. No GPU required.
// ---------------------------------------------------------------------------
function create2D(canvas) {
  const ctx = canvas.getContext('2d')
  let plate = null, pw = 0, ph = 0
  function paint(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const g = c.getContext('2d')
    const sky = g.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#02040a'); sky.addColorStop(1, '#071322')
    g.fillStyle = sky; g.fillRect(0, 0, w, h)
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 26; i++) {
      const x = rnd() * w, y = rnd() * h * 0.7, r = (0.15 + rnd() * 0.35) * w
      const n = g.createRadialGradient(x, y, 0, x, y, r)
      n.addColorStop(0, rnd() > 0.5 ? 'rgba(40,90,140,0.06)' : 'rgba(120,40,100,0.05)'); n.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = n; g.fillRect(0, 0, w, h)
    }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(220,230,255,${Math.pow(rnd(), 3)})`; g.fillRect(rnd() * w, rnd() * h, 1.2, 1.2) }
    const px = w * 0.78, py = h * 1.02, pr = h * 0.62
    const lim = g.createRadialGradient(px, py, pr * 0.96, px, py, pr * 1.08)
    lim.addColorStop(0, 'rgba(140,200,255,0.5)'); lim.addColorStop(1, 'rgba(140,200,255,0)')
    g.fillStyle = lim; g.beginPath(); g.arc(px, py, pr * 1.1, 0, 7); g.fill()
    g.save(); g.beginPath(); g.arc(px, py, pr, 0, 7); g.clip()
    for (let i = 0; i < 40; i++) {
      const y = py - pr + (i / 40) * pr * 2
      g.fillStyle = ['#6b4a30', '#c08a55', '#e6d2a8', '#9a6a44', '#d9c6a0'][i % 5]
      g.globalAlpha = 0.9; g.fillRect(px - pr, y, pr * 2, (pr * 2) / 40 + 1)
    }
    g.globalAlpha = 1
    const term = g.createLinearGradient(px - pr, py - pr, px + pr * 0.6, py + pr * 0.2)
    term.addColorStop(0, 'rgba(0,0,0,0.97)'); term.addColorStop(0.55, 'rgba(0,0,0,0.9)'); term.addColorStop(0.85, 'rgba(0,0,0,0.25)'); term.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = term; g.fillRect(px - pr, py - pr, pr * 2, pr * 2)
    g.restore()
    g.save(); g.translate(w * 0.58, h * 0.6); g.rotate(-0.08)
    g.strokeStyle = 'rgba(110,150,170,0.9)'; g.lineWidth = h * 0.012
    g.beginPath(); g.ellipse(0, 0, w * 0.62, h * 0.2, 0, Math.PI * 1.02, Math.PI * 1.98); g.stroke()
    g.strokeStyle = 'rgba(20,24,30,1)'; g.lineWidth = h * 0.05
    g.beginPath(); g.ellipse(0, 0, w * 0.62, h * 0.2, 0, Math.PI * 0.05, Math.PI * 0.95); g.stroke()
    g.restore()
    const sx = w * 0.86, sy = h * 0.16
    const sun = g.createRadialGradient(sx, sy, 0, sx, sy, h * 0.5)
    sun.addColorStop(0, 'rgba(255,250,235,1)'); sun.addColorStop(0.03, 'rgba(255,240,210,0.8)'); sun.addColorStop(0.2, 'rgba(160,200,255,0.12)'); sun.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = sun; g.fillRect(0, 0, w, h)
    g.fillStyle = 'rgba(140,190,255,0.25)'; g.fillRect(0, sy - 1, w, 2)
    return c
  }
  return {
    info: 'Canvas 2D fallback',
    frame(U, C, s) {
      const w = s.cw, h = s.ch
      if (!plate || pw !== w || ph !== h) { plate = paint(Math.round(w * 1.06), Math.round(h * 1.06)); pw = w; ph = h }
      const t = U[3] ? U[0 * 4 + 3] : 0
      ctx.drawImage(plate, -w * 0.03 + Math.sin(t * 0.05) * w * 0.02, -h * 0.03 + Math.cos(t * 0.04) * h * 0.01)
    },
  }
}
