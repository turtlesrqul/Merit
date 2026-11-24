import * as THREE from 'three';
import { OrbitControls } from 'three/orbit';
import { STATES, createFeed } from './feed.js';
import { build, kindOf } from './models.js';
import { ENGINE, createRenderer, describe, frameStats, onLoss } from './engine.js';
import { buildWarehouse } from './warehouse.js';

const [layout, config] = await Promise.all([
  fetch('data/layout.json').then((r) => r.json()),
  fetch('data/config.json').then((r) => r.json()).catch(() => ({ dataSource: { type: 'none' } })),
]);

// demo data on or off: remembered per browser, ?demo=1 / ?demo=0 overrides, config.demoMode is the first-visit default
const DEMO_KEY = 'grid-twin-demo', demoParam = new URLSearchParams(location.search).get('demo');
let demoOn = !!config.demoMode; try { const v = localStorage.getItem(DEMO_KEY); if (v === '0' || v === '1') demoOn = v === '1'; } catch {}
if (demoParam === '0' || demoParam === '1') demoOn = demoParam === '1';

// 2D plan instead of 3D: asked for with ?mode=2d, or used automatically when this screen cannot draw 3D at all (js/plan2d.js)
async function plan2D(reason) {
  const { start2D } = await import('./plan2d.js');
  start2D({ layout, config, demo: demoOn, reason });
  await new Promise(() => {});   // stop here: nothing below (the 3D twin) runs
}
const NOTE = (html) => { const n = document.createElement('div'); n.className = 'safe-note'; n.innerHTML = html; document.body.appendChild(n); return n; };
const with2D = () => location.pathname + (location.search ? location.search + '&' : '?') + 'mode=2d';
if (new URLSearchParams(location.search).get('mode') === '2d') await plan2D('');

// ---------- scene ----------
const U = 0.035, CX = 700, CY = 640;          // 1 plan unit = 35 mm
const mx = (X) => (X - CX) * U, mz = (Y) => (Y - CY) * U;
const stage = document.getElementById('stage');
// ?gpulog=1 runs the graphics diagnostics (js/gpulog.js) before the twin asks for its own 3D context
const GPULOG = new URLSearchParams(location.search).has('gpulog');
const gpulog = GPULOG ? await import('./gpulog.js') : null;
if (gpulog) await gpulog.runGpuProbe();
let renderer;
try { renderer = await createRenderer(); }   // engine chosen by the address: see js/engine.js
catch (err) {
  console.warn('3D unavailable, showing the 2D plan instead:', err);
  await plan2D(`3D is not available on this screen (${ENGINE === 'webgl' ? 'WebGL' : 'WebGPU and WebGL 2'} could not start)`);
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = renderer.isWebGPURenderer ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;   // r187's WebGPU renderer has no PCFSoft
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);
// graphics reset (driver restart, casting change, sleep): WebGL comes back by itself and the twin redraws; if it has not
// come back after 8 s, or on the WebGPU engine (which cannot come back), the page reloads. A second reset within 2 minutes
// goes to the normal engine (WebGPU) or the 2D plan (WebGL) instead of reloading in a loop.
let lostNote = null, lostTimer = 0;
function recover() {
  let last = 0; try { last = +sessionStorage.getItem('grid-twin-reset') || 0; sessionStorage.setItem('grid-twin-reset', String(Date.now())); } catch {}
  if (Date.now() - last > 120000) location.reload();
  else if (ENGINE !== 'webgl') location.href = location.pathname + location.search.replace(/([?&])engine=[^&]*&?/, '$1').replace(/[?&]$/, '');
  else location.href = with2D();
}
onLoss(renderer, (why) => {
  console.warn('Graphics reset:', why);
  lostNote = lostNote || NOTE('<b>GRAPHICS RESET</b><span>The graphics driver restarted. Reconnecting…</span>');
  clearTimeout(lostTimer); lostTimer = setTimeout(recover, ENGINE === 'webgl' ? 8000 : 1500);
}, () => { clearTimeout(lostTimer); lostNote?.remove(); lostNote = null; invalidate(30); });
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x061021); scene.fog = new THREE.Fog(0x061021, 70, 150);
const cam = new THREE.PerspectiveCamera(40, 1, 0.5, 400);   // near plane 0.5 m: 5x finer depth precision than 0.1, so touching surfaces don't fight
const ctl = new OrbitControls(cam, renderer.domElement);
ctl.enableDamping = true; ctl.maxPolarAngle = Math.PI * 0.495; ctl.minDistance = 3; ctl.maxDistance = 120; ctl.autoRotateSpeed = 0.6;
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x0a1830, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(-18, 34, 22); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;   // no striped shadow acne
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 90 }); scene.add(sun);
const base = new THREE.Mesh(new THREE.BoxGeometry(44, 0.3, 48), new THREE.MeshStandardMaterial({ color: 0x0a1a33, roughness: 0.95 }));
base.position.set(0, -0.16, 2); base.receiveShadow = true; scene.add(base);
const grid = new THREE.GridHelper(48, 32, 0x1d3a63, 0x12284a); grid.position.y = 0.005; grid.material.transparent = true; grid.material.opacity = 0.45; scene.add(grid);   // softer, coarser grid: less line shimmer while orbiting

const pickables = [];
const M = {
  body: new THREE.MeshStandardMaterial({ color: 0xdfe7ee, roughness: 0.45, metalness: 0.25 }),
  bodyW: new THREE.MeshStandardMaterial({ color: 0xf2f5f8, roughness: 0.4, metalness: 0.15 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x8a9aab, roughness: 0.4, metalness: 0.6 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2c3b4c, roughness: 0.6, metalness: 0.3 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x0d2238, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.82, clearcoat: 1 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x2f7fc4, roughness: 0.4 }),
  bench: new THREE.MeshStandardMaterial({ color: 0x8fa0b2, roughness: 0.6, metalness: 0.3, transparent: true, opacity: 0.55 }),
  benchTop: new THREE.MeshStandardMaterial({ color: 0x6d8aa6, roughness: 0.7 }),
  frame: new THREE.MeshStandardMaterial({ color: 0xb9c4cf, roughness: 0.6, metalness: 0.3 }),
  cab: new THREE.MeshStandardMaterial({ color: 0x7d8ea1, roughness: 0.5, metalness: 0.5 }),
  mach: new THREE.MeshStandardMaterial({ color: 0xc9d3dd, roughness: 0.5, metalness: 0.3 }),
  screen: new THREE.MeshStandardMaterial({ color: 0x1d5c99, emissive: 0x0c2f55, roughness: 0.3 }),
  table: new THREE.MeshStandardMaterial({ color: 0x5c7896, roughness: 0.5 }),
  chair: new THREE.MeshStandardMaterial({ color: 0x22313f, roughness: 0.7 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x5fa8ff, transparent: true, opacity: 0.15, roughness: 0.3, depthWrite: false, side: THREE.DoubleSide }),
};
// status lamps: the three lamps of a tower are one mesh whose colours change (one draw call instead of three)
const LAMP_HEX = [0x2ee06e, 0xffb020, 0xff4a3d], LAMP_ON = LAMP_HEX.map((h) => new THREE.Color(h)), LAMP_OFF = LAMP_HEX.map((h) => new THREE.Color(h).multiplyScalar(0.22));
const LAMP_MAT = new THREE.MeshBasicMaterial({ vertexColors: true });

function add(geo, mat, x, y, z, parent) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; (parent || scene).add(m); return m;
}

