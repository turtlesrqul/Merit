// Procedural 3D models of the Grid production equipment, shaped and coloured after manufacturer photos.
// Every model is built in its own frame: width W along x, depth D along z, the operator front facing +z, floor at y = 0.
// build() returns the machine height and where its signal tower stands (null = no tower).
import * as THREE from 'three';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2, ...o });
function stripes(a, b, n, vertical = true) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = a; x.fillRect(0, 0, 128, 128); x.fillStyle = b;
  for (let i = 0; i < n; i++) { const p = (i + 0.25) * 128 / n, s = 128 / n * 0.5; vertical ? x.fillRect(p, 0, s, 128) : x.fillRect(0, p, 128, s); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const C = {
  white: std(0xeef1f4, { roughness: 0.45, metalness: 0.1 }),
  offwhite: std(0xe6e2d6, { roughness: 0.5, metalness: 0.05 }),
  light: std(0xd3d9df, { roughness: 0.45, metalness: 0.25 }),
  silver: std(0xc2c9d0, { roughness: 0.35, metalness: 0.35 }),
  grey: std(0x8b96a1, { roughness: 0.45, metalness: 0.35 }),
  char: std(0x454c55, { roughness: 0.5, metalness: 0.35 }),
  black: std(0x1b1f25, { roughness: 0.45, metalness: 0.3 }),
  steel: std(0xc4ccd4, { roughness: 0.32, metalness: 0.35 }),
  smoke: new THREE.MeshPhysicalMaterial({ color: 0x1a1f26, roughness: 0.08, metalness: 0.2, clearcoat: 1 }),   // opaque: tinted hoods read as solid and never re-sort against the glass walls
  clear: new THREE.MeshPhysicalMaterial({ color: 0xa9d4ff, roughness: 0.05, transparent: true, opacity: 0.32, depthWrite: false }),
  amberGlass: new THREE.MeshPhysicalMaterial({ color: 0xffb64a, roughness: 0.08, transparent: true, opacity: 0.45, depthWrite: false }),
  screen: std(0x1d5c99, { emissive: 0x0e3a66, roughness: 0.3 }),
  blue: std(0x1f5fbf, { roughness: 0.4 }),         // Palomar
  royal: std(0x1e3c9e, { roughness: 0.4 }),        // InterSelect
  navy: std(0x1d2c62, { roughness: 0.4 }),         // Mirtec, Inficon
  red: std(0xc72a2f, { roughness: 0.4 }),          // Asscon
  orange: std(0xd9472b, { roughness: 0.4 }),       // Parmi
  ruby: std(0xb3232c, { roughness: 0.4 }),         // ASMPT accent
  slate: std(0x56688b, { roughness: 0.5, metalness: 0.2 }), // Espec
  estop: std(0xd8201f, { roughness: 0.4 }),
  yellow: std(0xf2c230, { roughness: 0.4 }),
  reel: std(0xf4f6f8, { roughness: 0.6 }),
  rubber: std(0x111316, { roughness: 0.9 }),
  feeder: std(0xffffff, { map: stripes('#202429', '#5b636d', 16), roughness: 0.6 }),
  grille: std(0xffffff, { map: stripes('#7f8a95', '#4b535c', 14, false), roughness: 0.6 }),
  tray: std(0xffffff, { map: stripes('#2a3038', '#9aa5b0', 10, false), roughness: 0.6 }),
  benchTop: std(0x6d8aa6, { roughness: 0.7 }),
  benchFrame: std(0x9fb0c2, { roughness: 0.5, metalness: 0.4 }),
};

// rounded-top block: depth D (z) × height H (y) profile with rounded top corners, extruded along x for length L
function dome(L, D, H, rF, rB = rF) {
  const s = new THREE.Shape(), a = D / 2;   // shape x = -z (so -a is the front)
  s.moveTo(-a, 0); s.lineTo(a, 0); s.lineTo(a, H - rB); s.quadraticCurveTo(a, H, a - rB, H);
  s.lineTo(-a + rF, H); s.quadraticCurveTo(-a, H, -a, H - rF); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -L / 2); g.rotateY(Math.PI / 2); return g;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (r, h, n = 20, r2 = r) => new THREE.CylinderGeometry(r, r2, h, n);

export function build(kind, a, W, D, H, put) {
  // put(geo, mat, x, y, z, {rx, ry, rz, pick}) adds a mesh to the model group
  const P = (geo, mat, x, y, z, o) => put(geo, mat, x, y, z, o);
  const monitorArm = (x, y, z, face = 0, size = 0.42) => {        // swing-arm monitor; face = rotation about y
    P(cyl(0.025, y - 0.2, 8), C.char, x, (y - 0.2) / 2 + 0.2 * 0 + 0.1, z, { pick: false });
    P(box(size, size * 0.72, 0.05), C.black, x, y, z, { ry: face }); P(box(size * 0.9, size * 0.62, 0.01), C.screen, x + Math.sin(face) * 0.03, y, z + Math.cos(face) * 0.03, { ry: face });
    P(box(size * 1.05, 0.03, 0.22), C.char, x + Math.sin(face) * 0.14, y - size * 0.55, z + Math.cos(face) * 0.14, { ry: face });   // keyboard tray
  };
  const feet = (w, d, inset = 0.08) => [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => P(cyl(0.035, 0.06, 10), C.char, sx * (w / 2 - inset), 0.03, sz * (d / 2 - inset), { pick: false })));
  const estop = (x, y, z) => { P(box(0.07, 0.07, 0.03), C.yellow, x, y, z, { pick: false }); P(cyl(0.025, 0.03, 12), C.estop, x, y, z + 0.025, { rx: Math.PI / 2, pick: false }); };
  const conveyorPorts = (y = 0.95) => [-1, 1].forEach((s) => P(box(0.03, 0.06, D * 0.35), C.black, s * (W / 2 + 0.005), y, 0, { pick: false }));
  const glassCase = (w, h, d, y0, frame = C.light) => {           // framed clear enclosure
    P(box(w, h, d), C.clear, 0, y0 + h / 2, 0);
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => P(box(0.04, h, 0.04), frame, sx * (w / 2 - 0.02), y0 + h / 2, sz * (d / 2 - 0.02), { pick: false })));
    P(box(w, 0.05, d), frame, 0, y0 + h - 0.025, 0);
  };
  let h = H || 1.5, tw = null;

  switch (kind) {
    case 'dek': {            // DEK Horizon 03i/03iX: white lower body, charcoal rounded side shells, smoked domed hood
      const base = 0.95; P(box(W * 0.9, base, D * 0.94), C.white, 0, base / 2, 0);
      [-1, 1].forEach((s) => P(dome(W * 0.06, D, h, 0.45, 0.35), C.char, s * W * 0.47, 0, 0));
      P(dome(W * 0.88, D * 0.92, h - base + 0.02, 0.32, 0.25), C.smoke, 0, base - 0.02, 0);
      P(box(W * 0.88, 0.05, 0.02), C.silver, 0, base + 0.02, D * 0.47, { pick: false });
      P(box(W * 0.5, 0.42, 0.02), C.light, -W * 0.1, 0.5, D * 0.475, { pick: false });
      estop(W * 0.36, base - 0.1, D * 0.475); conveyorPorts(); feet(W * 0.9, D * 0.94);
      monitorArm(W * 0.36, 1.35, D / 2 + 0.14, 0); tw = [W * 0.38, h, -D * 0.3]; break;
    }
    case 'parmi': {          // Parmi Sigma X / XL SPI: grey cabinet, orange name band, black glass upper box, side monitor
      P(box(W, 0.74, D), C.grey, 0, 0.37, 0); P(box(W * 1.004, 0.14, D * 1.004), C.orange, 0, 0.81, 0);
      P(box(W, h - 0.88, D), C.smoke, 0, 0.88 + (h - 0.88) / 2, 0); P(box(W, 0.04, D), C.char, 0, h - 0.02, 0);
      [-1, 1].forEach((s) => P(box(0.05, h - 0.88, D), C.char, s * (W / 2 - 0.025), 0.88 + (h - 0.88) / 2, 0, { pick: false }));
      estop(-W * 0.38, 0.7, D / 2 + 0.01); conveyorPorts(); feet(W, D);
      monitorArm(W * 0.36, 1.45, D / 2 + 0.14, 0, 0.36); tw = [W * 0.35, h, -D * 0.3]; break;
    }
    case 'mydata': {         // MyData / Mycronic MY100: wide grey chassis, charcoal sloped end covers, open gantry under a clear hood, centre monitor
      P(box(W, 0.88, D), C.light, 0, 0.44, 0);
      P(box(W * 0.98, 0.5, 0.02), C.silver, 0, 0.45, D / 2 + 0.005, { pick: false });
      [-1, 1].forEach((s) => P(dome(W * 0.16, D, h, 0.5, 0.5), C.char, s * W * 0.42, 0, 0));
      P(box(W * 0.68, 0.12, D * 0.92), C.grey, 0, 0.94, 0);
      P(box(W * 0.66, 0.06, D * 0.86), C.feeder, 0, 1.03, 0, { pick: false });                 // feeder magazines
      P(box(W * 0.68, h - 1.0, D * 0.8), C.clear, 0, 1.0 + (h - 1.0) / 2, 0);
      P(box(W * 0.62, 0.08, 0.1), C.char, 0, h - 0.12, 0, { pick: false });                    // gantry beam
      P(cyl(0.03, 0.5, 8), C.char, 0, h + 0.15, -D * 0.3, { pick: false });
      P(box(0.5, 0.36, 0.05), C.black, 0, h + 0.45, -D * 0.3); P(box(0.45, 0.31, 0.01), C.screen, 0, h + 0.45, -D * 0.3 + 0.03, { pick: false });
      estop(W * 0.3, 0.75, D / 2 + 0.01); conveyorPorts(); feet(W, D); tw = [-W * 0.46, h, D * 0.38]; break;
    }
    case 'yamaha': {         // Yamaha YS100 / YS88: white body, black feeder banks front and back on carts, grey top cover, monitor on top
      P(box(W, 0.8, D * 0.6), C.white, 0, 0.4, 0);
      [-1, 1].forEach((s) => { P(box(W * 0.86, 0.32, D * 0.2), C.feeder, 0, 0.92, s * D * 0.36); P(box(W * 0.86, 0.72, D * 0.18), C.char, 0, 0.38, s * D * 0.38); });
      P(box(W, h - 1.08, D * 0.6), C.white, 0, 1.08 + (h - 1.08) / 2, 0);
      P(dome(W * 0.7, D * 0.62, 0.12, 0.08), C.grey, 0, h - 0.02, 0);
      P(box(W * 0.5, 0.25, 0.02), C.smoke, 0, 1.25, D * 0.3 + 0.005, { pick: false });
      P(box(W * 1.002, 0.04, D * 0.6), C.blue, 0, 0.82, 0, { pick: false });
      P(box(0.42, 0.32, 0.05), C.black, W * 0.3, h + 0.28, D * 0.25); P(box(0.38, 0.28, 0.01), C.screen, W * 0.3, h + 0.28, D * 0.25 + 0.03, { pick: false });
      P(cyl(0.02, 0.18, 8), C.char, W * 0.3, h + 0.07, D * 0.25, { pick: false });
      conveyorPorts(); tw = [-W * 0.4, h + 0.08, -D * 0.2]; h += 0.1; break;
    }
    case 'trayloader': {     // Yamaha tray feeder: white tower with a window onto the tray stack
      P(box(W * 0.9, h, D * 0.7), C.white, 0, h / 2, -D * 0.1);
      P(box(W * 0.6, h * 0.5, 0.02), C.smoke, 0, h * 0.55, D * 0.25 + 0.01, { pick: false });
      P(box(W * 0.55, h * 0.45, 0.01), C.tray, 0, h * 0.55, D * 0.25 + 0.025, { pick: false });
      P(box(W * 0.9, 0.04, D * 0.7), C.blue, 0, 0.82, -D * 0.1, { pick: false }); conveyorPorts(); tw = [W * 0.3, h, -D * 0.3]; break;
    }
    case 'siplace': {        // ASMPT SIPLACE TX: light grey body, charcoal hood with red trim, feeder tables with reel trolleys front and back
      P(box(W, 0.95, D * 0.56), C.light, 0, 0.475, 0);
      P(dome(W, D * 0.56, h - 0.95, 0.22, 0.22), C.char, 0, 0.95, 0);
      P(box(W * 1.004, 0.035, D * 0.56), C.ruby, 0, 0.97, 0, { pick: false });
      P(box(W * 0.6, 0.25, 0.02), C.smoke, 0, 1.22, D * 0.28 + 0.005, { pick: false });
      [-1, 1].forEach((s) => {
        P(box(W * 0.9, 0.3, D * 0.2), C.feeder, 0, 0.98, s * D * 0.37);                          // feeder table
        P(box(W * 0.9, 0.06, D * 0.2), C.char, 0, 0.15, s * D * 0.37, { pick: false });             // trolley base
        for (let i = 0; i < 8; i++) P(cyl(0.17, 0.03, 18), C.reel, -W * 0.38 + i * W * 0.108, 0.45, s * D * 0.4, { rz: Math.PI / 2, pick: false });
      });
      monitorArm(-W * 0.46, 1.65, D * 0.32, 0, 0.36); conveyorPorts(); tw = [W * 0.42, h, -D * 0.1]; break;
    }
    case 'reflow': {         // Vitronics Soltec MR933: long light-grey oven, charcoal waist line, rounded silver hood, entry console with monitor and tower
      const base = 0.82; P(box(W, base, D), C.light, 0, base / 2, 0);
      for (let i = 1; i < 5; i++) P(box(0.01, base * 0.8, 0.01), C.grey, -W / 2 + i * W / 5, base / 2, D / 2 + 0.005, { pick: false });
      P(box(W * 1.002, 0.05, D * 1.002), C.char, 0, base + 0.025, 0);
      P(dome(W * 0.97, D * 0.96, h - base - 0.05, 0.28, 0.28), C.silver, 0, base + 0.05, 0);
      for (let i = 1; i < 9; i++) P(box(0.012, 0.012, D * 0.9), C.grey, -W * 0.485 + i * W * 0.97 / 9, h + 0.002, 0, { pick: false });
      P(box(0.06, 0.04, D * 0.25), C.black, W / 2 + 0.03, 0.95, 0, { pick: false });
      P(box(0.35, 0.12, 0.3), C.char, W / 2 - 0.25, base + 0.16, D / 2 + 0.12, { rx: -0.5 });       // entry console
      P(cyl(0.025, 0.7, 8), C.char, W / 2 - 0.25, h + 0.25, D * 0.3, { pick: false });
      P(box(0.4, 0.3, 0.05), C.black, W / 2 - 0.25, h + 0.6, D * 0.3); P(box(0.36, 0.26, 0.01), C.screen, W / 2 - 0.25, h + 0.6, D * 0.3 + 0.03, { pick: false });
      tw = [W / 2 - 0.12, h, -D * 0.25]; break;
    }
    case 'asscon': {         // Asscon VP6000 vapour phase: off-white rounded body, red control end with monitor, slide-out loading tray
      const ce = Math.min(0.6, W * 0.17);
      P(dome(W - ce, D, h, 0.3, 0.3), C.offwhite, -ce / 2, 0, 0);
      P(box(ce, h, D), C.red, W / 2 - ce / 2, h / 2, 0);
      P(box(0.38, 0.28, 0.02), C.black, W / 2 - ce / 2, h * 0.72, D / 2 + 0.01); P(box(0.34, 0.24, 0.01), C.screen, W / 2 - ce / 2, h * 0.72, D / 2 + 0.025, { pick: false });
      P(box(W * 0.3, 0.04, 0.5), C.silver, -W * 0.28, 0.92, D / 2 + 0.25, { pick: false });           // loading tray
      P(box(W * 0.32, 0.18, 0.02), C.black, -W * 0.28, 1.0, D / 2 + 0.005, { pick: false });
      P(box(0.3, 0.22, 0.02), C.smoke, W * 0.05, 1.05, D / 2 + 0.005, { pick: false });
      P(box(W - ce, 0.02, 0.02), C.grey, -ce / 2, 0.75, D / 2 + 0.01, { pick: false });
      estop(W / 2 - ce / 2, 0.85, D / 2 + 0.012); conveyorPorts(); tw = [W / 2 - ce / 2, h, -D * 0.3]; break;
    }
    case 'mirtec': {         // Mirtec MV-6 OMNI: light grey cabinet, dark window under a navy brand band, monitor on a side arm
      P(box(W, 0.9, D), C.light, 0, 0.45, 0); P(box(W, h - 0.9, D), C.white, 0, 0.9 + (h - 0.9) / 2, 0);
      P(box(W * 0.8, (h - 0.9) * 0.62, 0.02), C.smoke, 0, 0.9 + (h - 0.9) * 0.42, D / 2 + 0.01, { pick: false });
      P(box(W * 1.002, 0.1, D * 1.002), C.navy, 0, h - 0.08, 0);
      estop(-W * 0.38, 0.75, D / 2 + 0.01); conveyorPorts(); feet(W, D);
      monitorArm(-W * 0.3, 1.45, D / 2 + 0.14, 0, 0.4); tw = [W * 0.38, h, -D * 0.3]; break;
    }
    case 'xray': {           // Shimadzu Xslicer SMX-6000: white shielded cabinet, charcoal door panel with viewing window, black control console
      P(box(W * 0.78, h, D), C.white, -W * 0.11, h / 2, 0);
      P(box(W * 0.78, 0.12, D), C.black, -W * 0.11, 0.06, 0, { pick: false });
      P(box(W * 0.46, h * 0.36, 0.03), C.char, -W * 0.11, h * 0.6, D / 2 + 0.015);
      P(box(W * 0.2, h * 0.12, 0.01), C.smoke, -W * 0.11, h * 0.62, D / 2 + 0.035, { pick: false });
      P(box(W * 0.2, h * 0.62, D * 0.6), C.black, W * 0.4, h * 0.31, D * 0.18);                     // control tower
      P(box(W * 0.24, 0.04, D * 0.35), C.char, W * 0.4, h * 0.63, D * 0.3, { pick: false });
      P(box(0.04, 0.3, 0.4), C.black, W * 0.38, h * 0.82, D * 0.05, { ry: Math.PI / 2 }); tw = [-W * 0.4, h, -D * 0.35]; break;
    }
    case 'palomar': {        // Palomar die / wedge bonders: white base, blue waist band, clear enclosure, twin monitors on a front arm
      const base = 0.88; P(box(W, base, D), C.white, 0, base / 2, 0);
      P(box(W * 1.004, 0.09, D * 1.004), C.blue, 0, base + 0.045, 0);
      glassCase(W * 0.92, h - base - 0.09, D * 0.9, base + 0.09);
      P(box(W * 0.5, 0.25, D * 0.4), C.char, 0, base + 0.25, 0, { pick: false });                 // bond head stage
      P(box(W * 0.6, 0.06, 0.25), C.grey, 0, base + 0.03, D / 2 + 0.12, { pick: false });           // front table
      [0, 1].forEach((i) => { P(box(0.42, 0.3, 0.05), C.black, -W / 2 + 0.05, 1.25 + i * 0.34, D / 2 + 0.05); P(box(0.38, 0.26, 0.01), C.screen, -W / 2 + 0.05, 1.25 + i * 0.34, D / 2 + 0.08, { pick: false }); });
      P(cyl(0.025, 1.2, 8), C.char, -W / 2 + 0.05, 0.6, D / 2 + 0.02, { pick: false });
      estop(W * 0.38, base - 0.12, D / 2 + 0.01); feet(W, D); tw = [W * 0.4, h, -D * 0.35]; break;
    }
    case 'hesse': {          // Hesse BONDJET BJ855: narrow white cabinet, glass work cell, monitor set in the hood, drawer front
      const base = 0.92; P(box(W, base, D), C.white, 0, base / 2, 0);
      P(box(W * 0.9, 0.3, 0.02), C.light, 0, 0.5, D / 2 + 0.005, { pick: false });
      glassCase(W, h - base - 0.3, D, base, C.white);
      P(box(W, 0.3, D), C.white, 0, h - 0.15, 0);
      P(box(W * 0.6, 0.24, 0.02), C.black, 0, h - 0.15, D / 2 + 0.01); P(box(W * 0.55, 0.2, 0.01), C.screen, 0, h - 0.15, D / 2 + 0.022, { pick: false });
      P(box(W * 0.45, 0.06, 0.25), C.char, 0, base + 0.03, D / 2 + 0.12, { pick: false });
      estop(-W * 0.35, base - 0.1, D / 2 + 0.01); tw = [W * 0.35, h, -D * 0.3]; break;
    }
    case 'plasma': {         // plasma cleaner: white cabinet, square chamber door, small display
      P(box(W, h, D), C.white, 0, h / 2, 0);
      P(box(W * 0.62, W * 0.55, 0.03), C.steel, 0, h * 0.62, D / 2 + 0.015); P(cyl(W * 0.16, 0.02, 24), C.smoke, 0, h * 0.62, D / 2 + 0.035, { rx: Math.PI / 2, pick: false });
      P(box(W * 0.4, 0.14, 0.02), C.screen, 0, h * 0.86, D / 2 + 0.01, { pick: false });
      P(box(W, 0.05, D), C.grey, 0, h * 0.4, 0, { pick: false }); tw = [W * 0.3, h, -D * 0.3]; break;
    }
    case 'oven': {           // N2 baking oven: stainless cabinet on a plinth, door with a small window and handle, controller and N2 flow meter above
      const base = 0.12, top = h - 0.32;
      P(box(W, base, D), C.char, 0, base / 2, 0, { pick: false });
      P(box(W, top - base, D), C.steel, 0, (base + top) / 2, 0);
      P(box(W * 0.82, (top - base) * 0.82, 0.03), C.light, -W * 0.03, (base + top) / 2, D / 2 + 0.015);
      P(box(W * 0.34, (top - base) * 0.26, 0.01), C.smoke, -W * 0.03, (base + top) / 2 + 0.12, D / 2 + 0.035, { pick: false });
      P(box(0.04, (top - base) * 0.4, 0.05), C.char, W * 0.33, (base + top) / 2, D / 2 + 0.05, { pick: false });
      P(box(W, 0.32, D), C.light, 0, h - 0.16, 0);
      P(box(W * 0.36, 0.16, 0.01), C.screen, -W * 0.2, h - 0.16, D / 2 + 0.006, { pick: false });
      P(cyl(0.025, 0.2, 12), C.smoke, W * 0.25, h - 0.16, D / 2 + 0.03, { pick: false });
      tw = [W * 0.38, h, -D * 0.3]; break;
    }
    case 'pactech': {        // PacTech SB²-Jet: white cabinet with a grey glass laser cell and an operator screen
      const base = 0.9; P(box(W, base, D), C.white, 0, base / 2, 0);
      glassCase(W, h - base - 0.25, D, base, C.grey); P(box(W, 0.25, D), C.light, 0, h - 0.125, 0);
      P(box(W * 0.3, 0.4, D * 0.3), C.char, 0, base + 0.35, 0, { pick: false });
      monitorArm(W / 2 + 0.12, 1.4, D * 0.3, 0, 0.36); tw = [-W * 0.38, h, -D * 0.3]; break;
    }
    case 'typhoon': {        // Qualmark Typhoon 3.0 HALT/HASS: off-white chamber on legs, door with window, control tower beside it
      const cw = W * 0.72; P(box(cw, h - 0.25, D), C.offwhite, -W * 0.14, 0.25 + (h - 0.25) / 2, 0);
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => P(box(0.06, 0.25, 0.06), C.steel, -W * 0.14 + sx * (cw / 2 - 0.05), 0.125, sz * (D / 2 - 0.05), { pick: false })));
      P(box(cw * 0.7, (h - 0.25) * 0.75, 0.04), C.offwhite, -W * 0.14, 0.25 + (h - 0.25) * 0.47, D / 2 + 0.02);
      P(box(cw * 0.3, cw * 0.3, 0.02), C.smoke, -W * 0.14, 0.25 + (h - 0.25) * 0.5, D / 2 + 0.045, { pick: false });
      P(box(0.05, 0.5, 0.06), C.steel, -W * 0.14 + cw * 0.3, 1.1, D / 2 + 0.06, { pick: false });
      P(box(W * 0.24, h * 0.85, D * 0.7), C.offwhite, W * 0.37, h * 0.425, -D * 0.1);
      P(box(W * 0.16, 0.24, 0.02), C.screen, W * 0.37, h * 0.7, D * 0.25 + 0.01, { pick: false }); tw = [W * 0.37, h * 0.85, -D * 0.2]; break;
    }
    case 'espec': {          // ESPEC TSD-101: slate-blue two-zone thermal shock chamber, centre door with window, top-left panel
      P(box(W, h, D), C.slate, 0, h / 2, 0);
      P(box(W * 0.6, h * 0.36, 0.03), C.slate, W * 0.05, h * 0.52, D / 2 + 0.015); P(box(W * 0.2, h * 0.08, 0.02), C.light, W * 0.05, h * 0.62, D / 2 + 0.035, { pick: false });
      P(box(W * 0.16, h * 0.14, 0.02), C.black, -W * 0.32, h * 0.8, D / 2 + 0.01); P(box(W * 0.12, h * 0.08, 0.01), C.screen, -W * 0.32, h * 0.81, D / 2 + 0.022, { pick: false });
      [0.3, 0.75].forEach((t) => P(box(W * 0.98, 0.01, 0.01), C.char, 0, h * t, D / 2 + 0.006, { pick: false }));
      P(box(W * 0.1, 0.06, D * 0.4), C.grille, 0, h + 0.03, 0, { pick: false }); tw = [W * 0.4, h, -D * 0.3]; break;
    }
    case 'chiller': P(box(W, h, D), C.light, 0, h / 2, 0); P(box(W * 0.8, h * 0.5, 0.01), C.grille, 0, h * 0.45, D / 2 + 0.005, { pick: false }); P(box(W * 0.25, 0.1, 0.01), C.screen, W * 0.25, h * 0.85, D / 2 + 0.006, { pick: false }); break;
    case 'shock': {          // Labtone drop/shock tester: heavy base, twin guide columns, drop table and top beam
      P(box(W, 0.35, D), C.char, 0, 0.175, 0); [-1, 1].forEach((s) => P(cyl(0.04, h - 0.35, 12), C.steel, s * W * 0.32, 0.35 + (h - 0.35) / 2, 0));
      P(box(W * 0.75, 0.08, D * 0.6), C.silver, 0, 0.75, 0); P(box(W * 0.8, 0.12, D * 0.3), C.blue, 0, h - 0.06, 0); h = h; break;
    }
    case 'controller': P(box(W, h, D), C.light, 0, h / 2, 0); P(box(W * 0.6, 0.22, 0.02), C.black, 0, h * 0.75, D / 2 + 0.01); P(box(W * 0.5, 0.17, 0.01), C.screen, 0, h * 0.75, D / 2 + 0.022, { pick: false }); break;
    case 'vessel': {         // gross pressure / helium bombing chambers: steel vessel on a grey cabinet with gauges
      const cab = Math.min(0.8, h * 0.6); P(box(W, cab, D), C.grey, 0, cab / 2, 0);
      const r = Math.min(W, D) * 0.3, len = Math.max(W, D) * 0.7, horiz = W >= D;
      P(cyl(r, len, 24), C.steel, 0, cab + r + 0.02, 0, horiz ? { rz: Math.PI / 2 } : { rx: Math.PI / 2 });
      P(cyl(r * 1.1, 0.05, 24), C.char, horiz ? len / 2 : 0, cab + r + 0.02, horiz ? 0 : len / 2, horiz ? { rz: Math.PI / 2 } : { rx: Math.PI / 2 });
      [-1, 1].forEach((s) => P(cyl(0.05, 0.02, 16), C.white, s * W * 0.2, cab * 0.75, D / 2 + 0.01, { rx: Math.PI / 2, pick: false }));
      h = cab + 2 * r + 0.02; tw = [W * 0.4, h, -D * 0.35]; break;
    }
    case 'bubble': {         // bubble (gross leak) tester: cabinet with a lit fluid tank and hinged lid
      const cab = Math.max(0.35, h - 0.35); P(box(W, cab, D), C.light, 0, cab / 2, 0);
      P(box(W * 0.55, h - cab, D * 0.6), C.amberGlass, -W * 0.15, cab + (h - cab) / 2, 0);
      P(box(W * 0.25, 0.14, 0.02), C.screen, W * 0.3, cab * 0.8, D / 2 + 0.01, { pick: false }); tw = [W * 0.35, cab, -D * 0.3]; break;
    }
    case 'inficon': {        // INFICON UL1000 / UL3000 Fab: rounded silver cart, navy band, push handle, top display
      const body = h * 0.82; P(cyl(0.5, body, 28), C.silver, 0, 0.12 + body / 2, 0, { sx: W, sz: D });
      P(cyl(0.505, 0.08, 28), C.navy, 0, body * 0.45, 0, { sx: W, sz: D, pick: false });
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => P(cyl(0.07, 0.04, 14), C.rubber, sx * W * 0.38, 0.07, sz * D * 0.3, { rz: Math.PI / 2, pick: false })));
      P(box(0.03, 0.3, D * 0.6), C.navy, -W * 0.52, h - 0.05, 0, { pick: false });
      P(box(0.26, 0.04, 0.2), C.black, W * 0.1, 0.12 + body + 0.03, 0, { rx: -0.4 }); P(cyl(0.07, 0.08, 16), C.steel, -W * 0.15, 0.12 + body + 0.04, 0, { pick: false });
      h = 0.12 + body + 0.08; tw = null; break;
    }
    case 'engraver': {       // laser marking/engraving cabinet: charcoal enclosure with an amber laser-safe window
      P(box(W, h, D), C.char, 0, h / 2, 0);
      P(box(W * 0.7, h * 0.35, 0.02), C.amberGlass, 0, h * 0.68, D / 2 + 0.01, { pick: false });
      P(box(W * 0.2, 0.1, 0.02), C.screen, W * 0.3, h * 0.35, D / 2 + 0.01, { pick: false }); tw = [W * 0.38, h, -D * 0.3]; break;
    }
    case 'glovebox': {       // laser welding glovebox: stainless frame, glove box with tinted window and glove ports, antechamber
      const long = W >= D, L = long ? W : D, S = long ? D : W, top = 0.85;
      const g = (x, y, z, o) => (long ? [x, y, z] : [z, y, -x]);
      const at = (geo, mat, x, y, z, o = {}) => { const [px, py, pz] = g(x, y, z); P(geo, mat, px, py, pz, long ? o : { ...o, ry: (o.ry || 0) + Math.PI / 2 }); };
      at(box(L * 0.7, top, S * 0.9), C.steel, -L * 0.12, top / 2, 0);
      at(box(L * 0.7, h - top, S * 0.9), C.steel, -L * 0.12, top + (h - top) / 2, -S * 0.02);
      at(box(L * 0.62, (h - top) * 0.55, 0.03), C.amberGlass, -L * 0.12, top + (h - top) * 0.45, S * 0.44);
      for (let i = 0; i < 3; i++) at(new THREE.TorusGeometry(0.1, 0.025, 10, 24), C.rubber, -L * 0.12 - L * 0.2 + i * L * 0.2, top + 0.32, S * 0.46, { pick: false });
      at(cyl(0.22, L * 0.22, 24), C.steel, L * 0.36, top + 0.3, 0, { rz: Math.PI / 2 });
      at(box(0.06, 0.06, S * 0.6), C.char, L * 0.48, top + 0.3, 0, { pick: false });
      at(box(L * 0.18, 0.8, S * 0.6), C.grey, L * 0.38, 0.4, 0);
      tw = g(-L * 0.42, h, -S * 0.3); break;
    }
    case 'utility': P(box(W, h, D), C.light, 0, h / 2, 0); P(box(W * 0.8, h * 0.25, 0.01), C.grille, 0, h * 0.3, D / 2 + 0.005, { pick: false }); P(box(W * 0.3, 0.1, 0.01), C.screen, 0, h * 0.75, D / 2 + 0.005, { pick: false }); break;
    case 'mytower': {        // Mycronic MYTower: tall light-grey chamfered tower, recessed loading port with screen above
      P(cyl(0.5, h, 8, 0.5), C.light, 0, h / 2, 0, { sx: W * 1.08, sz: D * 1.08, ry: Math.PI / 8 });
      P(box(W * 0.45, 0.32, 0.05), C.black, 0, 1.05, D / 2 - 0.01, { pick: false });
      P(box(W * 0.3, 0.2, 0.01), C.screen, 0, 1.42, D / 2 + 0.01, { pick: false });
      P(box(W * 0.98, 0.08, D * 0.98), C.char, 0, 0.04, 0, { pick: false }); tw = [W * 0.3, h, -D * 0.2]; break;
    }
    case 'flyingprobe': {    // flying probe tester: white base, dark windowed upper, monitor arm
      P(box(W, 0.9, D), C.white, 0, 0.45, 0); P(box(W, h - 0.9, D), C.light, 0, 0.9 + (h - 0.9) / 2, 0);
      P(box(W * 0.75, (h - 0.9) * 0.6, 0.02), C.smoke, 0, 0.9 + (h - 0.9) * 0.48, D / 2 + 0.01, { pick: false });
      conveyorPorts(); monitorArm(-W * 0.32, 1.4, D / 2 + 0.14, 0, 0.36); tw = [W * 0.38, h, -D * 0.3]; break;
    }
    case 'interselect': {    // InterSelect wave/selective soldering: royal-blue base, white upper with windows, front loading shelf
      P(box(W, 0.8, D), C.royal, 0, 0.4, 0);
      [-1, 1].forEach((s) => P(box(W * 0.42, 0.6, 0.02), C.royal, s * W * 0.23, 0.42, D / 2 + 0.01, { pick: false }));
      P(dome(W, D * 0.96, h - 0.8, 0.25, 0.2), C.white, 0, 0.8, 0);
      P(box(W * 0.6, 0.3, 0.02), C.smoke, 0, 1.15, D * 0.48 + 0.005, { pick: false });
      P(box(W * 0.7, 0.04, 0.35), C.steel, 0, 0.95, D / 2 + 0.17, { pick: false });
      monitorArm(W / 2 + 0.12, 1.5, D * 0.2, 0, 0.36); tw = [-W * 0.38, h, -D * 0.3]; break;
    }
    case 'degreaser': {      // Crest vapour degreaser: stainless tank cabinet, hinged lid, side control box
      P(box(W * 0.8, h * 0.85, D), C.steel, -W * 0.1, h * 0.425, 0);
      P(box(W * 0.8, 0.05, D * 1.02), C.silver, -W * 0.1, h * 0.85 + 0.025, 0);
      P(box(W * 0.6, 0.12, D * 0.7), C.char, -W * 0.1, h * 0.85 + 0.1, 0, { pick: false });
      P(box(W * 0.2, h, D * 0.8), C.light, W * 0.4, h / 2, 0);
      P(box(W * 0.14, 0.16, 0.01), C.screen, W * 0.4, h * 0.8, D * 0.4 + 0.005, { pick: false }); tw = [W * 0.4, h, -D * 0.3]; break;
    }
    case 'coater': {         // Mycronic MYC50 conformal coater: white base, grey glass cell, monitor arm, signal tower
      const base = 0.85; P(box(W, base, D), C.white, 0, base / 2, 0);
      glassCase(W, h - base - 0.2, D, base, C.grey); P(box(W, 0.2, D), C.light, 0, h - 0.1, 0);
      P(box(W * 0.3, 0.3, 0.1), C.char, 0, h - 0.4, 0, { pick: false }); conveyorPorts();
      monitorArm(W * 0.32, 1.4, D / 2 + 0.14, 0, 0.36); tw = [-W * 0.38, h, -D * 0.3]; break;
    }
    case 'n2cab': {          // N2 / dry storage cabinet: steel frame, glass doors, shelves inside
      P(box(W, h, D), C.clear, 0, h / 2, 0);
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => P(box(0.04, h, 0.04), C.steel, sx * (W / 2 - 0.02), h / 2, sz * (D / 2 - 0.02), { pick: false })));
      for (let i = 0; i <= 5; i++) P(box(W * 0.96, 0.02, D * 0.94), C.steel, 0, 0.05 + i * (h - 0.1) / 5, 0, { pick: false });
      P(box(0.02, h * 0.9, 0.02), C.steel, 0, h / 2, D / 2, { pick: false });
      P(box(0.12, 0.08, 0.02), C.screen, W * 0.3, h - 0.12, D / 2 + 0.01, { pick: false }); break;
    }
    case 'metalcab':
      P(box(W, h, D), C.grey, 0, h / 2, 0); P(box(0.01, h * 0.96, 0.01), C.char, 0, h / 2, D / 2 + 0.005, { pick: false });
      [-1, 1].forEach((s) => P(box(0.02, 0.2, 0.03), C.steel, s * 0.05, h * 0.55, D / 2 + 0.015, { pick: false })); break;
    case 'rack':
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => P(box(0.04, h, 0.04), C.benchFrame, sx * (W / 2 - 0.02), h / 2, sz * (D / 2 - 0.02))));
      for (let i = 0; i < 5; i++) P(box(W, 0.03, D), C.benchFrame, 0, 0.1 + i * (h - 0.15) / 4, 0); break;
    case 'bench': {          // ESD work bench / table: top, steel legs, back panel with shelf on benches
      const t = Math.min(h, 0.9); P(box(W, 0.05, D), C.benchTop, 0, t - 0.025, 0);
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => P(box(0.05, t - 0.05, 0.05), C.benchFrame, sx * (W / 2 - 0.05), (t - 0.05) / 2, sz * (D / 2 - 0.05))));
      if (a.type === 'Work Bench') { P(box(W, 0.9, 0.03), C.benchFrame, 0, t + 0.45, -D / 2 + 0.03, { pick: false }); P(box(W, 0.03, 0.28), C.benchFrame, 0, t + 0.62, -D / 2 + 0.16, { pick: false }); }
      h = t; break;
    }
    default:
      P(box(W, h, D), C.light, 0, h / 2, 0); tw = [W * 0.35, h, -D * 0.35];
  }
  return { h, tower: tw };
}

