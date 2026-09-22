/* Completed MASTER playback finish. The host supplies the visibility fade,
 * twelve-second phase, and the undelayed source score. Geometry stays fixed.
 * Static fine grooves are rasterized once; no live blur buffers or particles.
 */
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = value => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  const channel = (score, name) => clamp(score && score[name]);
  const wrap = value => Number.isFinite(value) ? ((value % TAU) + TAU) % TAU : 0;
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const EMPTY_DASH = [];
  const CLEAR = 'rgba(0,0,0,0)';

  function addCircle(path, radius) {
    path.moveTo(radius, 0);
    path.arc(0, 0, radius, 0, TAU);
  }

  function annulus(inner, outer) {
    const path = new Path2D();
    addCircle(path, outer);
    path.moveTo(inner, 0);
    path.arc(0, 0, inner, 0, TAU, true);
    return path;
  }

  const faceClip = annulus(118, 218);
  const rimClip = annulus(196, 248);
  const lip = new Path2D();
  addCircle(lip, 224.5);
  const grooves = new Path2D();
  const fineGrooves = new Path2D();
  // Follow the evenly spaced cut already used by vinyl.js.
  for (let index = 1; index < 79; index++) {
    const radius = 117.5 + index * 1.25;
    addCircle(grooves, radius);
    if (index % 3 === 0) addCircle(fineGrooves, radius);
  }

  const originalPaths = [
    new Path2D('M4 32 C10 18 16 38 22 28 S34 16 40 28'),
    new Path2D('M4 36 C12 28 20 40 28 32 S36 24 40 36'),
    new Path2D('M6 30 C14 22 22 34 30 26 S38 18 42 30')
  ];
  // The reflected first control points below expand SVG's S commands exactly.
  // Length estimates only place the moving light; Canvas draws the source path.
  const curveControlPoints = [
    [[4,32,10,18,16,38,22,28], [22,28,28,18,34,16,40,28]],
    [[4,36,12,28,20,40,28,32], [28,32,36,24,36,24,40,36]],
    [[6,30,14,22,22,34,30,26], [30,26,38,18,38,18,42,30]]
  ];
  function cubicLength(points) {
    let length = 0, previousX = points[0], previousY = points[1];
    for (let step = 1; step <= 96; step++) {
      const t = step / 96, u = 1 - t;
      const a = u * u * u, b = 3 * u * u * t, d = 3 * u * t * t, e = t * t * t;
      const x = a * points[0] + b * points[2] + d * points[4] + e * points[6];
      const y = a * points[1] + b * points[3] + d * points[5] + e * points[7];
      length += Math.hypot(x - previousX, y - previousY);
      previousX = x; previousY = y;
    }
    return length;
  }
  const lengths = curveControlPoints.map(curves => cubicLength(curves[0]) + cubicLength(curves[1]));
  const widths = [2.6, 1.5, 1.5];
  const opacities = [1, 1, .75];
  const trailPasses = [
    { dash: [9, 512], extraWidth: 2.5, alpha: .045 },
    { dash: [6.2, 512], extraWidth: 1.5, alpha: .11 },
    { dash: [3.5, 512], extraWidth: .8, alpha: .26 },
    { dash: [1.6, 512], extraWidth: .48, alpha: .80 }
  ];
  const bassPasses = [[32, .022], [20, .040], [10, .065], [4, .14], [1.15, .28]];
  const stereoPasses = [[25, .025], [13, .050], [5, .12], [1.2, .28]];
  let surfaceStamps = null;
  let innerRimStamp = null;
  const innerRimClip = annulus(111.55, 124);

  function buildInnerRimStamp() {
    if (innerRimStamp) return innerRimStamp;
    const density = 3, extent = 124, size = extent * 2 * density;
    const canvas = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(size, size) : root.document.createElement('canvas');
    canvas.width = canvas.height = size;
    const brush = canvas.getContext('2d');
    if (!brush) return null;
    brush.setTransform(density, 0, 0, density, size / 2, size / 2);
    brush.clip(innerRimClip, 'evenodd');
    const ring = new Path2D();
    addCircle(ring, 114.1);
    // A complete quiet rim, plus one broad highlight baked into the same
    // texture. Rotation follows the vinyl exactly; no independent sweep.
    const color = brush.createConicGradient(-Math.PI * .5, 0, 0);
    color.addColorStop(0, 'rgba(165,119,255,.24)');
    color.addColorStop(.16, 'rgba(186,151,255,.58)');
    color.addColorStop(.27, 'rgba(213,214,255,.90)');
    color.addColorStop(.38, 'rgba(129,190,255,.70)');
    color.addColorStop(.57, 'rgba(90,139,246,.26)');
    color.addColorStop(.82, 'rgba(140,106,226,.17)');
    color.addColorStop(1, 'rgba(165,119,255,.24)');
    brush.strokeStyle = color;
    for (const [width, alpha] of [[15,.07],[9,.14],[4.5,.27],[2,.55],[.65,.90]]) {
      brush.globalAlpha = alpha;
      brush.lineWidth = width;
      brush.stroke(ring);
    }
    innerRimStamp = canvas;
    root.MastrifyCanvas?.cacheImage(canvas);
    return canvas;
  }

  function drawInnerRim(ctx, phase, originalAmount, masterAmount, score) {
    const original = clamp(originalAmount), master = clamp(masterAmount);
    if (original + master < .0001) return;
    const stamp = buildInnerRimStamp();
    if (!stamp) return;
    const pulse = smooth(channel(score, 'bass'));
    const strength = .58 + .24 * channel(score, 'level') + .30 * pulse;
    const p = wrap(phase);
    ctx.save();
    try {
      const opacity = prepare(ctx, 1);
      ctx.clip(innerRimClip, 'evenodd');
      // Match vinyl.js's endpoint crossfade: Original -p, Master -3p.
      // Mixing angular velocities here would visibly slip during A/B changes.
      if (original > .0001) {
        ctx.save();ctx.rotate(-p);
        ctx.globalAlpha = opacity * original * strength;
        ctx.drawImage(root.MastrifyCanvas?.imageSource(stamp) || stamp, -124, -124, 248, 248);ctx.restore();
      }
      if (master > .0001) {
        ctx.rotate(-3 * p);
        ctx.globalAlpha = opacity * master * strength * 1.16;
        ctx.drawImage(root.MastrifyCanvas?.imageSource(stamp) || stamp, -124, -124, 248, 248);
      }
    } finally { ctx.restore(); }
  }

  function buildSurfaceStamps() {
    if (surfaceStamps) return surfaceStamps;
    // Three pixels per record unit keeps the .38-unit etching crisp above the
    // host's capped 2x display density. Cache the exact same vector material,
    // so a changing float transform needn't rasterize ~100 circles per frame.
    const density = 3, extent = 219, size = extent * 2 * density;
    const stamps = [];
    for (let pass = 0; pass < 2; pass++) {
      const canvas = typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(size, size) : root.document.createElement('canvas');
      canvas.width = canvas.height = size;
      const brush = canvas.getContext('2d');
      if (!brush) return null;
      brush.setTransform(density, 0, 0, density, size / 2, size / 2);
      brush.clip(faceClip, 'evenodd');
      if (pass === 0) {
        const silver = brush.createLinearGradient(-205, -170, 200, 185);
        silver.addColorStop(0, 'rgba(102,151,237,.18)');
        silver.addColorStop(.22, 'rgba(166,191,233,.40)');
        silver.addColorStop(.39, 'rgba(207,220,247,.64)');
        silver.addColorStop(.59, 'rgba(113,157,230,.20)');
        silver.addColorStop(.80, 'rgba(162,191,241,.42)');
        silver.addColorStop(1, 'rgba(104,153,233,.20)');
        brush.strokeStyle = silver;
        brush.lineWidth = .56;
        brush.stroke(grooves);
      } else {
        brush.strokeStyle = '#c4dcff';
        brush.lineWidth = .38;
        brush.stroke(fineGrooves);
      }
      stamps.push(canvas);
    }
    surfaceStamps = stamps;
    return stamps;
  }

  function prepare(ctx, amount) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= amount;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
    ctx.shadowColor = CLEAR;
    ctx.filter = 'none';
    ctx.setLineDash(EMPTY_DASH);
    ctx.lineDashOffset = 0;
    return ctx.globalAlpha;
  }

  function drawSurface(ctx, phase, amount, score) {
    const visibility = clamp(amount);
    if (visibility === 0) return;
    const level = channel(score, 'level'), mid = channel(score, 'mid');
    const air = channel(score, 'air');
    const detail = root.MastrifyVinyl.getGrooves?.();
    const stamps = detail ? null : buildSurfaceStamps();
    if (!detail && !stamps) return;
    ctx.save();
    try {
      const opacity = prepare(ctx, visibility);
      // A fixed studio reflection exposes concentric material, with no moving
      // spotlight, radial scan, or filled patches over the record's texture.
      ctx.globalAlpha = opacity * (.17 + .16 * level + .10 * mid);
      if (detail) {
        ctx.clip(faceClip, 'evenodd');
        if (!root.MastrifyVinyl.hasGroovePaint?.('finish-silver')) {
          const silver = ctx.createLinearGradient(-205, -170, 200, 185);
          for (const [offset, color] of [[0,'rgba(102,151,237,.18)'],[.22,'rgba(166,191,233,.40)'],
            [.39,'rgba(207,220,247,.64)'],[.59,'rgba(113,157,230,.20)'],[.80,'rgba(162,191,241,.42)'],[1,'rgba(104,153,233,.20)']])
            silver.addColorStop(offset, color);
          ctx.strokeStyle = silver;
        }
        ctx.lineWidth = Math.max(.56, .72 / detail.pixelScale);
        root.MastrifyVinyl.drawGrooves(ctx, 'all', 'finish-silver');
      } else ctx.drawImage(stamps[0], -219, -219, 438, 438);
      // Treble reveals a finer subset of the same grooves. It only changes
      // their exposure; phase adds a restrained, exactly periodic shimmer.
      ctx.globalAlpha = opacity * (.025 + .31 * air) * (.94 + .06 * Math.cos(2 * wrap(phase)));
      if (detail) {
        ctx.strokeStyle = '#c4dcff'; ctx.lineWidth = Math.max(.38, .56 / detail.pixelScale);
        root.MastrifyVinyl.drawGrooves(ctx, 'fine', 'finish-air');
      } else ctx.drawImage(stamps[1], -219, -219, 438, 438);
    } finally {
      ctx.restore();
    }
  }

  function drawRim(ctx, phase, amount, score, gain = 1) {
    const visibility = clamp(amount);
    if (visibility === 0) return;
    const bass = channel(score, 'bass'), accent = channel(score, 'accent');
    const level = channel(score, 'level');
    const left = Number.isFinite(score && score.left) ? channel(score, 'left') : level;
    const right = Number.isFinite(score && score.right) ? channel(score, 'right') : level;
    const width = channel(score, 'width');
    // A smooth threshold keeps bass bloom brief. The strongest accent has a
    // modest extra crest, while the lip radius and all stroke widths stay fixed.
    const bassEnvelope = smooth((bass - .12) / .88);
    const impact = 1.65 * Math.max(0, Math.min(1.5, gain))
      * Math.pow(bassEnvelope, 1.35) * (1 + .18 * accent);
    const lateral = .28 + .72 * width;
    ctx.save();
    try {
      const opacity = prepare(ctx, visibility);
      ctx.clip(rimClip, 'evenodd');
      // Center bass drives the entire existing lip with identical brightness.
      // The color stays cool and neutral so a centered kick cannot imply pan.
      ctx.strokeStyle = '#9faeff';
      for (let pass = 0; pass < bassPasses.length; pass++) {
        ctx.lineWidth = bassPasses[pass][0];
        ctx.globalAlpha = opacity * impact * bassPasses[pass][1];
        ctx.stroke(lip);
      }
      // Each channel owns its side. Width broadens their smooth angular reach
      // around this same lip, without translating, rotating, or enlarging it.
      const shoulder = .12 + .17 * width;
      const stereo = ctx.createLinearGradient(-245, 0, 245, 0);
      stereo.addColorStop(0, `rgba(171,142,255,${left * lateral})`);
      stereo.addColorStop(shoulder, `rgba(171,158,255,${left * lateral * .42})`);
      stereo.addColorStop(.5, CLEAR);
      stereo.addColorStop(1 - shoulder, `rgba(117,182,255,${right * lateral * .42})`);
      stereo.addColorStop(1, `rgba(102,176,255,${right * lateral})`);
      ctx.strokeStyle = stereo;
      for (let pass = 0; pass < stereoPasses.length; pass++) {
        ctx.lineWidth = stereoPasses[pass][0];
        ctx.globalAlpha = opacity * stereoPasses[pass][1];
        ctx.stroke(lip);
      }
    } finally {
      ctx.restore();
    }
  }

  function drawLogoFlow(ctx, phase, amount, score, logoPaths) {
    const visibility = clamp(amount);
    if (visibility === 0) return;
    const paths = logoPaths || originalPaths;
    const response = .36 * channel(score, 'bass') + .22 * channel(score, 'mid')
      + .12 * channel(score, 'air') + .14 * channel(score, 'accent')
      + .16 * channel(score, 'level');
    const strength = .12 + .88 * response;
    const p = wrap(phase);
    ctx.save();
    try {
      const opacity = prepare(ctx, visibility);
      // Caller has already applied scale(4.45), translate(-24,-24), and
      // translate(1.6,-3). Paint this BEFORE all three crisp original strokes.
      const light = ctx.createLinearGradient(3, 26, 43, 30);
      light.addColorStop(0, '#b379ff');
      light.addColorStop(.38, '#c6b4ff');
      light.addColorStop(.67, '#accbff');
      light.addColorStop(1, '#6abbff');
      ctx.strokeStyle = light;
      for (let index = 0; index < 3; index++) {
        // Two constant-speed traversals in twelve seconds, staggered by curve.
        // The head and trail leave each open path fully before its phase wraps.
        const progress = ((2 * p / TAU + index * .21) % 1 + 1) % 1;
        const head = progress * (lengths[index] + 20) - 10;
        for (let pass = 0; pass < trailPasses.length; pass++) {
          const trail = trailPasses[pass];
          ctx.setLineDash(trail.dash);
          ctx.lineDashOffset = trail.dash[0] - head;
          ctx.lineWidth = widths[index] + trail.extraWidth;
          ctx.globalAlpha = opacity * strength * opacities[index] * trail.alpha;
          ctx.stroke(paths[index]);
        }
      }
    } finally {
      ctx.restore();
    }
  }

  function prepareResources() {
    // Build immutable finish materials before the first user-triggered reveal.
    // The one-pixel target is private; no intermediate mode reaches the page.
    buildInnerRimStamp();
    const target = root.document.createElement('canvas');
    target.width = target.height = 1;
    const brush = root.MastrifyCanvas?.context2D(target, { stableGradients: true }) || target.getContext('2d');
    if (brush) drawSurface(brush, 0, 1, null);
  }
  root.MastrifyMasterFinish = Object.freeze({ prepare: prepareResources, drawSurface, drawRim, drawInnerRim, drawLogoFlow });
})(typeof window !== 'undefined' ? window : globalThis);
