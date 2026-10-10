// ---------------------------------------------------------------------------
// Shaders. The scene is written twice, WGSL and GLSL ES 3.0, and the two are
// kept line-for-line parallel so a tweak to one is a search away in the other.
// Both read the same 12 x vec4 uniform block in the same order:
//  0 cam.xyz time | 1 right.xyz tanX | 2 up.xyz tanY | 3 fwd.xyz exposure
//  4 sun.xyz quality | 5 planet.xyz radius | 6 ringC.xyz R | 7 ringAxis.xyz halfW
//  8 ringU.xyz spin | 9 res.xy wallH atmoH | 10 planetAxis.xyz hullT
//  11 dt box motion count
// ---------------------------------------------------------------------------

const WGSL_COMMON = /* wgsl */ `
struct U {
  cam: vec4f, right: vec4f, up: vec4f, fwd: vec4f, sun: vec4f, planet: vec4f,
  ringC: vec4f, ringA: vec4f, ringU: vec4f, misc: vec4f, paxis: vec4f, pm: vec4f, s2: vec4f,
};
const S2COL = vec3f(0.62, 0.78, 1.0);
const SUNCOL = vec3f(1.0, 0.95, 0.88);
const M3 = mat3x3f(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);

fn hash13(p: vec3i) -> f32 {
  let q = bitcast<vec3u>(p);
  var h = (q.x * 0x8da6b343u) ^ (q.y * 0xd8163841u) ^ (q.z * 0xcb1ab31fu);
  h = (h ^ (h >> 15u)) * 0x2c1b3c6du;
  h = (h ^ (h >> 12u)) * 0x297a2d39u;
  h = h ^ (h >> 15u);
  return f32(h >> 8u) * (1.0 / 16777216.0);
}
fn vnoise(p: vec3f) -> f32 {
  let fl = floor(p); let i = vec3i(fl); let f = p - fl; let w = f * f * (3.0 - 2.0 * f);
  let a = hash13(i); let b = hash13(i + vec3i(1, 0, 0));
  let c = hash13(i + vec3i(0, 1, 0)); let d = hash13(i + vec3i(1, 1, 0));
  let e = hash13(i + vec3i(0, 0, 1)); let g = hash13(i + vec3i(1, 0, 1));
  let k = hash13(i + vec3i(0, 1, 1)); let l = hash13(i + vec3i(1, 1, 1));
  return mix(mix(mix(a, b, w.x), mix(c, d, w.x), w.y), mix(mix(e, g, w.x), mix(k, l, w.x), w.y), w.z);
}
fn fbm(p0: vec3f, oct: i32) -> f32 {
  var p = p0; var s = 0.0; var a = 0.5;
  for (var i = 0; i < 8; i++) {
    if (i >= oct) { break; }
    s += a * vnoise(p); p = M3 * p * 2.03 + vec3f(1.7, 9.2, 3.1); a *= 0.5;
  }
  return s;
}
`;

