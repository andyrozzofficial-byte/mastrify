/* Machined LP collar deployment. Timing and geometry match radial-deploy.js;
   only the segment material and the integrated rim impact are changed. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const q = clamp((x - a) / (b - a), 0, 1); return q * q * (3 - 2 * q); };
  const rgba = (color, alpha) => `rgba(${color},${clamp(alpha, 0, 1)})`;
  const radii = [1.035, 1.079, 1.123];
  const order = [0, 4, 8, 2, 6, 10, 1, 5, 9, 3, 7, 11];
  const pieces = Array.from({ length: 36 }, (_, index) => {
    const ring = Math.floor(index / 12), sector = index % 12;
    return {
      ring, sector, angle: sector / 12 * TAU + ring * .026,
      delay: .015 + ring * .035 + order[sector] * .0045,
      direction: (sector + ring) % 2 ? 1 : -1
    };
  });
  function arc(ctx, radius, start, end) {
    ctx.beginPath(); ctx.arc(0, 0, radius, start, end);
  }
  function paint(ctx, frame) {
    const r = frame.r;
    if (!(r > 0) || !Number.isFinite(r)) return;
    const p = clamp(Number.isFinite(frame.progress) ? frame.progress : 0, 0, 1);
    if (frame.reducedMotion || p <= 0 || p >= 1) return;
    const front = !!frame.front;
    const fade = 1 - smooth(.78, 1, p);
    const fine = clamp(r / 266, .72, 1.25);
    const hostAlpha = Number.isFinite(ctx.globalAlpha) ? ctx.globalAlpha : 1;
    const impact = clamp((p - .625) / .255, 0, 1);
    const impactLight = impact > 0 && impact < 1 ? Math.pow(Math.sin(Math.PI * impact), 1.1) : 0;
    ctx.save();
    try {
      ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath(); ctx.arc(0, 0, r * 1.19, 0, TAU);
      ctx.moveTo(r * 1.005, 0); ctx.arc(0, 0, r * 1.005, 0, TAU, true); ctx.clip('evenodd');
      ctx.beginPath(); ctx.rect(-r * 1.2, front ? 0 : -r * 1.2, r * 2.4, r * 1.2); ctx.clip();

      // A dark, shallow metal body. Its light comes from one fine bevel, not a neon tube.
      const graphite = ctx.createLinearGradient(-r, -r, r, r);
      graphite.addColorStop(0, '#292631');
      graphite.addColorStop(.30, '#191922');
      graphite.addColorStop(.52, '#35363f');
      graphite.addColorStop(.68, '#1a1c25');
      graphite.addColorStop(1, '#10131c');
      const bevel = ctx.createLinearGradient(-r, -r, r, r);
      bevel.addColorStop(0, '#b293ed');
      bevel.addColorStop(.30, '#74659b');
      bevel.addColorStop(.50, '#dae4f2');
      bevel.addColorStop(.66, '#90b0d8');
      bevel.addColorStop(1, '#6a8ab0');

      for (const piece of pieces) {
        // These deployment values deliberately match the original helper exactly.
        const q = clamp((p - piece.delay) / .465, 0, 1);
        if (q <= 0) continue;
        const opening = 1 - Math.pow(1 - q, 4);
        const settle = q > .76 ? .0026 * Math.sin((q - .76) / .24 * TAU) * (1 - q) / .24 : 0;
        const radius = r * (1.008 + (radii[piece.ring] - 1.008) * opening + settle);
        const hinge = piece.direction * .13 * Math.pow(1 - q, 2);
        const center = piece.angle + hinge;
        const span = .015 + .427 * opening;
        const a = center - span * .5, b = center + span * .5;
        const middleY = Math.sin(center) * radius;
        if ((middleY >= 0) !== front && Math.abs(Math.sin(center)) > .3) continue;
        const visible = smooth(0, .075, q) * fade;
        const bodyStrength = [.40, .63, .96][piece.ring];
        const edgeStrength = [.18, .31, .64][piece.ring];
        const width = fine * 4.5;

        ctx.globalAlpha = hostAlpha * visible * bodyStrength;
        arc(ctx, radius, a, b);
        ctx.lineWidth = width; ctx.strokeStyle = graphite; ctx.stroke();

        // The inner lip provides depth; restrained purple/blue light catches the outer lip.
        arc(ctx, radius - width * .36, a, b);
        ctx.lineWidth = fine * .65; ctx.strokeStyle = 'rgba(4,6,12,.68)'; ctx.stroke();
        ctx.globalAlpha = hostAlpha * visible * edgeStrength;
        arc(ctx, radius + width * .37, a, b);
        ctx.lineWidth = fine * .72; ctx.strokeStyle = bevel; ctx.stroke();

        // One short reflected impact on the existing outer rim, with no extra orbit.
        if (piece.ring === 2 && impactLight > .001) {
          const reflection = Math.pow(Math.max(0, Math.cos(center + 1.05)), 12) * impactLight;
          if (reflection > .008) {
            ctx.globalAlpha = hostAlpha * visible;
            ctx.lineWidth = fine * 2.6;
            ctx.strokeStyle = rgba('146,165,225', reflection * .16); ctx.stroke();
            ctx.lineWidth = fine * .9;
            ctx.strokeStyle = rgba('232,241,252', reflection * .78); ctx.stroke();
          }
        }
      }
    } finally { ctx.restore(); }
  }
  root.MastrifyRadialDeploy = Object.freeze({ paint });
})(window);
