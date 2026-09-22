/* A one-shot aperture behind the record. Its fixed back plane opens from a
 * shallow slit into a deep, coloured well; the host projects the LP forward.
 * Two cached textures, no live blur, independent clock or changing LP mesh. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, DURATION = 1.9;
  const WORLD = 704, SIZE = 1408, HALF = WORLD / 2;
  let textures = null;
  const clamp = value => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  const ease = value => { const t = clamp(value); return t * t * t * (10 - 15 * t + 6 * t * t); };

  function canvas() {
    const element = root.document.createElement('canvas');
    element.width = element.height = SIZE;
    const ctx = element.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(SIZE / WORLD, 0, 0, SIZE / WORLD, SIZE / 2, SIZE / 2);
    return { element, ctx };
  }
  function colour(ctx) {
    const gradient = typeof ctx.createConicGradient === 'function'
      ? ctx.createConicGradient(0, 0, 0) : ctx.createLinearGradient(262, 0, -262, 0);
    gradient.addColorStop(0, '#62caff');
    gradient.addColorStop(.18, '#687bff');
    gradient.addColorStop(.40, '#b16aff');
    gradient.addColorStop(.55, '#bd78ff');
    gradient.addColorStop(.76, '#6a68ee');
    gradient.addColorStop(1, '#62caff');
    return gradient;
  }
  function annulus(ctx, inner, outer) {
    ctx.beginPath(); ctx.arc(0, 0, outer, 0, TAU);
    ctx.arc(0, 0, inner, 0, TAU, true); ctx.clip('evenodd');
  }
  function prepare() {
    if (textures) return true;
    if (!root.document?.createElement) return false;
    const body = canvas(), corona = canvas();
    if (!body || !corona) return false;
    const b = body.ctx, g = corona.ctx;

    // A deep recess with a lower contact shadow, contained inside the fixed
    // r265 collar. The current LP silhouette will occlude all its centre.
    const cavity = b.createRadialGradient(0, 7, 219, 0, 7, 261);
    cavity.addColorStop(0, 'rgba(2,3,12,.20)');
    cavity.addColorStop(.22, 'rgba(2,3,12,.90)');
    cavity.addColorStop(.60, 'rgba(3,4,17,.96)');
    cavity.addColorStop(.87, 'rgba(8,7,25,.62)');
    cavity.addColorStop(1, 'rgba(8,7,25,0)');
    b.fillStyle = cavity; b.fillRect(-HALF, -HALF, WORLD, WORLD);

    // Coloured inner walls are broad, with one recessed bevel. They stay on
    // the back plane instead of sweeping over the record's grooves.
    b.save(); annulus(b, 234, 262);
    b.fillStyle = colour(b); b.globalAlpha = .43;
    b.fillRect(-HALF, -HALF, WORLD, WORLD);
    const wall = b.createRadialGradient(0, 0, 234, 0, 0, 263);
    wall.addColorStop(0, 'rgba(2,3,15,.91)');
    wall.addColorStop(.25, 'rgba(4,5,19,.72)');
    wall.addColorStop(.57, 'rgba(5,5,21,.28)');
    wall.addColorStop(.82, 'rgba(9,9,27,.03)');
    wall.addColorStop(1, 'rgba(4,5,17,.42)');
    b.globalAlpha = 1; b.fillStyle = wall;
    b.fillRect(-HALF, -HALF, WORLD, WORLD); b.restore();
    const lip = b.createLinearGradient(-257, 0, 257, 0);
    lip.addColorStop(0, '#ab64ed'); lip.addColorStop(.45, '#7560ce'); lip.addColorStop(1, '#5eafed');
    b.strokeStyle = lip; b.lineCap = 'round';
    b.beginPath(); b.arc(0, 0, 255.5, 0, TAU);
    for (const [width, alpha] of [[13, .07], [6, .14], [1.2, .28]]) {
      b.lineWidth = width; b.globalAlpha = alpha; b.stroke();
    }

    // A broad saturated corona, softer outside the collar. Masking the colour
    // field into a cached radial profile avoids a per-frame blur or white veil.
    g.fillStyle = colour(g); g.fillRect(-HALF, -HALF, WORLD, WORLD);
    g.globalCompositeOperation = 'destination-in';
    const emission = g.createRadialGradient(0, 0, 219, 0, 0, 335);
    emission.addColorStop(0, 'rgba(255,255,255,0)');
    emission.addColorStop(.16, 'rgba(255,255,255,.035)');
    emission.addColorStop(.30, 'rgba(255,255,255,.48)');
    emission.addColorStop(.40, 'rgba(255,255,255,.32)');
    emission.addColorStop(.57, 'rgba(255,255,255,.115)');
    emission.addColorStop(.78, 'rgba(255,255,255,.022)');
    emission.addColorStop(.94, 'rgba(255,255,255,0)');
    emission.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = emission; g.fillRect(-HALF, -HALF, WORLD, WORLD);
    textures = { body: body.element, corona: corona.element };
    root.MastrifyCanvas?.cacheImage(textures.body);
    root.MastrifyCanvas?.cacheImage(textures.corona);
    return true;
  }

  function draw(ctx, frame) {
    const t = Number.isFinite(frame?.t) ? frame.t : 0;
    const fade = frame?.fade === undefined ? 1 : clamp(frame.fade);
    if (t <= 0 || t >= DURATION || fade === 0) return;
    if (!prepare()) return;
    const forward = Number.isFinite(frame.forwardScale) && frame.forwardScale > .01 ? frame.forwardScale : 1;
    const opacity = fade * ease(t / .15) * (1 - ease((t - .94) / .96));
    if (opacity < 1e-7) return;
    const opening = ease((t - .055) / .56);
    const openingY = .27 + .73 * opening;
    const landing = ease((t - .23) / .28) * (1 - ease((t - .70) / .56));
    const inherited = Number.isFinite(ctx.globalAlpha) ? ctx.globalAlpha : 1;
    ctx.save();
    try {
      // Cancel only the host's forward projection; its global pose remains.
      // This fixed back plane makes the LP's independent kick read as depth.
      ctx.scale(1 / forward, 1 / forward);
      annulus(ctx, 224.5 * forward + .5, 330);
      ctx.shadowBlur = 0; ctx.shadowOffsetX = ctx.shadowOffsetY = 0; ctx.filter = 'none';
      ctx.scale(1, openingY);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = inherited * opacity;
      ctx.drawImage(root.MastrifyCanvas?.imageSource(textures.body) || textures.body, -HALF, -HALF, WORLD, WORLD);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = inherited * opacity * (.78 + .22 * landing);
      ctx.drawImage(root.MastrifyCanvas?.imageSource(textures.corona) || textures.corona, -HALF, -HALF, WORLD, WORLD);
    } finally { ctx.restore(); }
  }

  const registry = root.MastrifyTransitionVariants ||= {};
  registry.portal = Object.freeze({ prepare, draw });
})(typeof window !== 'undefined' ? window : globalThis);
