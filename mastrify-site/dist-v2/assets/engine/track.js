/* Mastrify Sonic Flow: a precise waveform with light moving across its surface.
 * The parent owns time and transport. Geometry is cached until samples or size
 * change; musical response changes illumination, never decoded peak heights.
 */
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const LOOP_SECONDS = 12;
  const PROBE_COLORS = ['#b995ff', '#82b7ff', '#65d8ff'];
  const clamp = (value, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, value));
  const smoothSeam = value => {
    const t = clamp(value);
    return t ** 4 * (35 - 84 * t + 70 * t * t - 20 * t ** 3);
  };
  const mix = (a, b, amount) => amount <= 0 ? a : amount >= 1 ? b : a + (b - a) * amount;
  const rgba = (r, g, b, alpha) => `rgba(${r},${g},${b},${clamp(alpha)})`;

  // Provläge (Linus 20 sep): ?wave=relief|prism|tube i adressen ritar
  // vågkroppen med en av tre nya 3D-kroppar i wave-bodies.js. Allt annat
  // (strängar, huvudljus, markör, utläsningar, puls) är oförändrat. Utan
  // flagga ritas dagens Sonic Wave exakt som förut.
  const WAVE_VARIANT = (() => {
    let body = null;
    try { body = new URLSearchParams(root.location.search).get('wave') || null; } catch (_) { body = null; }
    return { body: /^(relief|prism|tube|horizon|silk|glass)$/.test(body || '') ? body : null };
  })();
  root.MastrifyWaveVariant = WAVE_VARIANT;
  function seeded(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  class MastrifyTrack {
    constructor(canvas) {
      if (!canvas || typeof canvas.getContext !== 'function') {
        throw new TypeError('MastrifyTrack requires a canvas element.');
      }
      this.canvas = canvas;
      this.ctx = (root.MastrifyCanvas ? root.MastrifyCanvas.context2D(canvas, { alpha: true }) : canvas.getContext('2d', { alpha: true }));
      if (!this.ctx) throw new Error('Canvas 2D is not supported.');
      this.time = 0;
      this.energy = 1;
      this.activation = 0;
      this.destroyed = false;
      this.presentationMode = 'active';
      this.playbackBlend = null;
      this.playbackFlash = 0;
      this.source = 'demo';
      this.response = 0;
      this.ribbonBands = new Float32Array(3);
      this.ribbonHistory = new Float32Array(99);
      this.ribbonShape = new Float32Array(3);
      this.ribbonFastWeights = new Float32Array(99);
      this.ribbonRestWeights = new Float32Array(99);
      this.ribbonProcessing = { time: null, generation: null,
        levels: new Float32Array(3), bends: new Float32Array(3) };
      // Causal source-time filters give the tubes weight without a rolling
      // trace or frame-dependent spring state. Seek/A-B always lands exactly.
      for (let band = 0; band < 3; band++) {
        const span = band === 0 ? 2.4 : band === 1 ? 1.8 : 1.2;
        const fastTau = band === 0 ? .10 : band === 1 ? .09 : .08;
        const restTau = band === 0 ? .78 : band === 1 ? .65 : .6;
        let fastSum = 0, restSum = 0;
        for (let i = 0; i < 33; i++) {
          const age = (1-i/32)*span, at = band*33+i;
          fastSum += this.ribbonFastWeights[at] = Math.exp(-age/fastTau);
          restSum += this.ribbonRestWeights[at] = Math.exp(-age/restTau);
        }
        for (let i = band*33; i < (band+1)*33; i++) {
          this.ribbonFastWeights[i] /= fastSum;
          this.ribbonRestWeights[i] /= restSum;
        }
      }
      this.lightCue = { accent: 0, bass: 0, mid: 0, air: 0 };
      this.outputGain = 1;
      this.waveformRevision = 0;
      this.geometryRevision = 0;
      this.geometryCache = null;
      this.waveMaterials = new Map();
      this.waveformKey = null;
      this.colorCache = null;
      this.sonicAnalysisActive = false;
      this.sonicAnalysisFrame = {};
      // The host may replace processing annotations on Analyze only. The
      // immutable source geometry and all playback modes remain shared.
      this.analysisRenderer = null;
      this.analysisRendererActive = false;
      this.analysisRendererFrame = {};
      this.reducedMotion = root.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
      const random = seeded(0x4d415354);

      // Preserve the original deterministic example, including its asymmetric
      // positive/negative peaks. A real file replaces only those two values.
      this.samples = Array.from({ length: 256 }, (_, i) => {
        const u = i / 255;
        const phrase = .46 + .19 * Math.sin(u * TAU * 3.2 - .5)
          + .14 * Math.sin(u * TAU * 7.6 + 1.8)
          + .09 * Math.cos(u * TAU * 13.3);
        const transient = Math.pow(random(), 2.3);
        const taper = .22 + .78 * Math.pow(Math.sin(Math.PI * u), .35);
        const amplitude = clamp((phrase + transient * .42) * taper, .075, 1);
        const sample = { u, edge: Math.sin(Math.PI * u) ** .22,
          top: amplitude * (.76 + random() * .24),
          bottom: amplitude * (.67 + random() * .31), phase: random() * TAU };
        random();
        return sample;
      });
      this.exampleSamples = this.samples.map(sample => ({ ...sample }));
      this.hasWaveform = false;
      this.readheadU = 0;
      this.onResize = () => this.resize();
      this.releaseDensity = root.MastrifyCanvas?.observeDensity?.(this.onResize);
      if (typeof root.ResizeObserver === 'function') {
        this.resizeObserver = new root.ResizeObserver(this.onResize);
        this.resizeObserver.observe(canvas);
      } else root.addEventListener('resize', this.onResize);
      this.resize();
    }

    setPresentationMode(mode) {
      if (this.destroyed) return false;
      const normalized = mode === 'processing' || mode === 'mastering' ? 'active' : mode;
      if (!['idle', 'active', 'original', 'master'].includes(normalized)) {
        throw new TypeError('Unknown Sonic Flow presentation mode.');
      }
      if (this.presentationMode === normalized) return false;
      this.presentationMode = normalized;
      // The host renders immediately after setting its mode. Avoid a second
      // render here, and keep the exact same cached waveform in every mode.
      return true;
    }

    setWaveform(samples, render = true) {
      if (this.destroyed) return false;
      if (!Array.isArray(samples) || samples.length !== this.exampleSamples.length) {
        throw new TypeError('setWaveform requires 256 { top, bottom } samples.');
      }
      this.waveformKey = samples;
      const magnitude = value => clamp(Number.isFinite(value) ? value : 0);
      const next = this.exampleSamples.map((original, index) => {
        const sample = samples[index];
        if (!sample || typeof sample !== 'object') {
          throw new TypeError('Each waveform sample must contain top and bottom magnitudes.');
        }
        return { ...original, top: magnitude(sample.top), bottom: magnitude(sample.bottom) };
      });
      this.samples = next;
      this.hasWaveform = true;
      this.waveformRevision++;
      this.geometryCache = null;
      if (render) this.renderAt(this.time, this.energy);
      return true;
    }

    clearWaveform(render = true) {
      if (this.destroyed) return false;
      this.waveformKey = null;
      this.samples = this.exampleSamples.map(sample => ({ ...sample }));
      this.hasWaveform = false;
      this.waveformRevision++;
      this.geometryCache = null;
      if (render) this.renderAt(this.time, this.energy);
      return true;
    }

    resize(render = true) {
      if (this.destroyed) return;
      const rect = this.canvas.getBoundingClientRect();
      if ((!rect.width || !rect.height) && this.width) return;
      const width = rect.width || 850, height = rect.height || 100;
      const dpr = root.MastrifyCanvas?.pixelRatio || Math.min(root.devicePixelRatio || 1, 2);
      if (this.width === width && this.height === height && this.dpr === dpr
          && this.canvas.width === Math.round(width*dpr) && this.canvas.height === Math.round(height*dpr)) return;
      this.waveMaterials.clear();
      this.width=width; this.height=height; this.dpr=dpr;
      const pixelWidth = Math.max(1, Math.round(this.width * this.dpr));
      const pixelHeight = Math.max(1, Math.round(this.height * this.dpr));
      if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth;
      if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight;
      if (render) this.renderAt(this.time, this.energy);
    }

    prepareGeometry() {
      const w = this.width, h = this.height;
      const old = this.geometryCache;
      if (old && old.width === w && old.height === h && old.dpr === this.dpr
          && old.revision === this.waveformRevision) return old;
      const cached=this.waveMaterials.get(this.waveformKey);
      if(cached && cached.geometry.width===w && cached.geometry.height===h && cached.geometry.dpr===this.dpr) {
        this.geometryCache=cached.geometry;this.geometryCache.revision=this.waveformRevision;
        this.colorCache=cached.colors;return this.geometryCache;
      }
      const c = this.ctx;
      const pad = Math.max(10, w * .016), usable = Math.max(1, w - pad * 2);
      const middle = h * .45;
      // One fixed conversion for original, master, processing, pause and gain.
      // No local normalization, modulation, minimum height or edge taper.
      const scale = Math.min(h, 166) * .33;
      const spacing = usable / 255;
      const strokeWidth = clamp(spacing * .49, .55, 1.7);
      const barsPath = new Path2D(), topPath = new Path2D(), bottomPath = new Path2D();
      const bodyPath = new Path2D();
      const analysisGrid = new Path2D(), topMeasurements = new Path2D(), bottomMeasurements = new Path2D();
      const analysisTopTrace = new Path2D(), analysisBottomTrace = new Path2D();
      const bars = this.samples.map((sample, index) => {
        const x = pad + sample.u * usable;
        const top = middle - sample.top * scale;
        const bottom = middle + sample.bottom * scale;
        const silent = sample.top === 0 && sample.bottom === 0;
        if (!silent) { barsPath.moveTo(x, top); barsPath.lineTo(x, bottom); }
        if (index % 8 === 0) {
          analysisGrid.moveTo(x, middle - scale - 6);
          analysisGrid.lineTo(x, middle + scale + 6);
        }
        if (!silent && index % 4 === 0) {
          // Sample points and small measuring caps are attached to decoded
          // endpoints. They never change the position or height of a peak.
          topMeasurements.moveTo(x - 2.1, top - 3.3);
          topMeasurements.lineTo(x + 2.1, top - 3.3);
          topMeasurements.moveTo(x, top - 3.3); topMeasurements.lineTo(x, top);
          topMeasurements.moveTo(x + .8, top); topMeasurements.arc(x, top, .8, 0, TAU);
          bottomMeasurements.moveTo(x - 2.1, bottom + 3.3);
          bottomMeasurements.lineTo(x + 2.1, bottom + 3.3);
          bottomMeasurements.moveTo(x, bottom + 3.3); bottomMeasurements.lineTo(x, bottom);
          bottomMeasurements.moveTo(x + .8, bottom); bottomMeasurements.arc(x, bottom, .8, 0, TAU);
        }
        if (index === 0) {
          topPath.moveTo(x, top); bottomPath.moveTo(x, bottom); bodyPath.moveTo(x, top);
        } else {
          topPath.lineTo(x, top); bottomPath.lineTo(x, bottom); bodyPath.lineTo(x, top);
        }
        if (index === 0) {
          analysisTopTrace.moveTo(x, top); analysisBottomTrace.moveTo(x, bottom);
        } else if (index % 4 === 0 || index === 255) {
          analysisTopTrace.lineTo(x, top); analysisBottomTrace.lineTo(x, bottom);
        }
        return { x, top, bottom, u: sample.u, silent };
      });
      // Quiet, unlabelled amplitude guides use the same fixed waveform scale.
      // Their horizontal subdivisions align with every eighth real sample.
      for (let row = -4; row <= 4; row++) {
        const y = middle + row * scale / 4;
        analysisGrid.moveTo(pad, y); analysisGrid.lineTo(w - pad, y);
      }
      for (let i = bars.length - 1; i >= 0; i--) bodyPath.lineTo(bars[i].x, bars[i].bottom);
      bodyPath.closePath();
      const material = c.createLinearGradient(0, h * .12, 0, h * .79);
      material.addColorStop(0, '#a6a9d4');
      material.addColorStop(.28, '#9697bf');
      material.addColorStop(.49, '#dbdbe8');
      material.addColorStop(.55, '#a1accd');
      material.addColorStop(1, '#657baa');
      // Fit the material's color range to the fixed waveform bounds, so a
      // quieter file still shows violet and blue without enlarging its peaks.
      let materialTop = middle - 1, materialBottom = middle + 1;
      for (const bar of bars) {
        materialTop = Math.min(materialTop, bar.top);
        materialBottom = Math.max(materialBottom, bar.bottom);
      }
      const colorMiddle = (middle - materialTop) / (materialBottom - materialTop);
      const charged = c.createLinearGradient(0, materialTop, 0, materialBottom);
      charged.addColorStop(0, '#a675f0');
      charged.addColorStop(colorMiddle * .48, '#c197f5');
      charged.addColorStop(colorMiddle * .94, '#f6edff');
      charged.addColorStop(colorMiddle + (1 - colorMiddle) * .08, '#dce9ff');
      charged.addColorStop(colorMiddle + (1 - colorMiddle) * .52, '#85b9ff');
      charged.addColorStop(1, '#438cf4');
      const spectrum = c.createLinearGradient(pad, 0, w - pad, 0);
      spectrum.addColorStop(0, '#7e30d3');
      spectrum.addColorStop(.21, '#c395fa');
      spectrum.addColorStop(.43, '#fcf6ff');
      spectrum.addColorStop(.57, '#ecedff');
      spectrum.addColorStop(.74, '#b7d6ff');
      spectrum.addColorStop(1, '#438cf4');
      const body = c.createLinearGradient(0, h * .1, 0, h * .82);
      body.addColorStop(0, 'rgba(157,129,221,.025)');
      body.addColorStop(.45, 'rgba(154,139,217,.12)');
      body.addColorStop(1, 'rgba(91,135,207,.025)');
      const baseline = c.createLinearGradient(pad, 0, w - pad, 0);
      baseline.addColorStop(0, 'rgba(121,129,178,0)');
      baseline.addColorStop(.08, 'rgba(121,129,178,.11)');
      baseline.addColorStop(.5, 'rgba(189,191,221,.2)');
      baseline.addColorStop(.92, 'rgba(121,129,178,.11)');
      baseline.addColorStop(1, 'rgba(121,129,178,0)');
      const ribbonViolet = c.createLinearGradient(pad, 0, w - pad, 0);
      ribbonViolet.addColorStop(0, '#b976fa'); ribbonViolet.addColorStop(.4, '#dfbdff');
      ribbonViolet.addColorStop(.57, '#eee6ff'); ribbonViolet.addColorStop(1, '#599bff');
      const ribbonBlue = c.createLinearGradient(pad, 0, w - pad, 0);
      ribbonBlue.addColorStop(0, '#c79aff'); ribbonBlue.addColorStop(.4, '#e7ddff');
      ribbonBlue.addColorStop(.62, '#bfcfff'); ribbonBlue.addColorStop(1, '#6dbbff');
      const ribbonPoints = Array.from({ length: 113 }, (_, index) => {
        const u = index / 112, center = Math.round(u * 255);
        let signal = 0, weights = 0;
        // The tubes belong inside the printed waveform. Measure the room this
        // point actually has, taking the tightest bar across the span it spans.
        let roomUp = Infinity, roomDown = Infinity;
        const from = Math.max(0, Math.round((index - 1) / 112 * 255));
        const to = Math.min(255, Math.round((index + 1) / 112 * 255));
        for (let bar = from; bar <= to; bar++) {
          if (middle - bars[bar].top < roomUp) roomUp = middle - bars[bar].top;
          if (bars[bar].bottom - middle < roomDown) roomDown = bars[bar].bottom - middle;
        }
        // Smooth only the decorative ribbon envelope. The waveform paths
        // above still use every original top/bottom sample without filtering.
        for (let offset = -8; offset <= 8; offset++) {
          const sample = this.samples[clamp(center + offset, 0, 255)];
          const weight = 9 - Math.abs(offset);
          signal += (sample.top + sample.bottom) * .5 * weight;
          weights += weight;
        }
        return { u, x: pad + u * usable, edge: Math.sin(Math.PI * u) ** .7,
          signal: Math.sqrt(signal / weights),
          arch: Math.sin(u * TAU), counter: Math.cos(u * TAU),
          // Standing modes of a string pinned at both ends. The sway changes
          // shape in place, so no wavefront can travel in from an endpoint.
          sway1: Math.sin(Math.PI * u), sway3: Math.sin(3 * Math.PI * u),
          roomUp: Math.max(0, roomUp), roomDown: Math.max(0, roomDown) };
      });
      this.geometryRevision++;
      this.colorCache = { material, charged, spectrum, body, baseline, ribbonViolet, ribbonBlue };
      this.geometryCache = { width: w, height: h, dpr: this.dpr, revision: this.waveformRevision,
        pad, usable, middle, scale, spacing, strokeWidth, barsPath, topPath, bottomPath, bodyPath,
        analysisGrid, topMeasurements, bottomMeasurements, analysisTopTrace, analysisBottomTrace,
        ribbonPoints, bars, emission: null };
      this.geometryCache.colors=this.colorCache;
      if(this.waveMaterials.size>=3)this.waveMaterials.delete(this.waveMaterials.keys().next().value);
      this.waveMaterials.set(this.waveformKey,{geometry:this.geometryCache,colors:this.colorCache});
      return this.geometryCache;
    }

    async prepareWaveform(samples) {
      // Snapshot only the geometry pointers: no visible render, mode change or
      // audio selection. Preparation may finish while the current scene runs.
      const saved={samples:this.samples,hasWaveform:this.hasWaveform,waveformKey:this.waveformKey,
        waveformRevision:this.waveformRevision,geometryCache:this.geometryCache,colorCache:this.colorCache};
      let g;
      try {this.setWaveform(samples,false);g=this.prepareGeometry();}
      finally {Object.assign(this,saved);}
      if(root.MastrifyContourField){await root.MastrifyContourField.prepareAsync(g);return;}
      await this.prepareEmissionAsync(g);
      if(root.MastrifyCanvas?.webKit)this.prepareWaveLayers(g);
    }

    async prepareEmissionAsync(g) {
      if(g.emission)return g.emission;
      if(g.emissionJob)return g.emissionJob;
      if(!root.MastrifyCanvas?.blurredCanvasAsync || root.MastrifyCanvas.supportsFilter) {
        const colors=this.colorCache;this.colorCache=g.colors;
        try{return this.prepareEmission(g);}finally{this.colorCache=colors;}
      }
      const job=async()=>{
        const emission=document.createElement('canvas');emission.width=Math.round(g.width*g.dpr);emission.height=Math.round(g.height*g.dpr);
        const light=emission.getContext('2d');
        const layer=document.createElement('canvas');layer.width=emission.width;layer.height=emission.height;
        const ink=layer.getContext('2d',{willReadFrequently:true});
        for(const [path,color,width,alpha] of [[g.barsPath,g.colors.charged,g.strokeWidth*2,.65],[g.topPath,g.colors.spectrum,2.5,.48],[g.bottomPath,g.colors.spectrum,2.5,.48]]) {
          ink.setTransform(1,0,0,1,0,0);ink.clearRect(0,0,layer.width,layer.height);
          ink.setTransform(g.dpr,0,0,g.dpr,0,0);ink.strokeStyle=color;ink.lineWidth=width;ink.stroke(path);
          const blurred=await root.MastrifyCanvas.blurredCanvasAsync(layer,4*g.dpr);
          light.globalAlpha=alpha;light.drawImage(blurred,0,0);
        }
        root.MastrifyCanvas.cacheImage(emission);g.emission=emission;return emission;
      };
      g.emissionJob=job().finally(()=>{g.emissionJob=null;});return g.emissionJob;
    }

    prepareEmission(g) {
      if (g.emission) return g.emission;
      const { barsPath, topPath, bottomPath, strokeWidth } = g;
      const { charged, spectrum } = this.colorCache;
      // Colored light spills from the exact signal silhouette. Cache its blur
      // with the waveform so playback only composites a small bitmap.
      const emission = document.createElement('canvas');
      emission.width = this.canvas.width; emission.height = this.canvas.height;
      const light = (root.MastrifyCanvas ? root.MastrifyCanvas.context2D(emission, { willReadFrequently: root.MastrifyCanvas.webKit }) : emission.getContext('2d'));
      if (root.MastrifyCanvas && !root.MastrifyCanvas.supportsFilter) {
        const layer = document.createElement('canvas');
        layer.width = emission.width; layer.height = emission.height;
        const ink = layer.getContext('2d', { willReadFrequently: true });
        for (const [path, color, width, alpha] of [
          [barsPath, charged, strokeWidth * 2, .65],
          [topPath, spectrum, 2.5, .48], [bottomPath, spectrum, 2.5, .48]
        ]) {
          ink.setTransform(1, 0, 0, 1, 0, 0);
          ink.clearRect(0, 0, layer.width, layer.height);
          ink.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
          ink.strokeStyle = color; ink.lineWidth = width; ink.stroke(path);
          light.globalAlpha = alpha;
          light.drawImage(root.MastrifyCanvas.blurredCanvas(layer, 4 * this.dpr), 0, 0);
        }
      } else {
        light.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        light.strokeStyle = charged; light.lineWidth = strokeWidth * 2;
        light.filter = `blur(${4 * this.dpr}px)`;
        light.globalAlpha = .65; light.stroke(barsPath);
        light.strokeStyle = spectrum; light.lineWidth = 2.5;
        light.globalAlpha = .48; light.stroke(topPath); light.stroke(bottomPath);
        light.filter = 'none';
      }
      root.MastrifyCanvas?.cacheImage(emission);
      g.emission = emission;
      return emission;
    }

    paintWaveBody(c, g, colors, mode, masterAmount, gloss, playback, original, idle) {
      const w = this.width, h = this.height;
        // A compressed, subdued reflection sits below the signal. Its source
        // is the same immutable path, not a second fabricated waveform.
        c.save();
        c.translate(0, h * .975); c.scale(1, -.13);
        c.strokeStyle = colors.spectrum;
        c.globalAlpha = .025 + .09 * gloss;
        c.lineWidth = g.strokeWidth;
        c.stroke(g.barsPath);
        c.restore();

        // A narrow underside and tinted body give relief without displacing
        // the crisp front face or changing any peak's displayed amplitude.
        c.save();
        c.translate(0, 1.6 + 1.1 * gloss);
        c.strokeStyle = '#101524'; c.lineWidth = g.strokeWidth + .6;
        c.globalAlpha = .8; c.stroke(g.barsPath);
        c.strokeStyle = '#26304c'; c.lineWidth = .6;
        c.globalAlpha = .34; c.stroke(g.bottomPath);
        c.restore();
        c.fillStyle = colors.body; c.globalAlpha = .45 + .4 * gloss; c.fill(g.bodyPath);
        c.globalAlpha = 1; c.strokeStyle = colors.baseline; c.lineWidth = .6;
        c.beginPath(); c.moveTo(g.pad, g.middle); c.lineTo(w - g.pad, g.middle); c.stroke();
        c.lineWidth = g.strokeWidth;
        if (playback && masterAmount > 0 && masterAmount < 1) {
          c.strokeStyle = colors.material;
          c.globalAlpha = .55 * (1 - masterAmount); c.stroke(g.barsPath);
          c.strokeStyle = colors.charged;
          c.globalAlpha = mix(.04 + .18 * this.response, .84, masterAmount); c.stroke(g.barsPath);
        } else {
          c.strokeStyle = idle || original ? colors.material : colors.charged;
          c.globalAlpha = idle ? .3 : original ? .55 : playback ? .84 : .57;
          c.stroke(g.barsPath);
          if (original) {
            c.strokeStyle = colors.charged;
            c.globalAlpha = .04 + .18 * this.response;
            c.stroke(g.barsPath);
          }
        }
        c.strokeStyle = colors.spectrum; c.lineWidth = .48;
        c.globalAlpha = idle ? .055 + .08 * gloss : playback ? mix(.13, .25, masterAmount) : .16;
        c.stroke(g.topPath); c.stroke(g.bottomPath);

    }

    prepareWaveLayers(g) {
      if(g.layers)return g.layers;
      const layers={};
      const add=(name,paint)=>{
        const canvas=document.createElement('canvas');canvas.width=Math.round(g.width*g.dpr);canvas.height=Math.round(g.height*g.dpr);
        const c=canvas.getContext('2d');c.setTransform(g.dpr,0,0,g.dpr,0,0);c.lineCap='butt';c.lineJoin='round';
        paint(c);root.MastrifyCanvas?.cacheImage(canvas);layers[name]=canvas;
      };
      const stroke=(c,path,color,width)=>{c.strokeStyle=color;c.lineWidth=width;c.stroke(path);};
      const colors=g.colors;
      add('reflection',c=>{c.translate(0,g.height*.975);c.scale(1,-.13);stroke(c,g.barsPath,colors.spectrum,g.strokeWidth);});
      add('underside',c=>{c.globalAlpha=.8;stroke(c,g.barsPath,'#101524',g.strokeWidth+.6);c.globalAlpha=.34;stroke(c,g.bottomPath,'#26304c',.6);});
      add('body',c=>{c.fillStyle=colors.body;c.fill(g.bodyPath);});
      add('baseline',c=>{c.beginPath();c.moveTo(g.pad,g.middle);c.lineTo(g.width-g.pad,g.middle);c.strokeStyle=colors.baseline;c.lineWidth=.6;c.stroke();});
      add('material',c=>stroke(c,g.barsPath,colors.material,g.strokeWidth));
      add('charged',c=>stroke(c,g.barsPath,colors.charged,g.strokeWidth));
      add('top',c=>stroke(c,g.topPath,colors.spectrum,.48));
      add('bottom',c=>stroke(c,g.bottomPath,colors.spectrum,.48));
      return g.layers=layers;
    }

    drawWaveLayers(c,g,masterAmount,gloss,playback,original,idle) {
      const layers=this.prepareWaveLayers(g);
      const paint=(name,alpha,y=0)=>{c.globalAlpha=alpha;c.drawImage(root.MastrifyCanvas.imageSource(layers[name]),0,y,g.width,g.height);};
      paint('reflection',.025+.09*gloss);paint('underside',1,1.6+1.1*gloss);
      paint('body',.45+.4*gloss);paint('baseline',1);
      if(playback&&masterAmount>0&&masterAmount<1) {
        paint('material',.55*(1-masterAmount));paint('charged',mix(.04+.18*this.response,.84,masterAmount));
      }else{
        paint(idle||original?'material':'charged',idle?.3:original?.55:playback?.84:.57);
        if(original)paint('charged',.04+.18*this.response);
      }
      const edge=idle?.055+.08*gloss:playback?mix(.13,.25,masterAmount):.16;
      paint('top',edge);paint('bottom',edge);
    }

    drawWaveBody(c, g, colors, mode, masterAmount, gloss, playback, original, idle) {
      if(WAVE_VARIANT.body&&root.MastrifyWaveBodies){
        // Provläge: en av tre nya 3D-kroppar ersätter bara själva kroppen.
        root.MastrifyWaveBodies.draw(WAVE_VARIANT.body,c,g,{
          progress:this.readheadU,amount:playback?.35+.65*masterAmount:.7,
          response:playback?this.response:clamp(this.frontStrength),
          time:this.reducedMotion?0:this.time,bands:this.lightCue,
          playback,original,idle,masterAmount,gloss,energy:this.energy,
          scanning:mode==='active'&&!this.analysisRendererActive});
        return;
      }
      if(root.MastrifyContourField){
        const scanning=mode==='active'&&!this.analysisRendererActive;
        root.MastrifyContourField.draw(c,g,playback?.35+.65*masterAmount:.7,this.readheadU,
          playback?this.response:scanning?clamp(this.frontStrength):0,
          this.reducedMotion?0:this.time,this.lightCue,scanning);return;
      }
      const cacheable = root.MastrifyCanvas?.webKit && !original
        && (!playback || masterAmount === 1);
      if (!cacheable) {
        if(root.MastrifyCanvas?.webKit)this.drawWaveLayers(c,g,masterAmount,gloss,playback,original,idle);
        else this.paintWaveBody(c,g,colors,mode,masterAmount,gloss,playback,original,idle);
        return;
      }
      if (!g.materials) g.materials = new Map();
      if (!g.materials.has(mode)) {
        const canvas = document.createElement('canvas');
        canvas.width = this.canvas.width; canvas.height = this.canvas.height;
        const brush = root.MastrifyCanvas.context2D(canvas, { stableGradients: true });
        brush.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        brush.lineCap = 'butt'; brush.lineJoin = 'round';
        const palette = Object.fromEntries(Object.entries(colors).map(([key, value]) =>
          [key, root.MastrifyCanvas.copyGradient(value, brush)]));
        this.paintWaveBody(brush, g, palette, mode, masterAmount, gloss, playback, original, idle);
        root.MastrifyCanvas.cacheImage(canvas); g.materials.set(mode, canvas);
      }
      c.globalAlpha = 1;
      c.drawImage(root.MastrifyCanvas.imageSource(g.materials.get(mode)), 0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
    }

    renderAt(seconds, energy = 1) {
      if (this.dpr !== (root.MastrifyCanvas?.pixelRatio || Math.min(root.devicePixelRatio || 1, 2))) this.resize(false);
      if (this.destroyed) return;
      const safeTime = Number.isFinite(seconds) ? seconds : 0;
      this.time = safeTime;
      this.energy = clamp(Number.isFinite(energy) ? energy : 1);
      const u = ((safeTime % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS / LOOP_SECONDS;
      const theta = TAU * u, mode = this.presentationMode;
      const playback = mode === 'original' || mode === 'master';
      let masterAmount = mode === 'master' ? 1 : 0;
      if (playback && this.playbackBlend) {
        const originalWeight = clamp(Number(this.playbackBlend.original) || 0);
        const masterWeight = clamp(Number(this.playbackBlend.master) || 0);
        const total = originalWeight + masterWeight;
        if (total > .000001) masterAmount = masterWeight / total;
      }
      const flash = playback ? clamp(Number(this.playbackFlash) || 0) : 0;
      const audio = root.MastrifyAudio;
      const transport = audio && typeof audio.getState === 'function' ? audio.getState() : null;
      const processing = mode === 'active' && typeof root.MastrifyProcessing?.getState === 'function'
        ? root.MastrifyProcessing.getState() : null;
      this.processingWork = !!processing?.active;
      const audioLoaded = this.processingWork ? !!transport?.sources?.original?.loaded : !!transport?.loaded;
      this.source = audioLoaded ? 'audio' : 'demo';
      this.readheadU = this.processingWork ? clamp(Number(processing.progress) || 0)
        : audioLoaded && Number.isFinite(transport.duration) && transport.duration > 0
        ? clamp((Number.isFinite(transport.currentTime) ? transport.currentTime : 0) / transport.duration) : u;
      this.outputGain = audioLoaded && Number.isFinite(transport.outputGain)
        ? clamp(transport.outputGain, 0, 2) : 1;
      const cue = root.MastrifyScore && typeof root.MastrifyScore.sample === 'function'
        ? root.MastrifyScore.sample(theta, 'source') || {}
        : root.MastrifyPulse && typeof root.MastrifyPulse.sample === 'function'
          ? root.MastrifyPulse.sample(theta) || {} : {};
      const playing = this.processingWork || !audioLoaded || !!transport.playing;
      const value = key => playing ? clamp(Number.isFinite(cue[key]) ? cue[key] : 0) : 0;
      const level = value('level'), bass = value('bass'), mid = value('mid'), air = value('air');
      const accent = value('accent');
      const left = Number.isFinite(cue.left) ? value('left') : level;
      const right = Number.isFinite(cue.right) ? value('right') : level;
      const width = value('width');
      // Listening gain belongs to playback. Silent analysis reads source
      // energy directly even when the monitored output is level-matched down.
      const gain = mode === 'active' ? 1 : audioLoaded ? Math.min(1.3, Math.sqrt(this.outputGain)) : 1;
      this.response = playing ? clamp(Math.max(level, bass, mid, air, accent) * gain) : 0;
      // Musical bending is read from the song, independently of the very slow
      // standing sway. Source-time filtering keeps seek and A/B deterministic.
      this.lightCue.accent = accent;
      this.lightCue.bass = bass; this.lightCue.mid = mid; this.lightCue.air = air;
      this.ribbonBands.fill(0); this.ribbonHistory.fill(0);
      if (audioLoaded && typeof audio.sampleStringBands === 'function') {
        if (this.processingWork) audio.sampleStringBands(this.ribbonBands, this.ribbonHistory, cue.sourceTime, 'original');
        else audio.sampleStringBands(this.ribbonBands, this.ribbonHistory);
      } else if (!audioLoaded) {
        this.ribbonBands[0] = bass; this.ribbonBands[1] = mid; this.ribbonBands[2] = air;
      }
      for (let band = 0; band < 3; band++) {
        const offset = band * 33;
        let recent = 0, resting = 0;
        for (let i = 0; i < 33; i++) {
          const signal = audioLoaded ? this.ribbonHistory[offset+i] : this.ribbonBands[band];
          recent += signal*this.ribbonFastWeights[offset+i];
          resting += signal*this.ribbonRestWeights[offset+i];
        }
        // Each band gently leans away from rest on an attack, then returns.
        // Never map recent audio history across the song's entire width.
        this.ribbonBands[band] = recent;
        const departure = recent-resting;
        this.ribbonShape[band] = Math.abs(departure)<.000001 ? 0 : clamp(departure*2.2, -.7, .7);
      }
      if (this.processingWork) {
        // The scan traverses a whole song in 36 seconds. Its accelerated
        // source clock must never accelerate the tubes' physical response.
        const state = this.ribbonProcessing, elapsed = Number(processing.elapsed)||0;
        const gap = state.time === null ? 0 : elapsed-state.time;
        const reset = state.generation !== processing.generation || gap<0 || gap>.25;
        if (reset) { state.levels.fill(0); state.bends.fill(0); }
        const dt = reset ? 0 : Math.max(0,gap);
        const glowEase = -Math.expm1(-dt/.30), bendEase = -Math.expm1(-dt/.42);
        for (let band = 0; band < 3; band++) {
          state.levels[band] = mix(state.levels[band],this.ribbonBands[band],glowEase);
          state.bends[band] = mix(state.bends[band],this.ribbonShape[band],bendEase);
          this.ribbonBands[band] = state.levels[band]; this.ribbonShape[band] = state.bends[band];
        }
        state.time = elapsed; state.generation = processing.generation;
      } else {
        this.ribbonProcessing.time = null; this.ribbonProcessing.generation = null;
      }
      const modeStrength = mode === 'idle' ? .16 * this.energy
        : playback ? mix(1.12, 1.85, masterAmount) : this.energy;
      const activity = modeStrength * this.response;
      const activation = mode === 'active' ? this.energy * clamp(Number(this.activation) || 0) : 0;
      const originalFade = Math.sin(Math.PI * u) ** 2;
      const seam = clamp(Math.min(u, 1 - u) / .035);
      // Four vanishing powers extinguish even a nearly full played-prefix
      // cache before the demo head wraps. The first three derivatives match
      // at both ends, rather than leaving a one-frame residue of that prefix.
      const frontFade = smoothSeam(seam);
      const demoWork = this.processingWork && processing.demo === true;
      const workElapsed = demoWork && Number.isFinite(processing.elapsed) ? Math.max(0, processing.elapsed) : 0;
      const workDuration = demoWork && Number.isFinite(processing.duration) ? processing.duration : 36;
      this.processingOverlayFade = demoWork
        ? smoothSeam(workElapsed / .5) * smoothSeam((workDuration + .5 - workElapsed) / .5) : 1;
      // Demo travel remains twelve-second periodic. Keep its full strength
      // through the phrase, fading only at the seam; real files follow time.
      const loopFade = this.processingWork ? this.processingOverlayFade : audioLoaded ? 1 : mode === 'active' ? frontFade
        : playback ? mix(originalFade, frontFade, masterAmount) : originalFade;
      let illumination = loopFade * (activity * (.60 + .23 * level + .17 * accent) + .52 * activation);
      if (mode === 'active') {
        illumination = loopFade * (this.energy * (.72 + .68 * this.response + .28 * bass)
          + .70 * activation);
      }
      if (flash > 0) illumination += loopFade * .24 * flash;
      this.frontStrength = mode === 'active' ? illumination : 0;
      this.masterPlayedGlow = playback ? masterAmount * loopFade
        * (.62 + .52 * this.response + .30 * bass + .18 * flash) : 0;
      this.ribbonStrength = mode === 'idle' || !playing || level < .00001 ? 0
        : loopFade * (playback ? 1 : .70 * this.energy);
      const customAnalysis = mode === 'active' && typeof this.analysisRenderer === 'function';
      this.analysisRendererActive = customAnalysis && (this.reducedMotion ? this.energy : loopFade * this.energy) > .00001;
      this.sonicAnalysisActive = !customAnalysis && mode === 'active' && loopFade * this.energy > .00001
        && typeof root.MastrifySonicAnalysis?.draw === 'function';
      const c = this.ctx, w = this.width, h = this.height;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, this.canvas.width, this.canvas.height);
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.save();
      try {
        c.globalAlpha = 1;
        c.globalCompositeOperation = 'source-over';
        c.lineCap = 'butt';
        c.lineJoin = 'round';
        c.shadowBlur = 0; c.shadowOffsetX = c.shadowOffsetY = 0;
        const g = this.prepareGeometry(), colors = this.colorCache;
        const contourField=!!root.MastrifyContourField;
        const scanX = g.pad + g.usable * this.readheadU;
        const original = playback && masterAmount === 0, idle = mode === 'idle';
        const gloss = playback ? mix(.38, 1, masterAmount) : mode === 'active' ? .8 : .2;
        this.waveformScale = g.scale;
        if (customAnalysis) {
          // Keep the exact decoded waveform, material, scale and reflection.
          // Focus Lens replaces only the old processing ribbons/scan overlay.
          this.drawWaveBody(c, g, colors, mode, masterAmount, gloss, playback, original, idle);
          const frame = this.analysisRendererFrame;
          frame.w = w; frame.h = h; frame.bars = g.bars;
          frame.middle = g.middle; frame.scale = g.scale;
          frame.pad = g.pad; frame.usable = g.usable;
          frame.t = Number.isFinite(processing?.elapsed) ? Math.max(0, processing.elapsed) : safeTime;
          frame.p = this.readheadU;
          frame.amount = this.reducedMotion ? this.energy : loopFade * this.energy;
          frame.reducedMotion = this.reducedMotion;
          frame.hasSource = this.hasWaveform;
          c.save();
          try { c.globalAlpha = 1; this.analysisRenderer(c, frame); }
          finally { c.restore(); }
          return;
        }
        let analysisInk = null, analysisStart = 0, analysisSpan = 0;
        if (mode === 'active' && this.frontStrength > .00001) {
          const wake = Math.max(22, g.usable * .19) * (1 + .12 * width);
          const ahead = Math.max(4, g.usable * .023);
          analysisStart = scanX - wake;
          analysisSpan = wake + ahead;
          const crest = wake / analysisSpan;
          analysisInk = c.createLinearGradient(analysisStart, 0, scanX + ahead, 0);
          analysisInk.addColorStop(0, 'rgba(104,138,225,0)');
          analysisInk.addColorStop(crest * .30, 'rgba(131,164,241,.20)');
          analysisInk.addColorStop(crest * .67, 'rgba(167,209,255,.74)');
          analysisInk.addColorStop(crest, 'rgba(220,242,255,1)');
          analysisInk.addColorStop(1, 'rgba(126,191,252,0)');
          c.save();
          c.beginPath(); c.rect(analysisStart, 0, analysisSpan, h); c.clip();
          c.globalCompositeOperation = 'lighter';
          c.strokeStyle = analysisInk; c.lineWidth = .55;
          // Mid-band energy opens the local measuring field; bass and air
          // separately expose its lower and upper sample caps below.
          c.globalAlpha = clamp(this.frontStrength * (.20 + .16 * mid));
          c.stroke(g.analysisGrid);
          c.restore();
        }

        // Analyze's Focus Lens returns before this point and does not use
        // the blurred playback silhouette. Build it only on its first draw.
        // The breath lives in the outer contour only. The body itself keeps
        // its steady light, so nothing washes over the signal.
        // provNoPulse sätts bara av mätläget ?prov=spel.
        this.bodyPulse = playback && playing && !this.reducedMotion && !this.provNoPulse
          ? clamp(loopFade * (.05 + .42 * this.response)) : 0;
        if ((!contourField && (mode === 'active' || (playback && masterAmount > 0)
            || (original && illumination > .00001)
            || (this.masterPlayedGlow > .00001 && this.readheadU > 0)))) this.prepareEmission(g);

        if (!contourField && (mode === 'active' || (playback && masterAmount > 0))) {
          c.save(); c.globalCompositeOperation = 'lighter';
          c.globalAlpha = playback
            ? mix(.28 * illumination + .12 * this.response * loopFade, .38 + .13 * this.response, masterAmount)
            : .11 + .05 * this.response * (demoWork ? this.processingOverlayFade : 1);
          c.drawImage(root.MastrifyCanvas?.imageSource(g.emission) || g.emission, 0, 0, w, h); c.restore();
        } else if (!contourField && original && illumination > .00001) {
          // Original gets a restrained musical breath from the same cached
          // silhouette, well below the stronger continuous master material.
          c.save(); c.globalCompositeOperation = 'lighter';
          c.globalAlpha = .28 * illumination + .12 * this.response * loopFade;
          c.drawImage(root.MastrifyCanvas?.imageSource(g.emission) || g.emission, 0, 0, w, h); c.restore();
        }

        if (!contourField && this.masterPlayedGlow > .00001 && this.readheadU > 0) {
          // Reuse the decoded silhouette's cached light on the played side.
          // The boundary is the actual transport head, never a second clock.
          c.save();
          c.beginPath(); c.rect(0, 0, scanX, h); c.clip();
          c.globalCompositeOperation = 'lighter';
          c.globalAlpha = clamp(this.masterPlayedGlow);
          c.drawImage(root.MastrifyCanvas?.imageSource(g.emission) || g.emission, 0, 0, w, h);
          c.strokeStyle = colors.charged;
          c.lineWidth = g.strokeWidth;
          c.globalAlpha = clamp(this.masterPlayedGlow * .24);
          c.stroke(g.barsPath);
          c.restore();
        }

        this.drawWaveBody(c, g, colors, mode, masterAmount, gloss, playback, original, idle);

        if (this.bodyPulse > .00001) {
          // The body breathes softly; the outer contour carries the stronger
          // light, so the whole shape reads as one lit edge moving with the
          // song. Three passes on the cached top and bottom paths, no redraw.
          const edge = clamp(this.bodyPulse * 1.5);
          const pulseEdges = WAVE_VARIANT.body && root.MastrifyWaveBodies ? root.MastrifyWaveBodies.edges(WAVE_VARIANT.body, g) : null;
          const pulseTop = pulseEdges ? pulseEdges.top : g.topPath, pulseBottom = pulseEdges ? pulseEdges.bottom : g.bottomPath;
          c.save();
          c.globalCompositeOperation = 'lighter';
          c.lineJoin = 'round'; c.lineCap = 'round';
          c.strokeStyle = colors.ribbonViolet;
          c.lineWidth = 1.4 + 6.8 * edge; c.globalAlpha = edge * .11;
          c.stroke(pulseTop); c.stroke(pulseBottom);
          c.lineWidth = .9 + 2.5 * edge; c.globalAlpha = edge * .31;
          c.stroke(pulseTop); c.stroke(pulseBottom);
          c.strokeStyle = colors.ribbonBlue;
          c.lineWidth = .85; c.globalAlpha = edge * .44;
          c.stroke(pulseTop); c.stroke(pulseBottom);
          c.restore();
        }

        if (illumination > .00001 && !contourField) {
          const processing = mode === 'active';
          const wake = Math.max(22, g.usable * (playback ? mix(.078, .135, masterAmount) : processing ? .19 : .12))
            * (1 + .12 * width);
          const ahead = Math.max(4, g.usable * (processing ? .023 : .011));
          const headStop = wake / (wake + ahead);
          const light = c.createLinearGradient(scanX - wake, 0, scanX + ahead, 0);
          light.addColorStop(0, 'rgba(126,48,211,0)');
          if (processing) {
            light.addColorStop(headStop * .24, 'rgba(134,58,244,.16)');
            light.addColorStop(headStop * .52, 'rgba(169,89,255,.76)');
            light.addColorStop(headStop * .78, 'rgba(77,119,255,.96)');
            light.addColorStop(headStop - .045, 'rgba(79,180,255,1)');
            light.addColorStop(headStop, 'rgba(129,213,255,1)');
          } else {
            light.addColorStop(.22, 'rgba(126,48,211,.08)');
            light.addColorStop(.56, 'rgba(195,149,250,.35)');
            light.addColorStop(headStop - .10, 'rgba(236,237,255,.72)');
            light.addColorStop(headStop, 'rgba(252,246,255,1)');
          }
          light.addColorStop(1, 'rgba(67,140,244,0)');
          c.save();
          // Both gradient endpoints are transparent. Cull the rest of the
          // waveform from these repeated light passes without changing ink.
          // Round outward and retain a physical-pixel guard for antialiasing.
          const lightLeft = (Math.floor((scanX - wake) * this.dpr) - 1) / this.dpr;
          const lightRight = (Math.ceil((scanX + ahead) * this.dpr) + 1) / this.dpr;
          c.beginPath(); c.rect(lightLeft, 0, lightRight - lightLeft, h); c.clip();
          c.globalCompositeOperation = 'lighter';
          c.fillStyle = light; c.globalAlpha = clamp(illumination * (processing ? .055 + .05 * mid : .075 + .09 * mid));
          c.fill(g.bodyPath);
          c.strokeStyle = light; c.lineWidth = g.strokeWidth * (playback ? mix(2.1, 4.1, masterAmount) : processing ? 2.25 : 3.3);
          c.globalAlpha = clamp(illumination * (processing ? .10 + .10 * bass : .14 + .16 * bass)); c.stroke(g.barsPath);
          c.lineWidth = g.strokeWidth;
          if (processing) c.globalCompositeOperation = 'source-over';
          c.globalAlpha = clamp(illumination * (processing ? .74 + .20 * mid : .66 + .28 * mid)); c.stroke(g.barsPath);
          c.globalCompositeOperation = 'lighter';

          // Bass gives the lower edge weight, air catches the upper silver edge.
          // Stereo width spreads only the light; the waveform remains exact.
          c.lineWidth = playback ? mix(2.1, 4.4, masterAmount) : 3.2;
          c.globalAlpha = clamp(illumination * ((processing ? .14 : .065) + .075 * air + .04 * left)); c.stroke(g.topPath);
          c.globalAlpha = clamp(illumination * ((processing ? .16 : .075) + .10 * bass + .04 * right)); c.stroke(g.bottomPath);
          c.lineWidth = .65;
          c.globalAlpha = clamp(illumination * (.48 + .32 * air)); c.stroke(g.topPath);
          c.globalAlpha = clamp(illumination * (.40 + .30 * bass)); c.stroke(g.bottomPath);
          c.save();
          c.translate(0, h * .975); c.scale(1, -.13);
          c.lineWidth = g.strokeWidth;
          c.globalAlpha = clamp(illumination * (playback ? mix(.035, .085, masterAmount) : .085)); c.stroke(g.barsPath);
          c.restore();
          c.restore();
        }

        if (analysisInk) {
          c.save();
          c.beginPath(); c.rect(analysisStart, 0, analysisSpan, h); c.clip();
          c.globalCompositeOperation = 'lighter';
          c.strokeStyle = analysisInk; c.lineWidth = .85;
          c.globalAlpha = clamp(this.frontStrength * (.35 + .49 * air));
          c.stroke(g.topMeasurements);
          c.globalAlpha = clamp(this.frontStrength * (.33 + .51 * bass));
          c.stroke(g.bottomMeasurements);
          // Three moving light probes visualize source bands, without labels
          // or invented readings. Their rails use the existing amplitude grid.
          const workPhase = this.processingWork && Number.isFinite(processing.elapsed)
            ? processing.elapsed / LOOP_SECONDS * TAU : theta;
          const liftedInk = c.createLinearGradient(analysisStart, 0, analysisStart + analysisSpan, 0);
          liftedInk.addColorStop(0, 'rgba(146,96,250,0)');
          liftedInk.addColorStop(.24, 'rgba(179,127,255,.38)');
          liftedInk.addColorStop(.58, 'rgba(183,160,255,.96)');
          liftedInk.addColorStop(.86, 'rgba(102,196,255,1)');
          liftedInk.addColorStop(1, 'rgba(102,196,255,0)');
          c.strokeStyle = liftedInk;
          for (let side = 0; side < 2; side++) {
            const band = side === 0 ? air : bass, direction = side === 0 ? -1 : 1;
            const settling = .5 + .5 * Math.sin(workPhase + side * .55);
            const lift = h * (.035 + .035 * band + .009 * settling);
            // This lifted measuring copy connects exact sampled endpoints;
            // only the annotation rises. Its fixed cached lattice continues
            // through the fading window instead of snapping by four samples
            // whenever the readhead crosses an index boundary.
            const trace = side === 0 ? g.analysisTopTrace : g.analysisBottomTrace;
            c.save(); c.translate(0, direction * lift);
            c.lineWidth = 3.1;
            c.globalAlpha = clamp(this.frontStrength * .14); c.stroke(trace);
            c.lineWidth = 1.15;
            c.globalAlpha = clamp(this.frontStrength * (.57 + .35 * band)); c.stroke(trace);
            c.restore();
            c.beginPath();
            for (let index = 0; index < g.bars.length; index += 8) {
              const sample = g.bars[index], endpoint = side === 0 ? sample.top : sample.bottom;
              if (sample.silent || sample.x < analysisStart - 4 || sample.x > analysisStart + analysisSpan + 4) continue;
              const y = endpoint + direction * lift;
              c.moveTo(sample.x, endpoint); c.lineTo(sample.x, y);
              c.moveTo(sample.x - 2.4, y); c.lineTo(sample.x + 2.4, y);
              c.moveTo(sample.x + 1.1, y); c.arc(sample.x, y, 1.1, 0, TAU);
            }
            c.lineWidth = .72;
            c.globalAlpha = clamp(this.frontStrength * (.38 + .25 * band)); c.stroke();
          }
          for (let band = 0; band < 3; band++) {
            const signal = band === 0 ? air : band === 1 ? mid : bass;
            // One shared slow travel gives the three band probes weight;
            // their measured lengths still respond independently to the music.
            const travel = .5 + .5 * Math.sin(workPhase + band * .55);
            const x = analysisStart + analysisSpan * (.14 + .72 * travel);
            const y = g.middle + (band - 1) * g.scale * .75;
            const rail = Math.min(42, g.usable * .052), start = x - rail / 2;
            c.strokeStyle = PROBE_COLORS[band]; c.lineWidth = .65;
            c.globalAlpha = clamp(this.frontStrength * .18);
            c.beginPath(); c.moveTo(start, y); c.lineTo(start + rail, y); c.stroke();
            c.lineWidth = 1.25;
            c.globalAlpha = clamp(this.frontStrength * (.40 + .50 * signal));
            c.beginPath(); c.moveTo(start, y); c.lineTo(start + rail * signal, y);
            c.moveTo(start + rail * signal, y - 2.2); c.lineTo(start + rail * signal, y + 2.2); c.stroke();
          }
          c.restore();
        }

        if (this.ribbonStrength > .00001) {
          // Flowing light sits above the immutable waveform. The raw peaks
          // are never rescaled; source energy only animates these three ribbons.
          // Keep the logo's three-line signature in every visible mode.
          c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
          const headLight=contourField?root.MastrifyContourField.beginHeadLight?.(g,this.readheadU):null;
          // Strängarnas ljus vid huvudet ritas på den lilla ytan under huvudet,
          // men varje streck byggdes förut över hela vågformens bredd och
          // klipptes sedan. Nu tas bara punkterna nära ytan med: från sista
          // punkten mer än åtta bildpunkter till vänster om den till första
          // punkten lika långt till höger. Det bredaste strecket är 9,1 brett,
          // så ändarnas runda lock och allt som föll bort ligger utanför ytan;
          // varje bit som syns är samma streck som förut.
          let lightFrom = 0, lightTo = g.ribbonPoints.length - 1;
          if (headLight && root.MastrifyTrim !== false && g.headCanvas) {
            const width = g.headCanvas.width / g.dpr;
            const left = g.pad + g.usable * Math.max(0, Math.min(1, Number(this.readheadU) || 0)) - width * .5;
            const points = g.ribbonPoints, reach = 8;
            while (lightFrom < points.length - 1 && points[lightFrom + 1].x < left - reach) lightFrom++;
            while (lightTo > lightFrom && points[lightTo - 1].x > left + width + reach) lightTo--;
          }
          // Linus 19 sep: strängarna flyter i sitt eget mönster och musiken
          // styr inte längre rörelsen, varken svajet eller böjningen vid
          // spelhuvudet. Musiken syns bara i glöden vid spelhuvudet. Svajet är
          // lika stort vid lyssning som under analys och mastring.
          const swayAmp = .34;
          for (let ribbon = 0; ribbon < 3; ribbon++) {
            const bandEnergy = this.ribbonBands[ribbon];
            // Three standing modes with fixed nodes, every one periodic over
            // twelve seconds. They breathe in place; nothing races in from an end.
            const phase = theta + ribbon*2.1;
            const swayA = this.reducedMotion ? 0 : swayAmp*.58*Math.sin(phase);
            const swayB = this.reducedMotion ? 0 : swayAmp*.28*Math.sin(2*phase+1.1);
            const swayC = this.reducedMotion ? 0 : swayAmp*.16*Math.sin(3*phase+2.3);
            // Den låga strängen är nära dubbelt så bred som de två andra,
            // som är exakt lika breda. Linus 18 sep: djupförsöket gjorde det
            // fattigt, men storleksskillnaden ska vara kvar.
            const lineWeight = ribbon === 0 ? 1.95 : 1;
            const tubeWidth = 2.1 * lineWeight;
            // The low tube carries the most weight, so it moves ten percent
            // less than the other two. Its static bow and spacing are untouched.
            const motionGain = ribbon === 0 ? .9 : 1;
            const inset = tubeWidth * .5 + 1;
            const bandGlow = this.ribbonStrength * bandEnergy;
            c.beginPath(); headLight?.beginPath();
            for (let point = 0; point < g.ribbonPoints.length; point++) {
              const sample = g.ribbonPoints[point];
              const bow = ribbon === 0 ? .14*sample.arch+.05*sample.counter
                : ribbon === 1 ? -.12*sample.arch-.04*sample.counter : .10*sample.arch-.12*sample.counter;
              const lift = bow + (ribbon-1)*.055 + motionGain*(swayA*sample.sway1 + swayB*sample.arch + swayC*sample.sway3);
              let offset = g.scale * sample.edge * sample.signal * lift;
              // Ease against the printed edge instead of crossing it. Linear
              // below 60% of the available room, then a smooth approach that
              // never reaches the boundary. Order between tubes is preserved.
              const room = (offset < 0 ? sample.roomUp : sample.roomDown) - inset;
              const reach = offset < 0 ? -offset : offset;
              if (room <= 0) offset = 0;
              else if (reach > room*.6) {
                const over = (reach/room - .6)/.4;
                offset = (offset < 0 ? -room : room) * (.6 + .4*over/(1+over));
              }
              const y = g.middle + offset;
              if (point === 0) c.moveTo(sample.x,y); else c.lineTo(sample.x,y);
              if (headLight && point >= lightFrom && point <= lightTo) {
                if (point === lightFrom) headLight.moveTo(sample.x,y); else headLight.lineTo(sample.x,y);
              }
            }
            const hue = ribbon === 0 ? '#b477fa' : ribbon === 1 ? '#b8aeff' : '#84bdff';
            // Neon has a solid rounded body and a thin reflective core. Only
            // the restrained outer light is translucent; no live blur filter.
            // Linus 19 sep: glöden ska synas i hela strängen, inte bara vid
            // spelhuvudet. Samma värden som när strängarna först följde
            // banden (088cf2b): varje sträng lyser upp med sitt eget band.
            c.globalCompositeOperation = 'lighter'; c.strokeStyle = hue;
            c.lineWidth = tubeWidth + 5; c.globalAlpha = bandGlow*.035; c.stroke();
            c.globalCompositeOperation = 'source-over'; c.strokeStyle = '#171027';
            c.lineWidth = tubeWidth+.7; c.globalAlpha = this.ribbonStrength*.52; c.stroke();
            c.strokeStyle = ribbon === 0 ? colors.ribbonViolet : colors.ribbonBlue;
            c.lineWidth = tubeWidth; c.globalAlpha = this.ribbonStrength*(.36+.6*bandEnergy); c.stroke();
            c.strokeStyle = ribbon === 2 ? '#ecf5ff' : '#fff0ff';
            c.lineWidth = .58*lineWeight; c.globalAlpha = this.ribbonStrength*(.14+.42*bandEnergy); c.stroke();
            if (headLight) {
              headLight.strokeStyle = hue; headLight.globalCompositeOperation = 'lighter';
              headLight.lineWidth = tubeWidth+5; headLight.globalAlpha = bandGlow*.14; headLight.stroke();
              headLight.lineWidth = tubeWidth+1; headLight.globalAlpha = bandGlow*.38; headLight.stroke();
              headLight.strokeStyle = ribbon === 2 ? '#e6f4ff' : '#f5e4ff';
              headLight.lineWidth = .85*lineWeight; headLight.globalAlpha = bandGlow*.72; headLight.stroke();
            }
          }
          if(headLight)root.MastrifyContourField.endHeadLight(c,g);
          c.restore();
        }

        if (mode === 'active' && root.MastrifySonicAnalysis) {
          const originalSource = transport?.sources?.original;
          const frame = this.sonicAnalysisFrame;
          frame.phase = theta;
          frame.amount = loopFade * this.energy;
          frame.readheadU = this.readheadU;
          frame.score = cue;
          frame.processingState = processing;
          frame.hasSource = !!originalSource?.loaded;
          frame.sourceDuration = Number(originalSource?.duration) || 0;
          frame.sourceTime = Number.isFinite(cue.sourceTime) ? cue.sourceTime
            : Number.isFinite(processing?.sourceTime) ? processing.sourceTime
              : this.readheadU * frame.sourceDuration;
          frame.peakRate = Number(originalSource?.peakRate) || 0;
          c.save(); c.globalAlpha = 1;
          root.MastrifySonicAnalysis.draw(c, g, frame);
          c.restore();
        }

        // Playback gets one precise cursor. Only the processing presentation
        // uses a wider analysis beam and its secondary fine rail.
        if (!idle && loopFade > .000001) {
          const cursor = c.createLinearGradient(0, h * .075, 0, h * .85);
          cursor.addColorStop(0, 'rgba(195,149,250,0)');
          cursor.addColorStop(.16, 'rgba(195,149,250,.42)');
          cursor.addColorStop(.48, 'rgba(252,246,255,1)');
          cursor.addColorStop(.80, 'rgba(183,214,255,.42)');
          cursor.addColorStop(1, 'rgba(67,140,244,0)');
          c.save();
          c.globalCompositeOperation = 'lighter'; c.fillStyle = cursor;
          if (mode === 'active' && !contourField) {
            c.globalAlpha = clamp(loopFade * (.055 * this.energy + .13 * illumination));
            c.fillRect(scanX - 8, h * .075, 16, h * .775);
            c.globalAlpha = clamp(loopFade * (.10 * this.energy + .20 * illumination));
            c.fillRect(scanX - 3.8, h * .075, 7.6, h * .775);
            c.globalAlpha = clamp(loopFade * (.16 * this.energy + .24 * illumination));
            c.fillRect(scanX - 8.3, h * .075, .65, h * .775);
          } else if (masterAmount > 0 && !contourField) {
            c.globalAlpha = clamp(loopFade * .065 * illumination * masterAmount);
            c.fillRect(scanX - 1.8, h * .075, 3.6, h * .775);
          }
          const cursorBase = mode === 'active' ? .54 * this.energy : mix(.38, .64, masterAmount);
          c.globalAlpha = clamp(loopFade * (cursorBase + .43 * illumination))
            * (contourField && (mode === 'active' || this.response > 0) ? .24 : 1);
          c.fillRect(scanX - .45, h * .075, .9, h * .775);
          c.restore();
        }
      } finally { c.restore(); }
    }

    getStatus() {
      return { presentationMode: this.presentationMode, source: this.source,
        readheadSource: this.processingWork ? 'processing-progress' : this.source === 'audio' ? 'audio-current-time' : 'demo-phase',
        processingWork: !!this.processingWork, ribbonStrength: this.ribbonStrength || 0,
        processingOverlayFade: this.processingOverlayFade ?? 1,
        sonicAnalysisActive: !!this.sonicAnalysisActive,
        analysisRendererActive: !!this.analysisRendererActive,
        sonicAnalysis: this.sonicAnalysisActive ? root.MastrifySonicAnalysis?.getStatus() : { active: false },
        frontStrength: this.frontStrength || 0, masterPlayedGlow: this.masterPlayedGlow || 0,
        bodyPulse: this.bodyPulse || 0,
        readheadU: this.readheadU, response: this.response, outputGain: this.outputGain,
        waveformScale: this.waveformScale || 0, waveformRevision: this.waveformRevision,
        geometryRevision: this.geometryRevision, hasWaveform: this.hasWaveform };
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      this.releaseDensity?.();
      if (this.resizeObserver) this.resizeObserver.disconnect();
      else root.removeEventListener('resize', this.onResize);
      this.geometryCache = null; this.colorCache = null; this.waveMaterials.clear();
      this.analysisRenderer = null; this.analysisRendererFrame = null;
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  MastrifyTrack.LOOP_SECONDS = LOOP_SECONDS;
  root.MastrifyTrack = MastrifyTrack;
})(window);