// ---------- rooms & walls ----------
const walls = new THREE.Group(); scene.add(walls);
// Smart Warehouse: its floors, walls, doors and any machines go in their own groups so VIEW → Warehouse can hide it
const WH_ROOMS = layout.rooms.filter((r) => r.group === 'WH');
const WH_NAMES = new Set(WH_ROOMS.map((r) => r.name));
const inWH = (x, y) => WH_ROOMS.some((r) => x >= r.x - 1.5 && x <= r.x + r.w + 1.5 && y >= r.y - 1.5 && y <= r.y + r.h + 1.5);
const whGroup = new THREE.Group(); scene.add(whGroup);
const whWalls = new THREE.Group(); whWalls.renderOrder = 10; walls.add(whWalls);   // warehouse walls (restricted outline): drawn like the others, hidden with VIEW → Warehouse
const edge = new THREE.LineBasicMaterial({ color: 0x7cc4ff });
const WH = 2.6;
// walls are collected first, then shared walls of neighbouring rooms are merged so no two transparent panels overlap (they shimmer as the camera moves)
const segs = [];
function wall(x1, y1, x2, y2, red) { segs.push([x1, y1, x2, y2, !!red]); }
function buildWalls() {
  const out = [], tol = 1.2;   // plan units (~4 cm)
  for (const red of [false, true]) for (const horiz of [true, false]) {
    const list = segs.filter((q) => q[4] === red && (horiz ? Math.abs(q[1] - q[3]) < 0.01 : Math.abs(q[0] - q[2]) < 0.01))
      .map((q) => horiz ? [q[1], Math.min(q[0], q[2]), Math.max(q[0], q[2])] : [q[0], Math.min(q[1], q[3]), Math.max(q[1], q[3])])
      .sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const lines = [];                 // cluster walls lying on (nearly) the same line
    for (const q of list) { const L = lines.find((l) => Math.abs(l.c - q[0]) <= tol); if (L) L.iv.push([q[1], q[2]]); else lines.push({ c: q[0], iv: [[q[1], q[2]]] }); }
    for (const L of lines) {
      L.iv.sort((p, q) => p[0] - q[0]); let cur = null;
      for (const iv of L.iv) { if (cur && iv[0] <= cur[1] + tol) cur[1] = Math.max(cur[1], iv[1]); else { if (cur) out.push([...cur, L.c, horiz, red]); cur = [...iv]; } }
      if (cur) out.push([...cur, L.c, horiz, red]);
    }
  }
  segs.filter((q) => Math.abs(q[1] - q[3]) >= 0.01 && Math.abs(q[0] - q[2]) >= 0.01).forEach((q) => drawWall(...q));
  out.forEach(([a0, a1, c, horiz, red]) => horiz ? drawWall(a0, c, a1, c, red) : drawWall(c, a0, c, a1, red));
}
function drawWall(x1, y1, x2, y2, red) {
  const a = new THREE.Vector3(mx(x1), 0, mz(y1)), b = new THREE.Vector3(mx(x2), 0, mz(y2)); const len = a.distanceTo(b); if (len < 0.01) return;
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, WH, 0.08), M.wall);
  m.position.set((a.x + b.x) / 2, WH / 2, (a.z + b.z) / 2); m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); (red ? whWalls : walls).add(m);
  (red ? whWalls : walls).add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a.x, WH, a.z), new THREE.Vector3(b.x, WH, b.z)]), edge));
}
const inside = (r) => layout.rooms.some((o) => o !== r && o.w * o.h > r.w * r.h && r.x >= o.x - 0.5 && r.y >= o.y - 0.5 && r.x + r.w <= o.x + o.w + 0.5 && r.y + r.h <= o.y + o.h + 0.5);
for (const r of layout.rooms) {
  const f = add(new THREE.BoxGeometry(r.w * U - 0.04, 0.04, r.h * U - 0.04),
    new THREE.MeshStandardMaterial({ color: r.context ? 0x0d203b : r.hatch ? 0x1b3d66 : 0x16365e, roughness: 0.9 }), mx(r.x + r.w / 2), inside(r) ? 0.03 : 0.02, mz(r.y + r.h / 2), r.group === 'WH' ? whGroup : undefined);
  f.castShadow = false;
  if (r.name) {
    const grpArea = r.group ? layout.rooms.filter((q) => q.group === r.group).reduce((t, q) => t + q.w * q.h * U * U, 0) : 0;
    f.userData.hover = { name: r.name, sub: r.group ? `about ${Math.round(grpArea)} m²` : `${(r.w * U).toFixed(1)} × ${(r.h * U).toFixed(1)} m` + (r.context ? ' · outside production area' : '') }; pickables.push(f);
  }
  if (!r.context && !r.corridor && !r.group) {
    wall(r.x, r.y, r.x + r.w, r.y, r.restricted); wall(r.x + r.w, r.y, r.x + r.w, r.y + r.h, r.restricted);
    wall(r.x + r.w, r.y + r.h, r.x, r.y + r.h, r.restricted); wall(r.x, r.y + r.h, r.x, r.y, r.restricted);
  }
}
// rooms built from several floor pieces (smart warehouse, clean room, holding area) get one outline
for (const o of layout.outlines || []) o.points.forEach((p, k) => { const q = o.points[(k + 1) % o.points.length]; wall(p[0], p[1], q[0], q[1], o.restricted); });
buildWalls();
walls.renderOrder = 10;   // glass walls always draw after every other see-through part, so their order never flips as the camera moves

// doors (swing arcs; emergency exits in amber with a raised leaf)
for (const d of layout.doors) {
  const [hx, hy] = d.h, [ox, oy] = d.o, [cx, cy] = d.c; const r = Math.hypot(ox - hx, oy - hy);
  const a0 = Math.atan2(oy - hy, ox - hx); let da = Math.atan2(cy - hy, cx - hx) - a0; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
  const pts = [new THREE.Vector3(mx(hx), 0.06, mz(hy)), new THREE.Vector3(mx(ox), 0.06, mz(oy))];
  for (let i = 0; i <= 16; i++) { const a = a0 + da * i / 16; pts.push(new THREE.Vector3(mx(hx + r * Math.cos(a)), 0.06, mz(hy + r * Math.sin(a)))); }
  const dg = inWH(hx, hy) ? whGroup : scene;
  dg.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: d.exit ? 0xffb020 : 0xcfe6ff })));
  if (d.exit) {
    const leaf = add(new THREE.BoxGeometry(r * U, 2.1, 0.05), new THREE.MeshStandardMaterial({ color: 0xffb020, transparent: true, opacity: 0.55 }), mx((hx + ox) / 2), 1.05, mz((hy + oy) / 2), dg);
    leaf.rotation.y = -Math.atan2(oy - hy, ox - hx); leaf.userData.hover = { name: 'Emergency exit', sub: 'Keep clear' }; pickables.push(leaf);
  }
}

