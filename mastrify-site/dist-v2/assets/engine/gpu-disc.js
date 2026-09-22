/* Skivans yta på grafikkretsen. Ytan (bilden från vinyl.js), ringen som
 * snurrar (ytan, spåren och glansen), kantens två streck och spårljuset ritas
 * här med WebGL i en egen duk som ligger precis under motorns duk. Motorns
 * duk tar i stället bort precis det ytan täcker ur sin egen bild (vinyl.js,
 * gpu = true: samma bild och samma två streck, fast som hål) och läggs ovanpå
 * med plus-lighter, alltså ljus som adderas. Summan blir samma bild som när
 * allt ritades i en duk, eftersom allt som ritas efter skivan är adderat
 * ljus. Det enda som inte är det är mitten (etiketten och loggan), som
 * täcker allt under sig. Den ritas därför i en tredje duk överst, som vanligt
 * ovanpå resten.
 * Skarvarna mellan dukarna ligger där båda sidor räknar på samma sak: ytans
 * kant är bildens egen genomskinlighet i båda, och ringens kanter ritas helt
 * här, mellan två nästan likadana bilder av samma yta.
 * Samma bilder, samma färger och samma räkning som vinyl.js och
 * living-surface.js; bara själva ritandet flyttas till grafikkretsen.
 */