export function kindOf(a) {
  const t = a.type, m = `${a.model || ''} ${a.name}`;
  if (t === 'Stencil Printer') return 'dek';
  if (t === 'Solder Paste Inspection') return 'parmi';
  if (t === 'Placement') return /MY100|MyData|Mycronic/.test(m) ? 'mydata' : /Yamaha/.test(m) ? 'yamaha' : 'siplace';
  if (t === 'Tray Loader') return 'trayloader';
  if (t === 'Reflow Oven') return /VP6000|Vapor|Vapour/.test(m) ? 'asscon' : 'reflow';
  if (t === 'Automated Optical Inspection') return 'mirtec';
  if (t === 'X-Ray Inspection') return 'xray';
  if (/Bonder/.test(t)) return /Hesse/.test(m) ? 'hesse' : 'palomar';
  if (t === 'Plasma Cleaner') return 'plasma';
  if (t === 'Laser Ball Attach') return 'pactech';
  if (/HALT/.test(t)) return 'typhoon';
  if (t === 'Thermal Shock Chamber') return 'espec';
  if (t === 'Chiller') return 'chiller';
  if (t === 'Mechanical Shock Tester') return 'shock';
  if (t === 'Controller') return 'controller';
  if (t === 'Pressure System' || t === 'Bombing Chamber') return 'vessel';
  if (t === 'Bubble Tester') return 'bubble';
  if (t === 'Fine Leak Tester') return 'inficon';
  if (t === 'Laser Engraver') return 'engraver';
  if (t === 'Laser System') return /Glovebox/i.test(m) ? 'glovebox' : 'utility';
  if (t === 'Component Storage') return 'mytower';
  if (t === 'Flying Probe') return 'flyingprobe';
  if (t === 'Wave Soldering') return 'interselect';
  if (t === 'Degreaser') return 'degreaser';
  if (t === 'Conformal Coater') return 'coater';
  if (t === 'N2 Oven') return 'oven';
  if (t === 'N2 Cabinet' || t === 'Dry Cabinet') return 'n2cab';
  if (/Metal Cabinet|^Cabinet$/.test(t)) return 'metalcab';
  if (/Rack|ESD Shelves/.test(t)) return 'rack';
  if (/Table|Work Bench/.test(t)) return 'bench';
  return null;
}