// ---------- equipment ----------
function setPose(rec, x, z, rot) {
  rec.g.position.set(x, 0, z); rec.rot = ((rot % 360) + 360) % 360; rec.g.rotation.y = -rec.rot * Math.PI / 180;
  rec.center.set(x, rec.height ? rec.height / 2 : 0.7, z);
}
const assets = new Map();       // id -> record
const MS = Math.min(1, Math.max(0.5, Number(config.machineScale) || 0.85));   // machines drawn at 85 % of their footprint by default
const FURNITURE = /^(bench|n2cab|metalcab|rack)$/;
const STATEFUL = (a) => !/^(Work Bench|Bench|Table|Rack|Metal Rack|Metal Cabinet|ESD Shelves|IQC Workstations|N2 Cabinet|Cabinet|Dry Cabinet|Conveyor|Controller|Chiller)$/.test(a.type);
function tower(rec, g, x, y, z) {
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.35), M.steel, x, y + 0.17, z, g);
  const parts = [0, 1, 2].map((i) => new THREE.CylinderGeometry(0.045, 0.045, 0.07, 12).toNonIndexed().translate(x, y + 0.38 + i * 0.075, z));
  const n = parts[0].attributes.position.count, pos = new Float32Array(n * 9), nor = new Float32Array(n * 9);
  parts.forEach((p, i) => { pos.set(p.attributes.position.array, i * n * 3); nor.set(p.attributes.normal.array, i * n * 3); p.dispose(); });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 9), 3));
  rec.lamps = new THREE.Mesh(geo, LAMP_MAT); rec.lamps.userData.per = n; rec.lamps.castShadow = false; g.add(rec.lamps); setLamps(rec, 'NONE');
}
function monitor(g, x, y, z) { add(new THREE.BoxGeometry(0.04, 0.32, 0.42), M.dark, x, y, z, g); add(new THREE.BoxGeometry(0.01, 0.27, 0.37), M.screen, x - 0.025, y, z, g); }
function heightFor(a) {
  if (a.hgt) return a.hgt;
  const n = a.name, t = a.type;
  if (/Work Bench/.test(t)) return 0.9; if (t === 'Bench') return 0.45; if (/Rack|ESD/.test(t)) return 2.0; if (/IQC Work/.test(t)) return 0.75;
  if (/Cabinet/.test(t)) return /Dry/.test(t) ? 1.82 : 2.1; if (/N2 Oven/.test(t)) return 1.6; if (/Counter/.test(t)) return 2.3; if (t === 'X-Ray Inspection') return 1.91;
  if (/HALT|Temperature/.test(t)) return 2.0; if (/Wave/.test(t)) return 1.6; if (/Conformal/.test(t)) return 1.8; if (/Degreaser/.test(t)) return 1.5;
  if (/KNS/.test(n)) return 0.6; if (/Gap/.test(t)) return 0.5; if (/Plasma/.test(t)) return 1.85; if (/3880/.test(n)) return 1.6; if (/Palomar|Laser Ball|Hesse/.test(n)) return 1.9;
  if (/Westbond/.test(n)) return 1.6; if (/Optical/.test(t)) return 1.5; return 1.5;
}
function facing(a) {             // degrees to turn a model so its back is to the nearest wall of its room (or a.face if the layout sets it)
  if (typeof a.face === 'number') return a.face;
  const cx = a.x + a.w / 2, cy = a.y + a.h / 2;
  const r = layout.rooms.find((q) => q.name === a.room && cx >= q.x && cx <= q.x + q.w && cy >= q.y && cy <= q.y + q.h); if (!r) return 0;
  let gaps = [[a.x - r.x, 90], [r.x + r.w - a.x - a.w, -90], [a.y - r.y, 0], [r.y + r.h - a.y - a.h, 180]];
  if (/Table|Work Bench/.test(a.type)) gaps = a.h > a.w ? gaps.slice(0, 2) : gaps.slice(2);   // benches are worked from a long side
  return gaps.sort((p, q) => p[0] - q[0])[0][1];
}
// gap (plan units) between an item's back and its room's wall, or null when no real wall runs behind it (e.g. an open edge between floor pieces)
const SNAP = 0.9;   // metres: items whose back is closer than this to a wall are drawn flush against it
function wallGap(a, turn) {
  const cx = a.x + a.w / 2, cy = a.y + a.h / 2;
  const r = layout.rooms.find((q) => q.name === a.room && cx >= q.x && cx <= q.x + q.w && cy >= q.y && cy <= q.y + q.h); if (!r) return null;
  const [gap, horiz, c, mid] = turn === 90 ? [a.x - r.x, false, r.x, cy] : turn === -90 ? [r.x + r.w - a.x - a.w, false, r.x + r.w, cy]
    : turn === 0 ? [a.y - r.y, true, r.y, cx] : [r.y + r.h - a.y - a.h, true, r.y + r.h, cx];
  const walled = segs.some(([x1, y1, x2, y2]) => horiz
    ? Math.abs(y1 - y2) < 0.01 && Math.abs(y1 - c) <= 1.5 && Math.min(x1, x2) <= mid && Math.max(x1, x2) >= mid
    : Math.abs(x1 - x2) < 0.01 && Math.abs(x1 - c) <= 1.5 && Math.min(y1, y2) <= mid && Math.max(y1, y2) >= mid);
  return walled ? gap : null;
}
function makeAsset(a) {
  const w = a.w * U, d = a.h * U, x = mx(a.x + a.w / 2), z = mz(a.y + a.h / 2);
  const g = new THREE.Group(); (WH_NAMES.has(a.room) ? whGroup : scene).add(g);
  const rec = { a, g, meshes: [], state: 'NONE', ts: null, metrics: {}, stateful: STATEFUL(a) };
  const body = (geo, mat, px, py, pz) => { const m = add(geo, mat, px, py, pz, g); rec.meshes.push(m); return m; };
  let h;
  const kind = kindOf(a); let rw = w, rd = d, ox = 0, oz = 0;   // rw, rd: drawn footprint; ox, oz: shift towards the wall (for the floor ring)
  if (kind) {
    // model built facing +z, then turned so its front faces the line aisle (SMT lines: west) or away from the nearest wall
    const turn = a.line ? -90 : facing(a), swap = Math.abs(turn) === 90;
    const m = new THREE.Group(); m.position.set(x, 0, z); m.rotation.y = turn * Math.PI / 180; g.add(m); rec.turn = turn;
    let n = 0;
    const put = (geo, mat, px, py, pz, o = {}) => {
      const mesh = add(geo, mat, px, py, pz, m);
      // each part is grown by a different hair (0.1–0.5 %) so faces that sit flush on each other never share a plane (no z-fighting)
      const k = 1 + 0.001 * (n++ % 5 + 1); mesh.scale.set((o.sx || 1) * k, k, (o.sz || 1) * k);
      if (o.rx) mesh.rotation.x = o.rx; if (o.ry) mesh.rotation.y = o.ry; if (o.rz) mesh.rotation.z = o.rz;
      if (o.pick !== false) rec.meshes.push(mesh); return mesh;
    };
    const r = build(kind, a, swap ? d : w, swap ? w : d, heightFor(a), put); h = r.h;
    const ms = typeof a.scale === 'number' ? Math.min(1.5, Math.max(0.3, a.scale)) : MS;   // a layout item can set its own "scale" (1 = full footprint)
    if (!FURNITURE.test(kind)) {   // shrink machines (config.machineScale): SMT line machines only across the line so conveyors still meet them
      if (a.line) { m.scale.set(1, ms, ms); rw *= ms; } else { m.scale.setScalar(ms); rw *= ms; rd *= ms; }
      h *= ms;
    }
    if (!a.line) {   // wall-side items sit flush against the wall (the shrink is taken from the aisle side, not the wall side)
      const gap = wallGap(a, turn), D = swap ? w : d, sc = FURNITURE.test(kind) ? 1 : ms;
      if (gap !== null && gap * U < SNAP) {
        const sh = gap * U - 0.045 + (1 - sc) * D / 2, t = turn * Math.PI / 180;   // 0.045 m = half the wall thickness + 5 mm
        ox = -Math.sin(t) * sh; oz = -Math.cos(t) * sh; m.position.x += ox; m.position.z += oz;
      }
    }
    if (rec.stateful && r.tower) tower(rec, m, ...r.tower);
  } else {
    h = heightFor(a);
    if (a.type === 'Conveyor') {
      body(new THREE.BoxGeometry(w, 0.1, d), M.steel, x, h - 0.05, z); [-1, 1].forEach((s) => add(new THREE.BoxGeometry(0.04, 0.06, d), M.dark, x + s * w * 0.42, h + 0.03, z, g));
      [-1, 1].forEach((s) => [-1, 1].forEach((t) => add(new THREE.BoxGeometry(0.04, h - 0.1, 0.04), M.frame, x + s * w * 0.4, (h - 0.1) / 2, z + t * d * 0.4, g)));
      rec.arrows = [0, 1].map(() => { const c = add(new THREE.ConeGeometry(0.07, 0.18, 12), new THREE.MeshStandardMaterial({ color: 0x5fd0ff, emissive: 0x1b5d80 }), x, h + 0.06, z, g); c.rotation.x = -Math.PI / 2; return c; });
    } else if (/Table|Work Bench/.test(a.type)) {
      body(new THREE.BoxGeometry(w, 0.05, d), M.benchTop, x, h, z); body(new THREE.BoxGeometry(w * 0.96, h - 0.05, d * 0.9), M.bench, x, (h - 0.05) / 2, z);
      add(new THREE.BoxGeometry(w, 1.1, 0.03), M.frame, x, h + 0.55, z - d / 2 + 0.02, g);
    } else if (/KNS|Gap/.test(a.name)) {
      add(new THREE.BoxGeometry(w, 0.75, d), M.frame, x, 0.375, z, g); body(new THREE.BoxGeometry(w * 0.7, h, d * 0.7), M.mach, x, 0.75 + h / 2, z); h += 0.75;
    } else if (/Chamber|X-Ray|Tray Loader|Component Storage|Flying Probe|Optical|Wave|Degreaser|Coater|Laser System|Tester/.test(a.type)) {
      body(new THREE.BoxGeometry(w, h, d), M.mach, x, h / 2, z);   // enclosed machine with a front window
      add(new THREE.BoxGeometry(Math.min(w, d) * 0.5, h * 0.3, 0.02), M.glass, x, h * 0.62, z + d / 2 + 0.011, g);
    } else body(new THREE.BoxGeometry(w, h, d), /Cabinet|Rack|ESD/.test(a.type) ? M.cab : M.mach, x, h / 2, z);
    if (rec.stateful) tower(rec, g, x + w * 0.35, h, z - d * 0.35);
  }
  rec.height = h;
  if (rec.stateful) {   // state ring on the floor
    const ring = add(new THREE.PlaneGeometry(rw + 0.3, rd + 0.3), new THREE.MeshBasicMaterial({ color: STATES.NONE.color, transparent: true, opacity: 0.35, depthWrite: false }), x + ox, 0.045, z + oz, g);
    ring.rotation.x = -Math.PI / 2; ring.castShadow = false; rec.ring = ring;
  }
  g.children.forEach((c) => { c.position.x -= x; c.position.z -= z; });
  g.position.set(x, 0, z); rec.home = { x, z, rot: a.rot || 0 };
  rec.center = new THREE.Vector3(x, h / 2, z);
  setPose(rec, x, z, a.rot || 0);
  mergeParts(rec);
  rec.meshes.forEach((m) => { m.userData.asset = a.id; pickables.push(m); });
  assets.set(a.id, rec); return rec;
}
// Each machine is built from many small parts. Parts that share a material are joined into one mesh, so the graphics chip
// gets one draw call per material per machine instead of one per part. Status lamps, the floor ring and conveyor arrows stay
// separate because they change while the twin runs.
const _inv = new THREE.Matrix4(), _rel = new THREE.Matrix4();
function mergeParts(rec) {
  const keep = new Set([rec.lamps, rec.ring, ...(rec.arrows || [])]);
  rec.g.updateMatrixWorld(true); _inv.copy(rec.g.matrixWorld).invert();
  const byMat = new Map();
  rec.g.traverse((o) => { if (o.isMesh && !keep.has(o)) { if (!byMat.has(o.material)) byMat.set(o.material, []); byMat.get(o.material).push(o); } });
  const out = [];
  for (const [mat, list] of byMat) {
    if (list.length < 2) { out.push(...list); continue; }
    const parts = list.map((o) => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(_rel.multiplyMatrices(_inv, o.matrixWorld)); return g; });
    const n = parts.reduce((t, g) => t + g.attributes.position.count, 0), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let off = 0;
    for (const g of parts) { pos.set(g.attributes.position.array, off * 3); nor.set(g.attributes.normal.array, off * 3); off += g.attributes.position.count; g.dispose(); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; rec.g.add(mesh);
    list.forEach((o) => { o.parent.remove(o); o.geometry.dispose(); });
    out.push(mesh);
  }
  rec.meshes = out;
}
layout.assets.forEach(makeAsset);
const warehouse = buildWarehouse(THREE, { parent: whGroup, mx, mz, U, M, add, pickables, motion: new URLSearchParams(location.search).get('whmotion') === '1' });   // racking, robot, deposit points, desks: js/warehouse.js