(function (root) {
  'use strict';
  const LUT_WIDTH = 1024, LUT_ROWS = 8, STOPS = 41;

  const VERTEX = `
attribute vec2 aUnit;
uniform mat2 uMatrix;
uniform vec2 uOffset;
uniform vec2 uSize;
varying highp vec2 vU;
void main() {
  vec2 px = uMatrix * aUnit + uOffset;
  vU = aUnit;
  gl_Position = vec4(px.x / uSize.x * 2.0 - 1.0, 1.0 - px.y / uSize.y * 2.0, 0.0, 1.0);
}`;

  const FRAGMENT = `
precision highp float;
varying highp vec2 vU;
uniform sampler2D uSurface;
uniform sampler2D uRelief;
uniform sampler2D uMask;
uniform sampler2D uMask2;
uniform sampler2D uLut;
uniform float uScale;
uniform float uExtent;
uniform vec2 uRot0;
uniform vec2 uRot1;
uniform vec3 uFace;
uniform vec3 uLightOpacity;
uniform vec3 uLightAngle;
uniform vec3 uLightFlat;
uniform vec3 uLightDetail;
uniform float uDetailExposure;
uniform float uGlow;
uniform vec4 uLayerStart;
uniform vec4 uLayerAlpha;
uniform float uPolishStart;
uniform vec2 uPolish;
uniform float uChamfer;
const float TAU = 6.283185307179586;

// Andelen av en bildpunkt som ligger innanför en rak kant: d är avståndet
// från punktens mitt till kanten i bildpunkter (positivt innanför), n är
// kantens normal. Exakt yta för en fyrkantig bildpunkt.
float cover(float d, vec2 n) {
  float a = max(abs(n.x), abs(n.y));
  float b = min(abs(n.x), abs(n.y));
  float lo = 0.5 * (a - b);
  float hi = 0.5 * (a + b);
  float m = abs(d);
  float c = 1.0;
  if (m <= lo) c = 0.5 + m / a;
  else if (m < hi) { float e = hi - m; c = 1.0 - e * e / (2.0 * a * b); }
  return d >= 0.0 ? c : 1.0 - c;
}

float turn(vec2 u, float start) {
  return fract((atan(u.y, u.x) - start) / TAU);
}

vec4 specular(float t) {
  float x = t * 1023.0;
  float i = floor(x);
  vec4 a = texture2D(uLut, vec2((i + 0.5) / 1024.0, 0.0625));
  vec4 b = texture2D(uLut, vec2((min(i + 1.0, 1023.0) + 0.5) / 1024.0, 0.0625));
  return mix(a, b, x - i);
}

vec4 layer(float row, float t) {
  float x = t * 40.0;
  float i = floor(x);
  float v = (row + 0.5) / 8.0;
  vec4 a = texture2D(uLut, vec2((i + 0.5) / 1024.0, v));
  vec4 b = texture2D(uLut, vec2((i + 1.5) / 1024.0, v));
  return mix(a, b, x - i);
}

vec4 row(float index, float t) {
  float x = t * 1023.0;
  float i = floor(x);
  float v = (index + 0.5) / 8.0;
  vec4 a = texture2D(uLut, vec2((i + 0.5) / 1024.0, v));
  vec4 b = texture2D(uLut, vec2((min(i + 1.0, 1023.0) + 0.5) / 1024.0, v));
  return mix(a, b, x - i);
}

float along(vec2 u, vec4 line) {
  vec2 d = line.zw - line.xy;
  return clamp(dot(u - line.xy, d) / dot(d, d), 0.0, 1.0);
}

vec3 light(vec3 col, vec2 u, float opacity, float angle, float sheen, float detail, float mask) {
  if (opacity <= 0.0) return col;
  vec4 g = specular(turn(u, angle));
  float a1 = g.a * sheen * opacity;
  col = g.rgb * a1 + (1.0 - a1) * col;
  float a2 = g.a * detail * mask * opacity * uDetailExposure;
  return g.rgb * a2 + (1.0 - a2) * col;
}

void main() {
  vec2 u = vU;
  float r = length(u);
  float margin = 1.5 / uScale;
  // Innanför 108 täcker etiketten allt; utanför 224,5 finns ingen yta.
  if (r > 224.5 + margin || r < 108.0) discard;
  vec2 n = u / max(r, 0.001);
  vec4 base = texture2D(uSurface, (u + 226.0) / 452.0);
  vec3 col = base.rgb;
  float alpha = base.a;

  vec3 glow = vec3(0.0);
  float glowAlpha = 0.0;
  if (r < 219.0 + margin) {
    float outer = cover((219.0 - r) * uScale, n);
    float inner = cover((111.0 - r) * uScale, n);
    float ring = outer * (1.0 - inner);
    vec3 face = col;
    if (uFace.x > 0.0 || uFace.z > 0.0) {
      vec2 q = vec2(uRot0.x * u.x - uRot0.y * u.y, uRot0.y * u.x + uRot0.x * u.y);
      face = texture2D(uSurface, (q + 226.0) / 452.0).rgb;
    }
    vec3 x = mix(col, face, uFace.x);
    if (uFace.y > 0.0) {
      vec2 q = vec2(uRot1.x * u.x - uRot1.y * u.y, uRot1.y * u.x + uRot1.x * u.y);
      x = mix(x, texture2D(uSurface, (q + 226.0) / 452.0).rgb, uFace.y);
    }
    x = mix(x, face, uFace.z);
    vec2 mt = (u + uExtent) / (2.0 * uExtent);
    vec4 relief = texture2D(uRelief, mt);
    x = relief.rgb + (1.0 - relief.a) * x;
    vec4 masks = texture2D(uMask, mt);
    x = light(x, u, uLightOpacity.x, uLightAngle.x, uLightFlat.x, uLightDetail.x, masks.r);
    x = light(x, u, uLightOpacity.y, uLightAngle.y, uLightFlat.y, uLightDetail.y, masks.r);
    x = light(x, u, uLightOpacity.z, uLightAngle.z, uLightFlat.z, uLightDetail.z, masks.r);
    col = x * ring + col * (1.0 - ring);
    alpha = ring + alpha * (1.0 - ring);

    float clip = cover((218.0 - r) * uScale, n) * (1.0 - cover((116.0 - r) * uScale, n));
    if (uGlow > 0.0 && clip > 0.0) {
      vec4 c;
      float w;
      if (uLayerAlpha.x > 0.0) { c = layer(1.0, turn(u, uLayerStart.x)); w = c.a * masks.g * uLayerAlpha.x; glow += c.rgb * w; glowAlpha += w; }
      if (uLayerAlpha.y > 0.0) { c = layer(2.0, turn(u, uLayerStart.y)); w = c.a * masks.b * uLayerAlpha.y; glow += c.rgb * w; glowAlpha += w; }
      if (uLayerAlpha.z > 0.0) { c = layer(3.0, turn(u, uLayerStart.z)); w = c.a * masks.a * uLayerAlpha.z; glow += c.rgb * w; glowAlpha += w; }
      if (uLayerAlpha.w > 0.0) { c = layer(4.0, turn(u, uLayerStart.w)); w = c.a * texture2D(uMask2, mt).r * uLayerAlpha.w; glow += c.rgb * w; glowAlpha += w; }
      if (uPolish.x + uPolish.y > 0.0) {
        c = layer(5.0, turn(u, uPolishStart));
        w = c.a * (uPolish.x * clip + masks.r * uPolish.y);
        glow += c.rgb * w; glowAlpha += w;
      }
      glow *= uGlow * clip;
      glowAlpha *= uGlow * clip;
    }
  }

  // Kantens två streck vid 223,25, som vanligt ovanpå ytan.
  if (r > 222.6 - margin) {
    vec4 g = row(6.0, along(u, vec4(-224.0, -55.0, 224.0, 80.0)));
    float a = g.a * (cover((223.9 - r) * uScale, n) - cover((222.6 - r) * uScale, n));
    col = g.rgb * a + (1.0 - a) * col;
    alpha = a + (1.0 - a) * alpha;
    if (uChamfer > 0.0) {
      g = row(7.0, along(u, vec4(-170.0, -195.0, 160.0, 185.0)));
      a = g.a * uChamfer * (cover((223.55 - r) * uScale, n) - cover((222.95 - r) * uScale, n));
      col = g.rgb * a + (1.0 - a) * col;
      alpha = a + (1.0 - a) * alpha;
    }
  }
  float total = min(1.0, alpha + glowAlpha);
  gl_FragColor = vec4(min(col + glow, vec3(total)), total);
}`;

  const supported = () => {
    try {
      return !!root.WebGLRenderingContext && !!root.CSS?.supports?.('mix-blend-mode', 'plus-lighter')
        && typeof root.CanvasRenderingContext2D?.prototype?.createConicGradient === 'function';
    } catch (_) { return false; }
  };

  function create(engineCanvas) {
    if (!supported() || !engineCanvas?.getContext) return null;
    const doc = engineCanvas.ownerDocument || root.document;
    const canvas = doc.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.className = 'engine-gpu';
    canvas.style.cssText = 'position:absolute;z-index:-1;pointer-events:none;display:block;left:0;top:0;width:0;height:0';
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false,
      stencil: false, preserveDrawingBuffer: false });
    if (!gl) return null;
    // Mitten, överst. Samma sorts duk som motorns egen.
    const center = doc.createElement('canvas');
    center.setAttribute('aria-hidden', 'true');
    center.className = 'engine-center';
    center.style.cssText = 'position:absolute;pointer-events:none;display:block;left:0;top:0;width:0;height:0';
    const centerContext = root.MastrifyCanvas ? root.MastrifyCanvas.context2D(center, { alpha: true, stableGradients: true })
      : center.getContext('2d', { alpha: true });
    if (!centerContext) return null;
    let centerBox = null;

    let program = null, uniforms = null, buffer = null, textures = null, lutData = null;
    let sources = null, failed = false, active = false, shown = false, rimEnergy = NaN;

    function compile(type, text) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, text); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost())
        throw new Error('Grafikkretsens skuggkod: ' + gl.getShaderInfoLog(shader));
      return shader;
    }
    function texture(unit) {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, unit === 4 ? gl.NEAREST : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, unit === 4 ? gl.NEAREST : gl.LINEAR);
      return t;
    }
    function init() {
      const vs = compile(gl.VERTEX_SHADER, VERTEX), fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
      program = gl.createProgram();
      gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost())
        throw new Error('Grafikkretsens program: ' + gl.getProgramInfoLog(program));
      gl.useProgram(program);
      uniforms = {};
      for (const name of ['uMatrix', 'uOffset', 'uSize', 'uScale', 'uExtent', 'uRot0', 'uRot1', 'uFace', 'uLightOpacity',
        'uLightAngle', 'uLightFlat', 'uLightDetail', 'uDetailExposure', 'uGlow', 'uLayerStart', 'uLayerAlpha',
        'uPolishStart', 'uPolish', 'uChamfer', 'uSurface', 'uRelief', 'uMask', 'uMask2', 'uLut'])
        uniforms[name] = gl.getUniformLocation(program, name);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-227, -227, 227, -227, -227, 227, 227, 227]), gl.STATIC_DRAW);
      const at = gl.getAttribLocation(program, 'aUnit');
      gl.enableVertexAttribArray(at); gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
      textures = [0, 1, 2, 3, 4].map(texture);
      ['uSurface', 'uRelief', 'uMask', 'uMask2', 'uLut'].forEach((name, unit) => gl.uniform1i(uniforms[name], unit));
      // Färgerna längs gradienterna, 1024 steg per rad: rad 0 glansen, rad 6
      // kantens streck (beror på läget och skrivs om när det ändras), rad 7
      // den fina kanten. Raderna 1 till 5 är spårljusets fem lager och skrivs
      // om varje bildruta.
      lutData = new Uint8Array(LUT_WIDTH * LUT_ROWS * 4);
      fillRow(0, root.MastrifyVinyl.SPECULAR_STOPS);
      fillRow(7, root.MastrifyVinyl.CHAMFER_STOPS);
      rimEnergy = NaN;
      gl.activeTexture(gl.TEXTURE4);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, LUT_WIDTH, LUT_ROWS, 0, gl.RGBA, gl.UNSIGNED_BYTE, lutData);
      sources = null;
    }
    // Gradientens färg mellan stoppen, rakt (utan förmultiplicering), som i
    // en canvas-gradient.
    function fillRow(index, stops) {
      const base = index * LUT_WIDTH * 4;
      for (let i = 0; i < LUT_WIDTH; i++) {
        const t = i / (LUT_WIDTH - 1);
        let k = 0;
        while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
        const [o0, ...c0] = stops[k], [o1, ...c1] = stops[k + 1];
        const f = o1 > o0 ? Math.max(0, Math.min(1, (t - o0) / (o1 - o0))) : 0;
        for (let ch = 0; ch < 4; ch++) {
          const v = c0[ch] + (c1[ch] - c0[ch]) * f;
          lutData[base + i * 4 + ch] = Math.round(ch === 3 ? v * 255 : v);
        }
      }
    }
    function upload(unit, image) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); }
      catch (_) {
        // Äldre webbläsare tar inte en OffscreenCanvas här: kopiera till en vanlig duk.
        const copy = doc.createElement('canvas');
        copy.width = image.width; copy.height = image.height;
        copy.getContext('2d').drawImage(image, 0, 0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, copy);
      }
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    }
    // Skivans yta och spårens masker. Laddas upp en gång, och igen bara när
    // vinyl.js har byggt nya (ny storlek eller täthet).
    function ensureSources() {
      const next = root.MastrifyVinyl.gpuSources();
      if (sources && sources.surface === next.surface && sources.relief === next.relief) return next;
      const relief = next.relief, size = relief.size;
      upload(0, next.surface);
      upload(1, relief.entries.base.canvas);
      const read = name => relief.entries[name].canvas.getContext('2d').getImageData(0, 0, size, size).data;
      const all = read('all'), g0 = read('group0'), g1 = read('group1'), g2 = read('group2'), found = read('discovery');
      const packed = new Uint8Array(size * size * 4), single = new Uint8Array(size * size);
      for (let i = 0, j = 3; i < size * size; i++, j += 4) {
        packed[i * 4] = all[j]; packed[i * 4 + 1] = g0[j]; packed[i * 4 + 2] = g1[j]; packed[i * 4 + 3] = g2[j];
        single[i] = found[j];
      }
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, packed);
      gl.activeTexture(gl.TEXTURE3);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, size, size, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, single);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      sources = next;
      return next;
    }

    // Dukarna följer motorns duk: samma antal bildpunkter och samma plats.
    function place() {
      const stage = engineCanvas.parentElement;
      if (!stage) return;
      if (canvas.parentElement !== stage || canvas.nextElementSibling !== engineCanvas) engineCanvas.before(canvas);
      if (center.parentElement !== stage || center.previousElementSibling !== engineCanvas) engineCanvas.after(center);
      const e = engineCanvas.getBoundingClientRect(), s = stage.getBoundingClientRect();
      const left = `${e.left - s.left - stage.clientLeft + stage.scrollLeft}px`, top = `${e.top - s.top - stage.clientTop + stage.scrollTop}px`;
      const width = `${e.width}px`, height = `${e.height}px`;
      for (const style of [canvas.style, center.style]) {
        if (style.left !== left) style.left = left;
        if (style.top !== top) style.top = top;
        if (style.width !== width) style.width = width;
        if (style.height !== height) style.height = height;
      }
    }
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (active) place(); }) : null;
    const watch = typeof MutationObserver === 'function' ? new MutationObserver(() => { if (active) place(); }) : null;

    function show(on) {
      if (shown === on) return;
      shown = on;
      engineCanvas.style.mixBlendMode = on ? 'plus-lighter' : '';
      canvas.style.visibility = center.style.visibility = on ? 'visible' : 'hidden';
    }
    function clearCenter() {
      centerContext.setTransform(1, 0, 0, 1, 0, 0);
      centerContext.clearRect(0, 0, center.width, center.height);
      centerBox = null;
    }
    function clear() {
      if (!gl.isContextLost()) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
      clearCenter();
    }

    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); program = null; sources = null; show(false); });
    canvas.addEventListener('webglcontextrestored', () => { try { init(); } catch (_) { failed = true; } });

    try { init(); } catch (error) { root.console?.warn?.('Grafikkretsen gick inte att starta:', error); return null; }

    const api = {
      canvas,
      centerCanvas: center,
      get active() { return active; },
      // Om grafikkretsen kan rita just nu. Motorn frågar före varje bildruta.
      ready() { return active && !failed && !!program && !gl.isContextLost(); },
      setActive(on) {
        on = !!on && !failed;
        if (on === active) return active;
        active = on;
        if (on) {
          observer?.observe(engineCanvas); if (engineCanvas.parentElement) observer?.observe(engineCanvas.parentElement);
          watch?.observe(doc.body, { attributes: true, attributeFilter: ['data-page', 'data-step'] });
          place();
        } else {
          observer?.disconnect(); watch?.disconnect();
          clear(); show(false);
        }
        return active;
      },
      place,
      // Duken för mitten, tömd och med samma läge som motorns duk. Mitten
      // ryms helt inom radie 111 (motorn klipper den där), så bara rutan runt
      // den töms: förra bildrutans ruta och den nya.
      center(transform) {
        if (center.width !== engineCanvas.width || center.height !== engineCanvas.height) {
          center.width = engineCanvas.width; center.height = engineCanvas.height; centerBox = null;
        }
        const c = centerContext, m = transform;
        const reach = 114 * Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d));
        const box = [Math.floor(m.e - reach), Math.floor(m.f - reach), Math.ceil(m.e + reach), Math.ceil(m.f + reach)];
        const clearBox = centerBox ? [Math.min(box[0], centerBox[0]), Math.min(box[1], centerBox[1]),
          Math.max(box[2], centerBox[2]), Math.max(box[3], centerBox[3])] : [0, 0, center.width, center.height];
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(clearBox[0], clearBox[1], clearBox[2] - clearBox[0], clearBox[3] - clearBox[1]);
        centerBox = box;
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        c.lineCap = 'round'; c.lineJoin = 'round';
        c.setTransform(m);
        return c;
      },
      render(frame) {
        if (!api.ready()) return false;
        try {
          if (canvas.width !== engineCanvas.width) canvas.width = engineCanvas.width;
          if (canvas.height !== engineCanvas.height) canvas.height = engineCanvas.height;
          const source = ensureSources(), relief = source.relief;
          const m = frame.transform;
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.disable(gl.BLEND);
          gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
          gl.useProgram(program);
          gl.uniformMatrix2fv(uniforms.uMatrix, false, [m.a, m.b, m.c, m.d]);
          gl.uniform2f(uniforms.uOffset, m.e, m.f);
          gl.uniform2f(uniforms.uSize, canvas.width, canvas.height);
          gl.uniform1f(uniforms.uScale, Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)));
          gl.uniform1f(uniforms.uExtent, relief.size / (2 * relief.density));
          const plan = root.MastrifyVinyl.annulusPlan(frame.phase, frame.energy, frame.original);
          const [f0, f1, f2] = plan.faces;
          gl.uniform2f(uniforms.uRot0, Math.cos(-f0.rotation), Math.sin(-f0.rotation));
          gl.uniform2f(uniforms.uRot1, Math.cos(-f1.rotation), Math.sin(-f1.rotation));
          gl.uniform3f(uniforms.uFace, f0.opacity, f1.opacity, f2.opacity);
          const lights = plan.lights;
          gl.uniform3f(uniforms.uLightOpacity, lights[0].opacity, lights[1].opacity, lights[2].opacity);
          gl.uniform3f(uniforms.uLightAngle, lights[0].angle, lights[1].angle, lights[2].angle);
          gl.uniform3f(uniforms.uLightFlat, lights[0].flat, lights[1].flat, lights[2].flat);
          gl.uniform3f(uniforms.uLightDetail, lights[0].detail, lights[1].detail, lights[2].detail);
          gl.uniform1f(uniforms.uDetailExposure, plan.detailExposure);
          // Spårljuset: samma lager som living-surface.js ritar.
          const surface = root.MastrifyLivingSurface?.plan?.(frame.phase, frame.surface) || null;
          const start = [0, 0, 0, 0], alpha = [0, 0, 0, 0];
          let polishStart = 0, polishFill = 0, polishPaint = 0;
          if (surface) {
            for (const layer of surface.layers) {
              let row;
              if (layer.kind === 'discovery') { row = 4; start[3] = layer.start; alpha[3] = 1; }
              else if (layer.kind === 'all') {
                row = 5; polishStart = layer.start; polishFill = layer.fill;
                polishPaint = Math.min(1, layer.lineWidth / relief.spacing / .5);
              } else {
                const group = Number(layer.kind.slice(5));
                row = 1 + group; start[group] = layer.start;
                alpha[group] = Math.min(1, layer.lineWidth / relief.spacing / .5);
              }
              const base = (row * LUT_WIDTH) * 4;
              for (let i = 0; i < STOPS; i++) {
                const [r, g, b, a] = layer.stops[i];
                lutData[base + i * 4] = r; lutData[base + i * 4 + 1] = g; lutData[base + i * 4 + 2] = b;
                lutData[base + i * 4 + 3] = Math.round(a * 255);
              }
            }
            gl.activeTexture(gl.TEXTURE4);
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
            const rows = new Uint8Array(STOPS * 5 * 4);
            for (let row = 1; row <= 5; row++) rows.set(lutData.subarray(row * LUT_WIDTH * 4, row * LUT_WIDTH * 4 + STOPS * 4), (row - 1) * STOPS * 4);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 1, STOPS, 5, gl.RGBA, gl.UNSIGNED_BYTE, rows);
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
          }
          gl.uniform1f(uniforms.uGlow, surface ? surface.opacity : 0);
          // Kantens streck: färgerna beror på läget (e), den fina kanten ritas bara när e > 0.
          const e = Math.max(0, Math.min(1, Number(frame.energy) || 0));
          if (e !== rimEnergy) {
            rimEnergy = e;
            fillRow(6, root.MastrifyVinyl.rimStops(e));
            gl.activeTexture(gl.TEXTURE4);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 6, LUT_WIDTH, 1, gl.RGBA, gl.UNSIGNED_BYTE,
              lutData.subarray(6 * LUT_WIDTH * 4, 7 * LUT_WIDTH * 4));
          }
          gl.uniform1f(uniforms.uChamfer, e);
          gl.uniform4f(uniforms.uLayerStart, start[0], start[1], start[2], start[3]);
          gl.uniform4f(uniforms.uLayerAlpha, alpha[0], alpha[1], alpha[2], alpha[3]);
          gl.uniform1f(uniforms.uPolishStart, polishStart);
          gl.uniform2f(uniforms.uPolish, polishFill, polishPaint);
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          show(true);
          return true;
        } catch (error) {
          failed = true; active = false; show(false); clear();
          root.console?.warn?.('Grafikkretsen stängdes av:', error);
          return false;
        }
      },
      destroy() { api.setActive(false); canvas.remove(); center.remove(); gl.getExtension('WEBGL_lose_context')?.loseContext(); }
    };
    return api;
  }

  root.MastrifyGpuDisc = Object.freeze({ create, supported });
})(typeof window !== 'undefined' ? window : globalThis);
