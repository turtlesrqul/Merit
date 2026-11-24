// GPU diagnostics for the Grid production twin. Open the page with ?gpulog=1 to run it.
// 1. Before the twin starts, it asks the browser for a 3D context in several ways and records,
//    for each request, whether it got the graphics chip, software rendering, or nothing (and why).
// 2. It then watches the twin's own 3D context: driver resets (context lost/restored), slow frames,
//    screen/scaling changes and tab visibility.
// Everything is printed in the developer panel (F12 → Console, filter "[GPU]"), kept in window.gridGpuLog,
// and summarised on screen with a button to download the full log as a file.

const T0 = performance.now();
const log = { started: new Date().toISOString(), environment: {}, probes: [], twin: {}, events: [], verdict: '' };
window.gridGpuLog = log;
import { describe, frameStats, onLoss } from './engine.js';
const SOFT = /SwiftShader|WARP|Basic Render|llvmpipe|softpipe|Software/i;
const stamp = () => `${((performance.now() - T0) / 1000).toFixed(1)}s`;
const tag = ['%c[GPU]', 'color:#5fb4ff;font-weight:bold'];
function event(kind, detail, level = 'log') {
  const e = { t: stamp(), time: new Date().toISOString(), kind, ...detail };
  log.events.push(e); console[level](...tag, `${e.t} ${kind}`, detail);
  if (panel) panel.update();
}

function rendererOf(gl) {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
  };
}

function probe(test, type, attrs) {
  const c = document.createElement('canvas');
  let reason = '';
  c.addEventListener('webglcontextcreationerror', (e) => { reason = e.statusMessage || 'creation error, no message from browser'; });
  const t = performance.now(); let gl = null;
  try { gl = c.getContext(type, attrs); } catch (err) { reason = String(err); }
  const ms = +(performance.now() - t).toFixed(1);
  if (!gl) return { test, result: 'FAILED', ms, reason: reason || 'browser returned no context' };
  const { vendor, renderer } = rendererOf(gl);
  const row = {
    test, result: SOFT.test(renderer) ? 'SOFTWARE' : 'GRAPHICS CHIP', ms, renderer, vendor,
    version: gl.getParameter(gl.VERSION),
    maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    msaa: type === 'webgl2' ? gl.getParameter(gl.MAX_SAMPLES) : gl.getParameter(gl.SAMPLES),
    reason,
  };
  gl.getExtension('WEBGL_lose_context')?.loseContext();   // free it straight away
  return row;
}

function verdict() {
  const p = Object.fromEntries(log.probes.map((r) => [r.test, r]));
  const hw2 = p['WebGL2, chip only']?.result === 'GRAPHICS CHIP', hw1 = p['WebGL1, chip only']?.result === 'GRAPHICS CHIP';
  const twinSoft = log.twin.result === 'SOFTWARE';
  if (!twinSoft && log.twin.route === 'WebGPU') return `OK: the twin is drawn on the graphics chip through WebGPU (${log.twin.engine}).` + (hw2 ? '' : ' WebGL alone would NOT have reached the chip on this device, so WebGPU is what fixes it here.');
  if (hw2 && !twinSoft) return 'OK: the twin is drawn on the graphics chip.';
  if (hw2 && twinSoft) return 'The chip accepts WebGL2 in a test, but the twin itself ended up in software. Likely a driver reset during start-up; see the events list.';
  if (!hw2 && hw1) return 'The graphics chip REFUSES WebGL2 (what the twin needs) but ACCEPTS WebGL1. Driver/browser problem with WebGL2: a WebGL1 fallback in the twin or a driver change will fix it.';
  if (!hw2 && !hw1) return 'This page cannot get the graphics chip: every request (WebGL1 and WebGL2) ended in software rendering or failed. Driver, browser setting or company policy; check edge://gpu, edge://policy and the reasons listed.';
  return 'Inconclusive; send the downloaded log.';
}

export async function runGpuProbe() {
  const ua = navigator.userAgentData;
  log.environment = {
    browser: ua ? ua.brands.map((b) => `${b.brand} ${b.version}`).join(', ') : navigator.userAgent,
    platform: ua?.platform || navigator.platform,
    screen: `${screen.width} x ${screen.height}`, devicePixelRatio: devicePixelRatio,
    window: `${innerWidth} x ${innerHeight}`, cpuThreads: navigator.hardwareConcurrency, memoryGB: navigator.deviceMemory ?? 'n/a',
  };
  try {
    const a = navigator.gpu && await navigator.gpu.requestAdapter();
    const i = a && (a.info || (a.requestAdapterInfo && await a.requestAdapterInfo()));
    log.environment.webgpu = a ? `${i?.vendor || '?'} ${i?.architecture || ''} ${i?.description || ''}`.trim() + ((i?.isFallbackAdapter || a.isFallbackAdapter) ? ' (SOFTWARE fallback)' : '') : 'not available';
  } catch (err) { log.environment.webgpu = 'error: ' + err.message; }

  const tests = [
    ['WebGL2, as the twin asks', 'webgl2', { antialias: true }],
    ['WebGL2, chip only', 'webgl2', { antialias: true, failIfMajorPerformanceCaveat: true }],
    ['WebGL2, chip only, high-performance', 'webgl2', { antialias: true, failIfMajorPerformanceCaveat: true, powerPreference: 'high-performance' }],
    ['WebGL2, chip only, no antialias', 'webgl2', { antialias: false, failIfMajorPerformanceCaveat: true }],
    ['WebGL1, as a fallback would ask', 'webgl', { antialias: true }],
    ['WebGL1, chip only', 'webgl', { antialias: true, failIfMajorPerformanceCaveat: true }],
  ];
  for (const [name, type, attrs] of tests) log.probes.push(probe(name, type, attrs));

  console.group(...tag, 'Grid production twin graphics log');
  console.log('Environment', log.environment);
  console.table(log.probes.map(({ test, result, ms, renderer, reason }) => ({ test, result, 'time (ms)': ms, renderer: renderer || '', reason })));
  console.groupEnd();
  makePanel();
}