const WGSL_SCENE = WGSL_COMMON + /* wgsl */ `
@group(0) @binding(0) var<uniform> u: U;

struct VO { @builtin(position) pos: vec4f, @location(0) ndc: vec2f };
@vertex fn vsFull(@builtin(vertex_index) i: u32) -> VO {
  var ps = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var o: VO; o.pos = vec4f(ps[i], 0.0, 1.0); o.ndc = ps[i]; return o;
}

fn OCT() -> i32 { return i32(u.sun.w) + 3; }

struct Hit { t: f32, kind: i32, n: vec3f, h: f32, q: vec3f };

fn sphere(ro: vec3f, rd: vec3f, c: vec3f, r: f32) -> vec2f {
  let oc = ro - c; let b = dot(oc, rd); let cc = dot(oc, oc) - r * r; let h = b * b - cc;
  if (h < 0.0) { return vec2f(-1.0, -1.0); }
  let s = sqrt(h); return vec2f(-b - s, -b + s);
}
fn cylT(op: vec3f, dp: vec3f, r: f32) -> vec2f {
  let A = dot(dp, dp); let B = dot(op, dp); let C = dot(op, op) - r * r;
  let D = B * B - A * C;
  if (D < 0.0 || A < 1e-9) { return vec2f(-1.0, -1.0); }
  let s = sqrt(D); return vec2f((-B - s) / A, (-B + s) / A);
}
fn ringHit(ro: vec3f, rd: vec3f) -> Hit {
  var H: Hit; H.t = 1e9; H.kind = 0; H.n = vec3f(0.0); H.h = 0.0; H.q = vec3f(0.0);
  let a = u.ringA.xyz; let R = u.ringC.w; let hw = u.ringA.w;
  let o = ro - u.ringC.xyz; let oa = dot(o, a); let op = o - a * oa;
  let da = dot(rd, a); let dp = rd - a * da;
  let ti = cylT(op, dp, R);
  if (ti.y > 0.0) { let h = oa + ti.y * da; if (abs(h) < hw) { H.t = ti.y; H.kind = 1; H.h = h; } }
  let to = cylT(op, dp, R + u.paxis.w);
  if (to.x > 0.0 && to.x < H.t) { let h = oa + to.x * da; if (abs(h) < hw) { H.t = to.x; H.kind = 2; H.h = h; } }
  if (abs(da) > 1e-7) {
    for (var k = 0; k < 2; k++) {
      let s = select(1.0, -1.0, k == 0);
      let tw = (s * hw - oa) / da;
      if (tw > 0.0 && tw < H.t) {
        let q = op + dp * tw; let r = length(q);
        if (r > R - u.misc.z && r < R + u.paxis.w) { H.t = tw; H.kind = 3; H.h = s * hw; H.n = -sign(da) * a; H.q = q; }
      }
    }
  }
  if (H.kind == 1 || H.kind == 2) {
    let q = op + dp * H.t; H.q = q; let rad = normalize(q);
    H.n = select(rad, -rad, H.kind == 1);
  }
  return H;
}
fn planetShadow(p: vec3f) -> f32 {
  let oc = p - u.planet.xyz; let b = dot(oc, u.sun.xyz);
  if (b > 0.0) { return 1.0; }
  let d = sqrt(max(dot(oc, oc) - b * b, 0.0));
  return smoothstep(u.planet.w * 0.985, u.planet.w * 1.03, d);
}
fn spinQ(q: vec3f) -> vec3f {
  let a = u.ringA.xyz; let s = u.ringU.w;
  return q * cos(s) + cross(a, q) * sin(s);
}

fn shadeInner(H: Hit, rd: vec3f, wp: vec3f) -> vec3f {
  let a = u.ringA.xyz; let sun = u.sun.xyz;
  let qr = spinQ(H.q);
  let P = qr + a * H.h;
  let edge = abs(H.h) / u.ringA.w;
  let oct = OCT();
  let mount = smoothstep(0.6, 0.97, edge);
  var e = fbm(P * 1.3, oct + 3);
  e += mount * mount * 0.55 + (fbm(P * 30.0, 3) - 0.45) * mount * 0.3;
  let sea = 0.47;
  let n = H.n;
  let diff = max(dot(n, sun), 0.0);
  let sh = planetShadow(wp);
  var col: vec3f; var spec = 0.0;
  if (e < sea) {
    let dep = clamp((sea - e) * 6.0, 0.0, 1.0);
    col = mix(vec3f(0.05, 0.16, 0.22), vec3f(0.012, 0.035, 0.08), dep);
    spec = 1.0;
  } else {
    let hg = e - sea;
    let veg = fbm(P * 4.0 + 3.0, 5);
    col = mix(mix(vec3f(0.09, 0.15, 0.06), vec3f(0.16, 0.2, 0.08), smoothstep(0.3, 0.5, veg)), vec3f(0.34, 0.29, 0.18), smoothstep(0.5, 0.72, veg));
    col = mix(col, vec3f(0.36, 0.35, 0.34), smoothstep(0.08, 0.2, hg));
    col = mix(col, vec3f(0.86, 0.89, 0.93), smoothstep(0.26, 0.34, hg));
    col = mix(vec3f(0.52, 0.47, 0.34), col, smoothstep(0.0, 0.015, hg));
  }
  let t = u.cam.w;
  let cl = fbm(P * 1.8 + vec3f(t * 0.006, 0.0, t * 0.004) + vec3f(e * 2.5), oct + 2);
  let cloud = smoothstep(0.62, 0.84, cl) * (1.0 - mount * 0.5);
  let light = SUNCOL * 2.2 * diff * sh + S2COL * 0.35 * max(dot(n, u.s2.xyz), 0.0);
  let amb = vec3f(0.10, 0.075, 0.05) * 0.3 * max(dot(n, normalize(u.planet.xyz - wp)), 0.0) + vec3f(0.006, 0.009, 0.015);
  var c = col * (light + amb);
  let rf = reflect(rd, n);
  c += spec * SUNCOL * pow(max(dot(rf, sun), 0.0), 80.0) * 3.0 * sh * (1.0 - cloud);
  c = mix(c, vec3f(0.9, 0.92, 0.95) * (light * 1.05 + amb * 1.5), cloud);
  if (e >= sea) {
    let city = smoothstep(0.62, 0.8, vnoise(P * 40.0)) * smoothstep(0.55, 0.75, fbm(P * 6.0 + 9.0, 3)) * (1.0 - mount);
    c += vec3f(1.0, 0.62, 0.3) * city * 0.6 * pow(1.0 - diff, 6.0) * (1.0 - cloud * 0.8);
  }
  let cv = abs(dot(rd, n));
  let haze = 1.0 - exp(-0.05 / max(cv, 0.04));
  let hazeCol = vec3f(0.42, 0.6, 0.88) * (diff * sh * 1.1 + 0.015);
  return mix(c, hazeCol, haze);
}

fn shadeHull(H: Hit, rd: vec3f, wp: vec3f) -> vec3f {
  let a = u.ringA.xyz; let sun = u.sun.xyz;
  let qr = spinQ(H.q);
  let V = cross(a, u.ringU.xyz);
  let th = atan2(dot(qr, V), dot(qr, u.ringU.xyz));
  let uu = th / 6.2831853 * 900.0;
  let vv = H.h / u.ringA.w * 3.0;
  let cell = floor(vec2f(uu, vv)); let f = fract(vec2f(uu, vv));
  let pid = hash13(vec3i(i32(cell.x), i32(cell.y), 7));
  let seam = smoothstep(0.0, 0.035, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
  let fade = smoothstep(45.0, 6.0, H.t);
  let n = H.n;
  var base = vec3f(0.13, 0.14, 0.155) * mix(1.0, 0.86 + 0.28 * pid, fade);
  base *= mix(1.0, 0.55 + 0.45 * seam, fade);
  let rib = smoothstep(0.86, 0.98, abs(H.h) / u.ringA.w);
  base *= 1.0 - rib * 0.35;
  let diff = max(dot(n, sun), 0.0);
  let sh = planetShadow(wp);
  let hv = normalize(sun - rd);
  let spec = pow(max(dot(n, hv), 0.0), 48.0);
  let fres = pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
  var c = base * (SUNCOL * 2.0 * diff * sh + vec3f(0.09, 0.07, 0.05) * 0.5 * max(dot(n, normalize(u.planet.xyz - wp)), 0.0) + 0.012);
  c += SUNCOL * spec * 1.6 * sh * (0.3 + 0.7 * pid);
  c += vec3f(0.4, 0.55, 0.7) * fres * 0.06;
  c += base * S2COL * 1.2 * max(dot(n, u.s2.xyz), 0.0) + S2COL * pow(max(dot(n, normalize(u.s2.xyz - rd)), 0.0), 40.0) * 0.6;
  // running lights
  let lid = floor(uu / 12.0);
  let lu = (fract(uu / 12.0) - 0.5) * 12.0;
  let lv = abs(abs(vv) - 2.6);
  let lamp = smoothstep(0.55, 0.0, length(vec2f(lu, lv * 1.6)));
  let blink = 0.55 + 0.45 * sin(u.cam.w * 1.7 + hash13(vec3i(i32(lid), 3, 1)) * 40.0);
  let lampCol = select(vec3f(0.4, 0.85, 1.0), vec3f(1.0, 0.62, 0.25), hash13(vec3i(i32(lid), 9, 2)) > 0.7);
  c += lampCol * lamp * blink * 5.0 * smoothstep(22.0, 4.0, H.t);
  return c;
}

fn shadeWall(H: Hit, rd: vec3f, wp: vec3f) -> vec3f {
  let sun = u.sun.xyz; let R = u.ringC.w;
  let r = length(H.q);
  let rr = clamp((r - (R - u.misc.z)) / (u.misc.z + u.paxis.w), 0.0, 1.0);
  let qr = spinQ(H.q);
  let tex = fbm(qr * 60.0, 3);
  var base = vec3f(0.17, 0.18, 0.2) * (0.75 + 0.5 * tex);
  base *= 0.8 + 0.4 * smoothstep(0.92, 1.0, 1.0 - rr);
  let band = smoothstep(0.02, 0.0, abs(rr - 0.35));
  let n = H.n;
  let diff = max(dot(n, sun), 0.0);
  let sh = planetShadow(wp);
  let spec = pow(max(dot(n, normalize(sun - rd)), 0.0), 30.0);
  var c = base * (SUNCOL * 2.0 * diff * sh + 0.015) + SUNCOL * spec * 0.6 * sh;
  c += vec3f(0.3, 0.8, 1.0) * band * 1.5 * smoothstep(40.0, 8.0, H.t);
  return c;
}

fn shadePlanet(p: vec3f, rd: vec3f) -> vec3f {
  let sun = u.sun.xyz; let pa = u.paxis.xyz;
  let n = normalize(p - u.planet.xyz);
  let lat = dot(n, pa);
  let oct = OCT();
  let an = n + pa * lat * 5.0;
  let t = u.cam.w;
  let rot = t * 0.0015 * (1.0 + 0.6 * sin(lat * 13.0));
  let tg = normalize(cross(pa, n) + vec3f(1e-5));
  let w1 = fbm(an * 2.2 + tg * rot, 4);
  let w2 = fbm(an * 6.0 + vec3f(w1 * 2.0), oct);
  let w3 = fbm(an * 14.0 + vec3f(w2 * 4.0), 4);
  let b = lat * 7.0 + (w1 - 0.5) * 1.3 + (w2 - 0.5) * 0.8 + (w3 - 0.5) * 0.35;
  let s1 = 0.5 + 0.5 * sin(b * 3.1);
  let s2 = 0.5 + 0.5 * sin(b * 7.7 + 1.3);
  let cB = vec3f(0.30, 0.15, 0.06); let cA = vec3f(0.80, 0.46, 0.18);
  let cC = vec3f(0.92, 0.74, 0.48); let cP = vec3f(0.74, 0.68, 0.58);
  var col = mix(mix(cB, cA, s1), mix(cC, cP, s2), smoothstep(0.25, 0.75, s1 * 0.55 + s2 * 0.45));
  let fine = fbm(an * 18.0 + vec3f(w2 * 3.0), 3);
  col *= 0.88 + 0.24 * fine;
  // storm oval
  let sd = normalize(vec3f(-0.62, -0.18, 0.76));
  let sv = (n - sd); let sdist = length(vec2f(dot(sv, tg) * 0.55, dot(sv, pa)));
  let storm = smoothstep(0.075, 0.02, sdist + (w2 - 0.5) * 0.04);
  col = mix(col, vec3f(0.72, 0.36, 0.2), storm * 0.8);
  let ndl = dot(n, sun);
  let diff = smoothstep(-0.12, 0.5, ndl) * (0.35 + 0.65 * max(ndl, 0.0));
  let sh = ringHit(p + n * 0.01, sun);
  let rs = select(1.0, 0.1, sh.kind > 0);
  var c = col * SUNCOL * 0.5 * diff * rs;
  c += col * S2COL * 0.9 * smoothstep(0.0, 0.6, dot(n, u.s2.xyz));
  c += col * vec3f(0.006, 0.0065, 0.008);
  return c;
}

fn stars(rd: vec3f) -> vec3f {
  var c = vec3f(0.0);
  for (var l = 0; l < 2; l++) {
    let K = select(380.0, 170.0, l == 0);
    let q = rd * K;
    let fl = floor(q); let id = vec3i(fl);
    let h = hash13(id + vec3i(l * 131, 17, 3));
    if (h > 0.93) {
      let sp = fl + 0.25 + 0.5 * vec3f(hash13(id + vec3i(5, 1, 2)), hash13(id + vec3i(3, 7, 1)), hash13(id + vec3i(9, 2, 8)));
      let d = length(cross(rd, normalize(sp))) * K;
      let br = pow((h - 0.93) / 0.07, 6.0) * select(0.5, 1.6, l == 0);
      let sz = 0.05 + 0.04 * br;
      let tint = mix(vec3f(0.7, 0.8, 1.0), vec3f(1.0, 0.86, 0.68), hash13(id + vec3i(1, 1, 1)));
      c += tint * br * exp(-d * d / (sz * sz));
    }
  }
  return c;
}

fn background(rd: vec3f) -> vec3f {
  var c = vec3f(0.0);
  let gN = normalize(vec3f(0.35, 0.75, 0.55));
  let g = dot(rd, gN);
  let band = exp(-(g * g) / 0.18);
  let n1 = fbm(rd * 2.4 + vec3f(4.0), 5);
  let n2 = fbm(rd * 5.0 + vec3f(-2.0, 7.0, 1.0), 4);
  let dust = smoothstep(0.42, 0.68, fbm(rd * 7.0 + 11.0, 4));
  let neb = mix(vec3f(0.04, 0.16, 0.30), vec3f(0.30, 0.07, 0.22), smoothstep(0.35, 0.65, n2));
  c += neb * pow(n1, 2.2) * (0.2 + band) * 0.9 * (1.0 - dust * 0.75);
  c += stars(rd) * (1.0 - dust * 0.6) * (0.4 + band * 0.6);
  let mu = dot(rd, u.sun.xyz);
  c += SUNCOL * 60.0 * smoothstep(0.99993, 0.99996, mu);
  let m = max(mu, 0.0);
  c += SUNCOL * (pow(m, 5000.0) * 8.0 + pow(m, 600.0) * 0.5 + pow(m, 40.0) * 0.035);
  let m2 = max(dot(rd, u.s2.xyz), 0.0);
  c += S2COL * (40.0 * smoothstep(0.99996, 0.99998, m2) + pow(m2, 8000.0) * 6.0 + pow(m2, 900.0) * 0.4 + pow(m2, 60.0) * 0.03);
  return c;
}

struct Atmo { c: vec3f, T: vec3f };
fn atmosphere(ro: vec3f, rd: vec3f, tMax: f32) -> Atmo {
  var A: Atmo; A.c = vec3f(0.0); A.T = vec3f(1.0);
  let PR = u.planet.w; let H = PR * u.misc.w;
  let s = sphere(ro, rd, u.planet.xyz, PR + H * 1.0);
  if (s.y < 0.0) { return A; }
  let t0 = max(s.x, 0.0); let t1 = min(s.y, tMax);
  if (t1 <= t0) { return A; }
  let N = 6 + 2 * i32(u.sun.w);
  let dt = (t1 - t0) / f32(N);
  let mu = dot(rd, u.sun.xyz);
  let pR = 0.75 * (1.0 + mu * mu);
  let g = 0.72;
  let pM = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5);
  let bR = vec3f(0.28, 0.55, 1.0) * 0.16;
  let bM = vec3f(0.05);
  var T = vec3f(1.0); var sum = vec3f(0.0);
  for (var i = 0; i < 16; i++) {
    if (i >= N) { break; }
    let p = ro + rd * (t0 + (f32(i) + 0.5) * dt);
    var up = p - u.planet.xyz; let r = length(up); up = up / r;
    let hgt = max((r - PR) / H, 0.0);
    let dens = exp(-hgt * 4.0) * dt / H;
    let ct = dot(up, u.sun.xyz);
    let lit = smoothstep(-0.18, 0.15, ct);
    let Tl = exp(-(bR + bM) * 6.0 * (1.0 - smoothstep(-0.2, 0.6, ct)));
    sum += T * dens * lit * Tl * (bR * pR + bM * pM);
    T *= exp(-(bR + bM) * dens);
  }
  A.c = sum * SUNCOL * 3.2; A.T = T;
  return A;
}

@fragment fn fsScene(i: VO) -> @location(0) vec4f {
  let rd = normalize(u.fwd.xyz + u.right.xyz * i.ndc.x * u.right.w + u.up.xyz * i.ndc.y * u.up.w);
  let ro = u.cam.xyz;
  let H = ringHit(ro, rd);
  let ps = sphere(ro, rd, u.planet.xyz, u.planet.w);
  let tp = select(1e9, ps.x, ps.x > 0.0);
  var col: vec3f; var tMax = 1e9;
  if (H.kind > 0 && H.t < tp) {
    let wp = ro + rd * H.t;
    if (H.kind == 1) { col = shadeInner(H, rd, wp); }
    else if (H.kind == 2) { col = shadeHull(H, rd, wp); }
    else { col = shadeWall(H, rd, wp); }
    tMax = H.t;
  } else if (tp < 1e8) { col = shadePlanet(ro + rd * tp, rd); tMax = tp; }
  else { col = background(rd); }
  let A = atmosphere(ro, rd, tMax);
  col = col * A.T + A.c;
  return vec4f(col, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Particles: WebGPU integrates them in a compute pass; the vertex stage only
// billboards. Debris is alpha-blended (it silhouettes against the planet),
// dust is additive. Both ride one premultiplied pass: dust writes alpha 0.
// ---------------------------------------------------------------------------
const WGSL_PARTICLE_COMPUTE = WGSL_COMMON + /* wgsl */ `
struct Particle { pos: vec4f, vel: vec4f };
@group(0) @binding(0) var<storage, read_write> parts: array<Particle>;
@group(0) @binding(1) var<uniform> u: U;
@compute @workgroup_size(64) fn cs(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= arrayLength(&parts)) { return; }
  var P = parts[i];
  let dt = u.pm.x; let box = u.pm.y; let t = u.cam.w;
  let s = P.vel.w;
  let rel0 = P.pos.xyz - u.ringC.xyz;
  let tang = normalize(cross(u.ringA.xyz, rel0) + vec3f(1e-5));
  let swirl = vec3f(sin(t * 0.11 + s * 40.0), cos(t * 0.13 + s * 23.0), sin(t * 0.07 + s * 61.0)) * 0.004;
  let v = P.vel.xyz + tang * (0.004 + 0.008 * fract(s * 13.0)) + swirl;
  let p = P.pos.xyz + v * dt * u.pm.z;
  let rel = p - u.cam.xyz;
  let w = rel - floor((rel + box) / (2.0 * box)) * (2.0 * box);
  P.pos = vec4f(u.cam.xyz + w, P.pos.w);
  parts[i] = P;
}
`;

const WGSL_PARTICLE_RENDER = WGSL_COMMON + /* wgsl */ `
struct Particle { pos: vec4f, vel: vec4f };
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> parts: array<Particle>;
struct PO {
  @builtin(position) pos: vec4f, @location(0) uv: vec2f,
  @location(1) @interpolate(flat) kind: f32, @location(2) @interpolate(flat) seed: f32,
  @location(3) fade: f32, @location(4) sunv: vec3f,
};
@vertex fn vsPart(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> PO {
  var corners = array<vec2f, 6>(vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, 1.0));
  let P = parts[ii];
  var o: PO;
  let rel = P.pos.xyz - u.cam.xyz;
  let z = dot(rel, u.fwd.xyz);
  o.uv = corners[vi]; o.kind = select(0.0, 1.0, P.pos.w > 0.0); o.seed = P.vel.w;
  o.fade = 0.0; o.sunv = vec3f(0.0);
  if (z < 0.03) { o.pos = vec4f(2.0, 2.0, 2.0, 1.0); return o; }
  let x = dot(rel, u.right.xyz); let y = dot(rel, u.up.xyz);
  var size = abs(P.pos.w);
  let pxNdc = 2.0 / u.misc.y;
  let projected = size / (z * u.up.w);
  var amp = 1.0;
  if (projected < pxNdc * 0.9) { amp = (projected / (pxNdc * 0.9)) * (projected / (pxNdc * 0.9)); size = pxNdc * 0.9 * z * u.up.w; }
  let ang = P.vel.w * 6.2831 + u.cam.w * (P.vel.w - 0.5) * 0.5;
  let c = corners[vi];
  let rc = vec2f(c.x * cos(ang) - c.y * sin(ang), c.x * sin(ang) + c.y * cos(ang));
  o.pos = vec4f((x + rc.x * size) / (z * u.right.w), (y + rc.y * size) / (z * u.up.w), 0.5, 1.0);
  let dist = length(rel);
  o.fade = smoothstep(u.pm.y, u.pm.y * 0.55, dist) * smoothstep(0.03, 0.15, z) * amp;
  let sv = vec3f(dot(u.sun.xyz, u.right.xyz), dot(u.sun.xyz, u.up.xyz), dot(u.sun.xyz, u.fwd.xyz));
  o.sunv = vec3f(sv.x * cos(-ang) - sv.y * sin(-ang), sv.x * sin(-ang) + sv.y * cos(-ang), sv.z);
  if (o.kind < 0.5) {
    let fwdScatter = pow(max(dot(normalize(rel), u.sun.xyz), 0.0), 6.0);
    o.sunv = vec3f(0.06 + 1.6 * fwdScatter, 0.0, 0.0);
  }
  return o;
}
@fragment fn fsPart(i: PO) -> @location(0) vec4f {
  let r2 = dot(i.uv, i.uv);
  if (i.kind < 0.5) {
    let a = exp(-r2 * 4.0) * i.fade * i.sunv.x;
    return vec4f(vec3f(1.0, 0.92, 0.82) * a, 0.0);
  }
  let ang = atan2(i.uv.y, i.uv.x);
  let rr = 0.74 + 0.16 * sin(ang * 3.0 + i.seed * 20.0) + 0.08 * sin(ang * 7.0 + i.seed * 41.0);
  let r = sqrt(r2);
  if (r > rr) { discard; }
  let nz = sqrt(max(1.0 - r2 / (rr * rr), 0.0));
  let facet = vnoise(vec3f(i.uv * 4.0, i.seed * 50.0)) - 0.5;
  let n = normalize(vec3f(i.uv / rr * 0.9 + facet * 0.5, -nz));
  let ndl = max(dot(n, i.sunv), 0.0);
  let alb = mix(vec3f(0.07, 0.065, 0.06), vec3f(0.14, 0.12, 0.1), fract(i.seed * 7.0));
  let rim = pow(1.0 - nz, 3.0) * max(i.sunv.z, 0.0);
  let col = alb * (ndl * SUNCOL * 2.6 + vec3f(0.05, 0.04, 0.03)) + SUNCOL * rim * 0.5;
  let a = smoothstep(rr, rr - 0.1, r) * i.fade;
  return vec4f(col * a, a);
}
`;

// Bloom + composite. Shared bind group layout: 0 src tex, 1 sampler, 2 uniform, 3 second tex.
const WGSL_POST = /* wgsl */ `
struct CU { a: vec4f, b: vec4f, c: vec4f, d: vec4f };
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var<uniform> cu: CU;
@group(0) @binding(3) var src2: texture_2d<f32>;
const SUNCOL = vec3f(1.0, 0.95, 0.88);
struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) ndc: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> VO {
  var ps = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var o: VO; let p = ps[i];
  o.pos = vec4f(p, 0.0, 1.0); o.uv = vec2f(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); o.ndc = p; return o;
}
fn tx(uv: vec2f) -> vec3f { return textureSampleLevel(src, samp, uv, 0.0).rgb; }
fn luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
@fragment fn prefilter(i: VO) -> @location(0) vec4f {
  let ts = 1.0 / vec2f(textureDimensions(src));
  let a = tx(i.uv + ts * vec2f(-1.0, -1.0)); let b = tx(i.uv + ts * vec2f(1.0, -1.0));
  let c = tx(i.uv + ts * vec2f(-1.0, 1.0)); let d = tx(i.uv + ts * vec2f(1.0, 1.0));
  let wa = 1.0 / (1.0 + luma(a)); let wb = 1.0 / (1.0 + luma(b)); let wc = 1.0 / (1.0 + luma(c)); let wd = 1.0 / (1.0 + luma(d));
  let col = (a * wa + b * wb + c * wc + d * wd) / (wa + wb + wc + wd);
  let thr = cu.d.x; let knee = cu.d.y;
  let br = max(col.r, max(col.g, col.b));
  var rq = clamp(br - thr + knee, 0.0, 2.0 * knee); rq = rq * rq / (4.0 * knee + 1e-5);
  let w = max(rq, br - thr) / max(br, 1e-5);
  return vec4f(min(col * w, vec3f(64.0)), 1.0);
}
@fragment fn down(i: VO) -> @location(0) vec4f {
  let ts = 1.0 / vec2f(textureDimensions(src)); let uv = i.uv;
  let a = tx(uv + ts * vec2f(-2.0, 2.0)); let b = tx(uv + ts * vec2f(0.0, 2.0)); let c = tx(uv + ts * vec2f(2.0, 2.0));
  let d = tx(uv + ts * vec2f(-2.0, 0.0)); let e = tx(uv); let f = tx(uv + ts * vec2f(2.0, 0.0));
  let g = tx(uv + ts * vec2f(-2.0, -2.0)); let h = tx(uv + ts * vec2f(0.0, -2.0)); let k = tx(uv + ts * vec2f(2.0, -2.0));
  let j = tx(uv + ts * vec2f(-1.0, 1.0)); let l = tx(uv + ts * vec2f(1.0, 1.0));
  let m = tx(uv + ts * vec2f(-1.0, -1.0)); let n = tx(uv + ts * vec2f(1.0, -1.0));
  let col = e * 0.125 + (a + c + g + k) * 0.03125 + (b + d + f + h) * 0.0625 + (j + l + m + n) * 0.125;
  return vec4f(col, 1.0);
}
@fragment fn up(i: VO) -> @location(0) vec4f {
  let ts = 1.0 / vec2f(textureDimensions(src)); let uv = i.uv;
  var col = tx(uv) * 4.0;
  col += (tx(uv + vec2f(-ts.x, 0.0)) + tx(uv + vec2f(ts.x, 0.0)) + tx(uv + vec2f(0.0, -ts.y)) + tx(uv + vec2f(0.0, ts.y))) * 2.0;
  col += tx(uv + ts) + tx(uv - ts) + tx(uv + vec2f(ts.x, -ts.y)) + tx(uv + vec2f(-ts.x, ts.y));
  return vec4f(col / 16.0, 1.0);
}
fn aces(x: vec3f) -> vec3f {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), vec3f(0.0), vec3f(1.0));
}
fn h12(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453); }
fn flare(p: vec2f) -> vec3f {
  let s = cu.a.xy; let vis = cu.a.z * cu.a.w;
  if (vis <= 0.001) { return vec3f(0.0); }
  let asp = vec2f(cu.b.w, 1.0);
  let d = (p - s) * asp; let r = length(d);
  var c = SUNCOL * (exp(-r * 5.0) * 0.28 + exp(-r * 20.0) * 1.1);
  c += vec3f(0.3, 0.58, 1.0) * exp(-abs(d.y) * 110.0) * exp(-abs(d.x) * 1.15) * 0.7;
  let ang = atan2(d.y, d.x);
  let rays = pow(abs(sin(ang * 4.0 + 0.3)), 220.0) + pow(abs(sin(ang * 7.0 + 1.2)), 400.0) * 0.5;
  c += SUNCOL * rays * exp(-r * 7.0) * 0.22;
  var gk = array<f32, 7>(0.62, 0.32, -0.22, -0.55, -0.9, -1.25, -1.6);
  var gr = array<f32, 7>(0.035, 0.06, 0.03, 0.12, 0.05, 0.2, 0.08);
  var gc = array<vec3f, 7>(vec3f(0.3, 0.9, 1.0), vec3f(1.0, 0.65, 0.3), vec3f(0.7, 0.5, 1.0), vec3f(0.35, 1.0, 0.7), vec3f(1.0, 0.85, 0.6), vec3f(0.35, 0.6, 1.0), vec3f(1.0, 0.4, 0.5));
  for (var k = 0; k < 7; k++) {
    let gp = s * gk[k];
    let gd = length((p - gp) * asp);
    let R = gr[k];
    let disc = smoothstep(R, R * 0.6, gd) * 0.6 + smoothstep(R * 0.12, 0.0, abs(gd - R * 0.92)) * 0.8;
    c += gc[k] * disc * 0.04;
  }
  // halo ring around the sun
  let hr = abs(r - 0.42);
  c += vec3f(0.5, 0.75, 1.0) * smoothstep(0.03, 0.0, hr) * 0.03;
  return c * vis;
}
@fragment fn composite(i: VO) -> @location(0) vec4f {
  let uv = i.uv; let cc = uv - 0.5;
  let ca = cu.c.z * dot(cc, cc);
  var col = vec3f(textureSampleLevel(src, samp, uv - cc * ca, 0.0).r, textureSampleLevel(src, samp, uv, 0.0).g, textureSampleLevel(src, samp, uv + cc * ca, 0.0).b);
  let bl = textureSampleLevel(src2, samp, uv, 0.0).rgb;
  col += bl * cu.b.y;
  col += flare(i.ndc);
  col *= cu.b.x;
  col = aces(col);
  // split tone: teal shadows, warm highlights
  let l = luma(col);
  col = mix(col, col * vec3f(0.92, 1.0, 1.08) + vec3f(0.0, 0.006, 0.014), 1.0 - smoothstep(0.0, 0.5, l));
  col = pow(col, vec3f(1.0 / 2.2));
  let vig = 1.0 - cu.c.x * pow(length(cc * vec2f(1.0, 0.85)) * 1.3, 2.6);
  col *= clamp(vig, 0.0, 1.0);
  let gn = h12(i.pos.xy + vec2f(cu.b.z * 61.0, cu.b.z * 17.0)) - 0.5;
  col += gn * cu.c.y;
  return vec4f(col, 1.0);
}
`;

// ---------------------------------------------------------------------------
// GLSL ES 3.0 mirror of the above.
// ---------------------------------------------------------------------------
const GLSL_HEAD = `#version 300 es
precision highp float;
precision highp int;
`;
const GLSL_COMMON = `
uniform vec4 U[13];
#define S2 U[12].xyz
const vec3 S2COL = vec3(0.62, 0.78, 1.0);
#define CAM U[0].xyz
#define TIME U[0].w
#define RIGHT U[1].xyz
#define TANX U[1].w
#define UPV U[2].xyz
#define TANY U[2].w
#define FWD U[3].xyz
#define SUN U[4].xyz
#define QUALITY U[4].w
#define PC U[5].xyz
#define PR U[5].w
#define RC U[6].xyz
#define RR U[6].w
#define RA U[7].xyz
#define RHW U[7].w
#define RU U[8].xyz
#define SPIN U[8].w
#define RES U[9].xy
#define WALLH U[9].z
#define ATMOH U[9].w
#define PAXIS U[10].xyz
#define HULLT U[10].w
const vec3 SUNCOL = vec3(1.0, 0.95, 0.88);
const mat3 M3 = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
float hash13(ivec3 p) {
  uvec3 q = uvec3(p);
  uint h = (q.x * 0x8da6b343u) ^ (q.y * 0xd8163841u) ^ (q.z * 0xcb1ab31fu);
  h = (h ^ (h >> 15u)) * 0x2c1b3c6du;
  h = (h ^ (h >> 12u)) * 0x297a2d39u;
  h = h ^ (h >> 15u);
  return float(h >> 8u) * (1.0 / 16777216.0);
}
float vnoise(vec3 p) {
  vec3 fl = floor(p); ivec3 i = ivec3(fl); vec3 f = p - fl; vec3 w = f * f * (3.0 - 2.0 * f);
  float a = hash13(i), b = hash13(i + ivec3(1, 0, 0));
  float c = hash13(i + ivec3(0, 1, 0)), d = hash13(i + ivec3(1, 1, 0));
  float e = hash13(i + ivec3(0, 0, 1)), g = hash13(i + ivec3(1, 0, 1));
  float k = hash13(i + ivec3(0, 1, 1)), l = hash13(i + ivec3(1, 1, 1));
  return mix(mix(mix(a, b, w.x), mix(c, d, w.x), w.y), mix(mix(e, g, w.x), mix(k, l, w.x), w.y), w.z);
}
float fbm(vec3 p, int oct) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    s += a * vnoise(p); p = M3 * p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5;
  }
  return s;
}
`;

const GLSL_FULL_VS = GLSL_HEAD + `
out vec2 vNdc; out vec2 vUv;
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  vNdc = p; vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}
`;

const GLSL_SCENE_FS = GLSL_HEAD + GLSL_COMMON + `
in vec2 vNdc;
out vec4 outColor;
int OCT() { return int(QUALITY) + 3; }
struct Hit { float t; int kind; vec3 n; float h; vec3 q; };
vec2 sphere(vec3 ro, vec3 rd, vec3 c, float r) {
  vec3 oc = ro - c; float b = dot(oc, rd); float cc = dot(oc, oc) - r * r; float h = b * b - cc;
  if (h < 0.0) return vec2(-1.0);
  float s = sqrt(h); return vec2(-b - s, -b + s);
}
vec2 cylT(vec3 op, vec3 dp, float r) {
  float A = dot(dp, dp); float B = dot(op, dp); float C = dot(op, op) - r * r;
  float D = B * B - A * C;
  if (D < 0.0 || A < 1e-9) return vec2(-1.0);
  float s = sqrt(D); return vec2((-B - s) / A, (-B + s) / A);
}
Hit ringHit(vec3 ro, vec3 rd) {
  Hit H; H.t = 1e9; H.kind = 0; H.n = vec3(0.0); H.h = 0.0; H.q = vec3(0.0);
  vec3 a = RA; float R = RR; float hw = RHW;
  vec3 o = ro - RC; float oa = dot(o, a); vec3 op = o - a * oa;
  float da = dot(rd, a); vec3 dp = rd - a * da;
  vec2 ti = cylT(op, dp, R);
  if (ti.y > 0.0) { float h = oa + ti.y * da; if (abs(h) < hw) { H.t = ti.y; H.kind = 1; H.h = h; } }
  vec2 to = cylT(op, dp, R + HULLT);
  if (to.x > 0.0 && to.x < H.t) { float h = oa + to.x * da; if (abs(h) < hw) { H.t = to.x; H.kind = 2; H.h = h; } }
  if (abs(da) > 1e-7) {
    for (int k = 0; k < 2; k++) {
      float s = k == 0 ? -1.0 : 1.0;
      float tw = (s * hw - oa) / da;
      if (tw > 0.0 && tw < H.t) {
        vec3 q = op + dp * tw; float r = length(q);
        if (r > R - WALLH && r < R + HULLT) { H.t = tw; H.kind = 3; H.h = s * hw; H.n = -sign(da) * a; H.q = q; }
      }
    }
  }
  if (H.kind == 1 || H.kind == 2) {
    vec3 q = op + dp * H.t; H.q = q; vec3 rad = normalize(q);
    H.n = H.kind == 1 ? -rad : rad;
  }
  return H;
}
float planetShadow(vec3 p) {
  vec3 oc = p - PC; float b = dot(oc, SUN);
  if (b > 0.0) return 1.0;
  float d = sqrt(max(dot(oc, oc) - b * b, 0.0));
  return smoothstep(PR * 0.985, PR * 1.03, d);
}
vec3 spinQ(vec3 q) { return q * cos(SPIN) + cross(RA, q) * sin(SPIN); }

