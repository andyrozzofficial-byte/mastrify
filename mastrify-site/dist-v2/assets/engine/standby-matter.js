/* Quiet Mastrify matter inside the standby collar. Cached, closed ribbons
 * circulate through a translucent film; the host owns the twelve-second phase.
 * energy is the host's ACTIVE amount: 0 shows this material, 1 draws nothing.
 */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const INNER = 225, OUTER = 264;
  const clamp = value => Math.max(0, Math.min(1, value));
  const mix = (a, b, amount) => a + (b - a) * amount;

  const annulus = new Path2D();
  annulus.arc(0, 0, OUTER, 0, TAU);
  annulus.moveTo(INNER, 0);
  annulus.arc(0, 0, INNER, 0, TAU, true);

  // Radius, thickness, radial wave, angular frequency, phase, revolutions per
  // twelve seconds, opacity. The bands never expand or travel toward the LP.
  const definitions = [
    [231, 4.2, 1.6, 2, .5, -1, .042],
    [235.4, 6.8, 3.1, 3, 1.3, 1, .055],
    [242.1, 8.2, 4.0, 2, 2.2, -1, .064],
    [248.9, 7.6, 4.0, 3, .7, 1, .066],
    [254.2, 5.6, 3.1, 2, 2.8, -2, .053],
    [259.1, 3.3, 1.4, 3, 1.8, 2, .039]
  ];
  const SEGMENTS = 144;
  const ribbons = definitions.map(([radius, thickness, amplitude, frequency, offset, turns, opacity]) => {
    const path = new Path2D();
    function point(angle, side) {
      const ripple = .72 * Math.sin(frequency * angle + offset)
        + .28 * Math.sin((frequency + 2) * angle - offset * .6);
      const width = thickness * (.78 + .22 * Math.cos(2 * angle + offset));
      const r = radius + amplitude * ripple + side * width * .5;
      return [Math.cos(angle) * r, Math.sin(angle) * r];
    }
    const first = point(0, 1);
    path.moveTo(first[0], first[1]);
    for (let i = 1; i <= SEGMENTS; i++) path.lineTo(...point(i / SEGMENTS * TAU, 1));
    const inner = point(TAU, -1);
    path.lineTo(inner[0], inner[1]);
    for (let i = SEGMENTS - 1; i >= 0; i--) path.lineTo(...point(i / SEGMENTS * TAU, -1));
    path.closePath();
    return { path, offset, turns, opacity };
  });

  function draw(ctx, phase, energy) {
    const active = clamp(Number.isFinite(energy) ? energy : 0);
    const visibility = 1 - active;
    if (visibility <= 0 || typeof ctx.createConicGradient !== 'function') return;
    const p = Number.isFinite(phase) ? ((phase % TAU) + TAU) % TAU : 0;
    ctx.save();
    try {
      ctx.clip(annulus, 'evenodd');
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha *= visibility;
      ctx.shadowColor = 'rgba(0,0,0,0)';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // A faint continuous meniscus gives the thin existing strands a body.
      // Both radial edges fade to transparent, leaving the original outer
      // circle and the vinyl edge to define their own exact silhouettes.
      const film = ctx.createRadialGradient(0, 0, INNER, 0, 0, OUTER);
      film.addColorStop(0, 'rgba(113,91,239,0)');
      film.addColorStop(.18, 'rgba(113,91,239,.034)');
      film.addColorStop(.5, 'rgba(103,103,239,.058)');
      film.addColorStop(.82, 'rgba(90,118,244,.032)');
      film.addColorStop(1, 'rgba(90,118,244,0)');
      ctx.fillStyle = film;
      ctx.fill(annulus, 'evenodd');

      for (const ribbon of ribbons) {
        ctx.save();
        ctx.rotate(ribbon.turns * p);
        const density = ctx.createConicGradient(0, 0, 0);
        const current = -p + ribbon.offset;
        const breath = .88 + .12 * Math.sin(p + ribbon.offset);
        for (let i = 0; i <= 32; i++) {
          const angle = i === 32 ? 0 : i / 32 * TAU;
          const first = Math.exp(2.2 * (Math.cos(angle - current) - 1));
          const second = .52 * Math.exp(3.3 * (Math.cos(angle - current - 2.75) - 1));
          const light = first + second;
          // Counter-rotate the palette so violet stays mainly on the left
          // and blue on the right while the material itself keeps flowing.
          const blue = .5 + .5 * Math.cos(angle + ribbon.turns * p);
          const silver = .13 * first * (.5 + .5 * Math.sin(p + ribbon.offset));
          const red = mix(mix(164, 65, blue), 210, silver);
          const green = mix(mix(82, 162, blue), 221, silver);
          const alpha = 2.25 * ribbon.opacity * breath * (.3 + .94 * light);
          density.addColorStop(i / 32,
            `rgba(${Math.round(red)},${Math.round(green)},255,${alpha})`);
        }
        ctx.fillStyle = density;
        ctx.fill(ribbon.path);
        ctx.restore();
      }
    } finally {
      ctx.restore();
    }
  }

  root.MastrifyStandbyMatter = Object.freeze({ draw });
})(typeof window !== 'undefined' ? window : globalThis);