export function watchRenderer(renderer) {
  const d = describe(renderer);
  log.twin = { result: d.software ? 'SOFTWARE' : 'GRAPHICS CHIP', engine: d.engine, route: d.route, renderer: d.chip, vendor: d.vendor, version: d.version || '', pixelRatio: renderer.getPixelRatio() };
  log.verdict = verdict();
  console.log(...tag, 'Twin 3D context', log.twin);
  console.log(...tag, 'VERDICT:', log.verdict);

  onLoss(renderer,
    (why) => event('GRAPHICS DEVICE LOST (driver reset or browser took the chip away)', { why }, 'error'),
    () => event('graphics device restored', {}, 'warn'));
  document.addEventListener('visibilitychange', () => event('tab ' + document.visibilityState, {}));
  let mq; const dpr = () => { mq = matchMedia(`(resolution: ${devicePixelRatio}dppx)`); mq.addEventListener('change', () => { event('screen scaling changed (moved screen, casting or zoom)', { devicePixelRatio, screen: `${screen.width} x ${screen.height}` }, 'warn'); dpr(); }, { once: true }); }; dpr();

  // frame monitor: every 10 s, report frames per second and stutters (frames over 50 ms)
  let n = 0, worst = 0, slow = 0, last = performance.now(), t0 = last;
  (function tick(now) {
    const dt = now - last; last = now; n++; worst = Math.max(worst, dt); if (dt > 50) slow++;
    if (dt > 250 && document.visibilityState === 'visible') event('long freeze', { ms: Math.round(dt) }, 'warn');
    if (now - t0 >= 10000) {
      const r = { fps: +(n * 1000 / (now - t0)).toFixed(1), slowestFrameMs: Math.round(worst), framesOver50ms: slow, drawCalls: frameStats(renderer).calls };
      log.events.push({ t: stamp(), time: new Date().toISOString(), kind: 'frames (last 10 s)', ...r });
      console.log(...tag, `${stamp()} frames (last 10 s)`, r); n = 0; worst = 0; slow = 0; t0 = now; panel?.update(r);
    }
    requestAnimationFrame(tick);
  })(last);
  panel?.update();
}

// on-screen summary with a download button (for laptops where the developer panel is locked down)
let panel = null;
function makePanel() {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;right:16px;top:90px;z-index:20;width:min(460px,calc(100% - 32px));max-height:70vh;overflow:auto;background:rgba(8,22,44,.96);border:1px solid #ffb020;border-radius:6px;padding:12px;font:12px/1.45 ui-monospace,Consolas,monospace;color:#e6f0fb';
  const body = document.createElement('div'); body.style.whiteSpace = 'pre-wrap';
  const btn = document.createElement('button'); btn.textContent = 'DOWNLOAD GPU LOG';
  btn.style.cssText = 'margin-top:10px;font:600 12px system-ui;color:#ffd27a;background:#1a1606;border:1px solid #ffb020;border-radius:4px;padding:8px 10px;cursor:pointer';
  btn.onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' }));
    a.download = `grid-gpu-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const close = document.createElement('button'); close.textContent = 'HIDE';
  close.style.cssText = btn.style.cssText + ';margin-left:8px;color:#e6f0fb;border-color:#5fb4ff;background:transparent';
  close.onclick = () => box.remove();
  box.append(body, btn, close); document.body.appendChild(box);
  let lastFrames = null;
  panel = {
    update(frames) {
      if (frames) lastFrames = frames;
      const lines = ['GPU LOG  (full detail: F12 → Console, filter [GPU])', ''];
      log.probes.forEach((r) => lines.push(`${r.result.padEnd(13)} ${r.test}${r.reason ? `\n              reason: ${r.reason}` : ''}`));
      if (log.twin.renderer) lines.push('', `TWIN USES     ${log.twin.result} via ${log.twin.route} (${log.twin.engine})`, `              ${log.twin.renderer}`, '', `VERDICT  ${log.verdict}`);
      if (lastFrames) lines.push('', `LAST 10 s     ${lastFrames.fps} fps · slowest ${lastFrames.slowestFrameMs} ms · ${lastFrames.framesOver50ms} stutters`);
      const ev = log.events.filter((e) => !e.kind.startsWith('frames'));
      if (ev.length) lines.push('', 'EVENTS', ...ev.slice(-6).map((e) => `  ${e.t}  ${e.kind}${e.ms ? ` (${e.ms} ms)` : ''}`));
      body.textContent = lines.join('\n');
    },
  };
  panel.update();
}