// SMT lines: flow arrows ride on each line's conveyors (printer → … → oven, south to north) and animate only when the whole line runs
const lines = [1, 2, 3].map((n) => {
  const recs = [...assets.values()].filter((r) => r.a.line === n);
  recs.filter((r) => r.arrows).forEach((r) => { const d = r.a.h * U; r.arrows.forEach((c) => { c.userData.len = Math.max(0.2, d - 0.3); c.userData.z0 = c.position.z; }); });
  const machines = recs.filter((r) => r.stateful);
  const pnp = machines.find((r) => r.a.type === 'Placement') || machines[0];
  return { n, convs: recs.filter((r) => r.arrows), ids: machines.map((r) => r.a.id), focus: pnp.a.id };
});

// Core X interior (kidney desk turned 180°, 3 seats facing the video wall; desk slightly longer than the 3.55 m video wall)
const ccx = (v) => 542.6 + (v - 35) * 0.6535, ccy = (v) => 991.9 + (v - 183) * 0.6997;
const DS = 1.65;   // desk size factor: 3.9 m long against the 3.55 m video wall
const kx = (v) => -v * 0.9 * DS * 0.656 * U, ky = (v) => v * 0.9 * DS * 0.6216 * U;
const shape = new THREE.Shape(); shape.moveTo(kx(0), ky(-60));
[[24, -60, 30, -38, 18, -18], [10, -6, 10, 6, 18, 18], [30, 38, 24, 60, 0, 60], [-26, 60, -32, 30, -32, 0], [-32, -30, -26, -60, 0, -60]].forEach((c) => shape.bezierCurveTo(kx(c[0]), ky(c[1]), kx(c[2]), ky(c[3]), kx(c[4]), ky(c[5])));
const desk = add(new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.02, bevelSegments: 2 }), M.table, mx(ccx(345)), 0.75, mz(ccy(318)));
desk.rotation.x = -Math.PI / 2; desk.userData.hover = { name: 'Core X desk', sub: '' }; pickables.push(desk);
[-1, 1].forEach((s) => add(new THREE.CylinderGeometry(0.08, 0.1, 0.72, 12), M.steel, mx(ccx(345)), 0.36, mz(ccy(318 + s * 40))));
[-45, 0, 45].forEach((o) => { add(new THREE.BoxGeometry(0.5, 0.45, 0.5), M.chair, mx(ccx(283)), 0.25, mz(ccy(318 + o))); add(new THREE.BoxGeometry(0.08, 0.5, 0.5), M.chair, mx(ccx(283)) - 0.25, 0.7, mz(ccy(318 + o))); add(new THREE.BoxGeometry(0.04, 0.3, 0.45), M.dark, mx(ccx(362)), 0.95, mz(ccy(318 + o))); });
const vw = add(new THREE.BoxGeometry(0.08, 1.3, 163 * 0.6216 * U), M.screen, mx(ccx(468)), 1.6, mz(ccy(326))); vw.userData.hover = { name: 'Video wall', sub: 'Core X east wall' }; pickables.push(vw);
const av = add(new THREE.BoxGeometry(40 * 0.656 * U, 2.0, 36 * 0.6216 * U), M.dark, mx(ccx(55)), 1.0, mz(ccy(432))); av.userData.hover = { name: 'AV rack', sub: 'Core X' }; pickables.push(av);
const glz = [[75, 470], [120, 432], [300, 432], [355, 470], [480, 470]].map(([p, q]) => [ccx(p), ccy(q)]);
for (let i = 0; i < glz.length - 1; i++) {
  const a = new THREE.Vector3(mx(glz[i][0]), 0, mz(glz[i][1])), b = new THREE.Vector3(mx(glz[i + 1][0]), 0, mz(glz[i + 1][1]));
  const m = new THREE.Mesh(new THREE.BoxGeometry(a.distanceTo(b), 2.6, 0.05), new THREE.MeshPhysicalMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.22, roughness: 0.05 }));
  m.position.set((a.x + b.x) / 2, 1.3, (a.z + b.z) / 2); m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); walls.add(m);
}

// ---------- live state ----------
const staleMs = (config.staleAfterSeconds || 30) * 1000;
function effState(rec) { if (rec.state !== 'NONE' && rec.ts && Date.now() - rec.ts > staleMs) return 'NONE'; return rec.state; }
function paint(rec) {
  const s = effState(rec), col = STATES[s].color;
  if (rec.ring) { rec.ring.material.color.setHex(col); rec.ring.material.opacity = s === 'NONE' ? 0.25 : 0.55; }
  if (rec.lamps) setLamps(rec, s);
}
function setLamps(rec, s) {
  if (rec.lampState === s) return; rec.lampState = s;
  const on = { RUN: 0, IDLE: 1, DOWN: 2 }[s], col = rec.lamps.geometry.attributes.color, n = rec.lamps.userData.per;
  for (let i = 0; i < 3; i++) { const c = i === on ? LAMP_ON[i] : LAMP_OFF[i]; for (let v = i * n; v < (i + 1) * n; v++) col.setXYZ(v, c.r, c.g, c.b); }
  col.needsUpdate = true;
}
function ingest(msg) {
  const list = Array.isArray(msg) ? msg : msg.assets || [msg];
  for (const u of list) {
    const rec = assets.get(u.id); if (!rec) continue;
    if (u.state && STATES[u.state]) rec.state = u.state;
    rec.ts = u.ts ? Date.parse(u.ts) : Date.now();
    if (u.metrics) Object.assign(rec.metrics, u.metrics);
    paint(rec);
  }
  updateStates(); if (selected) showDetail(selected); invalidate();
}
let stopFeed = () => {};
const statusEl = document.getElementById('status'), statusText = document.getElementById('statusText');
function setStatus(kind, text) {
  statusEl.className = 'pill pill-' + kind;
  statusText.textContent = { none: 'No live data', live: 'Live', demo: 'Active', connecting: 'Connecting', reconnecting: 'Reconnecting', error: 'Feed error' }[kind] || kind;
  statusEl.title = text || '';
}
function startFeed(demo) {
  stopFeed(); assets.forEach((r) => { r.state = 'NONE'; r.ts = null; r.metrics = {}; paint(r); });
  stopFeed = createFeed({ ...config, demoMode: demo }, [...assets.keys()], ingest, setStatus); renderList();
}

