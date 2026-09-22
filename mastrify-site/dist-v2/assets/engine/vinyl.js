/* Physical LP surface. All light motion uses the supplied, periodic phase.
 * The host owns animation and paints its original mark over the center label.
 */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  // One quiet lap in standby; three laps when mastering. Both remain periodic
  // over 12 seconds. Only the two endpoint speeds are painted, then crossfaded.
  const rotationAt = (phase, active = 1) => -(active ? 3 : 1) * phase;
  let surface = null;
  let grooves = new Path2D(), engraving = new Path2D(), fineGrooves = new Path2D();
  let radii = [];
  let relief = null;
  let pixelScale = 2, grooveWidth = .4, engravingWidth = .35;
  const wallDisc = new Path2D();
  wallDisc.arc(0, 0, 224, 0, TAU);
  const outsideFace = new Path2D();
  outsideFace.rect(-260, -260, 520, 520);
  outsideFace.moveTo(224, 0);
  outsideFace.arc(0, 0, 224, 0, TAU, true);
  let wallReflection = null;
  let wallReflectionUnavailable = false;
  function setPixelScale(scale) {
    const nextScale = Math.max(.2, Number(scale) || 2);
    if (nextScale === pixelScale && radii.length) return;
    pixelScale = nextScale;
    relief = null;
    grooves = new Path2D(); engraving = new Path2D(); fineGrooves = new Path2D(); radii = [];
    // Keep the cut above the display's sampling limit. The same geometry is
    // shared by the finish highlights and stays fixed throughout each resize.
    const spacing = Math.max(1.25, 3.3 / pixelScale);
    grooveWidth = Math.max(.4, .62 / pixelScale);
    engravingWidth = Math.max(.35, .52 / pixelScale);
    for (let i = 0, radius = 117.5; radius < 215.6; i++, radius += spacing) {
      radii.push(radius);
      grooves.moveTo(radius, 0); grooves.arc(0, 0, radius, 0, TAU);
      const cut = radius + spacing * .40;
      engraving.moveTo(cut, 0); engraving.arc(0, 0, cut, 0, TAU);
      if (i % 3 === 0) { fineGrooves.moveTo(radius, 0); fineGrooves.arc(0, 0, radius, 0, TAU); }
    }
  }
  setPixelScale(2);
  const getGrooves = () => ({ grooves, fineGrooves, radii, pixelScale });

  function reliefMasks() {
    if (relief) return relief;
    const density = pixelScale / .98, size = Math.ceil(444 * density);
    const spacing = Math.max(1.25, 3.3 / pixelScale);
    const names = ['all', 'fine', 'group0', 'group1', 'group2', 'processing', 'processing-wide', 'discovery', 'base'];
    const entries = Object.fromEntries(names.map(name => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
      const brush = canvas.getContext('2d');
      return [name, { canvas, brush, image: brush.createImageData(size, size) }];
    }));
    const smooth = x => { x = Math.max(0, Math.min(1, x)); return x*x*(3-2*x); };
    // Integrate a smooth radial fundamental, instead of rasterizing a pair of
    // subpixel hard strokes. Its spatial frequencies stay below Nyquist even
    // on a 1x monitor; there are no cardinal/diagonal tessellation patterns.
    const mean = .5, sampleArea = Math.sin(Math.PI / (spacing*density)) / (Math.PI / (spacing*density));
    const buffers=names.slice(0,-1).map(name=>entries[name].image.data),coverage=new Float64Array(8);
    for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
      const radius = Math.hypot((x+.5-size/2)/density, (y+.5-size/2)/density);
      if (radius < 116 || radius > 217) continue;
      const edge = smooth((radius-116)/1.5) * smooth((217-radius)/1.5);
      const theta = TAU*(radius-117.5)/spacing;
      const ridge = 1 + .85*sampleArea*Math.cos(theta);
      const all = mean * ridge * edge;
      const group0=(1+Math.cos(theta/3))/3;
      coverage[0]=all; coverage[1]=coverage[2]=all*group0;
      coverage[3]=all*(1+Math.cos(theta/3-TAU/3))/3;
      coverage[4]=all*(1+Math.cos(theta/3-TAU*2/3))/3;
      coverage[5]=all*smooth((radius-146)/3)*smooth((192-radius)/3);
      const duty=Math.min(1,3.1/spacing), flat=edge*smooth((radius-145)/3)*smooth((193-radius)/3);
      coverage[6]=duty<=.5 ? coverage[5]*duty*2 : coverage[5]*2*(1-duty)+flat*(2*duty-1);
      coverage[7]=(.28*coverage[6]+coverage[5]*Math.min(1,.82/spacing/.5))/1.28;
      const i=(y*size+x)*4;
      for (let k=0;k<buffers.length;k++) {
        const data=buffers[k]; data[i]=data[i+1]=data[i+2]=255; data[i+3]=Math.round(255*coverage[k]);
      }
      const bright=.145*(.62/(spacing*pixelScale))*ridge*edge;
      const dark=.8*(.52/(spacing*pixelScale))*(1+.85*sampleArea*Math.cos(theta-TAU*.4))*edge;
      const alpha=dark+bright*(1-dark), data=entries.base.image.data;
      data[i]=129*bright*(1-dark)/alpha; data[i+1]=139*bright*(1-dark)/alpha;
      data[i+2]=(5*dark+175*bright*(1-dark))/alpha; data[i+3]=255*alpha;
    }
    for (const entry of Object.values(entries)) { entry.brush.putImageData(entry.image,0,0); root.MastrifyCanvas?.cacheImage(entry.canvas); delete entry.image; }
    relief = { size, density, spacing, entries, paints:new Map() };
    return relief;
  }

  function scratchPaint(r, kind) {
    const entry = r.entries[kind];
    if (!entry.paint) {
      entry.paint = document.createElement('canvas');
      entry.paint.width = entry.paint.height = r.size;
      entry.paintBrush = entry.paint.getContext('2d');
    }
    return entry;
  }

  function prepareResources() {
    ensureSurface();
    reflectionStamp();
    const r = reliefMasks();
    // These are the mutable light surfaces used by the current LP treatment.
    // Allocate them at the existing density before the first changing frame.
    for (const kind of ['all', 'group0', 'group1', 'group2', 'discovery']) scratchPaint(r, kind);
  }

  const hasGroovePaint = cacheKey => !!relief?.paints.has(cacheKey);

  // Spårens ljus fylls med en gradient över hela den kvadratiska ytan, men
  // masken släpper bara igenom en ring: radie 116 till 217 för spåren och 145
  // till 193 för den smalare bearbetningsringen. Allt utanför ringen nollas
  // ändå av masken. Gradienten fylls därför bara i ringen, med tre enheters
  // marginal åt båda håll så att ringens mjuka kant ligger där masken redan
  // är noll. Varje bildpunkt blir densamma; gradienten räknas ut på ungefär
  // hälften så många bildpunkter (en fjärdedel för den smala ringen).
  const RING = { all: [113, 220], fine: [113, 220], group0: [113, 220], group1: [113, 220], group2: [113, 220],
    processing: [142, 196], 'processing-wide': [142, 196], discovery: [142, 196] };
  const ringPaths = new Map();
  function ringPath(kind) {
    const range = RING[kind];
    if (!range || typeof Path2D !== 'function') return null;
    let path = ringPaths.get(kind);
    if (!path) {
      path = new Path2D();
      path.arc(0, 0, range[1], 0, TAU);
      path.moveTo(range[0], 0);
      path.arc(0, 0, range[0], 0, TAU, true);
      ringPaths.set(kind, path);
    }
    return path;
  }

  function groovePaint(c, kind, cacheKey, additionalGradients) {
    const r=reliefMasks();
    const wide=kind==='processing' && c.lineWidth===3.1;
    if(wide) kind='processing-wide';
    const exposure=wide || kind==='discovery' ? 1 : Math.min(1,c.lineWidth/r.spacing/.5);
    let paint=cacheKey && r.paints.get(cacheKey);
    if (!paint) {
      const entry=cacheKey ? r.entries[kind] : scratchPaint(r,kind);
      const canvas=cacheKey ? document.createElement('canvas') : entry.paint;
      if (cacheKey) canvas.width=canvas.height=r.size;
      const b=cacheKey ? canvas.getContext('2d') : entry.paintBrush;
      b.setTransform(1,0,0,1,0,0);
      // Full coverage replaces every old pixel, including transparent ones.
      b.globalAlpha=1; b.globalCompositeOperation='copy';
      b.setTransform(r.density,0,0,r.density,r.size/2,r.size/2);
      const extent=r.size/(2*r.density);
      const ring=root.MastrifyTrim!==false && extent>=RING[kind]?.[1] ? ringPath(kind) : null;
      for (const gradient of [c.strokeStyle,...(additionalGradients||[])]) {
        b.fillStyle=root.MastrifyCanvas?.copyGradient(gradient,b,c) || gradient;
        if (ring) b.fill(ring); else b.fillRect(-extent,-extent,extent*2,extent*2);
        b.globalCompositeOperation='lighter';
      }
      b.setTransform(1,0,0,1,0,0); b.globalCompositeOperation='destination-in';
      b.drawImage(root.MastrifyCanvas?.imageSource(r.entries[kind].canvas) || r.entries[kind].canvas,0,0);
      b.globalCompositeOperation='source-over'; paint=canvas;
      if (cacheKey) { r.paints.set(cacheKey,paint); root.MastrifyCanvas?.cacheImage(paint); }
    }
    return { r, paint, exposure };
  }

  function drawGrooves(c, kind='all', cacheKey=null, additionalGradients=null) {
    const { r, paint, exposure } = groovePaint(c, kind, cacheKey, additionalGradients);
    const extent=r.size/(2*r.density);
    c.save(); c.globalAlpha *= exposure;
    c.drawImage(root.MastrifyCanvas?.imageSource(paint) || paint,-extent,-extent,extent*2,extent*2); c.restore();
  }

  // Spårens ljus under uppspelning är tre till fem lager med samma blandning
  // (lighter), samma läge och samma urklipp på skivan. Varje lager lades
  // förut in på skivan för sig, skalat och klippt. Nu läggs lagren först ihop
  // i en egen, lika stor yta, rakt bildpunkt för bildpunkt och med sin egen
  // styrka, och summan läggs in på skivan i ett enda steg. Ljuset adderas på
  // samma sätt; skillnaden är bara avrundningen när summan skalas en gång i
  // stället för varje lager för sig, högst en eller två nivåer av 255.
  let layerSum = null;
  function beginGrooveLayers() {
    const r = reliefMasks();
    if (!layerSum || layerSum.canvas.width !== r.size) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = r.size;
      layerSum = { canvas, brush: canvas.getContext('2d'), count: 0, relief: r };
    }
    layerSum.count = 0; layerSum.relief = r;
  }
  function addGrooveLayer(c, kind = 'all') {
    if (!layerSum || layerSum.relief !== reliefMasks()) beginGrooveLayers();
    const { paint, exposure } = groovePaint(c, kind, null, null);
    const b = layerSum.brush;
    b.setTransform(1,0,0,1,0,0);
    b.globalCompositeOperation = layerSum.count ? 'lighter' : 'copy';
    b.globalAlpha = exposure;
    b.drawImage(paint, 0, 0);
    b.globalAlpha = 1; b.globalCompositeOperation = 'source-over';
    layerSum.count++;
  }
  // Summan från förra bildrutan går att använda igen så länge spårens mått
  // inte har ändrats (bara mätläget gör det, för att prova halv takt).
  const grooveLayersFresh = () => !!layerSum?.count && layerSum.relief === relief;
  function drawGrooveLayers(c) {
    if (!layerSum?.count || layerSum.relief !== relief) return false;
    const r = layerSum.relief, extent = r.size / (2 * r.density);
    c.drawImage(layerSum.canvas, -extent, -extent, extent * 2, extent * 2);
    return true;
  }

  function drawRelief(c) {
    const r=reliefMasks(),extent=r.size/(2*r.density),canvas=r.entries.base.canvas;
    c.drawImage(root.MastrifyCanvas?.imageSource(canvas)||canvas,-extent,-extent,extent*2,extent*2);
  }

  function circle(c, radius) {
    c.beginPath(); c.arc(0, 0, radius, 0, TAU);
  }

  function annulus(c) {
    c.beginPath();
    c.arc(0, 0, 219, 0, TAU);
    c.arc(0, 0, 111, 0, TAU, true);
    c.clip('evenodd');
  }

  function base(c) {
    const bevel = c.createLinearGradient(-150, -200, 145, 225);
    bevel.addColorStop(0, '#3b3b5e');
    bevel.addColorStop(.12, '#111622');
    bevel.addColorStop(.52, '#101423');
    bevel.addColorStop(.8, '#171c33');
    bevel.addColorStop(1, '#444269');
    c.fillStyle = bevel;
    circle(c, 224); c.fill();

    const disc = c.createRadialGradient(-82, -115, 0, -8, -12, 295);
    disc.addColorStop(0, '#151725');
    disc.addColorStop(.43, '#090b15');
    disc.addColorStop(.78, '#060812');
    disc.addColorStop(1, '#101422');
    c.fillStyle = disc;
    circle(c, 221.6); c.fill();

    c.strokeStyle = 'rgba(103,112,159,.21)';
    c.lineWidth = .65;
    circle(c, 220.5); c.stroke();
    c.strokeStyle = 'rgba(0,0,4,.85)';
    c.lineWidth = 1.2;
    circle(c, 218.3); c.stroke();

    // Lead-out grooves and the depressed lip around the paper label.
    c.strokeStyle = 'rgba(118,129,175,.14)';
    c.lineWidth = .55;
    [110.5, 112.1, 114.5, 116].forEach(radius => { circle(c, radius); c.stroke(); });
    c.fillStyle = '#02030a';
    circle(c, 109.2); c.fill();
    const label = c.createLinearGradient(-80, -100, 80, 115);
    label.addColorStop(0, '#141725');
    label.addColorStop(.38, '#0c0e1a');
    label.addColorStop(1, '#070913');
    c.fillStyle = label;
    circle(c, 106.8); c.fill();
    c.lineWidth = .6;
    c.strokeStyle = 'rgba(151,150,191,.25)';
    circle(c, 107.3); c.stroke();
    c.strokeStyle = 'rgba(118,127,165,.075)';
    circle(c, 103); c.stroke();

    // Fixed, extremely subtle satin grain; deterministic and cached once.
    let seed = 20931;
    for (let i = 0; i < 1350; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const a = seed / 4294967296 * TAU;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const r = Math.sqrt(seed / 4294967296) * 103;
      c.fillStyle = i % 2 ? 'rgba(165,173,209,.032)' : 'rgba(0,0,0,.11)';
      c.fillRect(Math.cos(a) * r, Math.sin(a) * r, .42, .42);
    }
  }

  function ensureSurface() {
    if (surface) return surface;
    // The fallback canvas remains detached; both caches use the same 2x base.
    const candidate = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(904, 904)
      : root.document.createElement('canvas');
    candidate.width = candidate.height = 904;
    const brush = candidate.getContext('2d');
    if (brush) {
      brush.setTransform(2, 0, 0, 2, 452, 452);
      base(brush);
      surface = candidate;
      root.MastrifyCanvas?.cacheImage(surface);
    }
    return surface;
  }

  function drawLabel(c) {
    const cached = ensureSurface();
    c.save();
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    circle(c, 111); c.clip();
    // The clip limits this cheap image pass to the label. Keep the original
    // image mapping to avoid subpixel rounding differences from a crop.
    if (cached) c.drawImage(root.MastrifyCanvas?.imageSource(cached) || cached, -226, -226, 452, 452);
    else base(c);
    c.restore();
  }

  // Kantens två streck (223,25). Samma listor används av grafikkretsen.
  const rimStops = e => [[0,185,151,250,.56 + .1 * e], [.23,166,159,220,.3], [.52,61,72,119,.06],
    [.8,124,149,219,.15], [1,111,163,250,.52 + .1 * e]];
  const CHAMFER_STOPS = Object.freeze([[0,220,230,249,.46], [.26,169,190,225,.13], [.56,96,119,162,.015],
    [.82,150,186,228,.08], [1,187,218,249,.23]].map(Object.freeze));
  const RIM = Object.freeze({ radius: 223.25, width: 1.3, chamferWidth: .6,
    line: Object.freeze([-224, -55, 224, 80]), chamferLine: Object.freeze([-170, -195, 160, 185]) });

  // Glansens färger. Samma lista används av grafikkretsen (gpu-disc.js).
  const SPECULAR_STOPS = Object.freeze([[0,125,133,214,0], [.035,128,116,207,.12], [.068,195,185,232,.75],
    [.086,141,142,219,.27], [.17,67,88,165,0], [.43,97,112,179,0], [.485,91,134,240,.22],
    [.523,153,174,237,.58], [.553,138,110,207,.14], [.63,93,89,156,0], [1,125,133,214,0]].map(Object.freeze));

  function specular(c, angle, strength, detailed) {
    if (typeof c.createConicGradient !== 'function') return;
    const g = c.createConicGradient(angle, 0, 0);
    const rgba = (r, g, b, a) => `rgba(${r},${g},${b},${a * strength})`;
    for (const [offset, r, gr, b, a] of SPECULAR_STOPS) g.addColorStop(offset, rgba(r, gr, b, a));
    if (detailed) {
      c.strokeStyle = g;
      c.lineWidth = Math.max(.52, .72 / pixelScale);
      drawGrooves(c);
    } else {
      c.fillStyle = g;
      c.fillRect(-220, -220, 440, 440);
    }
  }

  function faceAt() {
    // All radial cuts are live geometry now. The smooth rotating face and
    // stationary label share one immutable material instead of three copies.
    return ensureSurface();
  }

  function reflectionStamp() {
    if (wallReflection || wallReflectionUnavailable) return wallReflection;
    // Only angular color lives in this small cache. The live vector clips keep
    // both physical edges crisp at every display resolution.
    const canvas = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(512, 512) : root.document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const brush = canvas.getContext('2d');
    if (!brush || typeof brush.createConicGradient !== 'function') {
      wallReflectionUnavailable = true;
      return null;
    }
    brush.setTransform(1, 0, 0, 1, 256, 256);
    const light = brush.createConicGradient(0, 0, 0);
    for (let i = 0; i <= 96; i++) {
      const f = i / 96;
      const focus = Math.exp(5.2 * (Math.cos(TAU * (f - .5)) - 1));
      const r = Math.round(122 + 110 * focus);
      const g = Math.round(127 + 112 * focus);
      light.addColorStop(f, `rgba(${r},${g},255,${.002 + .998 * focus})`);
    }
    brush.fillStyle = light;
    brush.fillRect(-256, -256, 512, 512);
    // Wrap the highlight down the rounded wall, then dissolve it into the
    // underside. A cached radial mask avoids a hard, illuminated lower cut.
    const falloff = brush.createRadialGradient(0, 0, 223, 0, 0, 242);
    falloff.addColorStop(0, 'rgba(255,255,255,1)');
    falloff.addColorStop(.18, 'rgba(255,255,255,.94)');
    falloff.addColorStop(.46, 'rgba(255,255,255,.52)');
    falloff.addColorStop(.74, 'rgba(255,255,255,.10)');
    falloff.addColorStop(1, 'rgba(255,255,255,0)');
    brush.globalCompositeOperation = 'destination-in';
    brush.fillStyle = falloff;
    brush.fillRect(-256, -256, 512, 512);
    wallReflection = canvas;
    root.MastrifyCanvas?.cacheImage(canvas);
    return canvas;
  }

  function sidewallLight(c, phase, energy, visibility = 1) {
    if (energy <= 0 || visibility <= 0) return;
    if (root.MastrifyEffects && typeof root.MastrifyEffects.enabled === 'function'
      && !root.MastrifyEffects.enabled('edge')) return;
    const stamp = reflectionStamp();
    if (!stamp) return;
    const p = Number.isFinite(phase) ? ((phase % TAU) + TAU) % TAU : 0;
    const delayPhase = .15 / 12 * TAU;
    const delayed = ((p - delayPhase) % TAU + TAU) % TAU;
    const score = root.MastrifyScore && typeof root.MastrifyScore.sample === 'function'
      ? root.MastrifyScore.sample(p, 'wall')
      : root.MastrifyPulse && typeof root.MastrifyPulse.sample === 'function'
        ? root.MastrifyPulse.sample(delayed) : null;
    const response = score ? Math.max(0, Math.min(1,
      .5 * (Number(score.level) || 0) + .35 * (Number(score.rim) || 0)
        + .15 * (Number(score.accent) || 0))) : 0;
    const depth = 2.7 + 15 * energy;
    c.save();
    // Intersect the translated back disc with the exterior of the front disc.
    // The reflection can illuminate only the exposed wall, never face or label.
    c.translate(0, depth); c.clip(wallDisc); c.translate(0, -depth);
    c.clip(outsideFace, 'evenodd');
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha *= energy * visibility * (.25 + .27 * response);
    c.shadowBlur = 0; c.shadowOffsetX = c.shadowOffsetY = 0;
    // The same six clockwise revolutions, arriving on the wall 150 ms later.
    // Delay shifts the reflection; musical strength never changes its speed.
    c.rotate(6 * delayed - Math.PI * 1.5);
    c.drawImage(root.MastrifyCanvas?.imageSource(stamp) || stamp, -256, -256, 512, 512);
    c.restore();
  }

  // Det som ritas innanför ringen 111 till 219: ytan som snurrar, spåren och
  // glansen. Samma värden som draw() använder nedan, så att grafikkretsen
  // (gpu-disc.js) kan rita exakt samma sak.
  function annulusPlan(phase, energy, originalAmount = 0) {
    const p = Number.isFinite(phase) ? phase : 0;
    const e = Math.max(0, Math.min(1, Number(energy) || 0));
    const original = Math.max(0, Math.min(1, Number(originalAmount) || 0));
    const faces = [
      { rotation: rotationAt(p, 0), opacity: e < 1 && original < 1 ? 1 - original : 0 },
      { rotation: rotationAt(p, 1), opacity: e > 0 && original < 1 ? e * (1 - original) : 0 },
      { rotation: rotationAt(p, 0), opacity: original > 0 ? original : 0 }];
    const lights = [(1 - e) * (1 - original), e * (1 - original), original].map((opacity, presentation) => {
      const active = presentation === 2 ? .38 : presentation;
      return { opacity: opacity <= .00001 ? 0 : opacity,
        angle: -2.24 + rotationAt(p, presentation === 2 ? 0 : presentation),
        flat: .23 + .075 * active, detail: .62 + .16 * active };
    });
    const r = reliefMasks();
    const detailWidth = Math.max(.52, .72 / pixelScale);
    return { faces, lights, detailExposure: Math.min(1, detailWidth / r.spacing / .5) };
  }
  // Bilderna som grafikkretsen behöver: skivans yta och spårens masker.
  const gpuSources = () => ({ surface: ensureSurface(), relief: reliefMasks(), pixelScale });

  function draw(c, phase, energy, originalAmount = 0, gpu = false) {
    const p = Number.isFinite(phase) ? phase : 0;
    const e = Math.max(0, Math.min(1, Number(energy) || 0));
    const original = Math.max(0, Math.min(1, Number(originalAmount) || 0));
    c.save();
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    // Mastering exposes a slim dark sidewall beneath the unchanged round face.
    // Its depth depends only on the mode blend, never on musical hits or time.
    c.save();
    const depth = 2.7 + 15 * e;
    c.translate(0, depth);
    const lip = c.createLinearGradient(-210, 0, 210, 90);
    lip.addColorStop(0, '#242136');
    lip.addColorStop(.45, '#080a15');
    lip.addColorStop(1, '#202c4e');
    c.fillStyle = lip;
    circle(c, 224); c.fill();
    if (e > 0) {
      c.globalAlpha = e;
      // Shade from the front's curved edge into the underside. A straight
      // vertical gradient made the lower crescent read as a separate flat band.
      const wall = c.createRadialGradient(0, -depth, 224, 0, -depth, 224 + depth);
      wall.addColorStop(0, '#28283f');
      wall.addColorStop(.16, '#202338');
      wall.addColorStop(.40, '#141929');
      wall.addColorStop(.72, '#090c15');
      wall.addColorStop(1, '#05050b');
      c.fillStyle = wall;
      circle(c, 224); c.fill();
    }
    c.restore();
    // The processing sidewall has its own six-turn light. Original instead
    // keeps the quiet stationary bevel and one coherent rotating face.
    sidewallLight(c, p, e, 1 - original);
    ensureSurface();
    // Med grafikkretsen (gpu-disc.js) ritas skivans yta, ringen som snurrar
    // och kantens två streck där i stället. Här tas exakt det de täcker bort
    // ur duken: samma bild och samma två streck, fast som hål. Det som låg
    // under (kanten nedanför, skuggan, bakgrundsljuset) blir då kvar precis
    // så mycket som ytan släppte igenom förut.
    if (gpu) c.globalCompositeOperation = 'destination-out';
    if (surface) c.drawImage(root.MastrifyCanvas?.imageSource(surface) || surface, -226, -226, 452, 452);
    else base(c);

    if (!gpu) {
    c.save();
    annulus(c);
    const paintFace = (presentation, opacity) => {
      const active = presentation === 2 ? .38 : presentation;
      c.save();
      c.globalAlpha = opacity;
      c.rotate(rotationAt(p, presentation === 2 ? 0 : presentation));
      const face = faceAt(presentation);
      if (face) c.drawImage(root.MastrifyCanvas?.imageSource(face) || face, -226, -226, 452, 452);
      else {
        base(c);

      }
      c.restore();
    };
    // Fade between complete periodic motions instead of blending phase rates,
    // which would jump when a mode change crosses the shared loop boundary.
    if (e < 1 && original < 1) paintFace(0, 1 - original);
    if (e > 0 && original < 1) paintFace(1, e * (1 - original));
    // One cache contains the complete Original texture and its paired studio
    // reflection. Both share exactly one lap in twelve seconds, with no
    // secondary angular velocity, independent glint, or change in geometry.
    if (original > 0) paintFace(2, original);
    // Circles do not change when a record rotates. Keeping their raster grid
    // upright prevents the cardinal moire patches from a rotating fine bitmap.
    c.globalAlpha = 1;
    drawRelief(c);
    const paintLight = (presentation, opacity) => {
      if (opacity <= .00001) return;
      const active = presentation === 2 ? .38 : presentation;
      const angle = -2.24 + rotationAt(p, presentation === 2 ? 0 : presentation);
      c.globalAlpha = opacity;
      specular(c, angle, .23 + .075 * active, false);
      specular(c, angle, .62 + .16 * active, true);
    };
    paintLight(0, (1 - e) * (1 - original));
    paintLight(1, e * (1 - original));
    paintLight(2, original);
    c.restore();
    }

    const rim = c.createLinearGradient(...RIM.line);
    for (const [offset, r, g, b, a] of rimStops(e)) rim.addColorStop(offset, `rgba(${r},${g},${b},${a})`);
    c.strokeStyle = rim;
    c.lineWidth = RIM.width;
    circle(c, RIM.radius); c.stroke();
    if (e > 0) {
      // The fine chamfer shares the original rim, so it reads as a raised edge
      // rather than an additional orbit or an inflated border.
      c.globalAlpha = e;
      const chamfer = c.createLinearGradient(...RIM.chamferLine);
      for (const [offset, r, g, b, a] of CHAMFER_STOPS) chamfer.addColorStop(offset, `rgba(${r},${g},${b},${a})`);
      c.strokeStyle = chamfer;
      c.lineWidth = RIM.chamferWidth;
      circle(c, RIM.radius); c.stroke();
    }
    c.restore();
  }

  root.MastrifyVinyl = Object.freeze({ draw, drawLabel, rotationAt, setPixelScale, getGrooves, drawGrooves,
    beginGrooveLayers, addGrooveLayer, drawGrooveLayers, grooveLayersFresh,
    prepare: prepareResources, hasGroovePaint, annulusPlan, gpuSources, SPECULAR_STOPS, rimStops, CHAMFER_STOPS, RIM });
})(window);