vec3 shadeInner(Hit H, vec3 rd, vec3 wp) {
  vec3 a = RA;
  vec3 qr = spinQ(H.q);
  vec3 P = qr + a * H.h;
  float edge = abs(H.h) / RHW;
  int oct = OCT();
  float mount = smoothstep(0.6, 0.97, edge);
  float e = fbm(P * 1.3, oct + 3);
  e += mount * mount * 0.55 + (fbm(P * 30.0, 3) - 0.45) * mount * 0.3;
  float sea = 0.47;
  vec3 n = H.n;
  float diff = max(dot(n, SUN), 0.0);
  float sh = planetShadow(wp);
  vec3 col; float spec = 0.0;
  if (e < sea) {
    float dep = clamp((sea - e) * 6.0, 0.0, 1.0);
    col = mix(vec3(0.05, 0.16, 0.22), vec3(0.012, 0.035, 0.08), dep);
    spec = 1.0;
  } else {
    float hg = e - sea;
    float veg = fbm(P * 4.0 + 3.0, 5);
    col = mix(mix(vec3(0.09, 0.15, 0.06), vec3(0.16, 0.2, 0.08), smoothstep(0.3, 0.5, veg)), vec3(0.34, 0.29, 0.18), smoothstep(0.5, 0.72, veg));
    col = mix(col, vec3(0.36, 0.35, 0.34), smoothstep(0.08, 0.2, hg));
    col = mix(col, vec3(0.86, 0.89, 0.93), smoothstep(0.26, 0.34, hg));
    col = mix(vec3(0.52, 0.47, 0.34), col, smoothstep(0.0, 0.015, hg));
  }
  float cl = fbm(P * 1.8 + vec3(TIME * 0.006, 0.0, TIME * 0.004) + vec3(e * 2.5), oct + 2);
  float cloud = smoothstep(0.62, 0.84, cl) * (1.0 - mount * 0.5);
  vec3 light = SUNCOL * 2.2 * diff * sh + S2COL * 0.35 * max(dot(n, S2), 0.0);
  vec3 amb = vec3(0.10, 0.075, 0.05) * 0.3 * max(dot(n, normalize(PC - wp)), 0.0) + vec3(0.006, 0.009, 0.015);
  vec3 c = col * (light + amb);
  vec3 rf = reflect(rd, n);
  c += spec * SUNCOL * pow(max(dot(rf, SUN), 0.0), 80.0) * 3.0 * sh * (1.0 - cloud);
  c = mix(c, vec3(0.9, 0.92, 0.95) * (light * 1.05 + amb * 1.5), cloud);
  if (e >= sea) {
    float city = smoothstep(0.62, 0.8, vnoise(P * 40.0)) * smoothstep(0.55, 0.75, fbm(P * 6.0 + 9.0, 3)) * (1.0 - mount);
    c += vec3(1.0, 0.62, 0.3) * city * 0.6 * pow(1.0 - diff, 6.0) * (1.0 - cloud * 0.8);
  }
  float cv = abs(dot(rd, n));
  float haze = 1.0 - exp(-0.05 / max(cv, 0.04));
  vec3 hazeCol = vec3(0.42, 0.6, 0.88) * (diff * sh * 1.1 + 0.015);
  return mix(c, hazeCol, haze);
}