// ---------- UI: list, summary, search ----------
const groupsEl = document.getElementById('groups'), summaryEl = document.getElementById('summary'), q = document.getElementById('q');
const ORDER = ['Clean Room (SMT) · 100K', 'Hybrid Room · 1K', 'Laser Room · 100K', 'Test Lab 1-1', 'SMT Holding Area', 'Selective Wave Soldering', 'Conformal Coating / Degreaser · 100K', 'HASS', 'IQC 1-1', 'Changing Room 1-1'];
const dots = new Map();
const SUM = [['RUN', 'Running'], ['IDLE', 'Idle'], ['DOWN', 'Down'], ['MAINT', 'Maint.'], ['NONE', 'No data']];
summaryEl.innerHTML = SUM.map(([k, l]) => `<button type="button" data-f="${k}" aria-pressed="false" title="Show only: ${l}"><b style="color:${STATES[k].css}">0</b><span>${l}</span></button>`).join('');
const linesEl = document.createElement('div'); linesEl.className = 'lines'; summaryEl.after(linesEl);
const RANK = { DOWN: 4, MAINT: 3, IDLE: 2, RUN: 1, OFF: 0, NONE: 0 };
linesEl.innerHTML = lines.map((L) => `<button type="button" data-line="${L.n}" title="Fly to SMT Line ${L.n}"><i></i>LINE ${L.n}<span></span></button>`).join('');
function renderLines() {
  linesEl.querySelectorAll('button').forEach((b, k) => {
    const st = lines[k].ids.map((id) => effState(assets.get(id)));
    const on = st.filter((x) => x !== 'NONE' && x !== 'OFF');   // a line runs only if its machines do; all off → Off, no readings → No data
    const s2 = on.length ? on.reduce((a, c) => (RANK[c] > RANK[a] ? c : a), 'RUN') : st.some((x) => x === 'OFF') ? 'OFF' : 'NONE';
    b.querySelector('i').style.background = STATES[s2].css; b.querySelector('span').textContent = STATES[s2].label;
  });
}
linesEl.addEventListener('click', (e) => { const b = e.target.closest('button[data-line]'); if (!b) return; const c = assets.get(lines[b.dataset.line - 1].focus).center; flyTo(new THREE.Vector3(c.x - 4, 7, c.z + 9), new THREE.Vector3(c.x, 0.8, c.z - 1)); });
function renderSummary() {
  renderLines();
  const counts = { RUN: 0, IDLE: 0, DOWN: 0, MAINT: 0, NONE: 0 };
  let off = 0, none = 0;
  assets.forEach((r) => { if (!r.stateful) return; const s = effState(r); if (s === 'OFF') off++; else if (s === 'NONE') none++; counts[s === 'OFF' ? 'NONE' : s]++; });
  const last = summaryEl.querySelector('[data-f="NONE"] span'); if (last) last.textContent = off && none ? 'Off / no data' : off ? 'Off' : 'No data';   // last tile counts powered-off and silent machines
  summaryEl.querySelectorAll('button').forEach((b) => { b.querySelector('b').textContent = counts[b.dataset.f]; b.setAttribute('aria-pressed', String(stateFilter === b.dataset.f)); });
}
let stateFilter = null;
summaryEl.addEventListener('click', (e) => { const b = e.target.closest('button[data-f]'); if (!b) return; stateFilter = stateFilter === b.dataset.f ? null : b.dataset.f; renderList(); });
function updateStates() {
  if (stateFilter) { renderList(); return; }
  renderSummary();
  dots.forEach((el, id) => { const r = assets.get(id); el.style.background = STATES[effState(r)].css; });
  groupsEl.querySelectorAll('.item').forEach((b) => b.classList.toggle('sel', b.dataset.id === selected));
}
function renderList() {
  renderSummary(); dots.clear();
  const term = q.value.trim().toLowerCase();
  const byRoom = new Map(ORDER.map((r) => [r, []]));
  assets.forEach((r) => { const a = r.a; if (stateFilter && (!r.stateful || (effState(r) === 'OFF' ? 'NONE' : effState(r)) !== stateFilter)) return; if (term && !(`${a.name} ${a.id} ${a.room} ${a.type}`.toLowerCase().includes(term))) return; if (!byRoom.has(a.room)) byRoom.set(a.room, []); byRoom.get(a.room).push(r); });
  groupsEl.innerHTML = '';
  for (const [room, recs] of byRoom) {
    if (!recs.length) continue;
    recs.sort((x, y) => (y.stateful - x.stateful) || x.a.id.localeCompare(y.a.id, undefined, { numeric: true }));
    const sec = document.createElement('section'); sec.className = 'group';
    sec.innerHTML = `<h3>${room} · ${recs.length}</h3>`;
    for (const r of recs) {
      const b = document.createElement('button'); b.className = 'item' + (selected === r.a.id ? ' sel' : ''); b.type = 'button';
      const s = r.stateful ? effState(r) : null;
      b.innerHTML = `<i class="dot" style="background:${s ? STATES[s].css : 'transparent'};border:1px solid ${s ? 'transparent' : 'var(--line)'}"></i><span class="nm"></span><span class="id">${r.a.id}</span>`;
      b.querySelector('.nm').textContent = r.a.name; b.dataset.id = r.a.id; if (s) dots.set(r.a.id, b.querySelector('.dot'));
      b.onclick = () => select(r.a.id, true);
      sec.appendChild(b);
    }
    groupsEl.appendChild(sec);
  }
}
q.addEventListener('input', renderList);
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && selected) { select(null); history.replaceState(null, '', location.pathname + location.search); }
  if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); if (listPanel.classList.contains('collapsed')) listToggle.click(); q.focus(); }
});
const listPanel = document.getElementById('listPanel'), listToggle = document.getElementById('listToggle');
listToggle.onclick = () => { const c = listPanel.classList.toggle('collapsed'); listToggle.setAttribute('aria-expanded', String(!c)); listToggle.setAttribute('aria-label', c ? 'Expand equipment list' : 'Collapse equipment list'); listToggle.style.transform = c ? 'rotate(180deg)' : ''; };
if (matchMedia('(max-width: 820px)').matches) listToggle.click();

// ---------- selection & detail ----------
let selected = null; const hl = new THREE.Color(0x1d4f88);
const detail = document.getElementById('detail'), dName = document.getElementById('dName'), dBody = document.getElementById('dBody'), dLink = document.getElementById('dLink');
function setHighlight(id, on) { const r = assets.get(id); if (!r) return; r.meshes.forEach((m) => { if (on) { m.userData.mat = m.material; m.material = m.material.clone(); m.material.emissive = new THREE.Color(0x2a6fb8); m.material.emissiveIntensity = 0.6; } else if (m.userData.mat) { m.material = m.userData.mat; } }); }
function showDetail(id) {
  const r = assets.get(id); if (!r) return; const a = r.a; const s = r.stateful ? effState(r) : null;
  dName.textContent = a.name;
  const rows = [['ID', a.id], a.copyOf ? ['Copy of', a.copyOf] : null, ['Type', a.type], a.model ? ['Model', a.model] : null, ['Room', a.room], a.line ? ['Line', 'SMT Line ' + a.line] : null,
    ['Footprint', `${Math.round(a.w * 35)} × ${Math.round(a.h * 35)} mm`], ['Height', `${Math.round(r.height * 1000)} mm`],
    a.power ? ['Power', a.power] : null, a.utilities ? ['Utilities', a.utilities] : null, a.owner ? ['Owner', a.owner] : null,
    (r.g.position.distanceTo(new THREE.Vector3(r.home.x, 0, r.home.z)) > 1e-3 || r.rot !== r.home.rot) ? ['Moved', `${(r.g.position.x - r.home.x).toFixed(2)} m E · ${(r.g.position.z - r.home.z).toFixed(2)} m S · ${r.rot}°`] : null,
    s ? ['State', `<span class="state"><i style="background:${STATES[s].css}"></i>${STATES[s].label}</span>`] : null,
    s ? ['Last update', r.ts ? new Date(r.ts).toLocaleTimeString() : '—'] : null,
    ...Object.entries(r.metrics).map(([k, v]) => [k.toUpperCase(), k === 'oee' && v <= 1 ? (v * 100).toFixed(1) + '%' : String(v)])].filter(Boolean);
  dBody.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  dLink.href = '#' + a.id; detail.hidden = false;
}
function select(id, fly) {
  if (selected) setHighlight(selected, false);
  selected = assets.has(id) ? id : null;
  if (!selected) { detail.hidden = true; updateStates(); return; }
  setHighlight(selected, true); showDetail(selected); updateStates();
  if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
  if (fly) { const c = assets.get(id).center; flyTo(new THREE.Vector3(c.x - 5, c.y + 6, c.z + 7), c); }
}
document.getElementById('dClose').onclick = () => { select(null); history.replaceState(null, '', location.pathname + location.search); };
addEventListener('hashchange', () => select(decodeURIComponent(location.hash.slice(1)), true));

