/* Safari gradient opacity compatibility; visible canvases stay accelerated. */
(() => {
  const ua = navigator.userAgent;
  const webKit = /AppleWebKit\//.test(ua) && !/(Chrome|Chromium|Edg|OPR|SamsungBrowser)\//.test(ua);
  const measureFrames = new URLSearchParams(location.search).get('perf') === '1';
  const preparedContexts = new WeakSet();
  const images = new WeakMap();
  const gradients = new WeakMap();
  // One short-lived worker serializes exact glow preparation. Large Float32
  // convolution buffers never occupy the animation thread.
  let blurWorker=null,blurSequence=0,blurIdle=null;
  const blurJobs=new Map();
  const blurURL='/assets/engine/blur-worker.js?v=20260917-transition1';
  function failBlur(error) {
    blurWorker?.terminate();blurWorker=null;
    for(const job of blurJobs.values()){clearTimeout(job.timer);job.reject(error);}blurJobs.clear();
  }
  async function blurredCanvasAsync(source,sigma) {
    if(typeof window.Worker!=='function')return blurredCanvas(source,sigma);
    try {
      clearTimeout(blurIdle);
      if(!blurWorker){
        blurWorker=new Worker(blurURL);
        blurWorker.onerror=()=>failBlur(new Error('Glow preparation worker unavailable.'));
        blurWorker.onmessage=({data})=>{
          const job=blurJobs.get(data.id);if(!job)return;blurJobs.delete(data.id);clearTimeout(job.timer);
          if(data.error)job.reject(new Error(data.error));else job.resolve(data.buffer);
          if(!blurJobs.size)blurIdle=setTimeout(()=>{blurWorker?.terminate();blurWorker=null;},2000);
        };
      }
      const width=source.width,height=source.height;
      const pixels=source.getContext('2d').getImageData(0,0,width,height),id=++blurSequence;
      const result=await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>failBlur(new Error('Glow preparation timed out.')),15000);
        blurJobs.set(id,{resolve,reject,timer});
        try{blurWorker.postMessage({id,width,height,sigma,buffer:pixels.data.buffer},[pixels.data.buffer]);}
        catch(error){failBlur(error);}
      });
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(result),width,height),0,0);
      return canvas;
    }catch{return blurredCanvas(source,sigma);}
  }

  function parseColor(color) {
    if (typeof color !== 'string') return null;
    if (/^#[\da-f]{3,8}$/i.test(color)) {
      let hex = color.slice(1);
      if (hex.length === 3 || hex.length === 4) hex = [...hex].map(c => c + c).join('');
      if (hex.length !== 6 && hex.length !== 8) return null;
      return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16), hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1];
    }
    const rgb = color.match(/^rgba?\(([^)]+)\)$/);
    if (rgb) {
      const channels = rgb[1].split(',').map(Number);
      if ((channels.length === 3 || channels.length === 4) && channels.every(Number.isFinite))
        return [...channels.slice(0, 3), Math.max(0, Math.min(1, channels[3] ?? 1))];
    }
    return color === 'transparent' ? [0, 0, 0, 0] : null;
  }
  function stabilizeGradientOpacity(ctx) {
    if (preparedContexts.has(ctx)) return ctx;
    preparedContexts.add(ctx);
    for (const name of ['createLinearGradient', 'createRadialGradient', 'createConicGradient']) {
      const create = ctx[name];
      if (!create) continue;
      ctx[name] = function (...args) {
        const gradient = create.apply(this, args);
        const data = { create, args, matrix: this.getTransform(), stops: [], supported: true, opacityPaints: null };
        gradients.set(gradient, data);
        const addStop = gradient.addColorStop;
        gradient.addColorStop = function (offset, color) {
          addStop.call(this, offset, color);
          const rgba = parseColor(color);
          data.supported &&= rgba !== null;
          data.stops.push([offset, rgba]);
          data.opacityPaints?.clear();
        };
        return gradient;
      };
    }
    if (!webKit) return ctx;
    for (const [name, property] of [['stroke', 'strokeStyle'], ['fill', 'fillStyle'], ['fillRect', 'fillStyle']]) {
      const paint = ctx[name];
      ctx[name] = function (...args) {
        const alpha = this.globalAlpha;
        if (alpha === 1) return paint.apply(this, args);
        const data = gradients.get(this[property]);
        // Safari can flash a faint gradient stroke at full intensity when the
        // same gradient is reused at changing widths/opacities. Carry opacity
        // in the paint itself. Canvas applies alpha before generating shadows,
        // so this also preserves their color, blur and offsets unchanged.
        if (!data?.supported)
          return paint.apply(this, args);
        this.save();
        try {
          const paints = data.opacityPaints ||= new Map();
          let gradient = paints.get(alpha);
          if (!gradient) {
            const transform = this.getTransform();
            this.setTransform(data.matrix);
            gradient = data.create.apply(this, data.args);
            for (const [offset, [r, g, b, a]] of data.stops)
              gradient.addColorStop(offset, `rgba(${r},${g},${b},${a * alpha})`);
            this.setTransform(transform);
            // Exact alpha keys, never rounded. Bound moving gradients while
            // reusing repeated fixed-opacity passes of cached materials.
            if (paints.size >= 12) paints.delete(paints.keys().next().value);
            paints.set(alpha, gradient);
          }
          this[property] = gradient;
          this.globalAlpha = 1;
          return paint.apply(this, args);
        } finally { this.restore(); }
      };
    }
    return ctx;
  }
  // Three separable box passes approximate the Gaussian used by CSS blur.
  // Work only while building a light cache, in premultiplied RGBA so its
  // transparent edges retain their violet/blue color rather than dark fringes.
  function blurredCanvas(source, sigma) {
    const width = source.width, height = source.height;
    const result = document.createElement('canvas');
    result.width = width; result.height = height;
    const ctx = result.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0);
    const pixels = ctx.getImageData(0, 0, width, height);
    if (!(sigma > 0)) return result;
    let input = new Float32Array(pixels.data.length);
    let output = new Float32Array(input.length);
    for (let i = 0; i < input.length; i += 4) {
      const alpha = pixels.data[i + 3] / 255;
      input[i] = pixels.data[i] * alpha;
      input[i + 1] = pixels.data[i + 1] * alpha;
      input[i + 2] = pixels.data[i + 2] * alpha;
      input[i + 3] = pixels.data[i + 3];
    }
    let lower = Math.floor(Math.sqrt(4 * sigma * sigma + 1));
    if (lower % 2 === 0) lower--;
    lower = Math.max(1, lower);
    const upper = lower + 2;
    const lowerPasses = Math.round((12 * sigma * sigma - 3 * lower * lower - 12 * lower - 9) / (-4 * lower - 4));
    for (let pass = 0; pass < 3; pass++) {
      const radius = ((pass < lowerPasses ? lower : upper) - 1) / 2;
      for (let axis = 0; axis < 2; axis++) {
        const lines = axis ? width : height, length = axis ? height : width;
        const stride = axis ? width * 4 : 4;
        const divisor = radius * 2 + 1;
        for (let line = 0; line < lines; line++) {
          const base = axis ? line * 4 : line * width * 4;
          let r = 0, g = 0, b = 0, a = 0;
          for (let pos = 0; pos <= radius && pos < length; pos++) {
            const i = base + pos * stride;
            r += input[i]; g += input[i + 1]; b += input[i + 2]; a += input[i + 3];
          }
          for (let pos = 0; pos < length; pos++) {
            const i = base + pos * stride;
            output[i] = r / divisor; output[i + 1] = g / divisor;
            output[i + 2] = b / divisor; output[i + 3] = a / divisor;
            const remove = pos - radius, add = pos + radius + 1;
            if (remove >= 0) {
              const j = base + remove * stride;
              r -= input[j]; g -= input[j + 1]; b -= input[j + 2]; a -= input[j + 3];
            }
            if (add < length) {
              const j = base + add * stride;
              r += input[j]; g += input[j + 1]; b += input[j + 2]; a += input[j + 3];
            }
          }
        }
        [input, output] = [output, input];
      }
    }
    for (let i = 0; i < input.length; i += 4) {
      const alpha = Math.max(0, input[i + 3]);
      const factor = alpha > .00001 ? 255 / alpha : 0;
      pixels.data[i] = input[i] * factor;
      pixels.data[i + 1] = input[i + 1] * factor;
      pixels.data[i + 2] = input[i + 2] * factor;
      pixels.data[i + 3] = alpha;
    }
    ctx.putImageData(pixels, 0, 0);
    return result;
  }
  const densityListeners = new Set();
  let densityQuery;
  function densityChanged() {
    densityQuery?.removeEventListener('change', densityChanged);
    densityQuery = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    densityQuery.addEventListener('change', densityChanged);
    for (const notify of densityListeners) notify();
  }
  let output, start = null, frames = 0, last = null, costs = [], lastMode;
  const frameSamples = new Map();
  window.MastrifyCanvas = Object.freeze({
    webKit,
    supportsFilter: 'filter' in CanvasRenderingContext2D.prototype,
    blurredCanvas, blurredCanvasAsync,
    // The blur fallback builds CPU pixels once. Decode an immutable image so
    // animation frames don't repeatedly transfer its mutable software canvas.
    cacheImage(canvas) {
      if (images.has(canvas)) return;
      images.set(canvas, null);
      (async () => {
        // Snapshot immutable pixels directly. PNG serialization forced a
        // synchronous GPU readback at the first frame of each new material.
        if (typeof window.createImageBitmap === 'function') {
          try { images.set(canvas, await window.createImageBitmap(canvas)); return; }
          catch { /* Older WebKit sources retain the decoded-image fallback. */ }
        }
        const blob = canvas.convertToBlob
          ? await canvas.convertToBlob({ type: 'image/png' })
          : await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) return;
        const url = URL.createObjectURL(blob), image = new Image();
        try {
          image.src = url;
          await image.decode();
          images.set(canvas, image);
        } finally { URL.revokeObjectURL(url); }
      })().catch(() => { /* The canvas remains a usable fallback. */ });
    },
    imageSource(canvas) { return images.get(canvas) || canvas; },
    get pixelRatio() { return Math.min(window.devicePixelRatio || 1, 2); },
    measureFrames,
    observeDensity(notify) {
      if (!densityQuery) densityChanged();
      densityListeners.add(notify);
      return () => densityListeners.delete(notify);
    },
    recordFrame(timestamp, cost, mode, detail = {}) {
      if (!measureFrames) return;
      const key = mode + (detail.transition ? ':transition' : ':steady');
      let samples = frameSamples.get(key);
      if (!samples) frameSamples.set(key, samples = []);
      samples.push({ cost, interval: last !== null && timestamp - last < 250 ? timestamp - last : null, core: detail.core || 0, wave: detail.wave || 0 });
      if (samples.length > 1800) samples.shift();
      if (last === null || timestamp - last > 250 || mode !== lastMode) { start = timestamp; frames = 0; costs = []; }
      last = timestamp; lastMode = mode;
      frames++;
      costs.push(cost);
      if (timestamp - start < 2000) return;
      if (!output) {
        output = document.createElement('output');
        output.id = 'render-performance';
        output.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9999;padding:8px 12px;border:1px solid #b39be866;border-radius:8px;background:#07070eee;color:#ded2ff;font:12px monospace;pointer-events:none';
        document.body.append(output);
      }
      costs.sort((a, b) => a - b);
      output.textContent = `${webKit ? 'Safari' : 'Browser'} ${mode} · ${((frames - 1) * 1000 / (timestamp - start)).toFixed(1)} FPS · render p95 ${costs[Math.floor(costs.length * .95)].toFixed(1)} ms`;
      const report = {};
      for (const [key, rows] of frameSamples) {
        const sorted = rows.map(row => row.cost).sort((a,b) => a-b);
        const intervals = rows.map(row => row.interval).filter(value => value !== null);
        report[key] = { frames: rows.length, p95: sorted[Math.floor(sorted.length * .95)], max: sorted.at(-1),
          mean: rows.reduce((sum,row) => sum + row.cost, 0) / rows.length,
          coreMean: rows.reduce((sum,row) => sum + row.core, 0) / rows.length,
          waveMean: rows.reduce((sum,row) => sum + row.wave, 0) / rows.length,
          fps: intervals.length * 1000 / intervals.reduce((sum,value) => sum + value, 0),
          slowFrames: intervals.filter(value => value > 25).length };
      }
      output.dataset.report = JSON.stringify(report);
      output.dataset.environment = JSON.stringify({ webKit, pixelRatio: this.pixelRatio, width: innerWidth, height: innerHeight, scanner: window.MastrifyCoreField?.getStatus?.() });
      start = timestamp; frames = 1; costs = [];
    },
    copyGradient(gradient, ctx, sourceContext = null) {
      const data = gradients.get(gradient);
      if (!data?.supported) return gradient;
      ctx.save();
      try {
        ctx.setTransform(sourceContext
          ? ctx.getTransform().multiply(sourceContext.getTransform().inverse()).multiply(data.matrix) : data.matrix);
        const matrix = ctx.getTransform();
        const copy = data.create.apply(ctx, data.args);
        const copied = { ...data, matrix, stops: data.stops.slice(), opacityPaints: null };
        gradients.set(copy, copied);
        for (const [offset, [r,g,b,a]] of data.stops) copy.addColorStop(offset, `rgba(${r},${g},${b},${a})`);
        return copy;
      } finally { ctx.restore(); }
    },
    context2D(canvas, options = {}) {
      const { stableGradients = false, ...nativeOptions } = options;
      const ctx = canvas.getContext('2d', nativeOptions);
      return ctx && (stableGradients || canvas.id === 'engine' || canvas.id === 'track')
        ? stabilizeGradientOpacity(ctx) : ctx;
    }
  });
})();
