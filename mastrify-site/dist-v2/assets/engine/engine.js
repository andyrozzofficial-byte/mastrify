/* Mastrify Neural Engine. No libraries, network requests, or build step.
 * Steady motion uses one 12-second phase; activation adds a one-shot accent.
 * Circular light fields are reconstructed per frame, never accumulated.
 */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const LOOP_SECONDS = 12;
  const mix = (a, b, t) => a + (b - a) * t;
  const phaseAt = seconds => TAU * (((seconds % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS) / LOOP_SECONDS;
  const palette = { violet: [156, 79, 255], blue: [56, 135, 255], ice: [185, 210, 255] };
  const rgba = (rgb, opacity) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.max(0, Math.min(1, opacity))})`;
  const smoothstep = t => t * t * (3 - 2 * t);
  const energies = { idle: 0, original: .62, active: 1, master: 1 };
  // Skivans upplösning (Linus 20 sep: 15 % skarpare, den var nästan pixlig på
  // mobilen när man zoomar). Grunden är MastrifyCanvas.pixelRatio (skärmens
  // täthet, högst 2). Är skärmen tätare än så, som en telefon med täthet 3,
  // ritas skivan 15 % tätare än grunden (2,3). På en dator med täthet 2 eller
  // 1 är den som förut. Vågen och resten av sidan är orörda.
  const discPixelRatio = () => {
    const base = root.MastrifyCanvas?.pixelRatio || Math.min(root.devicePixelRatio || 1, 2);
    const screen = root.devicePixelRatio || 1;
    return screen > base ? Math.min(screen, base * 1.15) : base;
  };
  const weightsFor = mode => ({ idle: +(mode === 'idle'), original: +(mode === 'original'), active: +(mode === 'active'), master: +(mode === 'master') });
  // Kärnfältet är ett WebGL-pass plus en överföring till duken, och det
  // kostar lika mycket vid 1 % styrka som vid 100 %. Under en lägesövergång
  // ritas annars båda kärnorna, den oaktiva och den aktiva, i samma bildruta,
  // vilket är ungefär halva den rutans kostnad.
  // Tröskeln är uppmätt, inte gissad. Vid 25 % styrka ändrar kärnan som mest
  // 1,3 % av bildpunkterna med högst 26 stegs kanalskillnad. Mellan två
  // vanliga bildrutor i samma övergång ändras 23 till 36 % av bildpunkterna
  // med steg upp till 255, alltså tjugo gånger mer. Den gäller bara under
  // övergången: i vila och i reducerad rörelse ritas allt precis som förut.
  const FAINT_SCAN = .25;
  const playbackRest = Object.freeze({ strength: 0, kick: 0, charge: 0, wave: 0, radius: 112, impact: 0 });
  const rimPasses = [[44, .018], [28, .036], [15, .065], [7, .12], [3, .25], [1.05, .62]];
  const reflectionPasses = [[38, .055], [22, .12], [11, .23], [4.5, .53], [1.6, .98]];
  const reflectionStops = Array.from({ length: 65 }, (_, i) => {
    const f = i / 64, focus = Math.exp(5.5 * (Math.cos(TAU * (f - .5)) - 1));
    return [f, rgba([Math.round(116 + 116 * focus), Math.round(139 + 104 * focus), 255], .035 + .965 * focus)];
  });

  class MastrifyEngine {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = (root.MastrifyCanvas ? root.MastrifyCanvas.context2D(canvas, { alpha: true }) : canvas.getContext('2d', { alpha: true }));
      if (!this.ctx) throw new Error('Canvas 2D is not supported.');
      this.mode = Object.hasOwn(energies, options.mode) ? options.mode : 'idle';
      this.energy = energies[this.mode];
      this.modeBlend = null;
      this.masterAmount = 0;
      this.originalAmount = 0;
      this.transition = null;
      this.ignition = null;
      this.masteringReveal = null;
      this.playbackReveal = null;
      this.transitionVariant = options.transitionVariant || 'energy';
      this.playbackOutro = options.playbackOutro || null;
      this.previewTransition = options.previewTransition === true;
      this.playbackFlash = 0;
      this.time = 0;
      this.lastTime = null;
      this.running = false;
      this.frameId = null;
      this.frameInterval = options.maxFPS > 0 ? 1000 / options.maxFPS : 0;
      this.nextFrameAt = null;
      this.onRender = options.onRender || null;
      this.gpuDisc = null;
      // Optional analysis study replaces only the scanner; LP geometry,
      // materials, glow and the standby-to-active blend stay shared.
      this.analysisRenderer = options.analysisRenderer || null;
      this.reducedMotion = options.reducedMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.logoPaths = [
        new Path2D('M4 32 C10 18 16 38 22 28 S34 16 40 28'),
        new Path2D('M4 36 C12 28 20 40 28 32 S36 24 40 36'),
        new Path2D('M6 30 C14 22 22 34 30 26 S38 18 42 30')
      ];
      this.responseGrooves = new Path2D();
      for (let r = 119; r < 217; r += 2.5) {
        this.responseGrooves.moveTo(r, 0);
        this.responseGrooves.arc(0, 0, r, 0, TAU);
      }
      // Prepare the selected startup material before the first timed frame.
      root.MastrifyTransitionVariants?.portal?.prepare();
      if (this.playbackOutro === 'crystal') root.MastrifyTransitionVariants?.crystal?.prepareOutro();
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
      this.releaseDensity = root.MastrifyCanvas?.observeDensity?.(() => this.resize());
      this.onVisibility = () => { this.lastTime = null; if (document.hidden) this.cancelFrame(); else this.scheduleFrame(); };
      document.addEventListener('visibilitychange', this.onVisibility);
      this.resize();
      if (options.autoplay !== false && !this.reducedMotion) this.play();
    }

    resize(render = true) {
      const rect = this.canvas.getBoundingClientRect();
      if ((!rect.width || !rect.height) && this.width) return;
      const width = rect.width || 800, height = rect.height || width;
      const dpr = discPixelRatio();
      const pixelWidth = Math.max(1, Math.round(width * dpr));
      const pixelHeight = Math.max(1, Math.round(height * dpr));
      if (this.width === width && this.height === height && this.dpr === dpr
          && this.canvas.width === pixelWidth && this.canvas.height === pixelHeight) return;
      this.width = width; this.height = height; this.dpr = dpr;
      // Writing either dimension clears the bitmap and resets the context.
      if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth;
      if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight;
      this.ambientCache = null;
      this.responseGlowCache = new Map();
      this.prepareAmbient();
      // Antalet trådar runt skivan följer scenens fulla storlek och inte
      // skalningen i --lp-scale, så en mindre skiva ser likadan ut, bara mindre.
      const lpScale = parseFloat(root.getComputedStyle?.(this.canvas)?.getPropertyValue?.('--lp-scale')) || 1;
      this.detail = this.width / lpScale < 500 ? 48 : 68;
      root.MastrifyVinyl.setPixelScale?.(dpr * Math.min(width, height) / 900 * .98);
      root.MastrifyVinyl.prepare?.();
      this.prepareAwakening();
      this.responseGrooves = root.MastrifyVinyl.getGrooves?.().grooves || this.responseGrooves;
      this.buildLogoGlow();
      this.buildPlaybackGlow();
      if (root.MastrifyCanvas?.webKit) {
        for (const energy of [0, .62, 1, .5]) this.logoShadows(energy);
      }
      root.MastrifyMasterFinish?.prepare?.();
      // Compile and validate the analysis shader before a user starts a mode
      // transition. The warmup never paints into the visible canvas.
      this.ctx.save();
      const fieldScale=dpr*Math.min(width,height)/900;
      this.ctx.setTransform(fieldScale,0,0,fieldScale,0,0);
      root.MastrifyCoreField.prepare?.(this.ctx);
      this.ctx.restore();
      if (this.gpuDisc?.active) this.gpuDisc.place();
      if (render) this.renderAt(this.time, this.energy);
    }

    prepareAwakening() {
      if (root.MastrifyVinyl.hasGroovePaint?.('awakening-grooves')) return;
      // The surge changes opacity, never this material. Bake at the current
      // relief density before a mode change can enter its first visible frame.
      const target = document.createElement('canvas');
      target.width = target.height = 1;
      const c = root.MastrifyCanvas?.context2D(target, { stableGradients: true }) || target.getContext('2d');
      if (!c) return;
      const light = c.createLinearGradient(-225, 0, 225, 0);
      light.addColorStop(0, '#a778ff'); light.addColorStop(.46, '#e8dcff');
      light.addColorStop(.62, '#dcecff'); light.addColorStop(1, '#6fb7ff');
      c.strokeStyle = light; c.lineWidth = .9;
      root.MastrifyVinyl.drawGrooves(c, 'all', 'awakening-grooves');
    }

    buildLogoGlow() {
      // Cache each curve's own colored bloom at the display's pixel density.
      // The pulse only composites these small images; no live blur is needed.
      const density = Math.max(2, 4.45 * this.dpr * Math.min(this.width, this.height) / 900);
      const size = Math.ceil(68 * density);
      this.logoShadowMixer?.destroy();this.logoShadowMixer=null;
      this.logoShadowCache = new Map();
      this.logoShadowAtlas = null;
      this.logoShadowSteady = new Map();
      this.logoGlow = this.logoPaths.map((path, index) => {
        const source = document.createElement('canvas');
        source.width = source.height = size;
        const s = (root.MastrifyCanvas ? root.MastrifyCanvas.context2D(source, { willReadFrequently: root.MastrifyCanvas.webKit }) : source.getContext('2d'));
        s.setTransform(density, 0, 0, density, 10 * density, 10 * density);
        const color = s.createLinearGradient(3, 18, 42, 33);
        color.addColorStop(0, '#9148f3');
        color.addColorStop(.25, '#bc89fa');
        color.addColorStop(.48, '#f3eaff');
        color.addColorStop(.7, '#b0ceff');
        color.addColorStop(1, '#438cf4');
        s.strokeStyle = color; s.lineCap = 'round';
        s.lineWidth = [2.6, 1.5, 1.5][index]; s.stroke(path);
        const bloom = document.createElement('canvas');
        bloom.width = bloom.height = size;
        const b = (root.MastrifyCanvas ? root.MastrifyCanvas.context2D(bloom, { willReadFrequently: root.MastrifyCanvas.webKit }) : bloom.getContext('2d'));
        b.globalAlpha = .72;
        if (root.MastrifyCanvas && !root.MastrifyCanvas.supportsFilter) {
          b.drawImage(root.MastrifyCanvas.blurredCanvas(source, 2.2 * density), 0, 0);
          b.globalAlpha = .9;
          b.drawImage(root.MastrifyCanvas.blurredCanvas(source, .65 * density), 0, 0);
        } else {
          b.filter = `blur(${2.2 * density}px)`;
          b.drawImage(source, 0, 0);
          b.globalAlpha = .9;
          b.filter = `blur(${.65 * density}px)`;
          b.drawImage(source, 0, 0);
          b.filter = 'none';
        }
        root.MastrifyCanvas?.cacheImage(bloom);
        return bloom;
      });
    }

    logoShadows(energy) {
      if (!root.MastrifyCanvas?.webKit) return null;
      const density = 4.45 * this.dpr * Math.min(this.width, this.height) / 900;
      const size = Math.ceil(68 * density), levels = [0, .25, .5, .62, .75, 1];
      const nativeMask = level => {
        if (this.logoShadowCache.has(level)) return this.logoShadowCache.get(level);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size * 2;
        const brush = canvas.getContext('2d');
        [...this.logoPaths, null].forEach((path, index) => {
          const x = index % 2 * size, y = Math.floor(index / 2) * size;
          brush.save();
          brush.beginPath(); brush.rect(x, y, size, size); brush.clip();
          brush.setTransform(density, 0, 0, density, x + 10 * density, y + 10 * density);
          brush.lineCap = brush.lineJoin = 'round';
          brush.shadowColor = '#fff';
          brush.shadowBlur = (path ? 3 + level * 4 : 8 + level * 6) * this.dpr;
          // The native shadow is retained; its solid source stays outside
          // the cell. No gradient/shadow combination reaches Safari's bug.
          brush.translate(128, 0); brush.shadowOffsetX = -128 * density;
          brush.fillStyle = brush.strokeStyle = '#000';
          if (path) { brush.lineWidth = [2.6, 1.5, 1.5][index]; brush.stroke(path); }
          else { brush.beginPath(); brush.arc(24, 24, 20 / 7, 0, TAU); brush.fill(); }
          brush.restore();
        });
        root.MastrifyCanvas.cacheImage(canvas);
        this.logoShadowCache.set(level, canvas);
        return canvas;
      };
      if (this.logoShadowSteady.has(energy)) return this.logoShadowSteady.get(energy);
      if (this.logoShadowAtlas?.energy === energy) return this.logoShadowAtlas;
      // Warm the six blur levels together before any mode transition.
      if (this.logoShadowCache.size === 0) {
        levels.forEach(nativeMask);
        this.logoShadowMixer=root.MastrifyShadowMixer?.create(size*2)||null;
        // Upload all immutable masks before the first user-triggered blend.
        if(this.logoShadowMixer)for(const level of levels)this.logoShadowMixer.render(nativeMask(level),nativeMask(level),0,[139,103,255]);
      }
      let low = levels[0], high = levels.at(-1);
      for (const level of levels) { if (level <= energy) low = level; if (level >= energy) { high = level; break; } }
      // Interpolate premultiplied alpha masks on ONE reusable atlas. Source-over
      // crossfades would dim overlapping shadows; additive weights sum to one.
      const steady = [0, .62, 1].includes(energy);
      const blend = high === low ? 0 : (energy - low) / (high - low);
      const tint=[Math.round(mix(117,139,energy)),Math.round(mix(83,103,energy)),Math.round(mix(218,255,energy))];
      if(!steady&&this.logoShadowMixer?.render(nativeMask(low),nativeMask(high),blend,tint))
        return {energy,canvas:this.logoShadowMixer.canvas,size,density};
      const canvas = (!steady && this.logoShadowAtlas?.canvas) || document.createElement('canvas');
      if (canvas.width !== size * 2) canvas.width = size * 2;
      if (canvas.height !== size * 2) canvas.height = size * 2;
      const brush = canvas.getContext('2d');
      brush.clearRect(0, 0, canvas.width, canvas.height);
      brush.globalCompositeOperation = 'lighter';
      brush.globalAlpha = 1 - blend;
      brush.drawImage(root.MastrifyCanvas.imageSource(nativeMask(low)), 0, 0);
      if (blend > 0) { brush.globalAlpha = blend; brush.drawImage(root.MastrifyCanvas.imageSource(nativeMask(high)), 0, 0); }
      brush.globalAlpha = 1; brush.globalCompositeOperation = 'source-atop';
      brush.fillStyle = rgba([Math.round(mix(117,139,energy)), Math.round(mix(83,103,energy)), Math.round(mix(218,255,energy))], 1);
      brush.fillRect(0, 0, size * 2, size); brush.fillRect(0, size, size, size);
      brush.fillStyle = '#b4a7ff'; brush.fillRect(size, size, size, size);
      brush.globalCompositeOperation = 'source-over';
      // A mutable atlas is never registered as an immutable decoded image.
      const result = { energy, canvas, size, density };
      if (steady) { this.logoShadowSteady.set(energy, result); root.MastrifyCanvas.cacheImage(canvas); }
      else this.logoShadowAtlas = result;
      return result;
    }

    drawLogoShadow(atlas, index) {
      const { canvas, size, density } = atlas;
      this.ctx.drawImage(root.MastrifyCanvas.imageSource(canvas), index % 2 * size, Math.floor(index / 2) * size,
        size, size, -10, -10, size / density, size / density);
    }

    setMode(mode, immediate = false) {
      if (!Object.hasOwn(energies, mode)) throw new RangeError('Unknown animation mode.');
      const previousMode = this.mode;
      const remainingReveal = this.playbackRevealStrength();
      const remainingFrame = this.playbackRevealFrame();
      const previousReveal = this.playbackReveal;
      const previousWeights = this.modeBlend || weightsFor(this.mode);
      this.mode = mode;
      if (immediate || this.reducedMotion || !this.running || mode === 'idle' || mode === 'active') {
        this.playbackReveal = null;
      } else if (mode === 'master' && previousMode !== 'master') {
        this.playbackReveal = { elapsed: 0, releasing: false };
      } else if (mode === 'original' && previousReveal) {
        this.playbackReveal = { elapsed: 0, releasing: true, from: remainingReveal, fromFrame: remainingFrame,
          variantElapsed: previousReveal?.releasing ? previousReveal.variantElapsed : previousReveal?.elapsed || 0 };
      }
      if (mode !== 'active' || immediate || this.reducedMotion || !this.running) {
        this.ignition = null;
        this.masteringReveal = null;
      } else {
        // Energy 01 accompanies the established 0.82-second ignition.
        // Its light gathers at the physical edge, with no added outro ring.
        this.ignition = { elapsed: 0 };
        this.masteringReveal = { elapsed: 0 };
      }
      const to = energies[mode];
      if (immediate || this.reducedMotion || !this.running) {
        this.energy = to;
        this.transition = null;
        this.modeBlend = null;
        this.renderAt(this.time, this.energy);
      } else {
        this.modeBlend = previousWeights;
        this.transition = { from: this.energy, to, elapsed: 0, duration: mode === 'master' ? 1.90 : mode === 'original' ? 1.35 : 1.2, fromWeights: previousWeights, toWeights: weightsFor(mode) };
      }
    }

    activatePlayback() {
      if (this.mode === 'master' && this.running && !this.reducedMotion) {
        this.playbackReveal = { elapsed: 0, releasing: false };
      }
    }

    play() {
      // A mode change must not restart the clock of an already running scene.
      if (this.running) return;
      this.running = true; this.lastTime = null; this.nextFrameAt = null; this.scheduleFrame();
    }
    pause() { this.running = false; this.lastTime = null; this.nextFrameAt = null; this.cancelFrame(); }
    cancelFrame() { if (this.frameId !== null) cancelAnimationFrame(this.frameId); this.frameId = null; }
    scheduleFrame() { if (this.running && !document.hidden && this.frameId === null) this.frameId = requestAnimationFrame(t => this.tick(t)); }
    tick(timestamp) {
      const frameStarted = root.MastrifyCanvas?.measureFrames ? performance.now() : 0;
      this.frameId = null;
      // A 120 Hz display must not double the expensive scene work. Use the
      // display timestamp (not a timer), keeping transition duration intact.
      if (this.frameInterval && this.lastTime !== null) {
        if (this.nextFrameAt != null && timestamp + .25 < this.nextFrameAt) { this.scheduleFrame(); return; }
        this.nextFrameAt = Math.max((this.nextFrameAt ?? timestamp) + this.frameInterval, timestamp + this.frameInterval * .5);
      } else this.nextFrameAt = timestamp + (this.frameInterval || 0);
      // A display move can change pixel density without changing CSS size.
      if (this.dpr !== discPixelRatio()) this.resize(false);
      const dt = this.lastTime === null ? 0 : Math.min((timestamp - this.lastTime) / 1000, .1);
      this.lastTime = timestamp;
      this.advance(dt);
      this.renderAt(this.time, this.energy);
      if (root.MastrifyCanvas?.measureFrames) root.MastrifyCanvas.recordFrame(timestamp, performance.now() - frameStarted, this.mode,
        { transition: !!(this.transition || this.masteringReveal || this.playbackReveal), core: this.lastCoreMs, wave: this.lastWaveMs });
      this.scheduleFrame();
    }

    advance(dt) {
      this.time = (this.time + dt) % LOOP_SECONDS;
      if (this.mode === 'active') root.MastrifyProcessing?.advance(dt);
      if (this.ignition) {
        this.ignition.elapsed += dt;
        if (this.ignition.elapsed >= .82) this.ignition = null;
      }
      if (this.masteringReveal) {
        this.masteringReveal.elapsed += dt;
        if (this.masteringReveal.elapsed >= 1.9) this.masteringReveal = null;
      }
      if (this.playbackReveal) {
        this.playbackReveal.elapsed += dt;
        if (this.playbackReveal.elapsed >= (this.playbackReveal.releasing ? .7 : 1.90)) this.playbackReveal = null;
      }
      if (this.transition) {
        this.transition.elapsed += dt;
        const f = Math.min(1, this.transition.elapsed / this.transition.duration);
        const waking = this.mode === 'active' && root.MastrifyEffects?.enabled('awakening');
        // Gather briefly, open decisively, then settle without a size bounce.
        const wake = f < .09 ? .035 * smoothstep(f / .09)
          : f < .34 ? .035 + .875 * (1 - (1 - (f - .09) / .25) ** 3)
          : .91 + .09 * smoothstep((f - .34) / .66);
        const opening = f < .10 ? .035 * smoothstep(f / .10)
          : f < .38 ? .035 + .905 * smoothstep((f - .10) / .28)
          : .94 + .06 * smoothstep((f - .38) / .62);
        const blend = waking ? wake : this.mode === 'master' ? opening : smoothstep(f);
        this.energy = mix(this.transition.from, this.transition.to, blend);
        this.modeBlend = Object.fromEntries(Object.keys(energies).map(mode => [mode,
          mix(this.transition.fromWeights[mode], this.transition.toWeights[mode], blend)]));
        if (f === 1) { this.energy = this.transition.to; this.transition = null; this.modeBlend = null; }
      }
    }

    glow(x, y, radius, color, alpha, core = false) {
      const c = this.ctx;
      const g = c.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, rgba(core ? palette.ice : color, alpha));
      g.addColorStop(.12, rgba(color, alpha * .62));
      g.addColorStop(.4, rgba(color, alpha * .18));
      g.addColorStop(1, rgba(color, 0));
      c.fillStyle = g;
      c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    prepareAmbient() {
      if (this.ambientCache) return this.ambientCache;
      const density = this.dpr * Math.min(this.width, this.height) / 900;
      // Independent fields retain source-over painter order. Their only
      // changing term is opacity; no full-disc gradient raster per frame.
      this.ambientCache = [[-80,25,330,palette.violet,.105],[95,-20,320,palette.blue,.1]].map(([x,y,r,color,base])=>{
        const canvas=document.createElement('canvas');
        canvas.width=canvas.height=Math.ceil(r*2*density);
        const brush=canvas.getContext('2d');brush.setTransform(density,0,0,density,r*density,r*density);
        const original=this.ctx;try {this.ctx=brush;this.glow(0,0,r,color,1);} finally {this.ctx=original;}
        root.MastrifyCanvas?.cacheImage(canvas);
        return {canvas,x:x-r,y:y-r,diameter:r*2,base};
      });
      return this.ambientCache;
    }

    drawAmbient(energy) {
      const c=this.ctx,alpha=c.globalAlpha,fields=this.prepareAmbient();
      const paint=target=>{
        for(const field of fields) {
          target.globalAlpha=alpha*(field.base+energy*.07);
          target.drawImage(root.MastrifyCanvas?.imageSource(field.canvas)||field.canvas,field.x,field.y,field.diameter,field.diameter);
        }
        target.globalAlpha=alpha;
      };
      // Bakgrundsljuset är de två första lagren på en nyss tömd duk, och i ett
      // stillastående läge ser de exakt likadana ut varje bildruta. Då ritas
      // de en gång på en egen, lika stor duk med samma inställningar, och den
      // duken läggs sedan in rakt, bildpunkt för bildpunkt. Mot en tom duk
      // blir det exakt samma bildpunkter, men i stället för två skalade bilder
      // per bildruta blir det en rak kopia. Så fort något ändras (storlek,
      // läge, styrka eller bilderna själva) ritas lagren direkt som förut.
      const t=c.getTransform();
      const key=root.MastrifyTrim===false||c.globalCompositeOperation!=='source-over' ? null
        : [this.canvas.width,this.canvas.height,t.a,t.b,t.c,t.d,t.e,t.f,alpha,energy,c.imageSmoothingEnabled,c.imageSmoothingQuality].join(',');
      const sources=fields.map(field=>root.MastrifyCanvas?.imageSource(field.canvas)||field.canvas);
      const same=key!==null&&key===this.ambientKey&&this.ambientFields===fields
        &&sources.every((source,i)=>source===this.ambientSources?.[i]);
      this.ambientKey=key;this.ambientFields=fields;this.ambientSources=sources;
      if(!same){paint(c);return;}
      let cache=this.ambientFrame;
      if(!cache||cache.key!==key){
        const canvas=cache?.canvas||document.createElement('canvas');
        if(canvas.width!==this.canvas.width)canvas.width=this.canvas.width;
        if(canvas.height!==this.canvas.height)canvas.height=this.canvas.height;
        const brush=canvas.getContext('2d');
        brush.setTransform(1,0,0,1,0,0);brush.globalCompositeOperation='source-over';brush.globalAlpha=1;
        brush.imageSmoothingEnabled=c.imageSmoothingEnabled;brush.imageSmoothingQuality=c.imageSmoothingQuality;
        brush.clearRect(0,0,canvas.width,canvas.height);
        brush.setTransform(t);
        paint(brush);
        cache=this.ambientFrame={canvas,key};
      }
      c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;
      c.drawImage(cache.canvas,0,0);
      c.restore();
    }

    renderAt(seconds, modeOrEnergy = this.energy) {
      const renderStarted = performance.now();
      const e = typeof modeOrEnergy === 'string' ? (energies[modeOrEnergy] ?? 0) : Math.max(0, Math.min(1, modeOrEnergy));
      const weights = typeof modeOrEnergy === 'string' ? weightsFor(modeOrEnergy)
        : this.modeBlend || (this.mode === 'original' || this.mode === 'master' ? weightsFor(this.mode)
          : { idle: 1 - e, active: e, original: 0, master: 0 });
      this.masterAmount = weights.master;
      this.originalAmount = weights.original;
      this.playbackFlash = this.playbackRevealStrength();
      const playback = ['original', 'master'].includes(typeof modeOrEnergy === 'string' ? modeOrEnergy : this.mode);
      this.scannerAmount = playback ? 0 : weights.active;
      // Waveform/progress share this clock, but an offscreen LP needs no paint.
      if (this.renderEnabled === false) {
        this.lastCoreMs = 0;
        if (this.onRender) this.onRender(seconds, e);
        return;
      }
      const p = phaseAt(seconds);
      const score = root.MastrifyScore?.sample(p, 'source') || {};
      const depthCue = this.previewTransition ? { amount: 0 }
        : root.MastrifyPlaybackDepth?.sample(p, score) || { amount: 0 };
      const projection = root.MastrifyPlaybackDepth?.project(depthCue.amount, weights.original, weights.master) || { depth: 0, scale: 1 };
      this.depthPulse = depthCue.amount * (weights.original + weights.master);
      this.projectedDepth = projection.depth;
      const c = this.ctx;
      const scale = Math.min(this.width, this.height) / 900;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, this.canvas.width, this.canvas.height);
      c.setTransform(this.dpr * scale, 0, 0, this.dpr * scale, this.canvas.width / 2, this.canvas.height / 2);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      const breath = 1 + (.009 + e * .004) * (1 - weights.original - weights.master) * Math.sin(p);
      c.scale(breath, breath);

      this.drawAmbient(e);
      c.globalCompositeOperation = 'lighter';
      // One shared transform keeps the rim, record, scanner and surrounding light
      // attached during the LP's lift and tilt, in both operating modes.
      c.save();
      this.applyDiscFloat(p, weights.original + weights.master);
      root.MastrifyStandbyMatter?.draw(c, p, 1 - weights.idle);
      // Halv takt för trådarna finns bara för mätläget (?prov=spel) och för
      // att kunna titta på det (?halv=1). Normalt ritas de direkt som förut.
      const filamentsHalf = root.MastrifyFilamentHalfRate === true && this.drawFilamentsHalfRate(p, e);
      if (!filamentsHalf) {
        this.prepareFilaments(p);
        this.drawFilaments(p, 0, false, 1 - .75 * e);
      }
      // In mastering the collar is a rear layer. A cast shadow separates it
      // from the raised vinyl face; the established geometry never changes.
      if (e > 0) {
        if (!filamentsHalf) this.drawFilaments(p, 0, true, (1 - .75 * e) * e);
        this.drawRaisedShadow(e, projection.depth);
        // The collar markings emit their own light. The opaque LP still
        // occludes them, but the cast shadow cannot erase their full circle.
        root.MastrifySpectrum.draw(c, p, e * (1 - .05 * weights.original));
        // The rim of the rear frame remains a complete, fine circle outside
        // the shadowed recess, even where the cast shadow is deepest.
        this.drawOuterBoundary((1 - .55 * e) * e);
      }
      c.globalCompositeOperation = 'source-over';
      c.save();
      // One bounded contraction/kick belongs to the user-triggered reveal.
      // Playback modes share the same bass envelope at distinct, bounded depths.
      const bassPush = smoothstep(Math.max(0, Math.min(1, ((score.bass || 0) - .10) / .90)));
      const revealKick = this.playbackRevealFrame().kick + this.masteringRevealFrame().kick;
      const forwardScale = 1 + Math.max(projection.scale - 1, Math.max(0, revealKick))
        + Math.min(0, revealKick) + weights.active * .0065 * bassPush;
      this.forwardScale = forwardScale;
      c.scale(forwardScale, forwardScale);
      // Med grafikkretsen påslagen ritas skivans ring och spårljuset i en egen
      // duk under den här (gpu-disc.js); här tas ringen bara ut ur bilden.
      const gpu = this.gpuDisc?.ready() ? this.gpuDisc : null;
      const surfaceAmount = weights.active + .32 * weights.master + .16 * weights.original;
      root.MastrifyVinyl.draw(c, p, e, weights.original, !!gpu);
      if (gpu) gpu.render({ transform: c.getTransform(), phase: p, energy: e, original: weights.original, surface: surfaceAmount });
      else root.MastrifyLivingSurface?.draw(c, p, surfaceAmount);
      root.MastrifyMasterFinish?.drawSurface(c, p, weights.master + .45 * weights.original, score);
      root.MastrifyMasterFinish?.drawInnerRim?.(c, p, weights.original, weights.master, score);
      this.drawSurfaceResponse(p, 0, weights.idle, 0);
      const idleScan = playback ? 0 : weights.idle;
      // Standbysvepet släcks i samma ögonblick som ett lägesbyte ut ur vila
      // börjar, i stället för att tona ut med övergången (Linus val efter att
      // ha sett båda sida vid sida). Det tar bort ett helt kärnfältspass ur de
      // tyngsta rutorna. På väg tillbaka in i vila tonar svepet fram som förut.
      const leavingIdle = !!this.transition && this.mode !== 'idle';
      if (!leavingIdle && (!this.transition || idleScan >= FAINT_SCAN)) root.MastrifyCoreField.drawIdle(c, p, idleScan);
      this.drawFilaments(p, 0, true, (1 - .75 * e) * (1 - e));
      this.drawOuterBoundary((1 - .55 * e) * (1 - e));
      this.drawCircularProcessing(p, e * (1 + .20 * weights.original));
      root.MastrifyMasterFinish?.drawRim(c, p, weights.master + .55 * weights.active + .45 * weights.original,
        { ...score, bass: playback ? this.depthPulse : score.bass }, 1 + .24 * weights.master);
      // Samma sak från andra hållet: i början av en övergång är den aktiva
      // kärnan bara någon procent stark men kostar redan fullt.
      const svagSkanner = !!this.transition && this.scannerAmount < FAINT_SCAN;
      if (this.analysisRenderer && this.scannerAmount > 0) {
        if (!svagSkanner) this.analysisRenderer(c, { seconds, phase: p, amount: this.scannerAmount, reducedMotion: this.reducedMotion });
      } else if (!svagSkanner) {
        root.MastrifyCoreField.draw(c, p, this.scannerAmount);
      }
      root.MastrifyNotes.draw(c, p, weights.active + weights.master + .70 * weights.original, weights.original, weights.master);
      this.drawIgnition();
      this.drawMasteringReveal(forwardScale);
      this.drawPlaybackReveal(this.playbackFlash, forwardScale);
      // Mitten täcker allt under sig. Med grafikkretsen ritas den i en egen
      // duk överst, så att den täcker grafikkretsens ring på samma sätt.
      if (gpu) {
        const own = this.ctx;
        this.ctx = gpu.center(c.getTransform());
        try { this.drawProtectedCenter(e, p); } finally { this.ctx = own; }
      } else this.drawProtectedCenter(e, p);
      c.restore();
      c.restore();
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
      this.lastCoreMs = performance.now() - renderStarted;
      if (this.onRender) this.onRender(seconds, e);
    }

    applyDiscFloat(p, playbackWeight = 0) {
      // A gentle six-second lift and settle, shared by standby and mastering.
      // The surface, label, spindle and surrounding light move as one assembly.
      const float = 1 - Math.max(0, Math.min(1, playbackWeight));
      this.ctx.translate(0, -9 * Math.sin(2 * p) * float);
      this.ctx.scale(1, 1 - .004 * (1 - Math.cos(2 * p)) * float);
    }

    drawRaisedShadow(energy, depth = 0) {
      const c = this.ctx;
      c.save();
      c.globalCompositeOperation = 'source-over';
      // Upper-left studio light casts a soft lower-right shadow onto the
      // illuminated collar. The opaque LP covers its center on the next pass.
      const shadow = c.createRadialGradient(5, 23 + depth * .30, 212, 5, 23 + depth * .30, 272 + depth * .16);
      shadow.addColorStop(0, 'rgba(1,2,8,.96)');
      shadow.addColorStop(.24, 'rgba(1,2,8,.90)');
      shadow.addColorStop(.52, 'rgba(1,2,8,.54)');
      shadow.addColorStop(.78, 'rgba(1,2,8,.16)');
      shadow.addColorStop(1, 'rgba(1,2,8,0)');
      c.globalAlpha = energy;
      c.fillStyle = shadow;
      c.fillRect(-278, -250, 566, 582);
      c.restore();
    }

    filamentPoint(u, v, p) {
      // Traveling waves move within the collar. Their envelope vanishes at
      // both edges, so the outside stays a perfect unbroken circle.
      const baseRadius = 249 + 16 * Math.cos(v);
      const across = (baseRadius - 233) / 32;
      const envelope = Math.sin(Math.PI * across);
      const wave = .72 * Math.sin(3 * u - 2 * p + .3 * Math.sin(p))
        + .28 * Math.sin(5 * u + 3 * p + .8);
      const radius = baseRadius + 7.8 * envelope * wave;
      const tilt = -.28 + .035 * Math.sin(p);
      return {
        x: radius * Math.cos(u + tilt),
        y: radius * Math.sin(u + tilt),
        z: 55 * Math.sin(u + .2) + 40 * Math.sin(v)
      };
    }

    prepareFilaments(p) {
      // Geometry is shared by both depth passes. Compute angular waves once
      // per sample instead of repeating their trigonometry for every strand.
      const tilt = -.28 + .035 * Math.sin(p);
      const drift = -2 * p + .3 * Math.sin(p);
      // Bound chord error in physical pixels. Dense, invisible subdivisions
      // increase Safari's stroke work without adding visible collar detail.
      const density=this.dpr*Math.min(this.width,this.height)/900;
      const segments=Math.max(80,Math.ceil(Math.PI*Math.sqrt(460*density/(2*.18))/8)*8);
      const n = this.detail + 24;
      if (!this.filamentGeometry || this.filamentGeometry.segments !== segments || this.filamentGeometry.n !== n) {
        this.filamentGeometry = { segments, n,
          samples: Array.from({ length: segments + 1 }, (_, j) => {
            const u = TAU * j / segments;
            return { u, z: 55 * Math.sin(u + .2), x: 0, y: 0, wave: 0 };
          }), strands: [] };
        for (let k = 4; k < n; k += 4) {
          const v = TAU * k / n, radius = 249 + 16 * Math.cos(v);
          this.filamentGeometry.strands.push({ k, v, radius,
            amplitude: 7.8 * Math.sin(Math.PI * (radius - 233) / 32),
            z: 40 * Math.sin(v), paths: null });
        }
      }
      const { samples, strands } = this.filamentGeometry;
      for (let j = 0; j <= segments; j++) {
        const sample = samples[j], u = sample.u;
        sample.x = Math.cos(u + tilt); sample.y = Math.sin(u + tilt);
        sample.wave = .72 * Math.sin(3 * u + drift) + .28 * Math.sin(5 * u + 3 * p + .8);
      }
      this.filamentPaths = strands;
      for (const strand of strands) {
        const { radius, amplitude, z } = strand;
        const paths = [new Path2D(), new Path2D()];
        let previous = -1;
        for (const sample of samples) {
          const side = sample.z + z >= 0 ? 1 : 0;
          const r = radius + amplitude * sample.wave;
          const x = r * sample.x, y = r * sample.y;
          if (side !== previous) paths[side].moveTo(x, y);
          else paths[side].lineTo(x, y);
          previous = side;
        }
        strand.paths = paths;
      }
    }

    // Trådarna ritas då i ett eget lager lika stort som skivans duk, med samma
    // läge och samma blandning, och lagret läggs på med lighter. Eftersom
    // trådarna bara adderar ljus blir det samma bildpunkter som att rita dem
    // direkt. Varannan bildruta återanvänds lagret från förra bildrutan.
    drawFilamentsHalfRate(p, e) {
      const c = this.ctx, runtime = root.MastrifyCanvas;
      let layer = this.filamentLayer;
      if (!layer || layer.canvas.width !== this.canvas.width || layer.canvas.height !== this.canvas.height) {
        const canvas = layer?.canvas || document.createElement('canvas');
        canvas.width = this.canvas.width; canvas.height = this.canvas.height;
        const brush = runtime?.context2D ? runtime.context2D(canvas, { stableGradients: true }) : canvas.getContext('2d');
        if (!brush) return false;
        layer = this.filamentLayer = { canvas, brush, beat: false, ready: false };
      }
      layer.beat = !layer.beat;
      if (!layer.ready || !layer.beat) {
        const b = layer.brush, t = c.getTransform();
        b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.globalAlpha = 1;
        b.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        b.setTransform(t); b.globalAlpha = c.globalAlpha;
        b.lineCap = c.lineCap; b.lineJoin = c.lineJoin;
        const own = this.ctx;
        try {
          this.ctx = b;
          this.prepareFilaments(p);
          this.drawFilaments(p, 0, false, 1 - .75 * e);
          if (e > 0) this.drawFilaments(p, 0, true, (1 - .75 * e) * e);
        } finally { this.ctx = own; }
        b.globalAlpha = 1;
        layer.ready = true;
      }
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'lighter';
      c.drawImage(layer.canvas, 0, 0);
      c.restore();
      return true;
    }

    drawFilaments(p, e, front, visibility = 1) {
      if (visibility <= 0) return;
      const c = this.ctx;
      c.save();
      c.globalCompositeOperation = 'lighter';
      // Broad reflections travel over the filament material, like light across
      // polished audio hardware. No particles, comet heads or tapering tails.
      const reflectionAngle = p - .5;
      const lightX = Math.cos(reflectionAngle) * 300;
      const lightY = Math.sin(reflectionAngle) * 300;
      const sheen = c.createLinearGradient(-lightX, -lightY, lightX, lightY);
      sheen.addColorStop(0, 'rgba(172,112,249,.04)');
      sheen.addColorStop(.12, 'rgba(176,127,255,.10)');
      sheen.addColorStop(.29, 'rgba(216,191,255,.78)');
      sheen.addColorStop(.46, 'rgba(158,159,242,.12)');
      sheen.addColorStop(.57, 'rgba(137,174,255,.10)');
      sheen.addColorStop(.77, 'rgba(171,209,255,.65)');
      sheen.addColorStop(1, 'rgba(111,159,245,.05)');
      for (const {k, v, paths} of this.filamentPaths) {
        const amount = 1;
        const gradient = c.createLinearGradient(-280, 40, 280, -40);
        const depth = .5 + .5 * Math.cos(v);
        const breathing = .88 + .12 * Math.sin(2 * p + v);
        const alpha = (.10 + depth * .17 + e * .12) * breathing * amount * (front ? 1 : .64) * visibility;
        gradient.addColorStop(0, rgba([164, 67, 255], alpha * 1.3));
        gradient.addColorStop(.3, rgba([152, 101, 255], alpha));
        gradient.addColorStop(.65, rgba([98, 109, 255], alpha * .9));
        gradient.addColorStop(1, rgba([65, 162, 255], alpha * 1.5));
        c.strokeStyle = gradient;
        c.lineWidth = k % 8 === 0 ? .9 : .55;
        const path = paths[front ? 1 : 0];
        c.stroke(path);
        const sheenAlpha = amount * (.2 + depth * .4) * (front ? 1 : .5) * visibility * (1 - this.originalAmount);
        if (sheenAlpha > 0) {
          c.strokeStyle = sheen;
          c.globalAlpha = sheenAlpha;
          c.lineWidth = k % 8 === 0 ? .95 : .65;
          c.stroke(path);
          c.globalAlpha = 1;
        }
      }
      c.restore();
    }

    drawOuterBoundary(visibility) {
      if (visibility <= 0) return;
      const c = this.ctx;
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = visibility;
      const edge = c.createLinearGradient(-265, 50, 265, -50);
      edge.addColorStop(0, 'rgba(168,106,255,.45)');
      edge.addColorStop(.5, 'rgba(139,137,227,.28)');
      edge.addColorStop(1, 'rgba(89,172,255,.48)');
      c.strokeStyle = edge;
      c.lineWidth = .85;
      c.beginPath();
      c.arc(0, 0, 265, 0, TAU);
      c.stroke();
      c.restore();
    }

    drawResponseGlow(x,y,color,alpha) {
      const density=this.dpr*Math.min(this.width,this.height)/900;
      const key=color.join(',');
      if(!this.responseGlowCache.has(key)) {
        const canvas=document.createElement('canvas');
        canvas.width=canvas.height=Math.ceil(306*density);
        const brush=canvas.getContext('2d');
        brush.setTransform(density,0,0,density,153*density,153*density);
        const original=this.ctx;
        try { this.ctx=brush; this.glow(0,0,153,color,1); }
        finally { this.ctx=original; }
        root.MastrifyCanvas?.cacheImage(canvas);
        this.responseGlowCache.set(key,canvas);
      }
      const canvas=this.responseGlowCache.get(key),c=this.ctx;
      c.save(); c.globalAlpha*=alpha;
      c.drawImage(root.MastrifyCanvas?.imageSource(canvas)||canvas,x-153,y-153,canvas.width/density,canvas.height/density);
      c.restore();
    }

    drawSurfaceResponse(p, e, visibility = 1, active = 1) {
      if (visibility <= 0) return;
      const c = this.ctx;
      c.save();
      c.globalAlpha = visibility;
      c.beginPath(); c.arc(0, 0, 223, 0, TAU); c.clip();
      c.globalCompositeOperation = 'lighter';
      // Light touches the vinyl, revealing the existing cut instead of hiding it.
      const grooveLights=[];
      for (let pass = 0; pass < 3; pass++) {
        const amount = pass === 0 ? .5 + .5 * e : .12 + .88 * e;
        const a = root.MastrifyVinyl.rotationAt(p, active) - Math.PI * .5 + pass * TAU / 3;
        const x = Math.cos(a) * 165, y = Math.sin(a) * 165;
        const color = pass % 2 ? palette.violet : palette.blue;
        if(e===0) this.drawResponseGlow(x,y,color,amount*.13);
        else this.glow(x, y, 153 + e * 30, color, amount * (.13 + e * .16));
        const light = c.createRadialGradient(x, y, 0, x, y, 150);
        light.addColorStop(0, rgba([160, 180, 255], amount * (.25 + e * .31)));
        light.addColorStop(.4, rgba(color, amount * (.12 + e * .2)));
        light.addColorStop(1, rgba(color, 0));
        c.strokeStyle = light; grooveLights.push(light);
        c.lineWidth = 2.2;
        c.beginPath(); c.arc(0, 0, 222.1, 0, TAU); c.stroke();
      }
      // All three lights are additive and share the same radial coverage.
      c.strokeStyle=grooveLights[0]; c.lineWidth=.75;
      root.MastrifyVinyl.drawGrooves(c,'all',null,grooveLights.slice(1));
      c.restore();
    }

    drawIdleScan(p, e) {
      // The same musical reader in slow motion, with a longer ghost wake.
      root.MastrifyCoreField.drawIdle(this.ctx, p, 1 - e);
    }

    drawCircularProcessing(p, e) {
      if (e < .001) return;
      const c = this.ctx;
      const music = root.MastrifyScore ? root.MastrifyScore.sample(p, 'rim')
        : root.MastrifyPulse ? root.MastrifyPulse.sample(p) : { rim: 0 };
      const response = music.rim;
      c.save();
      c.globalCompositeOperation = 'lighter';

      // The working light is bonded to the actual bevel, at radius 224.
      // A continuous circular jacket lights both sides of the vinyl edge.
      const rim = c.createLinearGradient(-230, 60, 230, -60);
      rim.addColorStop(0, '#a465ff');
      rim.addColorStop(.45, '#a098ff');
      rim.addColorStop(1, '#66b6ff');
      c.strokeStyle = rim;
      c.beginPath(); c.arc(0, 0, 224.5, 0, TAU);
      // The reader's musical accents answer through the physical bevel.
      // Brightness and bloom settle together; the circular edge never expands.
      const pressure = .88 + .08 * Math.cos(2 * p) + (.46 + .08 * this.originalAmount) * response;
      for (const [width, opacity] of rimPasses) {
        c.lineWidth = width; c.globalAlpha = opacity * e * pressure; c.stroke();
      }

      // Both playback versions share the traveling edge and collar glint.
      // Original uses the same material at a quieter exposure.
      const travelingLight = 1 - .55 * this.originalAmount;
      if (travelingLight < .001) { c.restore(); return; }

      // Six clockwise revolutions per loop, opposing the vinyl’s slower spin.
      // A broad symmetric reflection travels around the edge. Its two ends
      // fade equally: this is lit material, not a particle or a trailing comet.
      const reflection = c.createConicGradient(6 * p - Math.PI * 1.5, 0, 0);
      for (const [offset, color] of reflectionStops) reflection.addColorStop(offset, color);
      c.strokeStyle = reflection;
      c.beginPath(); c.arc(0, 0, 224.5, 0, TAU);
      for (const [width, opacity] of reflectionPasses) {
        c.lineWidth = width * (width > 8 ? 1 + .22 * response : 1);
        c.globalAlpha = Math.min(1, opacity * e * (.76 + .64 * response)) * travelingLight; c.stroke();
      }
      // The same reflection catches the fine circular collar beside the bevel.
      c.globalAlpha = (.30 + .30 * response) * e * travelingLight; c.lineWidth = .75;
      c.beginPath(); c.arc(0, 0, 231.5, 0, TAU); c.stroke();

      c.restore();
    }

    ignitionStrength() {
      if (!this.ignition) return 0;
      if (root.MastrifyEffects?.enabled('awakening')) {
        const age = Math.max(0, Math.min(.82, this.ignition.elapsed));
        if (age < .10) return .14 * smoothstep(age / .10);
        if (age < .22) return .14 + .86 * smoothstep((age - .10) / .12);
        return 1 - smoothstep((age - .22) / .60);
      }
      const t = Math.min(1, this.ignition.elapsed / .82);
      return Math.sin(Math.PI * t) * Math.exp(-2 * t);
    }

    playbackRevealStrength() {
      return this.playbackRevealFrame().strength;
    }

    playbackRevealFrame() {
      return this.transitionRevealFrame(this.playbackReveal, this.transitionVariant);
    }

    masteringRevealFrame() {
      if (!root.MastrifyEffects?.enabled('awakening')) return playbackRest;
      return this.transitionRevealFrame(this.masteringReveal, 'energy');
    }

    transitionRevealFrame(reveal, variantName) {
      if (!reveal) return playbackRest;
      if (reveal.releasing) {
        const fade = 1 - smoothstep(Math.min(1, Math.max(0, reveal.elapsed) / .7));
        const from = reveal.fromFrame || { ...playbackRest, strength: reveal.from, impact: reveal.from };
        return { strength: from.strength * fade, kick: from.kick * fade,
          charge: from.charge * fade, wave: from.wave * fade,
          radius: from.radius, impact: from.impact * fade };
      }
      const t = Math.max(0, Math.min(1.90, reveal.elapsed));
      const eased = value => smoothstep(Math.max(0, Math.min(1, value)));
      const charge = .95 * eased(t / .16) * (1 - eased((t - .36) / .14));
      const wave = eased((t - .08) / .16) * (1 - eased((t - 1.02) / .16));
      const impact = eased((t - .70) / .34) * (1 - eased((t - 1.12) / .56));
      // The whole face lights first; this radius then clears it from the
      // center outward, gathering the remaining light at the physical lip.
      const radius = mix(112, 224.5, eased((t - .48) / .56));
      let kick = t < .18 ? -.020 * eased(t / .18)
        : t < .34 ? mix(-.020, .040, eased((t - .18) / .16))
          : .040 * (1 - eased((t - .46) / .86));
      // Each study's physical push coincides with its own release of light.
      const impulse = (gatherEnd, peakAt, holdUntil, endAt, pull, push) =>
        t < gatherEnd ? -pull * eased(t / gatherEnd)
          : t < peakAt ? mix(-pull, push, eased((t - gatherEnd) / (peakAt - gatherEnd)))
            : push * (1 - eased((t - holdUntil) / (endAt - holdUntil)));
      if (variantName === 'plasma') kick = impulse(.23, .37, .44, 1.36, .018, .052);
      else if (variantName === 'magnetic') kick = impulse(.77, 1.02, 1.08, 1.82, .016, .049);
      else if (variantName === 'crystal') kick = impulse(.55, .94, 1.02, 1.78, .008, .037);
      else if (variantName === 'portal') kick = .047 * eased((t - .13) / .51) * (1 - eased((t - .79) / 1.08));
      const strength = variantName === 'portal' ? eased(t / .15) * (1 - eased((t - .94) / .96))
        : Math.max(charge * .24, wave, impact);
      return { strength, kick, charge, wave, radius, impact };
    }

    buildPlaybackGlow() {
      // The light transferred from the colored face finishes on this physical
      // lip. Saturated violet/blue preserves color instead of forming white.
      if (this.playbackGlow) return;
      const stamp = document.createElement('canvas');
      stamp.width = stamp.height = 992;
      const c = (root.MastrifyCanvas ? root.MastrifyCanvas.context2D(stamp) : stamp.getContext('2d'));
      c.setTransform(2, 0, 0, 2, 496, 496);
      c.globalCompositeOperation = 'lighter';
      const light = c.createLinearGradient(-224, 0, 224, 0);
      light.addColorStop(0, '#983cff');
      light.addColorStop(.42, '#8764ff');
      light.addColorStop(.70, '#427dff');
      light.addColorStop(1, '#36adff');
      c.strokeStyle = light;
      c.beginPath(); c.arc(0, 0, 224.5, 0, TAU);
      for (const [width, alpha] of [[22, .05], [9, .12], [3.2, .46], [.85, .88]]) {
        c.lineWidth = width; c.globalAlpha = alpha; c.stroke();
      }
      this.playbackGlow = stamp;
      this.buildPlaybackPlasma();
    }

    buildPlaybackPlasma() {
      // Fixed world-space material; viewport changes cannot invalidate it.
      if (this.playbackPlasma) return;
      // One transparent, colored material covers the vinyl annulus. Its fine
      // radial grain leaves the real grooves readable beneath the illumination.
      // A reused mask surface removes this light from the center outward.
      const size = 1024, density = 2;
      const surface = document.createElement('canvas');
      const masked = document.createElement('canvas');
      surface.width = surface.height = masked.width = masked.height = size;
      const s = (root.MastrifyCanvas ? root.MastrifyCanvas.context2D(surface) : surface.getContext('2d')), maskContext = (root.MastrifyCanvas ? root.MastrifyCanvas.context2D(masked) : masked.getContext('2d'));
      const pixels = s.createImageData(size, size);
      for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
        const x = (px + .5) / density - 256, y = (py + .5) / density - 256;
        const radius = Math.hypot(x, y);
        if (radius <= 111.5 || radius >= 224.5) continue;
        const inner = smoothstep(Math.min(1, (radius - 111.5) / 4));
        const outer = 1 - smoothstep(Math.max(0, Math.min(1, (radius - 220) / 4.5)));
        const angle = Math.atan2(y, x);
        const side = Math.max(0, Math.min(1, (x + 224) / 448));
        const flow = .5 + .5 * Math.sin(3 * angle + radius * .025
          + .45 * Math.sin(7 * angle - radius * .012));
        const grooves = (.5 + .5 * Math.cos(radius * TAU / 2.5)) ** 7;
        const filament = Math.max(0, Math.sin(9 * angle + radius * .055)) ** 12;
        const alpha = (.30 + .13 * flow + .065 * grooves + .025 * filament) * inner * outer;
        const i = (py * size + px) * 4;
        pixels.data[i] = mix(167, 33, side);
        pixels.data[i + 1] = mix(51, 145, side);
        pixels.data[i + 2] = 255;
        pixels.data[i + 3] = alpha * 255;
      }
      s.putImageData(pixels, 0, 0);
      const gpu = root.MastrifyCanvas?.webKit ? root.MastrifyPlasmaReveal?.create(surface) : null;
      this.playbackPlasma = { surface, masked, maskContext, gpu, clearRadius: NaN };
    }

    drawPlaybackReveal(strength, forwardScale = 1) {
      this.drawTransitionReveal(this.playbackReveal, this.transitionVariant, forwardScale, this.playbackOutro);
    }

    drawTransitionReveal(reveal, variantName, forwardScale = 1, outro = null) {
      if (!reveal) return;
      const frame = this.transitionRevealFrame(reveal, variantName);
      const variant = root.MastrifyTransitionVariants?.[variantName];
      if (variant) {
        const fade = reveal.releasing ? 1 - smoothstep(Math.min(1, reveal.elapsed / .7)) : 1;
        variant.draw(this.ctx, { t: reveal.releasing ? reveal.variantElapsed : reveal.elapsed,
          fade, phase: phaseAt(this.time), forwardScale });
        return;
      }
      if (frame.strength < .001 || !this.playbackGlow) return;
      const c = this.ctx;
      c.save();
      c.beginPath(); c.arc(0, 0, 264.25 / forwardScale, 0, TAU);
      c.arc(0, 0, 111.5, 0, TAU, true); c.clip('evenodd');
      c.shadowBlur = 0; c.shadowOffsetX = c.shadowOffsetY = 0;
      if (this.playbackPlasma && frame.wave > .001 && frame.radius < 224.5) {
        const plasma = this.playbackPlasma;
        const accelerated = plasma.gpu?.render(frame.radius);
        // The texture remains attached to the record. Only its inner clear
        // boundary advances; an eleven-unit feather avoids a hard moving cut.
        // Mask geometry is reused during the full-face hold and on interruption.
        if (!accelerated && plasma.clearRadius !== frame.radius) {
          const m = plasma.maskContext;
          m.setTransform(1, 0, 0, 1, 0, 0);
          m.globalAlpha = 1; m.globalCompositeOperation = 'source-over';
          m.clearRect(0, 0, 1024, 1024);
          m.drawImage(plasma.surface, 0, 0);
          const edge = m.createRadialGradient(512, 512, frame.radius * 2,
            512, 512, (frame.radius + 11) * 2);
          edge.addColorStop(0, 'rgba(255,255,255,0)');
          edge.addColorStop(1, 'rgba(255,255,255,1)');
          m.globalCompositeOperation = 'destination-in';
          m.fillStyle = edge; m.fillRect(0, 0, 1024, 1024);
          m.globalCompositeOperation = 'source-over';
          plasma.clearRadius = frame.radius;
        }
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = frame.wave;
        c.drawImage(accelerated ? plasma.gpu.canvas : plasma.masked, -256, -256, 512, 512);
      }
      if (frame.impact > .0001) {
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = frame.impact;
        c.drawImage(this.playbackGlow, -248, -248, 496, 496);
      }
      c.restore();
      if (outro === 'crystal') {
        root.MastrifyTransitionVariants?.crystal?.drawOutro(c, {
          t: reveal.releasing ? reveal.variantElapsed : reveal.elapsed,
          fade: reveal.releasing ? 1 - smoothstep(Math.min(1, reveal.elapsed / .7)) : 1,
          phase: phaseAt(this.time), forwardScale
        });
      }
    }

    drawMasteringReveal(forwardScale = 1) {
      if (!root.MastrifyEffects?.enabled('awakening')) return;
      this.drawTransitionReveal(this.masteringReveal, 'energy', forwardScale);
    }

    drawIgnition() {
      if (!this.ignition) return;
      if (root.MastrifyEffects?.enabled('awakening')) {
        this.drawAwakening();
        return;
      }
      const c = this.ctx;
      const t = Math.min(1, this.ignition.elapsed / .82);
      const strength = this.ignitionStrength();
      const radius = 260 + 58 * (1 - (1 - t) ** 3);
      c.save(); c.globalCompositeOperation = 'lighter';
      const light = c.createLinearGradient(-radius, 0, radius, 0);
      light.addColorStop(0, '#b275ff');
      light.addColorStop(.5, '#ddceff');
      light.addColorStop(1, '#73bdff');
      c.beginPath(); c.arc(0, 0, radius, 0, TAU);
      c.strokeStyle = light;
      c.globalAlpha = strength * .15; c.lineWidth = 21; c.stroke();
      c.globalAlpha = strength * .42; c.lineWidth = 6; c.stroke();
      c.strokeStyle = '#e9e5ff';
      c.globalAlpha = strength * 1.7; c.lineWidth = 1.8; c.stroke();
      c.restore();
    }

    drawAwakening() {
      const c = this.ctx, age = this.ignition.elapsed;
      const strength = this.ignitionStrength();
      const travel = smoothstep(Math.max(0, Math.min(1, (age - .08) / .38)));
      const radius = 116 + 108.5 * travel;
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.beginPath(); c.arc(0, 0, 244, 0, TAU);
      c.arc(0, 0, 112, 0, TAU, true); c.clip('evenodd');
      const light = c.createLinearGradient(-225, 0, 225, 0);
      light.addColorStop(0, '#a778ff'); light.addColorStop(.46, '#e8dcff');
      light.addColorStop(.62, '#dcecff'); light.addColorStop(1, '#6fb7ff');
      c.strokeStyle = light;
      c.globalAlpha = strength * .13; c.lineWidth = .9; root.MastrifyVinyl.drawGrooves(c, 'all', 'awakening-grooves');
      c.beginPath(); c.arc(0, 0, radius, 0, TAU);
      for (const [width, alpha] of [[46,.045],[23,.11],[8,.28],[1.5,.80]]) {
        c.globalAlpha = strength * alpha; c.lineWidth = width; c.stroke();
      }
      // The surge arrives at the physical lip and lights the whole edge once.
      c.beginPath(); c.arc(0, 0, 224.5, 0, TAU);
      c.globalAlpha = strength * travel * .35; c.lineWidth = 6; c.stroke();
      c.globalAlpha = strength * travel * .65; c.lineWidth = 1.05; c.stroke();
      c.restore();
    }

    drawProtectedCenter(e, p = 0) {
      const c = this.ctx;
      // Restore the clean opaque label AFTER every light layer, including bloom.
      // The mark stays upright while the surrounding vinyl face rotates.
      c.save();
      c.beginPath(); c.arc(0, 0, 111, 0, TAU); c.clip();
      root.MastrifyVinyl.drawLabel(c);
      this.drawLogo(p, e);
      c.restore();
    }

    drawLogo(p, e) {
      const c = this.ctx;
      // The same source cue drives Sonic Flow: no second beat clock or lag.
      // Keep the reaction in the light, with a much quieter standby breath.
      const score = root.MastrifyScore?.sample(p, 'source') || root.MastrifyPulse?.sample(p) || {};
      const musical = Math.max(0, Math.min(1,
        .58 * ((this.masterAmount + this.originalAmount) > .001 ? this.depthPulse : (score.bass || 0)) + .30 * (score.accent || 0) + .12 * (score.level || 0)));
      // Original still listens visibly: a softer version of the same musical
      // pulse, while Master's brighter traveling logo light remains distinct.
      const musicalStrength = 1.24 * e + .3288 * this.originalAmount + .14 * this.masterAmount;
      const pulse = Math.max(0, Math.min(1, musicalStrength * musical + Math.max(0, 1 - musicalStrength) * .16 * (.5 - .5 * Math.cos(2 * p)) + .55 * this.playbackFlash));
      // The vinyl owns its satin center label. Keep it visible under the mark.
      c.globalCompositeOperation = 'lighter';
      this.glow(0, 2, 94, palette.violet, .045 + e * .035 + .065 * pulse);
      c.globalCompositeOperation = 'source-over';
      c.save();
      // The original dot represents the vinyl spindle hole. Anchor it exactly
      // at the disc center. Only light pulses; the mark's silhouette is fixed.
      c.scale(4.45, 4.45);
      c.translate(-24, -24);
      // Exact original SVG stroke widths and painter order. The heavy wave is
      // behind both fine waves; the crossing foreground wave is 75% opaque.
      const widths = [2.6, 1.5, 1.5];
      const opacities = [1, 1, .75];
      const body = c.createLinearGradient(3, 18, 42, 33);
      for (const [stop, color] of [[0,[126,48,211]],[.21,[195,149,250]],
        [.43,[252,246,255]],[.57,[236,237,255]],[.74,[183,214,255]],[1,[67,140,244]]]) {
        body.addColorStop(stop, rgba(color.map((v, i) => Math.round(mix(v, [245,241,255][i], .20 * pulse))), 1));
      }
      // Optical placement of the asymmetric waves around the LP's spindle.
      c.save();
      c.translate(1.6, -3);
      // Every wave emits its own halo, under ALL of the crisp original lines.
      // Same musical cue, separate curve silhouettes: no shared blob or lag.
      c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < this.logoGlow.length; k++) {
        c.globalAlpha = Math.min(1, (.18 + .64 * (e + .26 * this.originalAmount) + .16 * this.masterAmount) * pulse * opacities[k]);
        c.drawImage(root.MastrifyCanvas?.imageSource(this.logoGlow[k]) || this.logoGlow[k], -10, -10, 68, 68);
      }
      c.globalCompositeOperation = 'source-over';
      root.MastrifyMasterFinish?.drawLogoFlow(c, p, this.masterAmount + .45 * this.originalAmount, score, this.logoPaths);
      const shadows = this.logoShadows(e);
      const shadowTransform = root.MastrifyCanvas?.webKit && !shadows ? c.getTransform() : null;
      for (let k = 0; k < this.logoPaths.length; k++) {
        c.globalAlpha = opacities[k];
        c.shadowColor = rgba([Math.round(mix(117,139,e)),Math.round(mix(83,103,e)),Math.round(mix(218,255,e))], .68 + .32 * pulse);
        c.shadowBlur = (3 + e * 4) * this.dpr;
        c.lineWidth = widths[k];
        if (shadows) {
          c.shadowBlur = 0;
          c.globalAlpha = opacities[k] * (.68 + .32 * pulse);
          this.drawLogoShadow(shadows, k);
          c.globalAlpha = opacities[k];
        } else if (root.MastrifyCanvas?.webKit) {
          // Safari drops round caps on a gradient stroke with a live shadow.
          // Draw its identical opaque silhouette's shadow separately; the
          // source is outside the canvas, its shadow remains at the logo.
          c.save();
          const transform = shadowTransform, offset = 512;
          c.translate(offset, 0);
          c.shadowOffsetX -= offset * transform.a;
          c.shadowOffsetY -= offset * transform.b;
          c.strokeStyle = '#000';
          c.stroke(this.logoPaths[k]);
          c.restore();
          c.shadowBlur = 0;
        }
        c.strokeStyle = body; c.stroke(this.logoPaths[k]);
        c.shadowBlur = 0;
      }
      c.restore();
      c.globalAlpha = 1;
      c.fillStyle = '#faf7ff'; c.shadowColor = '#b4a7ff'; c.shadowBlur = (8 + e * 6) * this.dpr;
      if (shadows) {
        c.shadowBlur = 0;
        this.drawLogoShadow(shadows, 3);
      }
      // The site's 8px dot over a 42%-wide 48-unit SVG maps to radius20/7.
      c.beginPath(); c.arc(24, 24, 20 / 7, 0, TAU); c.fill();
      c.shadowBlur = 0; c.restore();
      this.glow(0, 0, 26 + 3 * pulse, palette.ice, .2 + e * .16 + .065 * pulse);
    }

    // Skivans ring på grafikkretsen, av eller på. Går det inte (ingen WebGL
    // eller ingen plus-lighter i webbläsaren) ritas allt som förut.
    setGpuDisc(on) {
      if (on && !this.gpuDisc) this.gpuDisc = root.MastrifyGpuDisc?.create(this.canvas) || null;
      const was = !!this.gpuDisc?.active;
      const now = this.gpuDisc ? this.gpuDisc.setActive(!!on) : false;
      if (was !== now && !this.running) this.renderAt(this.time, this.energy);
      return now;
    }

    destroy() {
      this.gpuDisc?.destroy();this.gpuDisc=null;
      this.playbackPlasma?.gpu?.destroy();this.playbackPlasma=null;
      this.logoShadowMixer?.destroy();this.logoShadowMixer=null;
      this.pause(); this.resizeObserver.disconnect(); this.releaseDensity?.();
      document.removeEventListener('visibilitychange', this.onVisibility);
    }
  }
  MastrifyEngine.LOOP_SECONDS = LOOP_SECONDS;
  MastrifyEngine.phaseAt = phaseAt;
  if (typeof module !== 'undefined' && module.exports) module.exports = MastrifyEngine;
  root.MastrifyEngine = MastrifyEngine;
})(typeof window !== 'undefined' ? window : globalThis);
