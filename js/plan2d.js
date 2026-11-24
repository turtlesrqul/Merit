// 2D floor plan: used when a screen cannot draw 3D at all, or when asked for with ?mode=2d.
// Same rooms, machines, layout edits and live (or demo) states as the 3D twin, drawn flat on a canvas, so it runs on anything.
import { STATES, createFeed } from './feed.js';
import { warehousePlan } from './warehouse.js';

const U = 0.035, CX = 700, CY = 640;
const STATEFUL = (a) => !/^(Work Bench|Bench|Table|Rack|Metal Rack|Metal Cabinet|ESD Shelves|IQC Workstations|N2 Cabinet|Cabinet|Dry Cabinet|Conveyor|Controller|Chiller)$/.test(a.type);

export function start2D({ layout, config, demo, reason }) {
  document.body.classList.add('plan2d');
  const stage = document.getElementById('stage'); stage.innerHTML = '';
  const cv = document.createElement('canvas'); cv.setAttribute('aria-label', '2D floor plan'); stage.appendChild(cv);
  const g = cv.getContext('2d');
  let hov = null, dragAt = null;

  // machines, with any moves and copies saved in this browser's layout editor
  let edits = {}, copies = [];
  try { edits = JSON.parse(localStorage.getItem('f17-twin-layout-v2') || '{}'); copies = JSON.parse(localStorage.getItem('f17-twin-copies-v2') || '[]'); } catch {}
  const items = [...layout.assets, ...copies.filter((a) => a && a.id)].map((a) => {
    const e = edits[a.id], cx = e ? e.x / U + CX : a.x + a.w / 2, cy = e ? e.z / U + CY : a.y + a.h / 2;
    const turned = Math.abs(((e?.rot ?? a.rot ?? 0) % 180)) === 90;
    return { a, cx, cy, w: turned ? a.h : a.w, h: turned ? a.w : a.h, state: 'NONE', ts: null, stateful: STATEFUL(a) };
  });
  const byId = new Map(items.map((i) => [i.a.id, i]));
  const wh = warehousePlan();

  // view: fit the floor, then wheel to zoom and drag to pan
  const rooms = layout.rooms;
  const bx0 = Math.min(...rooms.map((r) => r.x)), by0 = Math.min(...rooms.map((r) => r.y)), bx1 = Math.max(...rooms.map((r) => r.x + r.w)), by1 = Math.max(...rooms.map((r) => r.y + r.h));
  let k = 1, ox = 0, oy = 0;
  function fit() {
    const top = 110, pad = 24, W = innerWidth, H = innerHeight;
    k = Math.min((W - pad * 2) / (bx1 - bx0), (H - top - pad) / (by1 - by0));
    ox = (W - (bx1 - bx0) * k) / 2 - bx0 * k; oy = top + (H - top - pad - (by1 - by0) * k) / 2 - by0 * k;
  }
  function size() { const r = devicePixelRatio || 1; cv.width = innerWidth * r; cv.height = innerHeight * r; cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px'; fit(); draw(); }

  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function draw() {
    const r = devicePixelRatio || 1; g.setTransform(r, 0, 0, r, 0, 0);
    g.fillStyle = css('--bg') || '#061021'; g.fillRect(0, 0, innerWidth, innerHeight);
    g.setTransform(r * k, 0, 0, r * k, r * ox, r * oy);
    const px = 1 / k;   // one screen pixel in plan units
    for (const rm of rooms) {
      g.fillStyle = rm.context ? '#0d203b' : rm.hatch ? '#1b3d66' : '#16365e'; g.fillRect(rm.x, rm.y, rm.w, rm.h);
      if (!rm.group && !rm.context && !rm.corridor) { g.strokeStyle = 'rgba(110,175,245,.7)'; g.lineWidth = 1.5 * px; g.strokeRect(rm.x, rm.y, rm.w, rm.h); }
    }
    for (const o of layout.outlines || []) { g.beginPath(); o.points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.strokeStyle = 'rgba(110,175,245,.7)'; g.lineWidth = 1.5 * px; g.stroke(); }
    for (const [x, y, w, h, kind] of wh) {
      if (kind === 'zone') { g.fillStyle = 'rgba(255,194,26,.08)'; g.fillRect(x, y, w, h); g.strokeStyle = '#ffc21a'; g.lineWidth = 2 * px; g.strokeRect(x, y, w, h); continue; }
      g.fillStyle = kind === 'rack' ? '#6b7886' : kind === 'deposit' ? '#8fa0b2' : kind === 'conveyor' ? '#3d4b5c' : '#5c7896'; g.fillRect(x, y, w, h);
    }
    for (const it of items) {
      const s = it.stateful ? effState(it) : null;
      g.fillStyle = s ? STATES[s].css : '#55677c'; g.globalAlpha = s && s !== 'NONE' ? 0.9 : 0.55;
      g.fillRect(it.cx - it.w / 2, it.cy - it.h / 2, it.w, it.h); g.globalAlpha = 1;
      g.strokeStyle = it === hov ? '#ffffff' : 'rgba(6,16,33,.9)'; g.lineWidth = (it === hov ? 2 : 1) * px; g.strokeRect(it.cx - it.w / 2, it.cy - it.h / 2, it.w, it.h);
    }
    g.fillStyle = css('--muted') || '#9db8d6'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 ${11 * px}px "IBM Plex Sans", system-ui, sans-serif`;
    const seen = new Set();
    for (const rm of rooms) {
      if (!rm.name || seen.has(rm.name) || rm.w * k < 70 || rm.h * k < 22) continue; seen.add(rm.name);
      g.fillText(rm.name.replace(/ · .*$/, ''), rm.x + rm.w / 2, rm.y + 10 * px);
    }
  }

  // states
  const staleMs = (config.staleAfterSeconds || 30) * 1000;
  function effState(it) { return it.state !== 'NONE' && it.ts && Date.now() - it.ts > staleMs ? 'NONE' : it.state; }
  const sum = document.createElement('div'); sum.className = 'panel plan2d-sum'; document.body.appendChild(sum);
  function summary() {
    const n = { RUN: 0, IDLE: 0, DOWN: 0, MAINT: 0, NONE: 0 };
    items.forEach((it) => { if (it.stateful) { const s = effState(it) === 'OFF' ? 'NONE' : effState(it); n[s] = (n[s] || 0) + 1; } });
    sum.innerHTML = `<p><b>2D PLAN</b>${reason ? `<span>${reason}</span>` : ''}<a href="${location.pathname}${location.search.replace(/([?&])mode=2d&?/, '$1').replace(/[?&]$/, '')}">Try 3D</a></p>` +
      `<div class="summary">${[['RUN', 'Running'], ['IDLE', 'Idle'], ['DOWN', 'Down'], ['MAINT', 'Maint.'], ['NONE', 'Off / no data']].map(([s, l]) => `<div><b style="color:${STATES[s].css}">${n[s]}</b><span>${l}</span></div>`).join('')}</div>`;
  }
  const statusEl = document.getElementById('status'), statusText = document.getElementById('statusText');
  createFeed({ ...config, demoMode: demo }, items.filter((i) => i.stateful).map((i) => i.a.id), (msg) => {
    for (const u of Array.isArray(msg) ? msg : msg.assets || [msg]) { const it = byId.get(u.id); if (!it) continue; if (u.state && STATES[u.state]) it.state = u.state; it.ts = u.ts ? Date.parse(u.ts) : Date.now(); }
    summary(); draw();
  }, (kind, text) => {
    statusEl.className = 'pill pill-' + kind; statusEl.title = text || '';
    statusText.textContent = { none: 'No live data', live: 'Live', demo: 'Active', connecting: 'Connecting', reconnecting: 'Reconnecting', error: 'Feed error' }[kind] || kind;
  });
  const clock = document.getElementById('clock');
  setInterval(() => { clock.textContent = new Date().toLocaleTimeString(); summary(); draw(); }, 1000);

  // hover names, wheel zoom, drag pan
  const tip = document.getElementById('tip'), tipT = document.getElementById('tipT'), tipS = document.getElementById('tipS');
  const toPlan = (e) => [(e.clientX - ox) / k, (e.clientY - oy) / k];
  cv.addEventListener('pointermove', (e) => {
    if (dragAt) { ox += e.clientX - dragAt[0]; oy += e.clientY - dragAt[1]; dragAt = [e.clientX, e.clientY]; draw(); return; }
    const [x, y] = toPlan(e);
    const it = items.find((i) => Math.abs(x - i.cx) <= i.w / 2 && Math.abs(y - i.cy) <= i.h / 2);
    const w = !it && wh.find(([rx, ry, rw, rh, kind]) => kind !== 'zone' && x >= rx && x <= rx + rw && y >= ry && y <= ry + rh);
    const rm = !it && !w && rooms.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h && r.name);
    if (hov !== it) { hov = it || null; draw(); }
    const title = it ? it.a.name : w ? w[5] : rm ? rm.name : null;
    if (!title) { tip.hidden = true; return; }
    tipT.textContent = title; tipS.textContent = it ? it.a.id + (it.stateful ? ` · ${STATES[effState(it)].label}` : '') : '';
    tip.hidden = false; tip.style.left = Math.min(e.clientX + 16, innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = Math.min(e.clientY + 16, innerHeight - tip.offsetHeight - 8) + 'px';
  });
  cv.addEventListener('pointerleave', () => { tip.hidden = true; hov = null; draw(); });
  cv.addEventListener('pointerdown', (e) => { dragAt = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointerup', () => { dragAt = null; });
  cv.addEventListener('dblclick', () => { fit(); draw(); });
  cv.addEventListener('wheel', (e) => {
    e.preventDefault(); const f = Math.exp(-e.deltaY * 0.0015), nk = Math.min(Math.max(k * f, 0.2), 20);
    ox = e.clientX - (e.clientX - ox) * nk / k; oy = e.clientY - (e.clientY - oy) * nk / k; k = nk; draw();
  }, { passive: false });
  addEventListener('resize', size);
  summary(); size();
}