// ---------- camera views ----------
let tw = null;
function flyTo(p, t) { if (matchMedia('(prefers-reduced-motion: reduce)').matches) { cam.position.copy(p); ctl.target.copy(t); return; } tw = { fp: cam.position.clone(), ft: ctl.target.clone(), p, t, s: performance.now() }; }
const VIEWS = { vIso: [[-24, 30, 34], [0, 0, 2]], vTop: [[0, 70, 1.71], [0, 0, 1.7]], vSmt: [[-6, 11, 22], [mx(780), 0.8, mz(700)]], vHyb: [[mx(80), 17, mz(1230)], [mx(432), 0.5, mz(860)]], vWhs: [[mx(800), 17, mz(262)], [mx(420), 0, mz(250)]] };
const VNAME = { vIso: '3D', vTop: 'TOP', vSmt: 'SMT LINES', vHyb: 'HYBRID', vWhs: 'WAREHOUSE' };
const menuBtn = document.getElementById('menuBtn'), menuPanel = document.getElementById('menuPanel');
const setMenu = (open) => { menuPanel.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); };
menuBtn.onclick = (e) => { e.stopPropagation(); setMenu(menuPanel.hidden); };
document.addEventListener('click', (e) => { if (!menuPanel.hidden && !e.target.closest('.menu')) setMenu(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menuPanel.hidden) { setMenu(false); menuBtn.focus(); } });
Object.entries(VIEWS).forEach(([id, [p, t]]) => document.getElementById(id).onclick = () => {
  flyTo(new THREE.Vector3(...p), new THREE.Vector3(...t)); Object.keys(VIEWS).forEach((k) => document.getElementById(k).setAttribute('aria-pressed', String(k === id)));
  document.getElementById('viewName').textContent = VNAME[id]; setMenu(false);
  if (id === 'vWhs' && !whGroup.visible) setWarehouse(true);
});
cam.position.set(...VIEWS.vIso[0]); ctl.target.set(...VIEWS.vIso[1]);
const startView = new URLSearchParams(location.search).get('view');   // ?view=warehouse (or smt, hybrid, top) opens on that camera
const SV = { top: 'vTop', smt: 'vSmt', hybrid: 'vHyb', warehouse: 'vWhs' }[startView];
if (SV) { cam.position.set(...VIEWS[SV][0]); ctl.target.set(...VIEWS[SV][1]); Object.keys(VIEWS).forEach((k) => document.getElementById(k).setAttribute('aria-pressed', String(k === SV))); document.getElementById('viewName').textContent = VNAME[SV]; }
const toggle = (id, fn) => { const b = document.getElementById(id); b.onclick = () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); fn(on, b); }; };
toggle('tWalls', (on) => walls.visible = on);
const WH_KEY = 'grid-twin-warehouse', whParam = new URLSearchParams(location.search).get('warehouse');
function setWarehouse(on) {
  whGroup.visible = whWalls.visible = on; document.getElementById('tWh').setAttribute('aria-pressed', String(on));
  try { localStorage.setItem(WH_KEY, on ? '1' : '0'); } catch {}
}
let whStart = true; try { whStart = localStorage.getItem(WH_KEY) !== '0'; } catch {}
if (whParam === '0' || whParam === '1') whStart = whParam === '1';
setWarehouse(whStart);
toggle('tWh', (on) => setWarehouse(on));
toggle('tTour', (on) => ctl.autoRotate = on);

// Demo data: made-up machine states so the twin can be shown without a live feed. Remembered per browser; ?demo=1 or ?demo=0 in the address overrides.
document.getElementById('tDemo').setAttribute('aria-pressed', String(demoOn));
toggle('tDemo', (on) => { try { localStorage.setItem(DEMO_KEY, on ? '1' : '0'); } catch {} startFeed(on); });

// Hide panels: removes the controls and the equipment list for a clean wall screen. The PANELS button (top right) or the H key brings them back; ?panels=0 starts hidden.
const PANELS_KEY = 'grid-twin-panels', panelsParam = new URLSearchParams(location.search).get('panels'), showPanels = document.getElementById('showPanels');
function setPanels(hide) {
  document.body.classList.toggle('clean', hide); showPanels.hidden = !hide;
  document.getElementById('tPanels').setAttribute('aria-pressed', String(hide));
  if (hide) setMenu(false);
  try { localStorage.setItem(PANELS_KEY, hide ? '0' : '1'); } catch {}
}
let panelsHidden = false; try { panelsHidden = localStorage.getItem(PANELS_KEY) === '0'; } catch {}
if (panelsParam === '0' || panelsParam === '1') panelsHidden = panelsParam === '0';
setPanels(panelsHidden);
document.getElementById('tPanels').onclick = () => setPanels(true);
showPanels.onclick = () => { setPanels(false); menuBtn.focus(); };
addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 'h' || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, textarea')) return;
  setPanels(!document.body.classList.contains('clean'));
});
toggle('tFull', (on, b) => { const p = on ? document.documentElement.requestFullscreen?.() : document.exitFullscreen?.(); p?.catch?.(() => b.setAttribute('aria-pressed', 'false')); });
document.addEventListener('fullscreenchange', () => document.getElementById('tFull').setAttribute('aria-pressed', String(!!document.fullscreenElement)));

// ---------- hover & click ----------
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let hovId = null, downAt = null;
const tip = document.getElementById('tip'), tipT = document.getElementById('tipT'), tipS = document.getElementById('tipS');
function hit(e) { const r = renderer.domElement.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, cam); return ray.intersectObjects(pickables, false).find((h) => { for (let o = h.object; o; o = o.parent) if (!o.visible) return false; return true; }); }
renderer.domElement.addEventListener('pointermove', (e) => {
  const h = hit(e); let title = null, sub = '';
  const id = h?.object.userData.asset;
  if (id) { const r = assets.get(id); title = r.a.name + (r.a.line ? ` · Line ${r.a.line}` : ''); sub = `${r.a.id}` + (r.stateful ? ` · ${STATES[effState(r)].label}` : ''); }
  else if (h?.object.userData.hover) { title = h.object.userData.hover.name; sub = h.object.userData.hover.sub; }
  if (hovId !== id) { if (hovId && hovId !== selected) setHighlight(hovId, false); if (id && id !== selected) setHighlight(id, true); hovId = id || null; }
  renderer.domElement.style.cursor = id ? 'pointer' : '';
  if (!title) { tip.hidden = true; return; }
  tipT.textContent = title; tipS.textContent = sub; tip.hidden = false;
  const bw = tip.offsetWidth, bh = tip.offsetHeight; let lx = e.clientX + 16, ly = e.clientY + 16;
  if (lx + bw > innerWidth - 8) lx = e.clientX - bw - 16; if (ly + bh > innerHeight - 8) ly = e.clientY - bh - 16;
  tip.style.left = lx + 'px'; tip.style.top = ly + 'px';
});
renderer.domElement.addEventListener('pointerleave', () => { lastFloor = null; tip.hidden = true; if (hovId && hovId !== selected) setHighlight(hovId, false); hovId = null; });
renderer.domElement.addEventListener('pointerdown', (e) => downAt = [e.clientX, e.clientY]);
renderer.domElement.addEventListener('pointerup', (e) => {
  if (editing || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
  const id = hit(e)?.object.userData.asset; if (id) select(id, false);
});

// ---------- layout editing ----------
const SAVE_KEY = 'f17-twin-layout-v2';
let editing = false, drag = null; const undo = [];
const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitPt = new THREE.Vector3();
const editBar = document.getElementById('editBar'), editMsg = document.getElementById('editMsg'), tEdit = document.getElementById('tEdit');
const ADD_KEY = 'f17-twin-copies-v2';           // machines pasted in this browser (full asset records)
const HINT = 'Drag a machine to move it · R rotates · Ctrl+C / Ctrl+V copies it · arrow keys nudge 10 cm';
function loadEdits() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch { return {}; } }
let added = []; try { added = JSON.parse(localStorage.getItem(ADD_KEY) || '[]').filter((a) => a && a.id && !assets.has(a.id)); } catch {}
added.forEach(makeAsset);
function saveEdits() {
  const out = {}; assets.forEach((r, id) => { const p = r.g.position; if (Math.abs(p.x - r.home.x) > 1e-3 || Math.abs(p.z - r.home.z) > 1e-3 || r.rot !== r.home.rot) out[id] = { x: +p.x.toFixed(3), z: +p.z.toFixed(3), rot: r.rot }; });
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(out)); localStorage.setItem(ADD_KEY, JSON.stringify(added)); } catch {}
  const n = Object.keys(out).filter((id) => !added.some((a) => a.id === id)).length, c = added.length;
  const parts = [n ? `${n} machine${n > 1 ? 's' : ''} moved` : '', c ? `${c} cop${c > 1 ? 'ies' : 'y'} added` : ''].filter(Boolean);
  editMsg.textContent = parts.length ? parts.join(' · ') + ' · saved in this browser' : HINT;
}
Object.entries(loadEdits()).forEach(([id, e]) => { const r = assets.get(id); if (r) setPose(r, e.x, e.z, e.rot || 0); });

