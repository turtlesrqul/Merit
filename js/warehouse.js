// Smart Warehouse interior: an unmanned automated bin store (mini-load system) with one stacker crane.
//   - grey double-deep bin racking almost to the ceiling on both sides of one aisle: braced upright frames, beams,
//     large plastic bins (600 x 400 x 300 mm)
//   - one mini-load stacker crane in the aisle, on a floor rail with a top guide rail
//   - two pick-up / drop-off stands at the west end of the aisle, set in the fence: staff put bins in on one and take
//     them out from the other (no conveyors at the moment)
//   - bin deposit point 1: counters along the west wall either side of the double door (work desk for now)
//   - bin deposit point 2: a collection-point locker bank along the south wall
//   - three store-room work desks, short end against the north wall
// Positions are in plan units (1 unit = 35 mm), the same as data/layout.json. Everything goes into the warehouse group
// so VIEW → Warehouse hides it with the room. The crane stands parked; ?whmotion=1 plays an illustrative movement.

const U0 = 0.035, m = (metres) => metres / U0;
const WALL = { w: 186.2, n: 48, e: 622.9, s: 418.3 };               // west, north, east walls of the big room; south wall of the lower strip
const RD = m(1.25), AW = m(1.1);                                    // double-deep rack depth, aisle width
const RX = [410, 595];                                              // racking runs east–west between these x
const RN = 160, AISLE = RN + RD + AW / 2, RS = RN + RD + AW;         // north rack edge, aisle centre, south rack edge
const F = { w: 389, n: 148, s: RS + RD + 12 };                      // fence: west line (stands sit in it), north and south lines; east is the wall
const MOUTH = 398;                                                  // x of the pick-up / drop-off stands
const GATE = [410, 440];                                            // maintenance gate in the north fence
const COUNTERS = [[128, 230], [270, 362]], COUNTER_D = m(0.8);      // deposit point 1 along the west wall (door at y 238–262)
const LOCK = { x0: 289, x1: 470, d: m(0.5) };                       // deposit point 2 along the south wall
const DESKS = [307, 426, 533];                                      // store work desks along the north wall

// rectangles in plan units for the 2D plan: [x, y, w, h, kind, name]
export function warehousePlan() {
  const out = [[F.w, F.n, WALL.e - F.w, F.s - F.n, 'zone', 'Automated storage area (fenced)']];
  out.push([RX[0], RN, RX[1] - RX[0], RD, 'rack', 'Bin racking']);
  out.push([RX[0], RS, RX[1] - RX[0], RD, 'rack', 'Bin racking']);
  [-1, 1].forEach((s) => out.push([MOUTH - m(0.3), AISLE + s * (AW / 2 + m(0.31)) - m(0.32), m(0.6), m(0.64), 'deposit', s < 0 ? 'Drop-off stand (in)' : 'Pick-up stand (out)']));
  COUNTERS.forEach(([a, b]) => out.push([WALL.w + 1.3, a, COUNTER_D, b - a, 'deposit', 'Bin deposit point 1']));
  out.push([LOCK.x0, WALL.s - 1.3 - LOCK.d, LOCK.x1 - LOCK.x0, LOCK.d, 'deposit', 'Bin deposit point 2 (collection lockers)']);
  DESKS.forEach((x, i) => out.push([x - m(0.375), WALL.n + 1.3, m(0.75), m(1.6), 'desk', `Store work desk ${i + 1}`]));
  return out;
}