vec3 shadeHull(Hit H, vec3 rd, vec3 wp) {
  vec3 a = RA;
  vec3 qr = spinQ(H.q);
  vec3 V = cross(a, RU);
  float th = atan(dot(qr, V), dot(qr, RU));
  float uu = th / 6.2831853 * 900.0;
  float vv = H.h / RHW * 3.0;
  vec2 cell = floor(vec2(uu, vv)); vec2 f = fract(vec2(uu, vv));
  float pid = hash13(ivec3(int(cell.x), int(cell.y), 7));
  float seam = smoothstep(0.0, 0.035, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
  float fade = smoothstep(45.0, 6.0, H.t);
  vec3 n = H.n;
  vec3 base = vec3(0.13, 0.14, 0.155) * mix(1.0, 0.86 + 0.28 * pid, fade);
  base *= mix(1.0, 0.55 + 0.45 * seam, fade);
  float rib = smoothstep(0.86, 0.98, abs(H.h) / RHW);
  base *= 1.0 - rib * 0.35;
  float diff = max(dot(n, SUN), 0.0);
  float sh = planetShadow(wp);
  vec3 hv = normalize(SUN - rd);
  float spec = pow(max(dot(n, hv), 0.0), 48.0);
  float fres = pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
  vec3 c = base * (SUNCOL * 2.0 * diff * sh + vec3(0.09, 0.07, 0.05) * 0.5 * max(dot(n, normalize(PC - wp)), 0.0) + 0.012);
  c += SUNCOL * spec * 1.6 * sh * (0.3 + 0.7 * pid);
  c += vec3(0.4, 0.55, 0.7) * fres * 0.06;
  c += base * S2COL * 1.2 * max(dot(n, S2), 0.0) + S2COL * pow(max(dot(n, normalize(S2 - rd)), 0.0), 40.0) * 0.6;
  float lid = floor(uu / 12.0);
  float lu = (fract(uu / 12.0) - 0.5) * 12.0;
  float lv = abs(abs(vv) - 2.6);
  float lamp = smoothstep(0.55, 0.0, length(vec2(lu, lv * 1.6)));
  float blink = 0.55 + 0.45 * sin(TIME * 1.7 + hash13(ivec3(int(lid), 3, 1)) * 40.0);
  vec3 lampCol = hash13(ivec3(int(lid), 9, 2)) > 0.7 ? vec3(1.0, 0.62, 0.25) : vec3(0.4, 0.85, 1.0);
  c += lampCol * lamp * blink * 5.0 * smoothstep(22.0, 4.0, H.t);
  return c;
}

vec3 shadeWall(Hit H, vec3 rd, vec3 wp) {
  float r = length(H.q);
  float rr = clamp((r - (RR - WALLH)) / (WALLH + HULLT), 0.0, 1.0);
  vec3 qr = spinQ(H.q);
  float tex = fbm(qr * 60.0, 3);
  vec3 base = vec3(0.17, 0.18, 0.2) * (0.75 + 0.5 * tex);
  base *= 0.8 + 0.4 * smoothstep(0.92, 1.0, 1.0 - rr);
  float band = smoothstep(0.02, 0.0, abs(rr - 0.35));
  vec3 n = H.n;
  float diff = max(dot(n, SUN), 0.0);
  float sh = planetShadow(wp);
  float spec = pow(max(dot(n, normalize(SUN - rd)), 0.0), 30.0);
  vec3 c = base * (SUNCOL * 2.0 * diff * sh + 0.015) + SUNCOL * spec * 0.6 * sh;
  c += vec3(0.3, 0.8, 1.0) * band * 1.5 * smoothstep(40.0, 8.0, H.t);
  return c;
}

vec3 shadePlanet(vec3 p, vec3 rd) {
  vec3 pa = PAXIS;
  vec3 n = normalize(p - PC);
  float lat = dot(n, pa);
  int oct = OCT();
  vec3 an = n + pa * lat * 5.0;
  float rot = TIME * 0.0015 * (1.0 + 0.6 * sin(lat * 13.0));
  vec3 tg = normalize(cross(pa, n) + vec3(1e-5));
  float w1 = fbm(an * 2.2 + tg * rot, 4);
  float w2 = fbm(an * 6.0 + vec3(w1 * 2.0), oct);
  float w3 = fbm(an * 14.0 + vec3(w2 * 4.0), 4);
  float b = lat * 7.0 + (w1 - 0.5) * 1.3 + (w2 - 0.5) * 0.8 + (w3 - 0.5) * 0.35;
  float s1 = 0.5 + 0.5 * sin(b * 3.1);
  float s2 = 0.5 + 0.5 * sin(b * 7.7 + 1.3);
  vec3 cB = vec3(0.30, 0.15, 0.06), cA = vec3(0.80, 0.46, 0.18);
  vec3 cC = vec3(0.92, 0.74, 0.48), cP = vec3(0.74, 0.68, 0.58);
  vec3 col = mix(mix(cB, cA, s1), mix(cC, cP, s2), smoothstep(0.25, 0.75, s1 * 0.55 + s2 * 0.45));
  float fine = fbm(an * 18.0 + vec3(w2 * 3.0), 3);
  col *= 0.88 + 0.24 * fine;
  vec3 sd = normalize(vec3(-0.62, -0.18, 0.76));
  vec3 sv = n - sd; float sdist = length(vec2(dot(sv, tg) * 0.55, dot(sv, pa)));
  float storm = smoothstep(0.075, 0.02, sdist + (w2 - 0.5) * 0.04);
  col = mix(col, vec3(0.72, 0.36, 0.2), storm * 0.8);
  float ndl = dot(n, SUN);
  float diff = smoothstep(-0.12, 0.5, ndl) * (0.35 + 0.65 * max(ndl, 0.0));
  Hit sh = ringHit(p + n * 0.01, SUN);
  float rs = sh.kind > 0 ? 0.1 : 1.0;
  vec3 c = col * SUNCOL * 0.5 * diff * rs;
  c += col * S2COL * 0.9 * smoothstep(0.0, 0.6, dot(n, S2));
  c += col * vec3(0.006, 0.0065, 0.008);
  return c;
}

vec3 stars(vec3 rd) {
  vec3 c = vec3(0.0);
  for (int l = 0; l < 2; l++) {
    float K = l == 0 ? 170.0 : 380.0;
    vec3 q = rd * K;
    vec3 fl = floor(q); ivec3 id = ivec3(fl);
    float h = hash13(id + ivec3(l * 131, 17, 3));
    if (h > 0.93) {
      vec3 sp = fl + 0.25 + 0.5 * vec3(hash13(id + ivec3(5, 1, 2)), hash13(id + ivec3(3, 7, 1)), hash13(id + ivec3(9, 2, 8)));
      float d = length(cross(rd, normalize(sp))) * K;
      float br = pow((h - 0.93) / 0.07, 6.0) * (l == 0 ? 1.6 : 0.5);
      float sz = 0.05 + 0.04 * br;
      vec3 tint = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.86, 0.68), hash13(id + ivec3(1, 1, 1)));
      c += tint * br * exp(-d * d / (sz * sz));
    }
  }
  return c;
}

