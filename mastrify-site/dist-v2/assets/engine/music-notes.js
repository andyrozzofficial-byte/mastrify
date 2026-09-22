/* Continuous decorative notes emitted by the rotating rim light. Their
 * visibility follows the same smooth lifetime even during quiet audio; real
 * musical pulses only give their size a small lift. All timing comes from the
 * host's 12-second phase; glyphs are deterministic Canvas vectors. Both playback modes can
 * add a bounded burst on a real bass rise, with fewer notes in Original. Those extra lifetimes use the same
 * host clock, with no timer, per-frame randomness or independent animation.
 */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const PERIOD = 12;
  const EVENT_COUNT = 144;
  const EVENT_SPACING = PERIOD / EVENT_COUNT;
  const LIFETIME = .72;
  const RISE_TIME = .06;
  const SIZE_TIERS = [.78, 1.03, 1.34];
  // Choose irregular sizes once. The same weighted sequence repeats at the
  // loop boundary; larger accents stay occasional, with no per-frame random.
  let sizeSeed = 0x4d555349;
  const eventSizes = Array.from({ length: EVENT_COUNT }, () => {
    sizeSeed = (Math.imul(sizeSeed, 1664525) + 1013904223) >>> 0;
    const pick = sizeSeed / 4294967296;
    return SIZE_TIERS[pick < .58 ? 0 : pick < .9 ? 1 : 2];
  });
  // A separate fixed hash keeps Original's lighter stream irregular without
  // changing the established size sequence or choosing new events per frame.
  const originalOrder = Array.from({ length: EVENT_COUNT }, (_, event) => {
    let hash = (event + 0x4e4f5445) >>> 0;
    hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
    hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
    return { event, hash: (hash ^ (hash >>> 16)) >>> 0 };
  }).sort((a, b) => a.hash - b.hash);
  const originalEvents = new Uint8Array(EVENT_COUNT);
  for (let i = 0; i < Math.round(EVENT_COUNT * .48); i++) originalEvents[originalOrder[i].event] = 1;
  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const smoothstep = value => value * value * (3 - 2 * value);
  const bounded = value => Math.max(0, Math.min(1, Number(value) || 0));
  let burstStates = new WeakMap();
  const BURST_LIFETIME = .88, BURST_REFRACTORY = .38, MAX_BURST_NOTES = 6;
  let lastState = null;

  function resetState(state, time = null, source = null, audioTime = 0, bass = 0, playing = false) {
    state.time = time; state.source = source; state.audioTime = audioTime;
    state.clock = 0; state.bass = bass; state.floor = bass; state.playing = playing;
    state.lastBurst = -Infinity; state.armed = true; state.notes.length = 0;
    state.burstCount = 0; state.emittedNotes = 0; state.lastStrength = 0;
  }

  function updateBursts(c, p, energy, master, beat, original = 0) {
    let state = burstStates.get(c);
    if (!state) {
      state = { notes: [] }; resetState(state); burstStates.set(c, state);
    }
    lastState = state;
    if (energy < .001 || master + original < .001 || !beat.realAudio || beat.processing) {
      resetState(state); return state;
    }
    const audio = root.MastrifyAudio, transport = audio?.getState?.();
    if (!transport?.loaded || !['original', 'master'].includes(transport.selected)
        || (transport.selected === 'original' ? original < .001 : master < .001)
        || !(transport.duration > 0) || transport.currentTime >= transport.duration) {
      resetState(state); return state;
    }
    // The waveform reference identifies replacements even when filename and
    // duration are identical. The string is only for lightweight host adapters.
    const source = audio.getWaveform?.(transport.selected)
      || `${transport.selected}:${transport.name || ''}:${transport.duration}`;
    const time = mod(p, TAU) / TAU * PERIOD;
    const audioTime = Number.isFinite(transport.currentTime) ? transport.currentTime : 0;
    const bass = bounded(beat.bass), playing = !!transport.playing;
    if (state.time === null || source !== state.source) {
      resetState(state, time, source, audioTime, bass, playing); return state;
    }
    // Shortest signed phase distance crosses 12 -> 0 without dropping live
    // notes. A manual render jump or transport seek begins a fresh transient.
    const dt = mod(time - state.time + PERIOD / 2, PERIOD) - PERIOD / 2;
    const audioStep = audioTime - state.audioTime;
    const seek = audioStep < -.035 || (dt > 1e-8 && Math.abs(audioStep - dt) > .20);
    if (dt < -1e-8 || dt > .25 || seek) {
      resetState(state, time, source, audioTime, bass, playing); return state;
    }
    if (dt < 1e-8) return state;
    state.time = time; state.audioTime = audioTime;
    if (!playing || !state.playing) {
      // Audio pause holds existing extra notes. Resuming at a sustained loud
      // level primes the detector instead of inventing an onset on play.
      state.playing = playing; state.bass = bass; state.floor = bass; return state;
    }
    state.clock += dt;
    for (let index = state.notes.length - 1; index >= 0; index--) {
      if (state.clock - state.notes[index].birth >= BURST_LIFETIME) state.notes.splice(index, 1);
    }
    const rise = (bass - state.bass) / dt;
    state.floor += (bass - state.floor) * -Math.expm1(-dt / .24);
    const novelty = bass - state.floor;
    if (novelty < .035) state.armed = true;
    if (state.armed && bass > .16 && bounded(beat.level) > .025
        && novelty > .075 && rise > .65 && state.clock - state.lastBurst >= BURST_REFRACTORY) {
      const strength = bounded(.60 * (novelty - .075) / .42 + .40 * (rise - .65) / 7);
      const requested = transport.selected === 'original' ? 1 : strength > .63 ? 3 : strength > .26 ? 2 : 1;
      const count = Math.min(requested, MAX_BURST_NOTES - state.notes.length);
      for (let index = 0; index < count; index++) {
        const serial = state.emittedNotes++;
        state.notes.push({ birth: state.clock + index * .023,
          angle: 6 * p - Math.PI / 2 + (index - (count - 1) / 2) * .12,
          size: eventSizes[(serial * 37 + 19) % EVENT_COUNT],
          kind: (serial + Math.floor(serial / 5)) % 4, strength });
      }
      if (count) {
        state.lastBurst = state.clock; state.burstCount++; state.lastStrength = strength;
        state.armed = false;
      }
    }
    state.bass = bass;
    return state;
  }

  function head(c, x, y) {
    c.beginPath();
    c.ellipse(x, y, 2.5, 1.65, -.32, 0, TAU);
    c.fill();
  }

  function stem(c, x, bottom, top) {
    c.beginPath(); c.moveTo(x, bottom); c.lineTo(x, top); c.stroke();
  }

  function flag(c, x, y) {
    c.beginPath();
    c.moveTo(x, y);
    c.bezierCurveTo(x + 1.6, y + 2.6, x + 5.3, y + 2.3, x + 2.9, y + 6.4);
    c.bezierCurveTo(x + 3.8, y + 3.4, x + 1, y + 3.7, x, y + 2.2);
    c.closePath();
    c.fill();
  }

  function buildGlyph(c, kind) {
    if (kind === 3) {
      // A beamed pair with two clearly separated heads and a short rising beam.
      head(c, -3.6, 5);
      head(c, 3.6, 2.7);
      stem(c, -1.55, 4.5, -5.7);
      stem(c, 5.65, 2.2, -8);
      c.beginPath();
      c.moveTo(-1.55, -5.7); c.lineTo(5.65, -8);
      c.lineTo(5.65, -6.05); c.lineTo(-1.55, -3.75);
      c.closePath(); c.fill();
      return;
    }
    head(c, -1.25, 4.65);
    stem(c, .8, 4.1, -7.3);
    if (kind > 0) flag(c, .8, -7.3);
    if (kind === 2) flag(c, .8, -3.9);
  }

  // Keep each head, stem and flag as a separate paint, in its original order.
  // Merging them would alter overlapping shadows; only their geometry is cached.
  // Record each glyph's extent while its geometry is cached. Nothing about the
  // drawing changes; the box only says where a note can possibly put ink.
  const glyphBounds = [];
  const glyphParts = Array.from({ length: 4 }, (_, kind) => {
    const parts = [];
    let path;
    const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const seen = (x, y, reach = 0) => {
      if (x - reach < box.x0) box.x0 = x - reach;
      if (y - reach < box.y0) box.y0 = y - reach;
      if (x + reach > box.x1) box.x1 = x + reach;
      if (y + reach > box.y1) box.y1 = y + reach;
    };
    const recorder = {
      beginPath() { path = new Path2D(); },
      ellipse(x, y, radiusX, radiusY, ...rest) {
        seen(x, y, Math.max(Math.abs(radiusX), Math.abs(radiusY)));
        path.ellipse(x, y, radiusX, radiusY, ...rest);
      },
      moveTo(x, y) { seen(x, y); path.moveTo(x, y); },
      lineTo(x, y) { seen(x, y); path.lineTo(x, y); },
      bezierCurveTo(...args) {
        seen(args[0], args[1]); seen(args[2], args[3]); seen(args[4], args[5]);
        path.bezierCurveTo(...args);
      },
      closePath() { path.closePath(); },
      fill() { parts.push({ path, stroke: false }); },
      stroke() { parts.push({ path, stroke: true }); }
    };
    buildGlyph(recorder, kind);
    glyphBounds[kind] = box;
    return parts;
  });

  // A shadowed draw on the full-size disc otherwise costs a layer as large as
  // the whole surface, and there are several notes every frame. Bounding that
  // layer to the note is a compositing hint only: every pixel the note paints,
  // blur included, lies well inside this rectangle, so the picture is identical.
  // Call it after translating to the note and before scaling to its size.
  function boundShadow(c, kind, scale) {
    const box = glyphBounds[kind];
    if (!box || !Number.isFinite(box.x0) || typeof c.clip !== 'function' || typeof c.rect !== 'function') return;
    const size = Math.abs(Number(scale) || 0), margin = 4 * size + 14;
    c.beginPath();
    c.rect(box.x0 * size - margin, box.y0 * size - margin,
      (box.x1 - box.x0) * size + margin * 2, (box.y1 - box.y0) * size + margin * 2);
    c.clip();
  }

  function glyph(c, kind) {
    for (const part of glyphParts[kind]) {
      if (part.stroke) c.stroke(part.path);
      else c.fill(part.path);
    }
  }

  // Bounded-shadow painting. Kept as the fallback for hosts that cannot make
  // an offscreen canvas, and for the sandboxed tests. The clip is what keeps a
  // live shadow from costing a layer the size of the whole disc.
  function paintGlyph(c, kind, scale, x, y, opacity, shadowColor, shadowBlur, ink) {
    c.save();
    c.translate(x, y);
    boundShadow(c, kind, scale);
    c.scale(scale, scale);
    c.globalAlpha = opacity;
    c.shadowColor = shadowColor; c.shadowBlur = shadowBlur;
    c.fillStyle = c.strokeStyle = ink;
    glyph(c, kind);
    c.restore();
  }

  // Varje skuggad ritning tvingar fram ett eget renderingslager, och det är
  // det som kostar. Uppmätt på riktig hårdvara: notpasset tog 4,1 ms av en
  // bildruta på 16,7 ms, fördelat på trettiotvå lager. Ytan spelade ingen
  // roll, bara antalet lager.
  //
  // Glorian går att rita en gång och återanvända. Fyra saker måste stämma för
  // att bilden ska bli densamma och inte en efterlikning:
  //
  //  1. Oskärpan följer INTE ritningens skala, den ligger fast på 2,1
  //     bildpunkter (uppmätt). Därför sparas glorian per storleksklass, med
  //     klasserna 25 procent isär. Själva noten ritas fortfarande som
  //     vektorer, så formen är exakt rätt i varje storlek; bara oskärpans
  //     bredd kan ligga någon tiondels bildpunkt fel, i en gloria som redan
  //     är svag.
  //  2. Skuggan och kroppen ADDERAS, de ligger inte över varandra. En bild med
  //     båda inbakade mättar där kroppen är och tappar skuggan under den,
  //     uppmätt till 51 nivåer av 255 fel. Bilden innehåller därför bara
  //     skuggan: figuren ritas långt utanför duken och förskjutningen flyttar
  //     in skuggan igen.
  //  3. Delarnas glorior adderas i samma bild, aldrig sammanslagna till en
  //     enda form. En sammanslagen form skulle ge en gloria där två delar
  //     möts i stället för två. Summan mättar aldrig: högsta uppmätta värde
  //     är 131 av 255.
  //  4. En not har alltid en enda platt färg, och glorian är den färgen gånger
  //     ett skalärt täckningsfält. Eftersom noterna adderas kan varje färg
  //     skrivas som en viktad summa av fasta grundfärger vars vikter summerar
  //     till ett. Då landar både färgen och alfat exakt rätt utan att en enda
  //     bild behöver göras om när färgen glider.
  //
  // Största uppmätta skillnad mot den levande skuggan: 6 nivåer av 255, på
  // ungefär sex bildpunkter per not, i gloriaan.
  const HALO_STEP = 1.25;
  const LOG_HALO_STEP = Math.log(HALO_STEP);
  const HALO_OFFSET = 4096;     // bildpunkter, långt utanför den lilla duken
  const HALO_FLOOR = 1 / 2048;  // under detta bidrar grundfärgen mindre än en halv nivå
  const HALO_LIMIT = 640;       // tak för antalet sparade bilder
  // Bilderna byggs allteftersom storlekarna dyker upp. Uppmätt över ett helt
  // tolvsekundersvarv: 73 bilder på 0,16 miljoner bildpunkter, nästan alla
  // inom de två första sekunderna. Taket här hindrar att en enda bildruta får
  // bygga en hel hög av dem; noterna som blir över ritas med den levande
  // skuggan just den bildrutan, alltså precis som förut.
  const HALO_BUDGET = 4;
  const haloSets = new Map();
  let haloBudget = HALO_BUDGET;
  let haloUsable = null;

  function canMakeHalo() {
    if (haloUsable !== null) return haloUsable;
    haloUsable = false;
    try {
      const probe = root.document?.createElement?.('canvas');
      if (!probe) return false;
      probe.width = probe.height = 8;
      const brush = probe.getContext?.('2d');
      haloUsable = !!brush && typeof brush.fill === 'function' && typeof brush.stroke === 'function'
        && typeof brush.setTransform === 'function' && typeof brush.drawImage === 'function';
    } catch { haloUsable = false; }
    return haloUsable;
  }

  // En bild med hela glyfens gloria i en grundfärg, byggd i storleksklassens
  // egen täthet så att den ritas ut i stort sett en bildpunkt mot en.
  function haloSet(kind, rgb, shadowAlpha, step) {
    const key = kind + '|' + rgb + '|' + shadowAlpha + '|' + step;
    const cached = haloSets.get(key);
    if (cached !== undefined) return cached;
    const box = glyphBounds[kind];
    if (!canMakeHalo() || !box || !Number.isFinite(box.x0)) { haloSets.set(key, null); return null; }
    // Slut på bygget för den här bildrutan: ingen minnesanteckning, bilden
    // görs i stället nästa gång noten ritas.
    if (haloBudget <= 0) return null;
    haloBudget--;
    if (haloSets.size >= HALO_LIMIT) haloSets.clear();
    const density = Math.pow(HALO_STEP, step);
    // Oskärpan når drygt tre bildpunkter; marginalen tar även linjebredden.
    const reach = .9 + 7.8 / density;
    const x0 = box.x0 - reach, y0 = box.y0 - reach;
    const wide = Math.ceil(((box.x1 - box.x0) + reach * 2) * density);
    const high = Math.ceil(((box.y1 - box.y0) + reach * 2) * density);
    if (!(wide > 0) || !(high > 0) || wide > 600 || high > 600) { haloSets.set(key, null); return null; }
    let canvas;
    try {
      canvas = root.document.createElement('canvas');
      canvas.width = wide; canvas.height = high;
      const brush = canvas.getContext('2d');
      if (!brush) { haloSets.set(key, null); return null; }
      brush.globalCompositeOperation = 'lighter';
      brush.setTransform(density, 0, 0, density, -x0 * density, -y0 * density);
      brush.lineCap = 'round'; brush.lineJoin = 'round'; brush.lineWidth = 1.05;
      brush.fillStyle = brush.strokeStyle = 'rgb(' + rgb + ')';
      brush.shadowColor = 'rgba(' + rgb + ',' + shadowAlpha + ')';
      brush.shadowBlur = 2.1;
      brush.shadowOffsetY = HALO_OFFSET;
      brush.translate(0, -HALO_OFFSET / density);
      glyph(brush, kind);
      root.MastrifyCanvas?.cacheImage?.(canvas);
    } catch { haloSets.set(key, null); return null; }
    const set = { canvas, x0, y0, wide: wide / density, high: high / density };
    haloSets.set(key, set);
    return set;
  }

  // Grundfärgerna är precis de som kroppens uträkning blandar, i samma ordning:
  // violett vänster, blått höger, och silverljuset ovanpå.
  const DRIFT_BASIS = [
    { rgb: '174,133,245', alpha: '.28', weight: 0 },
    { rgb: '120,180,245', alpha: '.28', weight: 0 },
    { rgb: '233,237,255', alpha: '.28', weight: 0 }];
  const BURST_BASIS = [
    { rgb: '182,146,255', alpha: '.30', weight: 0 },
    { rgb: '131,194,255', alpha: '.30', weight: 0 }];
  const haloPlan = [];

  function paintNote(c, kind, scale, x, y, opacity, shadowColor, shadowBlur, ink, basis, unit) {
    const size = unit * scale;
    let ready = size > 0 && Number.isFinite(size);
    if (ready) {
      const step = Math.round(Math.log(size) / LOG_HALO_STEP);
      haloPlan.length = basis.length;
      for (let index = 0; index < basis.length; index++) {
        if (!(basis[index].weight > HALO_FLOOR)) { haloPlan[index] = null; continue; }
        const set = haloSet(kind, basis[index].rgb, basis[index].alpha, step);
        if (!set) { ready = false; break; }
        haloPlan[index] = set;
      }
    }
    if (!ready) {
      paintGlyph(c, kind, scale, x, y, opacity, shadowColor, shadowBlur, ink);
      return;
    }
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    // Ingen skugga på bilderna: en enda oskarp skugga ger tillbaka lagret.
    c.shadowColor = 'rgba(0,0,0,0)';
    c.shadowBlur = 0;
    c.shadowOffsetX = 0;
    c.shadowOffsetY = 0;
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    for (let index = 0; index < haloPlan.length; index++) {
      const set = haloPlan[index];
      if (!set) continue;
      c.globalAlpha = opacity * basis[index].weight;
      c.drawImage(root.MastrifyCanvas?.imageSource(set.canvas) || set.canvas,
        set.x0, set.y0, set.wide, set.high);
    }
    // Kroppen ritas utan skugga. Chrome ritar en figur en aning annorlunda
    // när en skugga är FÖRSKJUTEN: uppmätt 15 nivåer av 255 på kantens
    // bildpunkter, även med skuggan flyttad utanför duken. Den skillnaden går
    // att ta bort med en skarp skugga långt utanför duken, men det mättes till
    // hälften så många bildrutor som den gamla oskarpa skuggan, alltså dyrare
    // än problemet det löser. En skugga med förskjutningen noll ändrar
    // ingenting alls, varken kanten eller farten. Prova inte om.
    c.globalAlpha = opacity;
    c.fillStyle = c.strokeStyle = ink;
    glyph(c, kind);
    c.restore();
  }

  // Bildpunkter per enhet just nu. Oskärpan mäts i bildpunkter, inte i
  // enheter, så storleksklassen måste väljas efter den. En duk som är
  // märkbart ihoptryckt åt ett håll faller tillbaka på den levande skuggan.
  function unitSize(c) {
    if (typeof c.getTransform !== 'function') return 0;
    try {
      const m = c.getTransform();
      const across = Math.hypot(m.a, m.b), down = Math.hypot(m.c, m.d);
      if (!(across > 0) || !(down > 0) || !Number.isFinite(across) || !Number.isFinite(down)) return 0;
      return Math.abs(across - down) > across * .06 ? 0 : (across + down) / 2;
    } catch { return 0; }
  }

  function draw(c, phase, energy, originalAmount = 0, masterAmount = 0) {
    const e = Math.max(0, Math.min(1, Number(energy) || 0));
    const original = Math.max(0, Math.min(1, Number(originalAmount) || 0));
    const master = bounded(masterAmount);
    const p = Number.isFinite(phase) ? phase : 0;
    const time = mod(p, TAU) / TAU * PERIOD;
    const beat = root.MastrifyScore?.sample(p, 'source') || root.MastrifyPulse?.sample(p) || {};
    const bursts = updateBursts(c, p, e, master, beat, original);
    if (e < .001) return;
    const pulse = Math.max(0, Math.min(1,
      .58 * (beat.bass || 0) + .30 * (beat.accent || 0) + .12 * (beat.level || 0)));
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.lineWidth = 1.05;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.shadowBlur = 1.2;
    c.shadowColor = 'rgba(141,115,209,.15)';
    const unit = unitSize(c);
    haloBudget = HALO_BUDGET;
    // Inspect only the recent emission window. One guard slot on each side
    // preserves the original floating-point boundary decisions below. At wrap,
    // visit low event IDs before the previous loop's tail, matching paint order.
    const first = Math.floor((time - LIFETIME) / EVENT_SPACING) - 1;
    const last = Math.min(EVENT_COUNT - 1, Math.floor(time / EVENT_SPACING) + 1);
    const wrappedFirst = first < 0 ? EVENT_COUNT + first : EVENT_COUNT;
    for (let event = Math.max(0, first); event < EVENT_COUNT;
      event = event === last ? Math.max(event + 1, wrappedFirst) : event + 1) {
      const birth = event * EVENT_SPACING;
      const age = mod(time - birth, PERIOD);
      if (age >= LIFETIME) continue;
      if (original === 1 && !originalEvents[event]) continue;
      const q = age / LIFETIME;
      // Zero opacity and zero opacity slope at both ends, including wraparound.
      const pop = smoothstep(Math.min(1, age / RISE_TIME));
      const settle = smoothstep(Math.max(0, (age - RISE_TIME) / (LIFETIME - RISE_TIME)));
      let opacity = .6 * e * pop * (1 - settle);
      if (original > 0 && !originalEvents[event]) opacity *= 1 - original;
      if (opacity < .00001) continue;
      const eventPhase = TAU * birth / PERIOD;
      const angle = 6 * eventPhase - Math.PI / 2;
      const radius = 266 + 28 * smoothstep(q);
      const tier = eventSizes[event];
      // A small beat lift shares the logo's cue and settles into the existing
      // outward drift/fade. The three irregular size tiers remain distinct.
      const beatLift = 1 + (.16 + .04 * original) * pulse * pop * (1 - .3 * settle);
      let scale = (.5 + .8 * smoothstep(Math.min(1, q / .8))) * tier * beatLift;
      if (original > 0) scale *= 1 - .2 * original;
      // Share the collar's violet-left / blue-right material and silver light.
      const side = .5 + .5 * Math.cos(angle);
      const silver = .32 * pop * (1 - settle);
      const body = [174 - 54 * side, 133 + 47 * side, 245];
      const color = body.map((channel, index) => Math.round(channel + ([233, 237, 255][index] - channel) * silver));
      const kind = (event + Math.floor(event / 16)) % 4;
      // Samma blandning som färgen ovan, uppdelad på sina tre grundfärger.
      DRIFT_BASIS[0].weight = (1 - silver) * (1 - side);
      DRIFT_BASIS[1].weight = (1 - silver) * side;
      DRIFT_BASIS[2].weight = silver;
      // Stay upright after emission; only the note's radial position drifts.
      paintNote(c, kind, scale, Math.cos(angle) * radius, Math.sin(angle) * radius, opacity,
        `rgba(${color[0]},${color[1]},${color[2]},.28)`, 2.1, `rgb(${color[0]},${color[1]},${color[2]})`,
        DRIFT_BASIS, unit);
    }
    for (const note of bursts.notes) {
      const age = bursts.clock - note.birth;
      if (age <= 0 || age >= BURST_LIFETIME) continue;
      const q = age / BURST_LIFETIME;
      const pop = smoothstep(Math.min(1, age / .07));
      const fade = 1 - smoothstep(q);
      const opacity = .72 * e * (master + .48 * original) * pop * fade * (.76 + .24 * note.strength);
      if (opacity < .00001) continue;
      const radius = 267 + 39 * smoothstep(q);
      const scale = (.76 + .42 * smoothstep(q)) * note.size * (1 + .10 * note.strength);
      const side = .5 + .5 * Math.cos(note.angle);
      const red = Math.round(182 - 51 * side), green = Math.round(146 + 48 * side);
      BURST_BASIS[0].weight = 1 - side;
      BURST_BASIS[1].weight = side;
      paintNote(c, note.kind, scale, Math.cos(note.angle) * radius, Math.sin(note.angle) * radius, opacity,
        `rgba(${red},${green},255,.30)`, 2.1, `rgb(${red},${green},255)`,
        BURST_BASIS, unit);
    }
    c.restore();
  }

  function getStatus(context) {
    const state = context ? burstStates.get(context) : lastState;
    return { liveBurstNotes: state?.notes.length || 0, burstCount: state?.burstCount || 0,
      emittedNotes: state?.emittedNotes || 0, lastBurstStrength: state?.lastStrength || 0,
      burstClock: state?.clock || 0, originalEvents: originalEvents.reduce((sum, value) => sum + value, 0) };
  }
  function reset(context) {
    if (!context) { burstStates = new WeakMap(); lastState = null; return; }
    if (burstStates.get(context) === lastState) lastState = null;
    burstStates.delete(context);
  }
  root.MastrifyNotes = Object.freeze({ draw, getStatus, reset });
})(window);