// copy / paste / delete
let clip = null, lastFloor = null;
function newId(id) {
  const m = id.match(/^(.*?)(\d+)$/); let k = m ? +m[2] : 1, c;
  do { k++; c = m ? m[1] + String(k).padStart(m[2].length, '0') : `${id}-${k}`; } while (assets.has(c));
  return c;
}
function removeAsset(id) {
  const r = assets.get(id); if (!r) return;
  if (selected === id) select(null); if (hovId === id) hovId = null;
  scene.remove(r.g); r.g.traverse((o) => o.geometry?.dispose());
  for (let i = pickables.length - 1; i >= 0; i--) if (pickables[i].userData.asset === id) pickables.splice(i, 1);
  assets.delete(id); added = added.filter((a) => a.id !== id);
}
function copySel() {
  if (!selected) { editMsg.textContent = 'Select a machine first, then copy it'; return; }
  const r = assets.get(selected); clip = { a: JSON.parse(JSON.stringify(r.a)), rot: r.rot, x: r.g.position.x, z: r.g.position.z, turn: r.turn };
  editMsg.textContent = `Copied ${r.a.name} · Ctrl+V or PASTE places it at the pointer`;
}
function paste(at) {
  if (!clip) { editMsg.textContent = 'Copy a machine first (select it, then COPY or Ctrl+C)'; return; }
  const snap = (v) => Math.round(v / 0.05) * 0.05;
  const px = at ? snap(at.x) : clip.x + 1, pz = at ? snap(at.z) : clip.z + 1;
  const a = { ...JSON.parse(JSON.stringify(clip.a)), id: newId(clip.a.id), copyOf: clip.a.copyOf || clip.a.id };
  if (!/\(copy\)$/.test(a.name)) a.name += ' (copy)';
  a.x = +((px / U + CX) - a.w / 2).toFixed(1); a.y = +((pz / U + CY) - a.h / 2).toFixed(1); a.rot = clip.rot || 0; if (!a.rot) delete a.rot;
  if (typeof clip.turn === 'number') a.face = clip.turn;   // keep the original's facing wherever the copy goes
  delete a.line;                                     // a copy is not part of an SMT line's flow
  const r = makeAsset(a); setPose(r, px, pz, clip.rot); r.home = { x: px, z: pz, rot: clip.rot };
  added.push(a); undo.push({ add: a.id }); if (!at) clip = { ...clip, x: px, z: pz };
  saveEdits(); renderList(); select(a.id, false); paint(r);
  editMsg.textContent = `Pasted ${a.id} · drag it into place`;
}
function deleteSel() {
  if (!selected) { editMsg.textContent = 'Select a pasted copy to delete it'; return; }
  const a = added.find((x) => x.id === selected);
  if (!a) { editMsg.textContent = 'Only pasted copies can be deleted here · to remove a drawing machine, edit data/layout.json'; return; }
  const r = assets.get(a.id); undo.push({ del: { ...a }, x: r.g.position.x, z: r.g.position.z, rot: r.rot });
  removeAsset(a.id); saveEdits(); renderList(); editMsg.textContent = `Deleted ${a.id} · UNDO brings it back`;
}
function pushUndo(r) { undo.push({ id: r.a.id, x: r.g.position.x, z: r.g.position.z, rot: r.rot }); if (undo.length > 100) undo.shift(); }
function moveBy(id, dx, dz) { const r = assets.get(id); if (!r) return; pushUndo(r); setPose(r, r.g.position.x + dx, r.g.position.z + dz, r.rot); saveEdits(); showDetail(id); }
function rotate(id) { const r = assets.get(id); if (!r) return; pushUndo(r); setPose(r, r.g.position.x, r.g.position.z, r.rot + 90); saveEdits(); showDetail(id); }
function setEditing(on) {
  editing = on; tEdit.setAttribute('aria-pressed', String(on)); editBar.hidden = !on; document.body.classList.toggle('editing', on);
  if (on) { ctl.autoRotate = false; document.getElementById('tTour').setAttribute('aria-pressed', 'false'); saveEdits(); }
}
tEdit.onclick = () => setEditing(!editing);
document.getElementById('eDone').onclick = () => setEditing(false);
document.getElementById('eRot').onclick = () => { if (selected) rotate(selected); else editMsg.textContent = 'Select a machine first, then rotate it'; };
document.getElementById('eUndo').onclick = () => {
  const u = undo.pop(); if (!u) return;
  if (u.add) { removeAsset(u.add); saveEdits(); renderList(); return; }
  if (u.del) { const r = makeAsset(u.del); added.push(u.del); setPose(r, u.x, u.z, u.rot); r.home = { x: u.x, z: u.z, rot: u.rot }; saveEdits(); renderList(); paint(r); return; }
  const r = assets.get(u.id); if (!r) return; setPose(r, u.x, u.z, u.rot); saveEdits(); if (selected === u.id) showDetail(u.id);
};
document.getElementById('eCp').onclick = copySel;
document.getElementById('ePaste').onclick = () => paste(null);
document.getElementById('eDel').onclick = deleteSel;
document.getElementById('eReset').onclick = () => {
  if (editMsg.dataset.confirm !== '1') { editMsg.dataset.confirm = '1'; editMsg.textContent = 'Press RESET ALL again to put every machine back to the drawing position and remove pasted copies'; clearTimeout(editMsg._t); editMsg._t = setTimeout(() => { editMsg.dataset.confirm = ''; saveEdits(); }, 6000); return; }
  clearTimeout(editMsg._t); editMsg.dataset.confirm = ''; undo.length = 0; added.map((a) => a.id).forEach(removeAsset); added = [];
  assets.forEach((r) => setPose(r, r.home.x, r.home.z, r.home.rot)); saveEdits(); renderList(); if (selected) showDetail(selected);
};
function exportLayout() {
  const out = JSON.parse(JSON.stringify(layout));
  out.assets.push(...JSON.parse(JSON.stringify(added)));
  out.assets.forEach((a) => { const r = assets.get(a.id); a.x = +((r.g.position.x / U + CX) - a.w / 2).toFixed(1); a.y = +((r.g.position.z / U + CY) - a.h / 2).toFixed(1); if (r.rot) a.rot = r.rot; else delete a.rot; });
  return JSON.stringify(out);
}
document.getElementById('eExport').onclick = () => {
  const url = URL.createObjectURL(new Blob([exportLayout()], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'layout.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  editMsg.textContent = 'layout.json downloaded · replace data/layout.json on the server so everyone sees it';
};
document.getElementById('eCopy').onclick = async () => {
  try { await navigator.clipboard.writeText(exportLayout()); editMsg.textContent = 'Layout copied · paste it into data/layout.json on the server'; }
  catch { editMsg.textContent = 'Copy was blocked here · use DOWNLOAD LAYOUT on the hosted site'; }
};
function floorHit(e) { const r = renderer.domElement.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, cam); return ray.ray.intersectPlane(floor, hitPt) ? hitPt.clone() : null; }
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (!editing || e.button !== 0) return;
  const id = hit(e)?.object.userData.asset; if (!id) return;
  const r = assets.get(id), p = floorHit(e); if (!p) return;
  select(id, false); pushUndo(r); ctl.enabled = false; renderer.domElement.setPointerCapture(e.pointerId);
  drag = { r, off: new THREE.Vector3().subVectors(r.g.position, p) }; renderer.domElement.style.cursor = 'grabbing';
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (editing && !drag) lastFloor = floorHit(e);
  if (!drag) return; const p = floorHit(e); if (!p) return;
  const snap = (v) => Math.round(v / 0.05) * 0.05;
  setPose(drag.r, snap(p.x + drag.off.x), snap(p.z + drag.off.z), drag.r.rot); tip.hidden = true;
});
const endDrag = () => { if (!drag) return; const id = drag.r.a.id; drag = null; ctl.enabled = true; saveEdits(); showDetail(id); };
renderer.domElement.addEventListener('pointerup', endDrag); renderer.domElement.addEventListener('pointercancel', endDrag);
addEventListener('keydown', (e) => {
  if (!editing || e.target.closest('input, textarea')) return;
  const mod = e.ctrlKey || e.metaKey, key = e.key.toLowerCase();
  if (mod && key === 'c') { if (window.getSelection()?.toString()) return; e.preventDefault(); copySel(); return; }
  if (mod && key === 'v') { e.preventDefault(); paste(lastFloor); return; }
  if (mod && key === 'd') { e.preventDefault(); copySel(); paste(null); return; }
  if ((e.key === 'Delete' || e.key === 'Backspace') && selected) { e.preventDefault(); deleteSel(); return; }
  if (!selected) return;
  const st = e.shiftKey ? 0.5 : 0.1;
  const k = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
  if (k) { e.preventDefault(); moveBy(selected, ...k); }
  if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rotate(selected); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); document.getElementById('eUndo').click(); }
});