vec3 background(vec3 rd) {
  vec3 c = vec3(0.0);
  vec3 gN = normalize(vec3(0.35, 0.75, 0.55));
  float g = dot(rd, gN);
  float band = exp(-(g * g) / 0.18);
  float n1 = fbm(rd * 2.4 + vec3(4.0), 5);
  float n2 = fbm(rd * 5.0 + vec3(-2.0, 7.0, 1.0), 4);
  float dust = smoothstep(0.42, 0.68, fbm(rd * 7.0 + 11.0, 4));
  vec3 neb = mix(vec3(0.04, 0.16, 0.30), vec3(0.30, 0.07, 0.22), smoothstep(0.35, 0.65, n2));
  c += neb * pow(n1, 2.2) * (0.2 + band) * 0.9 * (1.0 - dust * 0.75);
  c += stars(rd) * (1.0 - dust * 0.6) * (0.4 + band * 0.6);
  float mu = dot(rd, SUN);
  c += SUNCOL * 60.0 * smoothstep(0.99993, 0.99996, mu);
  float m = max(mu, 0.0);
  c += SUNCOL * (pow(m, 5000.0) * 8.0 + pow(m, 600.0) * 0.5 + pow(m, 40.0) * 0.035);
  float m2 = max(dot(rd, S2), 0.0);
  c += S2COL * (40.0 * smoothstep(0.99996, 0.99998, m2) + pow(m2, 8000.0) * 6.0 + pow(m2, 900.0) * 0.4 + pow(m2, 60.0) * 0.03);
  return c;
}

