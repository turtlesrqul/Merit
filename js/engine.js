// Which 3D engine the twin runs on, chosen by the address (index.html loads the matching three.js build):
//   (default)            three.js r160, WebGL        — the established engine
//   ?engine=webgpu       three.js r187, WebGPU       — falls back to WebGL 2 by itself if the browser has no usable WebGPU
//   ?engine=webgpu-webgl three.js r187, forced WebGL 2 (to compare the two r187 routes)
import * as THREE from 'three';

const q = (new URLSearchParams(location.search).get('engine') || '').toLowerCase();
export const ENGINE = q === 'webgpu-webgl' ? 'webgpu-webgl' : q === 'webgpu' ? 'webgpu' : 'webgl';
const SOFT = /SwiftShader|WARP|Basic Render|llvmpipe|softpipe|Software/i;

// create the renderer for the chosen engine; WebGPU needs an asynchronous start-up
export async function createRenderer() {
  if (ENGINE !== 'webgl' && THREE.WebGPURenderer) {
    const r = new THREE.WebGPURenderer({ antialias: true, forceWebGL: ENGINE === 'webgpu-webgl' });
    await r.init();
    return r;
  }
  return new THREE.WebGLRenderer({ antialias: true });
}

function glInfo(gl) {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    chip: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    version: gl.getParameter(gl.VERSION),
  };
}

// what the twin is actually drawing with: engine, route (WebGPU or WebGL), graphics chip, and whether it is software
export function describe(renderer) {
  const rev = THREE.REVISION;
  if (renderer.isWebGPURenderer) {
    const b = renderer.backend;
    if (b.isWebGPUBackend) {
      const i = b.device?.adapterInfo || {};
      const chip = [i.vendor, i.architecture, i.device, i.description].filter(Boolean).join(' ') || 'graphics chip (details hidden by the browser)';
      return { engine: `three.js r${rev}`, route: 'WebGPU', chip, vendor: i.vendor || '', software: !!i.isFallbackAdapter || SOFT.test(chip) };
    }
    const g = glInfo(b.gl);
    return { engine: `three.js r${rev}`, route: ENGINE === 'webgpu-webgl' ? 'WebGL 2 (forced)' : 'WebGL 2 (WebGPU unavailable, fell back)', chip: g.chip, vendor: g.vendor, version: g.version, software: SOFT.test(g.chip) };
  }
  const g = glInfo(renderer.getContext());
  return { engine: `three.js r${rev}`, route: 'WebGL', chip: g.chip, vendor: g.vendor, version: g.version, software: SOFT.test(g.chip) };
}

// draw-call and triangle counts of the last frame (field names differ between the two engines)
export function frameStats(renderer) {
  const r = renderer.info.render;
  return { calls: r.drawCalls ?? r.calls ?? 0, triangles: r.triangles ?? 0 };
}

// call back when the graphics device is lost (driver reset) or comes back
export function onLoss(renderer, lost, restored) {
  if (renderer.isWebGPURenderer) {
    const prev = renderer.onDeviceLost?.bind(renderer);
    renderer.onDeviceLost = (info) => { lost(info?.message || info?.reason || 'device lost'); prev?.(info); };
  } else {
    renderer.domElement.addEventListener('webglcontextlost', () => lost('WebGL context lost'));
    renderer.domElement.addEventListener('webglcontextrestored', () => restored?.());
  }
}