// ---------- loop: draw only when something changes ----------
// Full speed while someone moves the camera, drags a machine or a view is flying; 30 frames a second while only
// machine animations run (robot, conveyor arrows, Down pulses); no drawing at all when nothing moves.
const clock = document.getElementById('clock');
let need = 30;                                     // frames still to draw (start-up: let textures and shadows settle)
const invalidate = (n = 2) => { need = Math.max(need, n); };
ctl.addEventListener('change', () => invalidate());
['pointermove', 'pointerdown', 'pointerup', 'wheel', 'keydown', 'click'].forEach((ev) => addEventListener(ev, () => invalidate(), { passive: true, capture: true }));
let stateSig = '';
setInterval(() => {
  clock.textContent = new Date().toLocaleTimeString(); assets.forEach(paint); updateStates();
  const sig = [...assets.values()].map(effState).join(''); if (sig !== stateSig) { stateSig = sig; invalidate(); }   // a reading went stale
}, 1000);
function size() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); invalidate(); }
addEventListener('resize', size); size();
document.addEventListener('visibilitychange', () => invalidate(5));

// automatic quality: if frames come too slowly, step down (lower resolution, then no shadows); step back up after a long smooth spell.
// ?quality=high | medium | low | lowest fixes a level and turns the automatic choice off.
const QUALITY = [
  { name: 'high', ratio: 2, shadows: 2048 }, { name: 'medium', ratio: 1.25, shadows: 1024 },
  { name: 'low', ratio: 1, shadows: 0 }, { name: 'lowest', ratio: 0.75, shadows: 0 },
];
const qParam = new URLSearchParams(location.search).get('quality'), qFixed = QUALITY.findIndex((q) => q.name === qParam);
const quality = { level: qFixed >= 0 ? qFixed : 0, auto: qFixed < 0, samples: [], good: 0, ups: 0 };
function setQuality(i) {
  quality.level = i; const q = QUALITY[i];
  renderer.setPixelRatio(Math.min(devicePixelRatio, q.ratio));
  sun.castShadow = q.shadows > 0;
  if (q.shadows && sun.shadow.mapSize.x !== q.shadows) { sun.shadow.mapSize.set(q.shadows, q.shadows); sun.shadow.map?.dispose(); sun.shadow.map = null; }
  size(); quality.samples = []; quality.good = 0;
}
setQuality(quality.level);
function judge(ms) {   // ms between two frames that were both drawn
  if (!quality.auto || document.hidden || ms > 3000) return;
  const S = quality.samples; S.push(ms);
  if (S.length < 45 && !(S.length >= 6 && S.reduce((t, v) => t + v, 0) > 3000)) return;   // decide after 45 frames, or after 3 s on a very slow screen
  const med = [...S].sort((a, b) => a - b)[S.length >> 1]; S.length = 0;
  if (med > 125 && quality.level === QUALITY.length - 1 && !quality.noted) {   // still under 8 frames a second at the lowest quality: offer the 2D plan
    quality.noted = true;
    const n = NOTE(`<b>SLOW SCREEN</b><span>${describe(renderer).software ? 'This screen draws 3D without its graphics chip, so it is slow.' : '3D runs very slowly on this screen.'} The 2D plan shows the same machines and states and runs on anything.</span><a href="${with2D()}">Switch to 2D plan</a><button type="button">Keep 3D</button>`);
    n.querySelector('button').onclick = () => n.remove();
  }
  if (med > 40 && quality.level < QUALITY.length - 1) { setQuality(quality.level + 1); return; }   // under 25 frames a second
  if (med < 20 && quality.level > 0 && quality.ups < 2) { if (++quality.good >= 10) { quality.ups++; setQuality(quality.level - 1); } }
  else quality.good = 0;
}

let last = performance.now(), lastDraw = 0, drewLast = false;
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  let anim = false;
  if (tw) { const k = Math.min(1, (now - tw.s) / 900), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; cam.position.lerpVectors(tw.fp, tw.p, e); ctl.target.lerpVectors(tw.ft, tw.t, e); if (k >= 1) tw = null; invalidate(); }
  for (const L of lines) {
    const run = L.ids.length && L.ids.every((id) => effState(assets.get(id)) === 'RUN'); if (run && L.convs.length) anim = true;
    L.convs.forEach((r) => r.arrows.forEach((c, i) => { const len = c.userData.len, t = run ? ((now / 1000 * 0.5 + i * len / 2) % len) : i * len / 2; c.position.z = c.userData.z0 + len / 2 - t; c.material.emissiveIntensity = run ? 1.5 : 0.4; }));
  }
  const pulse = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(now / 250));
  assets.forEach((r) => { if (r.ring && effState(r) === 'DOWN') { anim = true; r.ring.material.opacity = pulse; r.ring.scale.setScalar(1 + 0.08 * Math.sin(now / 250)); } else if (r.ring) r.ring.scale.setScalar(1); });
  if (warehouse.tick(dt)) anim = true;
  const moved = ctl.update(); if (moved) anim = true;   // the slow tour orbit counts as an animation (30 a second)
  const busy = need > 0 || (moved && !ctl.autoRotate) || drag;
  if (document.hidden || (!busy && (!anim || now - lastDraw < 1000 / 30 - 3))) { drewLast = false; return; }
  if (drewLast) judge(now - lastDraw);
  need = Math.max(0, need - 1); lastDraw = now; drewLast = true;
  renderer.render(scene, cam); frameCount++;
});
let frameCount = 0;   // frames actually drawn (the ?stats readout shows them per second)

// ---------- diagnostics: add ?stats=1 to the address to show a performance readout ----------
if (new URLSearchParams(location.search).has('stats')) {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:16px;bottom:12px;z-index:9;background:rgba(8,22,44,.94);border:1px solid #5fb4ff;border-radius:6px;padding:10px 12px;font:12px/1.5 ui-monospace,Consolas,monospace;color:#e6f0fb;white-space:pre;pointer-events:none';
  document.body.appendChild(box);
  const d = describe(renderer), gpu = d.chip + (d.software ? '   (SOFTWARE, not the graphics chip)' : '');
  let frames = 0, t0 = performance.now(), fps = 0, worst = 0, prev = t0, drawn0 = frameCount;
  renderer.info.autoReset = true;
  (function tick(now) {
    frames++; worst = Math.max(worst, now - prev); prev = now;
    if (now - t0 >= 1000) {
      fps = frames * 1000 / (now - t0); const drawn = (frameCount - drawn0) * 1000 / (now - t0); drawn0 = frameCount; frames = 0; t0 = now;
      const c = renderer.domElement, pr = renderer.getPixelRatio(), f = frameStats(renderer);
      box.textContent = [
        `Engine         ${d.engine} · ${d.route}`,
        `FPS            ${fps.toFixed(0)}   (slowest frame ${worst.toFixed(0)} ms)`,
        `Drawn          ${drawn.toFixed(0)} frames/s   (0 = nothing moving, nothing to redraw)`,
        `Quality        ${QUALITY[quality.level].name}${quality.auto ? ' (automatic)' : ' (fixed by address)'}   shadows ${sun.castShadow ? 'on' : 'off'}`,
        `Graphics chip  ${gpu.replace(/^ANGLE \(|\)$/g, '')}`,
        `Screen         ${screen.width} x ${screen.height} at ${Math.round(devicePixelRatio * 100)}% scaling`,
        `Drawing        ${c.width} x ${c.height} px = ${(c.width * c.height / 1e6).toFixed(1)} million px (x${pr})`,
        `Per frame      ${f.calls} draw calls, ${(f.triangles / 1000).toFixed(0)}k triangles`,
        `Tour           ${ctl.autoRotate ? 'on' : 'off'}    Walls ${walls.visible ? 'on' : 'off'}`,
      ].join('\n');
      worst = 0;
    }
    requestAnimationFrame(tick);
  })(t0);
}

if (new URLSearchParams(location.search).has('stats')) window.twinScene = scene;   // for checking from the developer panel
if (gpulog) gpulog.watchRenderer(renderer);

startFeed(demoOn);
renderList();
if (location.hash.length > 1) select(decodeURIComponent(location.hash.slice(1)), true);
