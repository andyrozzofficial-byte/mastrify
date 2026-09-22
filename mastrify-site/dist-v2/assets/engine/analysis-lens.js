/* Focus Lens — selected Analyze-only Sonic Flow renderer.
 * Host clears/draws the baseline and owns RAF/DPR. Coordinates are CSS pixels.
 * bars are sorted {x, top, bottom}; top/bottom are absolute source y positions.
 */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const rgba = (rgb, a) => `rgba(${rgb},${clamp(a, 0, 1)})`;
  const ICE = '196,229,255', VIOLET = '172,128,255', BLUE = '103,173,255';

  // One small scratch set per canvas; source samples and output paths retain
  // their exact double-precision coordinates without per-point garbage.
  const scratchByContext = new WeakMap();
  function scratchFor(c) {
    let scratch = scratchByContext.get(c);
    if (!scratch) {
      scratch = { x: new Float64Array(97), top: new Float64Array(97),
        bottom: new Float64Array(97), valid: new Uint8Array(97), sample: { top: 0, bottom: 0 } };
      scratchByContext.set(c, scratch);
    }
    return scratch;
  }
  const contourPasses = [[10, .036], [4, .12], [1.25, .83]];
  const rimPasses = [[0, 24, .018], [0, 18, .035], [0, 12, .07], [0, 7, .14],
    [0, 3.1, .43], [0, 1.2, .96], [-5, .6, .30], [7, .55, .32]];
  const arcPasses = [[7, .05], [2.3, .32], [.8, .62]];
  const bracketAngles = [-Math.PI * .76, Math.PI * .24], sides = [-1, 1];
  const captions = ['Reading transients', 'Tracing detail', 'Listening to balance'];

  function sourceAt(bars, x, sample) {
    if (x < bars[0].x || x > bars[bars.length - 1].x) return null;
    let lo = 0, hi = bars.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >>> 1;
      if (bars[mid].x <= x) lo = mid; else hi = mid;
    }
    const a = bars[lo], b = bars[hi];
    const u = b.x === a.x ? 0 : clamp((x - a.x) / (b.x - a.x), 0, 1);
    const top = a.top + (b.top - a.top) * u;
    const bottom = a.bottom + (b.bottom - a.bottom) * u;
    if (!Number.isFinite(top) || !Number.isFinite(bottom)) return null;
    sample.top = top; sample.bottom = bottom;
    return sample;
  }
  function ellipse(c, x, y, rx, ry, a = 0, b = TAU) {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, a, b);
  }
  function mark(c, x, y, color, strength = 1) {
    c.beginPath(); c.arc(x, y, 5, 0, TAU);
    c.strokeStyle = rgba(color, .44 * strength); c.lineWidth = .8; c.stroke();
    c.beginPath(); c.arc(x, y, 1.7, 0, TAU);
    c.fillStyle = rgba(ICE, .96 * strength); c.fill();
  }

  function lens(c, frame) {
    const { w, h, bars } = frame;
    const amount = clamp(Number.isFinite(frame.amount) ? frame.amount : 1, 0, 1);
    if (amount <= .00001) return;
    if (!(w > 0 && h > 0) || !bars || bars.length < 2) return;
    const middle = Number.isFinite(frame.middle) ? frame.middle : h * .5;
    const p = frame.reducedMotion ? .5 : clamp(Number(frame.p) || 0, 0, 1);
    const time = frame.reducedMotion ? 0 : Number(frame.t) || 0;
    const pad = Number.isFinite(frame.pad) ? frame.pad : bars[0].x;
    const usable = Number.isFinite(frame.usable) ? frame.usable : bars[bars.length - 1].x - pad;
    const focus = clamp(pad + p * usable, bars[0].x, bars[bars.length - 1].x);
    const rx = Math.max(22, Math.min(143, w * .235, h * .335));
    const ry = rx * .91;
    const cx = clamp(focus, rx + 15, w - rx - 15);
    const cy = clamp(middle - h * .018, ry + 24, h - ry - 27);
    const zoomX = w < 520 ? 2.0 : 2.45;
    const zoomY = 1.38;
    const steps = w < 520 ? 62 : 96;
    const breath = frame.reducedMotion ? 1 : .94 + .06 * Math.sin(time * 1.35);
    const ink = c.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    ink.addColorStop(0, '#af80ff'); ink.addColorStop(.32, '#c6b1ff');
    ink.addColorStop(.60, '#f3f8ff'); ink.addColorStop(1, '#72b9ff');

    c.save(); c.globalAlpha = amount; c.lineCap = 'round'; c.lineJoin = 'round';
    c.globalCompositeOperation = 'source-over';

    // The glass remains local. The original wave outside it is untouched.
    ellipse(c, cx, cy, rx, ry);
    const glass = c.createRadialGradient(cx - rx * .25, cy - ry * .4, 0, cx, cy, rx * 1.25);
    glass.addColorStop(0, 'rgba(38,40,77,.91)');
    glass.addColorStop(.58, 'rgba(12,17,36,.94)');
    glass.addColorStop(1, 'rgba(16,13,31,.96)');
    c.fillStyle = glass; c.fill();

    c.save(); ellipse(c, cx, cy, rx - 3, ry - 3); c.clip();
    const sheen = c.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    sheen.addColorStop(0, 'rgba(186,154,255,.11)');
    sheen.addColorStop(.48, 'rgba(130,195,255,.015)');
    sheen.addColorStop(1, 'rgba(117,149,255,.08)');
    c.fillStyle = sheen; c.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);

    // A quiet optical graticule gives depth without simulating measurements.
    c.strokeStyle = 'rgba(143,178,222,.09)'; c.lineWidth = .65;
    c.beginPath();
    for (let k = -2; k <= 2; k++) {
      const gy = cy + k * ry * .31;
      c.moveTo(cx - rx, gy); c.lineTo(cx + rx, gy);
    }
    c.stroke();
    ellipse(c, cx, cy, rx * .7, ry * .72); c.strokeStyle = 'rgba(153,177,226,.065)'; c.stroke();

    // Magnify ONLY the supplied waveform. No oscillators fabricate this contour.
    const scratch = scratchFor(c), { x: xs, top: upper, bottom: lower, valid } = scratch;
    const ticks = new Path2D();
    for (let i = 0; i <= steps; i++) {
      const localX = -rx + i / steps * rx * 2;
      const sample = sourceAt(bars, focus + localX / zoomX, scratch.sample);
      valid[i] = sample ? 1 : 0;
      if (!sample) continue;
      const x = cx + localX;
      const top = cy + (sample.top - middle) * zoomY;
      const bottom = cy + (sample.bottom - middle) * zoomY;
      xs[i] = x; upper[i] = top; lower[i] = bottom;
      ticks.moveTo(x, top); ticks.lineTo(x, bottom);
    }
    const contour = new Path2D(), body = new Path2D();
    let start = 0;
    while (start <= steps) {
      while (start <= steps && !valid[start]) start++;
      if (start > steps) break;
      let end = start; while (end + 1 <= steps && valid[end + 1]) end++;
      contour.moveTo(xs[start], upper[start]); body.moveTo(xs[start], upper[start]);
      for (let i = start + 1; i <= end; i++) { contour.lineTo(xs[i], upper[i]); body.lineTo(xs[i], upper[i]); }
      contour.moveTo(xs[start], lower[start]);
      for (let i = start + 1; i <= end; i++) contour.lineTo(xs[i], lower[i]);
      for (let i = end; i >= start; i--) body.lineTo(xs[i], lower[i]);
      body.closePath(); start = end + 1;
    }
    c.globalCompositeOperation = 'lighter'; c.fillStyle = ink; c.globalAlpha = amount * (.045); c.fill(body);
    for (const [width, alpha] of contourPasses) {
      c.lineWidth = width; c.globalAlpha = amount * (alpha * breath); c.strokeStyle = ink; c.stroke(contour);
    }
    c.globalAlpha = amount * (.46); c.lineWidth = w < 520 ? 1.15 : 1.35; c.strokeStyle = ink; c.stroke(ticks);
    // The focal band follows the same sample, so its brightest peaks stay honest.
    c.save(); c.beginPath(); c.rect(cx - 13, cy - ry, 26, ry * 2); c.clip();
    c.globalAlpha = amount * (.68); c.strokeStyle = '#e8f5ff'; c.lineWidth = 1.25; c.stroke(ticks); c.restore();
    c.globalAlpha = amount * (1);
    const focusSample = sourceAt(bars, focus, scratch.sample);
    if (focusSample) {
      for (let endpoint = 0; endpoint < 2; endpoint++) {
        const yy = endpoint === 0 ? focusSample.top : focusSample.bottom;
        const y = cy + (yy - middle) * zoomY;
        mark(c, cx, y, ICE, .85);
        c.beginPath(); c.moveTo(cx - 8, y); c.lineTo(cx - 4, y);
        c.moveTo(cx + 4, y); c.lineTo(cx + 8, y);
        c.strokeStyle = 'rgba(211,237,255,.82)'; c.lineWidth = .8; c.stroke();
      }
    }
    c.restore();

    // The whole aperture emits a continuous violet / ice-blue / white rim.
    // Matching first/last colors close the seam; only color slowly circulates.
    const rim = c.createConicGradient(-Math.PI * .7 + time * .18, cx, cy);
    rim.addColorStop(0, '#b682ff'); rim.addColorStop(.19, '#d5b4ff');
    rim.addColorStop(.35, '#f0f8ff'); rim.addColorStop(.53, '#8fd4ff');
    rim.addColorStop(.70, '#79a9ff'); rim.addColorStop(.86, '#a08bff');
    rim.addColorStop(1, '#b682ff');
    c.globalCompositeOperation = 'lighter'; c.strokeStyle = rim;
    // Layered strokes form a soft bloom without blur/filter passes. The
    // widest stroke extends 12px: inside the existing bracket/tick envelope.
    for (const [offset, width, alpha] of rimPasses) {
      ellipse(c, cx, cy, rx + offset, ry + offset);
      c.lineWidth = width; c.globalAlpha = amount * (alpha); c.stroke();
    }
    c.globalAlpha = amount * (1);
    const arcStart = -.90 + .11 * Math.sin(time * .6);
    for (const [width, alpha] of arcPasses) {
      ellipse(c, cx, cy, rx + 1, ry + 1, arcStart, arcStart + .9);
      c.lineWidth = width; c.strokeStyle = rgba(ICE, alpha); c.stroke();
    }
    // Separated curved brackets emphasize the moving observation aperture.
    for (const angle of bracketAngles) {
      ellipse(c, cx, cy, rx + 10, ry + 10, angle - .18, angle + .18);
      c.lineWidth = 1.7; c.strokeStyle = ink; c.globalAlpha = amount * (.7); c.stroke();
    }
    c.globalAlpha = amount * (.34); c.lineWidth = .8; c.strokeStyle = ink; c.beginPath();
    for (let k = 0; k < 24; k++) {
      const a = k / 24 * TAU, cs = Math.cos(a), sn = Math.sin(a);
      c.moveTo(cx + cs * (rx + 7), cy + sn * (ry + 7));
      c.lineTo(cx + cs * (rx + (k % 3 ? 9 : 12)), cy + sn * (ry + (k % 3 ? 9 : 12)));
    }
    c.stroke(); c.globalAlpha = amount * (1);

    // Contextual pinpoints are located on actual neighboring source peaks.
    for (const side of sides) {
      const sx = clamp(cx + side * (rx + 36), bars[0].x, bars[bars.length - 1].x);
      if (Math.abs(sx - cx) < rx + 13) continue;
      const sample = sourceAt(bars, sx, scratch.sample); if (!sample) continue;
      const sy = side < 0 ? sample.top : sample.bottom;
      if (!(sy > 9 && sy < h - 9)) continue;
      const ax = cx + side * (rx + 7), ay = cy + side * ry * .12;
      const color = side < 0 ? VIOLET : BLUE;
      c.beginPath(); c.moveTo(ax, ay);
      c.bezierCurveTo(ax + side * 18, ay, sx - side * 16, sy, sx, sy);
      c.lineWidth = .8; c.strokeStyle = rgba(color, .50); c.stroke();
      mark(c, sx, sy, color, .8);
    }
    // A tiny open focal cross stays restrained, leaving the data visible.
    c.beginPath(); c.moveTo(cx - 3.5, cy); c.lineTo(cx + 3.5, cy);
    c.moveTo(cx, cy - 3.5); c.lineTo(cx, cy + 3.5);
    c.lineWidth = .8; c.strokeStyle = 'rgba(221,239,255,.78)'; c.stroke();
    // Short optical notes share the real processing clock. No invented readings.
    const cycle = frame.reducedMotion ? 1.5 : ((time % 5) + 5) % 5;
    const label = captions[frame.reducedMotion ? 0 : Math.floor(Math.max(0, time) / 5) % captions.length];
    const count = frame.reducedMotion ? label.length : Math.floor(Math.max(0, cycle - .15) * 28);
    const fade = frame.reducedMotion ? 1 : Math.min(1, cycle / .25, (5 - cycle) / .75);
    if (count > 0 && fade > .001) {
      c.font = `${w < 520 ? 9.5 : 10.5}px ui-monospace, SFMono-Regular, Consolas, monospace`;
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      const shown = label.slice(0, count);
      const ty = Math.min(h - 10, cy + ry + 23);
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = amount * fade * .85; c.fillStyle = '#d4edff';
      c.fillText(shown, cx, ty);
    }
    c.restore();
  }
  root.MastrifyAnalysisLens = Object.freeze({ draw: lens });
})(typeof window !== 'undefined' ? window : globalThis);