export function buildWarehouse(THREE, { parent, mx, mz, U, M, add, pickables, motion = false }) {
  const len = (units) => units * U;
  const hover = (mesh, name, sub) => { mesh.userData.hover = { name, sub }; pickables.push(mesh); return mesh; };
  const tmp = new THREE.Object3D();
  const inst = (geo, mat, n) => { const im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = im.receiveShadow = true; parent.add(im); return im; };
  const box = (w, h, d, mat, x, y, z) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const palette = [0x30383f, 0x30383f, 0x30383f, 0x2f6fb0, 0x2f6fb0, 0x7d8894];
  const BIN = { w: 0.4, h: 0.3, d: 0.6 };
  const binGeo = new THREE.BoxGeometry(BIN.w, BIN.h, BIN.d);
  const railMat = new THREE.MeshStandardMaterial({ color: 0x5d6b7a, roughness: 0.5, metalness: 0.5 });

  // ---------- racking (grey, double-deep, one rack on each side of the aisle) ----------
  const RACK_H = 2.4, LEVELS = [0.12, 0.54, 0.96, 1.38, 1.8], BAYS = 7;
  const x0 = mx(RX[0]), x1 = mx(RX[1]), bayLen = (x1 - x0) / BAYS, depth = len(RD);
  const upMat = new THREE.MeshStandardMaterial({ color: 0x4a5866, roughness: 0.5, metalness: 0.45 });
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x9aa5b1, roughness: 0.45, metalness: 0.4 });
  const braceMat = new THREE.MeshStandardMaterial({ color: 0xc3cbd3, roughness: 0.35, metalness: 0.6 });
  const racks = [{ y: RN, side: -1 }, { y: RS, side: 1 }];   // side: -1 north of the aisle, +1 south
  const nFrames = (BAYS + 1) * racks.length;
  const ups = inst(new THREE.BoxGeometry(0.07, RACK_H, 0.07), upMat, nFrames * 2);
  const beamLevels = [...LEVELS, 2.25];
  const beams = inst(new THREE.BoxGeometry(x1 - x0, 0.08, 0.04), beamMat, racks.length * beamLevels.length * 2);
  const STEP = 0.45, nDiag = Math.floor((RACK_H - 0.15) / STEP), dLen = Math.hypot(depth - 0.07, STEP);
  const braces = inst(new THREE.BoxGeometry(0.025, dLen, 0.025), braceMat, nFrames * nDiag);
  const slots = [];
  let iu = 0, ib = 0, idg = 0;
  const aisleZ = mz(AISLE);
  racks.forEach(({ y, side }) => {
    const zN = mz(y) + 0.035, zS = mz(y + RD) - 0.035, zc = (zN + zS) / 2;
    for (let k = 0; k <= BAYS; k++) {
      const x = x0 + k * bayLen;
      for (const z of [zN, zS]) { tmp.position.set(x, RACK_H / 2, z); tmp.rotation.set(0, 0, 0); tmp.updateMatrix(); ups.setMatrixAt(iu++, tmp.matrix); }
      for (let j = 0; j < nDiag; j++) { const flip = j % 2 ? 1 : -1; tmp.position.set(x, 0.15 + STEP * (j + 0.5), zc); tmp.rotation.set(flip * Math.atan2(zS - zN, STEP), 0, 0); tmp.updateMatrix(); braces.setMatrixAt(idg++, tmp.matrix); }
    }
    for (const yy of beamLevels) for (const z of [zN, zS]) { tmp.position.set((x0 + x1) / 2, yy - 0.04, z); tmp.rotation.set(0, 0, 0); tmp.updateMatrix(); beams.setMatrixAt(ib++, tmp.matrix); }
    for (let k = 0; k < BAYS; k++) for (const s of [0.25, 0.75]) for (const yy of LEVELS) for (const deep of [0, 1]) {
      const z = aisleZ + side * (len(AW / 2) + 0.31 + deep * 0.62);
      slots.push({ x: x0 + (k + s) * bayLen, y: yy, z, reach: side * (len(AW / 2) + 0.31 + deep * 0.62) });
    }
  });
  tmp.rotation.set(0, 0, 0);
  const rackSub = `2 double-deep racks · ${LEVELS.length} levels · ${slots.length} bin places · ${RACK_H} m high`;
  [ups, beams, braces].forEach((im) => hover(im, 'Bin racking', rackSub));
  const bins = inst(binGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65 }), slots.length);
  const col = new THREE.Color();
  function setSlot(i) {
    const s = slots[i]; tmp.position.set(s.x, s.y + BIN.h / 2, s.z); tmp.scale.setScalar(s.full ? 1 : 0.0001); tmp.updateMatrix();
    bins.setMatrixAt(i, tmp.matrix); tmp.scale.setScalar(1); bins.instanceMatrix.needsUpdate = true;
  }
  slots.forEach((s, i) => { s.full = rnd() > 0.2; bins.setColorAt(i, col.setHex(palette[Math.floor(rnd() * palette.length)])); setSlot(i); });
  hover(bins, 'Storage bin', '600 × 400 × 300 mm');

  // ---------- fenced storage area ----------
  const yellow = new THREE.MeshBasicMaterial({ color: 0xffc21a });
  const flat = (w, d, mat, x, z, y = 0.058) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); p.receiveShadow = true; parent.add(p); return p; };
  const tint = new THREE.MeshBasicMaterial({ color: 0xffc21a, transparent: true, opacity: 0.05, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  hover(flat(len(WALL.e - F.w), len(F.s - F.n), tint, mx((F.w + WALL.e) / 2), mz((F.n + F.s) / 2), 0.056), 'Automated storage area', 'Fenced · no entry while the crane runs');
  const T = 0.08, tin = m(0.25);
  flat(len(WALL.e - F.w - tin), T, yellow, mx((F.w + tin + WALL.e) / 2), mz(F.n + tin));
  flat(len(WALL.e - F.w - tin), T, yellow, mx((F.w + tin + WALL.e) / 2), mz(F.s - tin));
  flat(T, len(F.s - F.n - 2 * tin), yellow, mx(F.w + tin), mz((F.n + F.s) / 2));
  const fc = document.createElement('canvas'); fc.width = fc.height = 64;
  const fg = fc.getContext('2d'); fg.strokeStyle = '#2a3542'; fg.lineWidth = 9; fg.strokeRect(0, 0, 64, 64);
  const meshTex = new THREE.CanvasTexture(fc); meshTex.wrapS = meshTex.wrapT = THREE.RepeatWrapping;
  const FH = 1.5, cell = 0.1;
  const panelMat = new THREE.MeshStandardMaterial({ map: meshTex, alphaTest: 0.2, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.4 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0xffc21a, roughness: 0.5, metalness: 0.2 });
  const standY = [-1, 1].map((s) => AISLE + s * (AW / 2 + m(0.31)));                       // stand centres (north: in, south: out)
  const gapN = [standY[0] - m(0.36), standY[0] + m(0.36)], gapS = [standY[1] - m(0.36), standY[1] + m(0.36)];
  const runs = [[F.w, F.n, F.w, gapN[0]], [F.w, gapN[1], F.w, gapS[0]], [F.w, gapS[1], F.w, F.s],
    [F.w, F.n, GATE[0], F.n], [GATE[1], F.n, WALL.e, F.n], [F.w, F.s, WALL.e, F.s]];
  const posts = [];
  for (const [ax0, ay0, bx0, by0] of runs) {
    const ax = mx(ax0), az = mz(ay0), bx = mx(bx0), bz = mz(by0), L = Math.hypot(bx - ax, bz - az); if (L < 0.3) continue;
    const geo = new THREE.PlaneGeometry(L, FH - 0.1); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L / cell, uv.getY(i) * (FH - 0.1) / cell);
    const p = new THREE.Mesh(geo, panelMat); p.position.set((ax + bx) / 2, 0.1 + (FH - 0.1) / 2, (az + bz) / 2); p.rotation.y = -Math.atan2(bz - az, bx - ax); p.castShadow = true; parent.add(p);
    hover(p, 'Safety fence', 'Staff stay outside; bins go in and out at the stands');
    const n = Math.ceil(L / 1.5); for (let i = 0; i <= n; i++) posts.push([ax + (bx - ax) * i / n, az + (bz - az) * i / n]);
    const rail = box(L, 0.04, 0.04, postMat, (ax + bx) / 2, FH, (az + bz) / 2); rail.rotation.y = p.rotation.y;
  }
  const postMesh = inst(new THREE.BoxGeometry(0.05, FH, 0.05), postMat, posts.length);
  posts.forEach(([x, z], i) => { tmp.position.set(x, FH / 2, z); tmp.updateMatrix(); postMesh.setMatrixAt(i, tmp.matrix); });
  hover(postMesh, 'Safety fence', 'Staff stay outside; bins go in and out at the stands');
  hover(box(len(GATE[1] - GATE[0]) - 0.04, FH - 0.12, 0.03, new THREE.MeshStandardMaterial({ color: 0xffc21a, roughness: 0.5 }), mx((GATE[0] + GATE[1]) / 2), 0.08 + (FH - 0.12) / 2, mz(F.n)), 'Maintenance gate', 'Locked while the crane runs');

  // ---------- pick-up / drop-off stands at the aisle end, set in the fence ----------
  const STAND_H = 0.8;
  const standBins = standY.map((y, k) => {
    const x = mx(MOUTH), z = mz(y), name = k === 0 ? 'Drop-off stand (in)' : 'Pick-up stand (out)', sub = k === 0 ? 'Staff put bins here for the crane to store' : 'The crane puts requested bins here for staff';
    hover(box(0.6, 0.04, 0.64, M.steel, x, STAND_H - 0.02, z), name, sub);
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => box(0.04, STAND_H - 0.04, 0.04, railMat, x + a * 0.27, (STAND_H - 0.04) / 2, z + b * 0.29));
    const bin = add(binGeo, new THREE.MeshStandardMaterial({ color: palette[3 + k], roughness: 0.65 }), x, STAND_H + BIN.h / 2, z, parent);
    bin.visible = k === 0; hover(bin, 'Bin', name); return bin;
  });

  // ---------- crane rail and the stacker crane ----------
  const railX0 = mx(MOUTH) - 0.3, railX1 = x1 + 0.6, railLen = railX1 - railX0, railCx = (railX0 + railX1) / 2;
  hover(box(railLen, 0.05, 0.08, railMat, railCx, 0.025, aisleZ), 'Crane rail', 'Floor rail');
  hover(box(railLen, 0.06, 0.06, railMat, railCx, 2.47, aisleZ), 'Crane guide rail', 'Top guide rail');
  for (let k = 0; k <= BAYS; k += 2) box(0.05, 0.05, len(AW) + 0.1, railMat, x0 + k * bayLen, 2.47, aisleZ);
  const g = new THREE.Group(); g.position.set(mx(MOUTH), 0, aisleZ); parent.add(g);
  const body = new THREE.MeshStandardMaterial({ color: 0xd9dee4, roughness: 0.45, metalness: 0.25 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x2f6fb0, roughness: 0.4 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x2c3742, roughness: 0.5, metalness: 0.3 });
  const parts = [];
  const pp = (geo, mat, x, y, z, p = g) => { const mesh = add(geo, mat, x, y, z, p); parts.push(mesh); return mesh; };
  pp(new THREE.BoxGeometry(1.0, 0.22, 0.42), darkM, 0.25, 0.16, 0);                 // bottom carriage (the lift sits at its west end)
  pp(new THREE.BoxGeometry(0.34, 0.75, 0.36), body, 0.55, 0.64, 0);                 // control cabinet
  pp(new THREE.BoxGeometry(0.35, 0.05, 0.37), accent, 0.55, 0.9, 0);
  pp(new THREE.BoxGeometry(0.2, 2.2, 0.26), body, 0.2, 0.27 + 1.1, 0);               // mast
  pp(new THREE.BoxGeometry(0.21, 0.08, 0.27), accent, 0.2, 1.8, 0);
  pp(new THREE.BoxGeometry(0.6, 0.08, 0.2), darkM, 0.2, 2.41, 0);                   // top carriage on the guide rail
  const beacon = new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0xffb020, emissiveIntensity: 0.25 });
  pp(new THREE.CylinderGeometry(0.04, 0.04, 0.07, 10), beacon, 0.55, 1.05, 0);
  const lift = new THREE.Group(); lift.position.set(0, 0.7, 0); g.add(lift);
  pp(new THREE.BoxGeometry(0.5, 0.05, 0.5), darkM, 0, 0, 0, lift);
  [-1, 1].forEach((s) => pp(new THREE.BoxGeometry(0.04, 0.16, 0.5), body, s * 0.25, 0.08, 0, lift));
  const fork = new THREE.Group(); lift.add(fork);
  [-0.14, 0.14].forEach((x) => pp(new THREE.BoxGeometry(0.05, 0.03, 0.58), M.steel, x, 0.04, 0, fork));
  const carried = pp(binGeo, new THREE.MeshStandardMaterial({ color: palette[0], roughness: 0.65 }), 0, 0.06 + BIN.h / 2, 0, fork); carried.visible = false;
  parts.forEach((p) => hover(p, 'Mini-load stacker crane', 'Automatic · stores and retrieves bins in the aisle'));

  // ---------- deposit point 1: counters along the west wall, either side of the double door ----------
  COUNTERS.forEach(([a, b]) => {
    const d = len(COUNTER_D), x = mx(WALL.w) + 0.045 + d / 2, z0 = mz(a), z1 = mz(b), w = z1 - z0, cz = (z0 + z1) / 2, sub = 'Work desk for now · final design to follow';
    hover(box(d, 0.05, w, M.benchTop, x, 0.9, cz), 'Bin deposit point 1', sub);
    hover(box(d * 0.92, 0.85, w * 0.98, M.bench, x, 0.425, cz), 'Bin deposit point 1', sub);
    for (let k = 0; k < Math.floor(w / 0.9); k += 2) add(binGeo, new THREE.MeshStandardMaterial({ color: palette[k % 4 ? 0 : 3], roughness: 0.65 }), x, 0.925 + BIN.h / 2, z0 + 0.5 + k * 0.9, parent);
  });

  // ---------- deposit point 2: collection-point lockers along the south wall, doors facing north ----------
  {
    const D = len(LOCK.d), H = 1.95, w = len(LOCK.x1 - LOCK.x0), cx = mx((LOCK.x0 + LOCK.x1) / 2), z = mz(WALL.s) - 0.045 - D / 2, sub = 'Collection point: staff collect bins from the lockers';
    hover(box(w, H, D, new THREE.MeshStandardMaterial({ color: 0xe9eef3, roughness: 0.45, metalness: 0.1 }), cx, H / 2, z), 'Bin deposit point 2', sub);
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = Math.round(1024 * H / w);
    const c2 = cv.getContext('2d'), W = cv.width, Hh = cv.height, head = Hh * 0.12;
    c2.fillStyle = '#e9eef3'; c2.fillRect(0, 0, W, Hh);
    c2.fillStyle = '#1f6fb8'; c2.fillRect(0, 0, W, head);
    c2.fillStyle = '#ffffff'; c2.font = `700 ${Math.round(head * 0.5)}px system-ui, sans-serif`; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText('BIN COLLECTION POINT', W / 2, head / 2);
    const k0 = W * 0.45, k1 = W * 0.55, rowsH = [0.2, 0.2, 0.28, 0.32];
    c2.fillStyle = '#c9d3dd'; c2.fillRect(k0, head, k1 - k0, Hh - head);
    let n = 1;
    for (const [s0, s1] of [[0, k0], [k1, W]]) {
      const cols = 4, cw = (s1 - s0) / cols;
      for (let c = 0; c < cols; c++) {
        let yy = head + 4;
        for (const f of rowsH) {
          const h = (Hh - head - 8) * f, x = s0 + c * cw;
          c2.fillStyle = '#f7f9fb'; c2.fillRect(x + 3, yy + 3, cw - 6, h - 6);
          c2.strokeStyle = '#8d9aa8'; c2.lineWidth = 2; c2.strokeRect(x + 3, yy + 3, cw - 6, h - 6);
          c2.fillStyle = n % 7 === 0 ? '#ffb020' : '#2ee06e'; c2.beginPath(); c2.arc(x + cw - 12, yy + 12, 3.5, 0, 7); c2.fill();
          c2.fillStyle = '#5d6b7a'; c2.font = `600 ${Math.round(h * 0.14 + 6)}px system-ui, sans-serif`; c2.textAlign = 'left'; c2.fillText(String(n++).padStart(2, '0'), x + 10, yy + 16);
          yy += h;
        }
      }
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, H), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1 }));
    face.position.set(cx, H / 2, z - D / 2 - 0.004); face.rotation.y = Math.PI; parent.add(face); hover(face, 'Bin deposit point 2', sub);
    hover(box(w * 0.08, 1.5, 0.12, M.dark, cx, 0.75, z - D / 2 - 0.06), 'Collection kiosk', 'Scan a badge or order to open a locker');
    box(w * 0.065, 0.42, 0.01, M.screen, cx, 1.15, z - D / 2 - 0.125);
  }

  // ---------- store-room work desks: short end against the north wall, worked from the west side ----------
  DESKS.forEach((px, i) => {
    const W = 0.75, L = 1.6, x = mx(px), z = mz(WALL.n) + 0.045 + L / 2, name = `Store work desk ${i + 1}`;
    hover(box(W, 0.05, L, M.table, x, 0.75, z), name, 'Store room staff');
    [-1, 1].forEach((s) => box(W * 0.9, 0.72, 0.05, M.steel, x, 0.36, z + s * (L / 2 - 0.06)));
    box(0.04, 0.34, 0.55, M.dark, x + W / 2 - 0.15, 1.0, z);
    box(0.01, 0.29, 0.5, M.screen, x + W / 2 - 0.175, 1.0, z);
    box(0.5, 0.45, 0.5, M.chair, x - W / 2 - 0.35, 0.25, z);
    box(0.08, 0.5, 0.5, M.chair, x - W / 2 - 0.6, 0.7, z);
  });

  // ---------- optional illustrative movement (?whmotion=1): drop-off stand → rack, rack → pick-up stand ----------
  const CRANE_SPEED = 1.2, LIFT_SPEED = 0.7, FORK_SPEED = 0.6, STAND_REACH = len(AW / 2) + 0.31;
  const approach = (v, to, step) => (Math.abs(to - v) <= step ? to : v + Math.sign(to - v) * step);
  const atX = (x) => x, mouthX = atX(mx(MOUTH)), standLift = STAND_H - 0.06 + 0.005;
  let steps = [], wait = 0, job = 0, refill = 0;
  function plan() {
    const inbound = job++ % 2 === 0;
    if (inbound && standBins[0].visible) {
      const empty = slots.map((s, i) => (s.full ? -1 : i)).filter((i) => i >= 0); if (!empty.length) return;
      const i = empty[Math.floor(rnd() * empty.length)], s = slots[i]; s.full = true;
      steps = [['go', mouthX], ['lift', standLift], ['fork', -STAND_REACH], ['takeStand'], ['fork', 0], ['go', atX(s.x)], ['lift', s.y - 0.04], ['fork', s.reach], ['put', i], ['fork', 0], ['lift', 0.7]];
    } else if (!inbound && !standBins[1].visible) {
      const full = slots.map((s, i) => (s.full ? i : -1)).filter((i) => i >= 0), i = full[Math.floor(rnd() * full.length)], s = slots[i];
      steps = [['go', atX(s.x)], ['lift', s.y - 0.04], ['fork', s.reach], ['pick', i], ['fork', 0], ['go', mouthX], ['lift', standLift], ['fork', STAND_REACH], ['putStand'], ['fork', 0], ['lift', 0.7]];
    }
  }
  function tick(dt) {
    if (!motion || !parent.visible) return false;   // cranes stay parked unless ?whmotion=1 asks for the illustrative movement
    dt = Math.min(dt, 0.1);
    beacon.emissiveIntensity = steps.length && Math.sin(performance.now() / 160) > 0 ? 1.6 : 0.25;
    if ((refill -= dt) < 0 && !standBins[0].visible) { refill = 8; standBins[0].material.color.setHex(palette[Math.floor(rnd() * palette.length)]); standBins[0].visible = true; }   // staff drop a bin off
    if (standBins[1].visible && refill < 4) standBins[1].visible = false;                                                                                                // staff take the bin away
    if (wait > 0) { wait -= dt; return true; }
    if (!steps.length) { plan(); wait = 1.5; return true; }
    const [t, v] = steps[0];
    if (t === 'go') { g.position.x = approach(g.position.x, v, CRANE_SPEED * dt); if (g.position.x === v) steps.shift(); }
    else if (t === 'lift') { lift.position.y = approach(lift.position.y, v, LIFT_SPEED * dt); if (lift.position.y === v) { steps.shift(); wait = 0.2; } }
    else if (t === 'fork') { fork.position.z = approach(fork.position.z, v, FORK_SPEED * dt); if (fork.position.z === v) { steps.shift(); wait = 0.15; } }
    else if (t === 'takeStand') { standBins[0].visible = false; carried.material.color.copy(standBins[0].material.color); carried.visible = true; refill = 6; steps.shift(); }
    else if (t === 'put') { bins.setColorAt(v, carried.material.color); bins.instanceColor.needsUpdate = true; setSlot(v); carried.visible = false; steps.shift(); }
    else if (t === 'pick') { slots[v].full = false; setSlot(v); bins.getColorAt(v, col); carried.material.color.copy(col); carried.visible = true; steps.shift(); }
    else if (t === 'putStand') { standBins[1].material.color.copy(carried.material.color); standBins[1].visible = true; carried.visible = false; refill = 10; steps.shift(); }
    return true;
  }
  return { tick };
}