vec3 atmosphere(vec3 ro, vec3 rd, float tMax, out vec3 Tout) {
  Tout = vec3(1.0);
  float H = PR * ATMOH;
  vec2 s = sphere(ro, rd, PC, PR + H);
  if (s.y < 0.0) return vec3(0.0);
  float t0 = max(s.x, 0.0), t1 = min(s.y, tMax);
  if (t1 <= t0) return vec3(0.0);
  int N = 6 + 2 * int(QUALITY);
  float dt = (t1 - t0) / float(N);
  float mu = dot(rd, SUN);
  float pR = 0.75 * (1.0 + mu * mu);
  float g = 0.72;
  float pM = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5);
  vec3 bR = vec3(0.28, 0.55, 1.0) * 0.16;
  vec3 bM = vec3(0.05);
  vec3 T = vec3(1.0), sum = vec3(0.0);
  for (int i = 0; i < 16; i++) {
    if (i >= N) break;
    vec3 p = ro + rd * (t0 + (float(i) + 0.5) * dt);
    vec3 up = p - PC; float r = length(up); up /= r;
    float hgt = max((r - PR) / H, 0.0);
    float dens = exp(-hgt * 4.0) * dt / H;
    float ct = dot(up, SUN);
    float lit = smoothstep(-0.18, 0.15, ct);
    vec3 Tl = exp(-(bR + bM) * 6.0 * (1.0 - smoothstep(-0.2, 0.6, ct)));
    sum += T * dens * lit * Tl * (bR * pR + bM * pM);
    T *= exp(-(bR + bM) * dens);
  }
  Tout = T;
  return sum * SUNCOL * 3.2;
}
vec3 acesLdr(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

void main() {
  vec3 rd = normalize(FWD + RIGHT * vNdc.x * TANX + UPV * vNdc.y * TANY);
  vec3 ro = CAM;
  Hit H = ringHit(ro, rd);
  vec2 ps = sphere(ro, rd, PC, PR);
  float tp = ps.x > 0.0 ? ps.x : 1e9;
  vec3 col; float tMax = 1e9;
  if (H.kind > 0 && H.t < tp) {
    vec3 wp = ro + rd * H.t;
    if (H.kind == 1) col = shadeInner(H, rd, wp);
    else if (H.kind == 2) col = shadeHull(H, rd, wp);
    else col = shadeWall(H, rd, wp);
    tMax = H.t;
  } else if (tp < 1e8) { col = shadePlanet(ro + rd * tp, rd); tMax = tp; }
  else col = background(rd);
  vec3 T; vec3 ins = atmosphere(ro, rd, tMax, T);
  col = col * T + ins;
#ifdef LDR
  col = pow(acesLdr(col * U[3].w), vec3(1.0 / 2.2));
#endif
  outColor = vec4(col, 1.0);
}
`;

// WebGL2 has no compute; the same orbit is evaluated in closed form per vertex.
const GLSL_PART_VS = GLSL_HEAD + GLSL_COMMON + `
out vec2 vUv; flat out float vKind; flat out float vSeed; out float vFade; out vec3 vSunv;
float hi(int i) { return hash13(ivec3(i, 71, 13)); }
void main() {
  vec2 corners[6] = vec2[6](vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(1.0, 1.0), vec2(-1.0, -1.0), vec2(1.0, 1.0), vec2(-1.0, 1.0));
  int id = gl_InstanceID;
  vec2 c = corners[gl_VertexID];
  float box = U[11].y;
  float seed = hi(id * 7);
  float kindR = hi(id * 7 + 1);
  bool debris = kindR < U[11].w;
  float sz = debris ? 0.003 + 0.016 * pow(hi(id * 7 + 2), 4.0) : 0.0012 + 0.0025 * hi(id * 7 + 2);
  vec3 base = (vec3(hi(id * 7 + 3), hi(id * 7 + 4), hi(id * 7 + 5)) - 0.5) * 2.0 * box;
  vec3 tang = normalize(cross(RA, CAM - RC));
  vec3 vel = (vec3(hi(id * 7 + 6), hi(id * 7 + 2), hi(id * 7 + 4)) - 0.5) * 0.01 + tang * (0.004 + 0.008 * fract(seed * 13.0));
  float t = TIME * U[11].z;
  vec3 p = base + vel * t + vec3(sin(t * 0.11 + seed * 40.0), cos(t * 0.13 + seed * 23.0), sin(t * 0.07 + seed * 61.0)) * 0.03;
  vec3 rel = p - CAM;
  rel = rel - floor((rel + box) / (2.0 * box)) * (2.0 * box);
  float z = dot(rel, FWD);
  vUv = c; vKind = debris ? 1.0 : 0.0; vSeed = seed; vFade = 0.0; vSunv = vec3(0.0);
  if (z < 0.03) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float x = dot(rel, RIGHT), y = dot(rel, UPV);
  float pxNdc = 2.0 / RES.y;
  float projected = sz / (z * TANY);
  float amp = 1.0;
  if (projected < pxNdc * 0.9) { float k = projected / (pxNdc * 0.9); amp = k * k; sz = pxNdc * 0.9 * z * TANY; }
  float ang = seed * 6.2831 + TIME * (seed - 0.5) * 0.5;
  vec2 rc = vec2(c.x * cos(ang) - c.y * sin(ang), c.x * sin(ang) + c.y * cos(ang));
  gl_Position = vec4((x + rc.x * sz) / (z * TANX), (y + rc.y * sz) / (z * TANY), 0.5, 1.0);
  vFade = smoothstep(box, box * 0.55, length(rel)) * smoothstep(0.03, 0.15, z) * amp;
  vec3 sv = vec3(dot(SUN, RIGHT), dot(SUN, UPV), dot(SUN, FWD));
  vSunv = vec3(sv.x * cos(-ang) - sv.y * sin(-ang), sv.x * sin(-ang) + sv.y * cos(-ang), sv.z);
  if (!debris) {
    float fs = pow(max(dot(normalize(rel), SUN), 0.0), 6.0);
    vSunv = vec3(0.06 + 1.6 * fs, 0.0, 0.0);
  }
}
`;
const GLSL_PART_FS = GLSL_HEAD + GLSL_COMMON + `
in vec2 vUv; flat in float vKind; flat in float vSeed; in float vFade; in vec3 vSunv;
out vec4 outColor;
void main() {
  float r2 = dot(vUv, vUv);
  if (vKind < 0.5) {
    float a = exp(-r2 * 4.0) * vFade * vSunv.x;
    outColor = vec4(vec3(1.0, 0.92, 0.82) * a, 0.0); return;
  }
  float ang = atan(vUv.y, vUv.x);
  float rr = 0.74 + 0.16 * sin(ang * 3.0 + vSeed * 20.0) + 0.08 * sin(ang * 7.0 + vSeed * 41.0);
  float r = sqrt(r2);
  if (r > rr) discard;
  float nz = sqrt(max(1.0 - r2 / (rr * rr), 0.0));
  float facet = vnoise(vec3(vUv * 4.0, vSeed * 50.0)) - 0.5;
  vec3 n = normalize(vec3(vUv / rr * 0.9 + facet * 0.5, -nz));
  float ndl = max(dot(n, vSunv), 0.0);
  vec3 alb = mix(vec3(0.07, 0.065, 0.06), vec3(0.14, 0.12, 0.1), fract(vSeed * 7.0));
  float rim = pow(1.0 - nz, 3.0) * max(vSunv.z, 0.0);
  vec3 col = alb * (ndl * SUNCOL * 2.6 + vec3(0.05, 0.04, 0.03)) + SUNCOL * rim * 0.5;
  float a = smoothstep(rr, rr - 0.1, r) * vFade;
  outColor = vec4(col * a, a);
}
`;

const GLSL_POST_COMMON = GLSL_HEAD + `
uniform sampler2D uSrc; uniform sampler2D uSrc2; uniform vec4 C[4];
in vec2 vUv; in vec2 vNdc;
out vec4 outColor;
const vec3 SUNCOL = vec3(1.0, 0.95, 0.88);
vec3 tx(vec2 uv) { return texture(uSrc, uv).rgb; }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`;
const GLSL_PREFILTER = GLSL_POST_COMMON + `
void main() {
  vec2 ts = 1.0 / vec2(textureSize(uSrc, 0));
  vec3 a = tx(vUv + ts * vec2(-1.0, -1.0)), b = tx(vUv + ts * vec2(1.0, -1.0));
  vec3 c = tx(vUv + ts * vec2(-1.0, 1.0)), d = tx(vUv + ts * vec2(1.0, 1.0));
  float wa = 1.0 / (1.0 + luma(a)), wb = 1.0 / (1.0 + luma(b)), wc = 1.0 / (1.0 + luma(c)), wd = 1.0 / (1.0 + luma(d));
  vec3 col = (a * wa + b * wb + c * wc + d * wd) / (wa + wb + wc + wd);
  float thr = C[3].x, knee = C[3].y;
  float br = max(col.r, max(col.g, col.b));
  float rq = clamp(br - thr + knee, 0.0, 2.0 * knee); rq = rq * rq / (4.0 * knee + 1e-5);
  float w = max(rq, br - thr) / max(br, 1e-5);
  outColor = vec4(min(col * w, vec3(64.0)), 1.0);
}
`;
const GLSL_DOWN = GLSL_POST_COMMON + `
void main() {
  vec2 ts = 1.0 / vec2(textureSize(uSrc, 0)); vec2 uv = vUv;
  vec3 a = tx(uv + ts * vec2(-2.0, 2.0)), b = tx(uv + ts * vec2(0.0, 2.0)), c = tx(uv + ts * vec2(2.0, 2.0));
  vec3 d = tx(uv + ts * vec2(-2.0, 0.0)), e = tx(uv), f = tx(uv + ts * vec2(2.0, 0.0));
  vec3 g = tx(uv + ts * vec2(-2.0, -2.0)), h = tx(uv + ts * vec2(0.0, -2.0)), k = tx(uv + ts * vec2(2.0, -2.0));
  vec3 j = tx(uv + ts * vec2(-1.0, 1.0)), l = tx(uv + ts * vec2(1.0, 1.0));
  vec3 m = tx(uv + ts * vec2(-1.0, -1.0)), n = tx(uv + ts * vec2(1.0, -1.0));
  outColor = vec4(e * 0.125 + (a + c + g + k) * 0.03125 + (b + d + f + h) * 0.0625 + (j + l + m + n) * 0.125, 1.0);
}
`;
const GLSL_UP = GLSL_POST_COMMON + `
void main() {
  vec2 ts = 1.0 / vec2(textureSize(uSrc, 0)); vec2 uv = vUv;
  vec3 col = tx(uv) * 4.0;
  col += (tx(uv + vec2(-ts.x, 0.0)) + tx(uv + vec2(ts.x, 0.0)) + tx(uv + vec2(0.0, -ts.y)) + tx(uv + vec2(0.0, ts.y))) * 2.0;
  col += tx(uv + ts) + tx(uv - ts) + tx(uv + vec2(ts.x, -ts.y)) + tx(uv + vec2(-ts.x, ts.y));
  outColor = vec4(col / 16.0, 1.0);
}
`;
const GLSL_COMPOSITE = GLSL_POST_COMMON + `
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
float h12(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 flare(vec2 p) {
  vec2 s = C[0].xy; float vis = C[0].z * C[0].w;
  if (vis <= 0.001) return vec3(0.0);
  vec2 asp = vec2(C[1].w, 1.0);
  vec2 d = (p - s) * asp; float r = length(d);
  vec3 c = SUNCOL * (exp(-r * 5.0) * 0.28 + exp(-r * 20.0) * 1.1);
  c += vec3(0.3, 0.58, 1.0) * exp(-abs(d.y) * 110.0) * exp(-abs(d.x) * 1.15) * 0.7;
  float ang = atan(d.y, d.x);
  float rays = pow(abs(sin(ang * 4.0 + 0.3)), 220.0) + pow(abs(sin(ang * 7.0 + 1.2)), 400.0) * 0.5;
  c += SUNCOL * rays * exp(-r * 7.0) * 0.22;
  float gk[7] = float[7](0.62, 0.32, -0.22, -0.55, -0.9, -1.25, -1.6);
  float gr[7] = float[7](0.035, 0.06, 0.03, 0.12, 0.05, 0.2, 0.08);
  vec3 gc[7] = vec3[7](vec3(0.3, 0.9, 1.0), vec3(1.0, 0.65, 0.3), vec3(0.7, 0.5, 1.0), vec3(0.35, 1.0, 0.7), vec3(1.0, 0.85, 0.6), vec3(0.35, 0.6, 1.0), vec3(1.0, 0.4, 0.5));
  for (int k = 0; k < 7; k++) {
    vec2 gp = s * gk[k];
    float gd = length((p - gp) * asp);
    float R = gr[k];
    float disc = smoothstep(R, R * 0.6, gd) * 0.6 + smoothstep(R * 0.12, 0.0, abs(gd - R * 0.92)) * 0.8;
    c += gc[k] * disc * 0.04;
  }
  float hr = abs(r - 0.42);
  c += vec3(0.5, 0.75, 1.0) * smoothstep(0.03, 0.0, hr) * 0.03;
  return c * vis;
}
void main() {
  vec2 uv = vUv; vec2 cc = uv - 0.5;
  float ca = C[2].z * dot(cc, cc);
  vec3 col = vec3(texture(uSrc, uv - cc * ca).r, texture(uSrc, uv).g, texture(uSrc, uv + cc * ca).b);
  col += texture(uSrc2, uv).rgb * C[1].y;
  col += flare(vNdc);
  col *= C[1].x;
  col = aces(col);
  float l = luma(col);
  col = mix(col, col * vec3(0.92, 1.0, 1.08) + vec3(0.0, 0.006, 0.014), 1.0 - smoothstep(0.0, 0.5, l));
  col = pow(col, vec3(1.0 / 2.2));
  float vig = 1.0 - C[2].x * pow(length(cc * vec2(1.0, 0.85)) * 1.3, 2.6);
  col *= clamp(vig, 0.0, 1.0);
  col += (h12(gl_FragCoord.xy + vec2(C[1].z * 61.0, C[1].z * 17.0)) - 0.5) * C[2].y;
  outColor = vec4(col, 1.0);
}
`;
