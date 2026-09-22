/* Mastrify collar spectrum. All arc positions and radii are fixed.
 * Only their light levels change. The established circulating light remains
 * visible; actual audio adds emphasis without extinguishing the collar.
 */
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const BIN_COUNT = 64;
  // Clear the raised LP's lower sidewall (reaches 241.7), keeping every row
  // visible for the full 360 degrees inside the unbroken 265-unit boundary.
  const RADII = [243.4, 247.7, 252, 256.3, 260.6];
  const ARC_HALF_SPAN = TAU / BIN_COUNT * .245;
  const clamp = value => Math.max(0, Math.min(1, value));
  const mix = (a, b, amount) => a + (b - a) * amount;
  function smoothstep(low, high, value) {
    const t = clamp((value - low) / (high - low));
    return t * t * (3 - 2 * t);
  }

  // Mirrored frequency order keeps both sides of the collar visually balanced.
  // Broad, overlapping bands move together instead of flickering independently.
  const bins = Array.from({ length: BIN_COUNT }, (_, index) => {
    const angle = -Math.PI / 2 + index * TAU / BIN_COUNT;
    const frequency = .5 - .5 * Math.cos(index * TAU / BIN_COUNT);
    const bass = Math.exp(-(((frequency - .08) / .31) ** 2));
    const middle = Math.exp(-(((frequency - .5) / .29) ** 2));
    const treble = Math.exp(-(((frequency - .94) / .27) ** 2));
    const total = bass + middle + treble;
    const colorMix = .5 + .5 * Math.cos(angle);
    return {
      angle,
      paths: RADII.map(radius => {
        const path=new Path2D(), start=angle-ARC_HALF_SPAN;
        path.moveTo(Math.cos(start)*radius,Math.sin(start)*radius);
        path.arc(0,0,radius,start,angle+ARC_HALF_SPAN);
        return path;
      }),
      bass: bass / total,
      middle: middle / total,
      treble: treble / total,
      color: [
        mix(158, 82, colorMix),
        mix(105, 153, colorMix),
        mix(244, 250, colorMix)
      ]
    };
  });

  function draw(ctx, phase, energy) {
    const e = clamp(Number.isFinite(energy) ? energy : 0);
    if (e <= 0) return;
    const p = Number.isFinite(phase) ? ((phase % TAU) + TAU) % TAU : 0;
    const head = 6 * p - Math.PI / 2;
    const music = root.MastrifyScore?.sample(p, 'rim');
    const bass = .54 + .15 * Math.sin(2 * p - .4) + .07 * Math.sin(4 * p + .8) + (music?.realAudio ? .18 * music.bass : 0);
    const middle = .47 + .14 * Math.sin(3 * p + .8) + .06 * Math.sin(p - .6) + (music?.realAudio ? .18 * music.mid : 0);
    const treble = .4 + .11 * Math.sin(4 * p + 1.7) + .05 * Math.sin(2 * p + 1.1) + (music?.realAudio ? .18 * music.air : 0);

    ctx.save();
    ctx.globalAlpha *= e;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    for (let index = 0; index < BIN_COUNT; index++) {
      const bin = bins[index];
      // Circular Gaussian: symmetric around the main rim light, without a tail
      // or a discontinuity at angle zero. Follow the constant two-second turn.
      const focus = Math.exp(4.8 * (Math.cos(bin.angle - head) - 1));
      const band = bin.bass * bass + bin.middle * middle + bin.treble * treble;
      const contour = .055 * Math.sin(5 * bin.angle + 2 * p) + .035 * Math.sin(11 * bin.angle - 4 * p);
      const amplitude = clamp(.18 + .62 * band + contour + .28 * focus);

      for (let level = 0; level < RADII.length; level++) {
        const threshold = (level + .55) / RADII.length;
        const lit = smoothstep(threshold - .17, threshold + .08, amplitude);
        const opacity = (.09 + lit * (.25 + .38 * focus)) * (1 - level * .055);
        const white = focus * lit * .77;
        const red = Math.round(mix(bin.color[0], 235, white));
        const green = Math.round(mix(bin.color[1], 237, white));
        const blue = Math.round(mix(bin.color[2], 255, white));
        const color = `rgba(${red},${green},${blue},${opacity})`;
        // Each arc has one flat color, including its round caps. Paint that
        // directly instead of resolving 128 conic stops at every rim pixel.
        ctx.strokeStyle=color;
        ctx.lineWidth=level===RADII.length-1 ? 1.35 : 1.6;
        ctx.stroke(bin.paths[level]);
      }
    }
    ctx.restore();
  }

  root.MastrifySpectrum = Object.freeze({ draw });
})(typeof window !== 'undefined' ? window : globalThis);
