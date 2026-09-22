/* Light in the original LP grooves: three quiet moving bands, a focused
 * processing response, and a brief silver polish. The host owns the clock.
 * All geometry is cached, circular, and contained between radii 116 and 218.
 */
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const LOOP = 12;
  const INNER = 116;
  const OUTER = 218;
  const STOPS = 40;
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const mix = (a, b, t) => a + (b - a) * t;
  const wrap = (value, period) => ((value % period) + period) % period;
  const EMPTY_DASH = [];
  // The angular samples are fixed; only their phase and musical exposure vary.
  // Keep the original arithmetic and color rounding for the changing terms.
  const angularStops = Array.from({ length: STOPS + 1 }, (_, i) => {
    const angle = i === STOPS ? 0 : i / STOPS * TAU;
    const cosine = Math.cos(angle) - 1;
    const first = Math.exp(3.8 * cosine);
    const second = .43 * Math.exp(5.4 * (Math.cos(angle - 2.85) - 1));
    return { offset: i / STOPS, cosine, first, light: first + second,
      blue: .5 + .5 * Math.sin(angle + .6), polish: Math.exp(3.5 * cosine) };
  });

  const annulus = new Path2D();
  annulus.arc(0, 0, OUTER, 0, TAU);
  annulus.moveTo(INNER, 0);
  annulus.arc(0, 0, INNER, 0, TAU, true);

  function enabled(name) {
    return !root.MastrifyEffects || typeof root.MastrifyEffects.enabled !== 'function'
      || root.MastrifyEffects.enabled(name);
  }

  function cueEnvelope(seconds, start, duration, attackFraction) {
    const age = wrap(seconds - start, LOOP) / duration;
    if (age >= 1) return 0;
    return age < attackFraction
      ? smooth(age / attackFraction)
      : 1 - smooth((age - attackFraction) / (1 - attackFraction));
  }

  function readScore(p) {
    const hasScore = root.MastrifyScore && typeof root.MastrifyScore.sample === 'function';
    const source = hasScore ? root.MastrifyScore : root.MastrifyPulse;
    const raw = source && typeof source.sample === 'function'
      ? source.sample(p, 'surface') || {} : {};
    const value = name => clamp(Number.isFinite(raw[name]) ? raw[name] : 0);
    const seconds = p / TAU * LOOP;
    return {
      level: value('level'), bass: value('bass'), mid: value('mid'),
      air: value('air'), accent: value('accent'),
      discovery: hasScore ? value('discovery') : Math.max(
        cueEnvelope(seconds, .9, 2.45, .28),
        cueEnvelope(seconds, 5.0, 2.15, .32)),
      polish: hasScore ? value('polish') : cueEnvelope(seconds, 9.1, 1.65, .4)
    };
  }

  function rgba(red, green, blue, alpha) {
    return `rgba(${Math.round(red)},${Math.round(green)},${Math.round(blue)},${clamp(alpha)})`;
  }

  // Wrapped cosine lobes have no angular seam or hard sector boundaries.
  function gradient(ctx, start, colorAt) {
    const result = ctx.createConicGradient(start, 0, 0);
    for (const stop of angularStops) result.addColorStop(stop.offset, colorAt(stop));
    return result;
  }

  // Lagrens färger som rena tal. Både draw() nedan och grafikkretsen
  // (gpu-disc.js) räknar färgerna med exakt samma funktioner.
  function groupColor(score, group) {
    const response = [score.bass, score.mid, score.air][group];
    const strength = .16 + .22 * score.level + .32 * response;
    return ({ first, light, blue }) => {
      const silver = .22 * score.air * first;
      return [mix(mix(162, 89, blue), 230, silver), mix(mix(113, 166, blue), 233, silver), 252, strength * light];
    };
  }
  function discoveryColor(score) {
    const process = smooth((score.discovery - .2) / .8);
    const strength = score.discovery * (.45 + .25 * score.mid);
    return ({ cosine }) => {
      const focus = Math.exp((6.5 - 2.5 * process) * cosine);
      return [mix(166, 218, process), mix(123, 224, process), 255, strength * focus * 1.28];
    };
  }
  function polishColor(score) {
    const silver = smooth(score.polish);
    return ({ polish: focus }) => [mix(160, 242, silver), mix(133, 241, silver), 255, score.polish * .65 * focus];
  }
  const css = color => rgba(color[0], color[1], color[2], color[3]);
  const exact = color => [Math.round(color[0]), Math.round(color[1]), Math.round(color[2]), clamp(color[3])];

  // Allt spårljuset i en bildruta, som tal i stället för ritanrop. Värdena är
  // desamma som draw() ritar med: startvinkel, de 41 färgerna och bredden
  // (bredden styr hur starkt spåren lyser, se groovePaint i vinyl.js).
  function plan(phase, energy) {
    const e = clamp(Number.isFinite(energy) ? energy : 0);
    if (e <= 0 || typeof root.CanvasRenderingContext2D?.prototype?.createConicGradient !== 'function') return null;
    const grooves = enabled('grooves'), discovery = enabled('discovery'), polish = enabled('polish');
    if (!grooves && !discovery && !polish) return null;
    const p = Number.isFinite(phase) ? wrap(phase, TAU) : 0;
    const score = readScore(p);
    const layers = [];
    if (grooves) for (let group = 0; group < 3; group++) {
      const color = groupColor(score, group);
      layers.push({ kind: 'group' + group, start: -p - Math.PI / 2 + group * .42, lineWidth: .85 + group * .035,
        stops: angularStops.map(stop => exact(color(stop))) });
    }
    if (discovery && score.discovery > .0001) {
      const color = discoveryColor(score);
      layers.push({ kind: 'discovery', start: -p + 1.12, stops: angularStops.map(stop => exact(color(stop))) });
    }
    if (polish && score.polish > .0001) {
      const color = polishColor(score);
      layers.push({ kind: 'all', start: -p - .83, lineWidth: .78, fill: .14, stops: angularStops.map(stop => exact(color(stop))) });
    }
    return { opacity: e, layers };
  }

  let halfBeat = false;
  function draw(ctx, phase, energy) {
    const e = clamp(Number.isFinite(energy) ? energy : 0);
    if (e <= 0 || typeof ctx.createConicGradient !== 'function') return;
    const grooves = enabled('grooves');
    const discovery = enabled('discovery');
    const polish = enabled('polish');
    if (!grooves && !discovery && !polish) return;
    const p = Number.isFinite(phase) ? wrap(phase, TAU) : 0;
    const score = readScore(p);

    // Normalt ritas lagren ett och ett som förut. För mätläget (?prov=spel)
    // och för att kunna titta (?halv=1) finns två alternativ: lagren läggs
    // ihop innan de läggs in på skivan (MastrifyGrooveMerge, se vinyl.js),
    // och halv takt (MastrifyGrooveHalfRate) där varannan bildruta
    // återanvänder förra bildrutans summa.
    const vinyl = root.MastrifyVinyl;
    const merge = root.MastrifyTrim !== false && (root.MastrifyGrooveMerge === true || root.MastrifyGrooveHalfRate === true)
      && typeof vinyl.addGrooveLayer === 'function';
    halfBeat = !halfBeat;
    const reuse = merge && root.MastrifyGrooveHalfRate === true && halfBeat && vinyl.grooveLayersFresh();
    if (merge && !reuse) vinyl.beginGrooveLayers();
    const paint = kind => merge ? vinyl.addGrooveLayer(ctx, kind) : vinyl.drawGrooves(ctx, kind);

    ctx.save();
    try {
      ctx.clip(annulus, 'evenodd');
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha *= e;
      const opacity = ctx.globalAlpha;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowColor = 'rgba(0,0,0,0)';
      ctx.setLineDash(EMPTY_DASH);

      if (grooves && !reuse) {
        for (let group = 0; group < 3; group++) {
          const color = groupColor(score, group);
          ctx.strokeStyle = gradient(ctx, -p - Math.PI / 2 + group * .42, stop => css(color(stop)));
          ctx.lineWidth = .85 + group * .035;
          paint('group'+group);
        }
      }

      if (discovery && score.discovery > .0001 && !reuse) {
        // A broad curved region first wakes in violet, becomes more precise
        // and silvery while processing, then returns smoothly to the glass.
        const color = discoveryColor(score);
        ctx.strokeStyle = gradient(ctx, -p + 1.12, stop => css(color(stop)));
        ctx.globalAlpha = opacity;
        paint('discovery');
      }

      if (polish && score.polish > .0001) {
        // A broad reflection reveals the existing etching rather than adding
        // a new luminous ring. Its low-opacity film keeps the vinyl visible.
        const color = polishColor(score);
        ctx.strokeStyle = gradient(ctx, -p - .83, stop => css(color(stop)));
        ctx.fillStyle = ctx.strokeStyle;
        ctx.globalAlpha = opacity * .14;
        ctx.fill(annulus, 'evenodd');
        ctx.globalAlpha = opacity;
        ctx.lineWidth = .78;
        if (!reuse) paint();
      }
      if (merge) { ctx.globalAlpha = opacity; vinyl.drawGrooveLayers(ctx); }
    } finally {
      ctx.restore();
    }
  }

  root.MastrifyLivingSurface = Object.freeze({ draw, plan, INNER, OUTER });
})(typeof window !== 'undefined' ? window : globalThis);
