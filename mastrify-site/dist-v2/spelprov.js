/* Mätläge för uppspelningen. Laddas bara med ?prov=spel i adressen.
   Trettonde mätningen: både Master och Original, och byten mellan dem, med
   och utan grafikkretsen (gpu-disc.js). Varje läge mäts i par om korta
   fönster, utan och med grafikkretsen, så att båda ligger i samma del av
   låten. Lägena turas om i ny ordning varje varv, så att telefonens
   uppvärmning drabbar alla lika, och ett pausat fönster var tredje varv visar
   om telefonen själv blir trögare. Bytena mäts med övergången, eftersom det
   är den man ser när man trycker. Varje hack över 0,1 s skrivs upp med vad
   sidan gjorde just då: ritkoden, uppladdningar till grafikkretsen, läsningar
   ur dukar, långsamma kopieringar mellan dukar och ljudets klocka.
   Bildkoll i Master och i Original: samma bildruta ritas som nu och med
   grafikkretsen, och skillnaden räknas bildpunkt för bildpunkt.
   Inget sparas, och allt ställs tillbaka när mätningen är klar. Utan flaggan
   i adressen finns filen inte på sidan. */
(function (root) {
  'use strict';
  const SETTLE = 250, WINDOW = 1200, SWITCH_WINDOW = 2600, PAUSE_WINDOW = 2400, PAUSE_EVERY = 3;
  const LATE = 20.8, STALL = 40, HITCH = 100;
  // Antal varv, tio om inget annat anges (?varv=1 ger ett kort prov av själva flödet).
  const PASSES = Math.max(1, Math.min(20, Number(new URLSearchParams(root.location?.search || '').get('varv')) || 10));
  // [namn, läge]. Varje läge mäts utan (som nu) och med grafikkretsen.
  const STEPS = [['Master', 'master'], ['Original', 'original'], ['Byte Master och Original', 'switch']];
  // Samma ordning varje gång testet körs, men en ny ordning i varje varv.
  let seed = 20260920;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const PHASES = [{ pause: true, span: PAUSE_WINDOW }];
  for (let pass = 0; pass < PASSES; pass++) {
    const order = STEPS.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (const step of order) {
      const span = STEPS[step][1] === 'switch' ? SWITCH_WINDOW : WINDOW;
      const pair = [{ step, base: true, pass, span }, { step, base: false, pass, span }];
      if (pass % 2) pair.reverse();
      PHASES.push(...pair);
    }
    if ((pass + 1) % PAUSE_EVERY === 0 || pass === PASSES - 1) PHASES.push({ pause: true, span: PAUSE_WINDOW, pass });
  }

  function start(host) {
    const W = root, doc = root.document;
    if (!host?.engine || doc.getElementById('spelprov')) return;
    const style = doc.createElement('style');
    style.textContent = '#spelprov{position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;padding:10px 12px;'
      + 'border-radius:12px;background:#07070ef5;border:1px solid #b39be8aa;color:#efe6ff;'
      + 'font:11px/1.45 ui-monospace,Menlo,monospace;pointer-events:none;}'
      + '#spelprov.klar{top:8px;overflow-y:auto;-webkit-overflow-scrolling:touch;pointer-events:auto;overscroll-behavior:contain}'
      + '#spelprov b{color:#fff}#spelprov table{width:100%;border-collapse:collapse;margin:2px 0 6px}'
      + '#spelprov td{padding:1px 3px;white-space:nowrap}#spelprov td+td{text-align:right}';
    doc.head.append(style);
    const box = doc.createElement('div');
    box.id = 'spelprov';
    doc.body.append(box);
    let shown = '';
    const show = html => { if (html !== shown) { shown = html; box.innerHTML = html; } };

    // Skärmen hålls tänd där det går. Safari kräver ofta ett tryck först,
    // därför begärs låset igen vid varje tryck och när sidan syns igen.
    let lock = null, lockState = W.navigator?.wakeLock ? 'väntar på tryck' : 'går inte';
    async function wake() {
      if (lock || !W.navigator?.wakeLock || doc.hidden) return;
      try { lock = await W.navigator.wakeLock.request('screen'); lockState = 'på'; lock.addEventListener?.('release', () => { lock = null; lockState = 'släppt'; }); }
      catch (_) { lockState = 'nekad'; }
    }
    const lockLine = () => lockState === 'på' ? 'Skärmen hålls tänd.' : 'Skärmen kan släckas: ställ Automatiskt lås på Aldrig under testet.';
    doc.addEventListener('pointerdown', wake, { capture: true, passive: true });
    doc.addEventListener('click', wake, { capture: true });
    let interrupted = false, interruptions = 0;
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) { interrupted = true; interruptions++; } else wake(); });
    wake();
    const total = PHASES.reduce((a, p) => a + p.span + SETTLE, 0) + PASSES * 5000;
    show(`<b>Mätläge för uppspelning, Master och Original</b><br>Kör fram till resultatet och tryck play. Testet tar ungefär ${Math.round(total / 60000 + 1)} minuter. Låten byter mellan Master och Original, pausas och startar igen av sig själv. Rör inte skärmen.`);

    // Vad sidan gör i varje ruta. Räknas bara, ändrar ingenting.
    const tally = { up: 0, upMs: 0, read: 0, readMs: 0, slow: 0, slowMs: 0, lost: 0 };
    const unwrap = [];
    const wrap = (proto, name, after) => {
      const f = proto?.[name];
      if (typeof f !== 'function') return;
      proto[name] = function (...args) { const s = performance.now(); try { return f.apply(this, args); } finally { after(performance.now() - s); } };
      unwrap.push(() => { proto[name] = f; });
    };
    wrap(W.WebGLRenderingContext?.prototype, 'texImage2D', ms => { tally.up++; tally.upMs += ms; });
    wrap(W.WebGLRenderingContext?.prototype, 'texSubImage2D', ms => { if (ms > 1) { tally.up++; tally.upMs += ms; } });
    wrap(W.CanvasRenderingContext2D?.prototype, 'getImageData', ms => { tally.read++; tally.readMs += ms; });
    wrap(W.CanvasRenderingContext2D?.prototype, 'drawImage', ms => { if (ms > 2) { tally.slow++; tally.slowMs += ms; } });
    // Hur lång tid vågens ritkod tar i varje ruta. Skivans tid mäter motorn själv.
    let waveMs = 0;
    const track = host.track, trackRender = track?.renderAt;
    if (trackRender) track.renderAt = function (...args) { const s = performance.now(); try { return trackRender.apply(this, args); } finally { waveMs = performance.now() - s; } };
    const audio = W.MastrifyAudio, engine = host.engine, media = W.HTMLMediaElement?.prototype;
    const gpuAtStart = !!engine.gpuDisc?.active;
    function apply(gpu) {
      engine.setGpuDisc?.(!!gpu);
      if (!engine.running) engine.play();
      engine.renderEnabled = host.lpVisible();
    }
    // Samma knappar som man trycker på: Original och Master under vågen.
    const pick = mode => { if (engine.mode !== mode) doc.getElementById('compare-' + mode)?.click(); };

    // Grafikkretsen startas en gång innan mätningen börjar, så att första
    // steget med den inte får betala uppstarten (då byggs dess bilder).
    let gpuState = 'inte provad';
    const checks = [];
    function warmGpu() {
      if (!W.MastrifyGpuDisc) { gpuState = 'saknas, filen laddades inte'; return; }
      if (!W.MastrifyGpuDisc.supported()) { gpuState = 'stöds inte i den här webbläsaren'; return; }
      let ok = false;
      try { if (engine.setGpuDisc?.(true)) { engine.renderAt(engine.time, engine.energy); ok = !!engine.gpuDisc?.ready(); } }
      catch (_) { ok = false; }
      engine.gpuDisc?.canvas?.addEventListener('webglcontextlost', () => { tally.lost++; });
      engine.setGpuDisc?.(false);
      try { engine.renderAt(engine.time, engine.energy); } catch (_) { /* Nästa ruta ritar ändå. */ }
      gpuState = ok ? 'på' : 'gick inte att starta';
    }
    // Bildkoll: samma bildruta ritas som nu och med grafikkretsen, och de två
    // dukarna läggs ihop som skärmen gör. Tiden, slumpen och ljudets analys
    // står stilla under tiden, så skillnaden kommer bara från ritningen.
    // Bilden som nu ritas två gånger: skiljer de sig är koll-bilden brusig.
    function imageCheck(label) {
      if (gpuState !== 'på') { checks.push(`Bildkoll ${label}: gick inte, grafikkretsen ${gpuState}.`); return; }
      const wasRunning = !!engine.running, perf = W.performance, ownNow = Object.prototype.hasOwnProperty.call(perf, 'now');
      const clock = perf.now, frozenNow = clock.call(perf), randomBefore = Math.random, audioRef = W.MastrifyAudio;
      const timeDesc = media && Object.getOwnPropertyDescriptor(media, 'currentTime');
      const pausedDesc = media && Object.getOwnPropertyDescriptor(media, 'paused');
      const held = new Map();
      const hold = el => { if (!held.has(el)) held.set(el, [timeDesc.get.call(el), pausedDesc.get.call(el)]); return held.get(el); };
      const gpuBefore = !!engine.gpuDisc?.active;
      let images = null;
      engine.pause();
      try {
        if (timeDesc?.get && pausedDesc?.get) {
          Object.defineProperty(media, 'currentTime', { configurable: true, enumerable: timeDesc.enumerable,
            get() { return hold(this)[0]; }, set(value) { timeDesc.set.call(this, value); } });
          Object.defineProperty(media, 'paused', { configurable: true, enumerable: pausedDesc.enumerable, get() { return hold(this)[1]; } });
        }
        perf.now = () => frozenNow;
        if (audioRef) {
          const memo = {};
          for (const [key, value] of Object.entries(audioRef)) {
            if (typeof value !== 'function') { memo[key] = value; continue; }
            const seen = new Map();
            memo[key] = (...args) => {
              let id; try { id = JSON.stringify(args); } catch (_) { return value.apply(audioRef, args); }
              if (!seen.has(id)) seen.set(id, value.apply(audioRef, args));
              return seen.get(id);
            };
          }
          W.MastrifyAudio = memo;
        }
        const w = engine.canvas.width, h = engine.canvas.height;
        let place = null;
        const draw = gpu => {
          let n = 12345; Math.random = () => (n = (n * 16807) % 2147483647) / 2147483647;
          engine.setGpuDisc(gpu);
          // Skivans läge i duken (mitt och skala) tas från grafikkretsens eget
          // anrop, så att radien i rapporten är skivans egna mått.
          const disc = gpu ? engine.gpuDisc : null, render = disc?.render;
          if (disc) disc.render = frame => { place = frame.transform; return render(frame); };
          try { engine.renderAt(engine.time, engine.energy); } finally { if (disc) disc.render = render; }
          if (gpu && !engine.gpuDisc?.ready()) throw new Error('grafikkretsen ritade inte');
          const c = doc.createElement('canvas'); c.width = w; c.height = h;
          const x = c.getContext('2d', { willReadFrequently: true });
          if (gpu) { x.drawImage(engine.gpuDisc.canvas, 0, 0); x.globalCompositeOperation = 'lighter'; }
          x.drawImage(engine.canvas, 0, 0);
          if (gpu) { x.globalCompositeOperation = 'source-over'; x.drawImage(engine.gpuDisc.centerCanvas, 0, 0); }
          return x.getImageData(0, 0, w, h).data;
        };
        images = { a: draw(false), a2: draw(false), g: draw(true), w, h, place };
      } catch (error) {
        checks.push(`Bildkoll ${label}: gick inte (${error?.message || error}).`);
      } finally {
        Math.random = randomBefore;
        if (ownNow) perf.now = clock; else delete perf.now;
        if (audioRef) W.MastrifyAudio = audioRef;
        if (timeDesc) Object.defineProperty(media, 'currentTime', timeDesc);
        if (pausedDesc) Object.defineProperty(media, 'paused', pausedDesc);
        try { engine.setGpuDisc(gpuBefore); engine.renderAt(engine.time, engine.energy); } catch (_) { /* Nästa ruta ritar ändå. */ }
        if (wasRunning) engine.play();
      }
      if (images) checks.push(`Bildkoll ${label} ${compareImages(images)}`);
    }
    // Förmultiplicerat (färg gånger täckning), så som bilden faktiskt syns.
    // Per bildpunkt räknas den största skillnaden i någon kanal, 0 till 255.
    function compareImages({ a, a2, g, w, h, place }) {
      const m = place || { a: 1, b: 0, c: 0, d: 1, e: w / 2, f: h / 2 }, scale = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
      let seen = 0, differ = 0, over4 = 0, over16 = 0, top = 0, sum = 0, noise = 0;
      const rings = new Map();
      for (let i = 0; i < a.length; i += 4) {
        if (a[i] !== a2[i] || a[i + 1] !== a2[i + 1] || a[i + 2] !== a2[i + 2] || a[i + 3] !== a2[i + 3]) noise++;
        if (!a[i + 3] && !g[i + 3]) continue;
        seen++;
        const p = a[i + 3] / 255, q = g[i + 3] / 255;
        const d = Math.round(Math.max(Math.abs(a[i] * p - g[i] * q), Math.abs(a[i + 1] * p - g[i + 1] * q),
          Math.abs(a[i + 2] * p - g[i + 2] * q), Math.abs(a[i + 3] - g[i + 3])));
        if (!d) continue;
        differ++; sum += d; if (d > 4) over4++; if (d > top) top = d;
        if (d > 16) {
          over16++;
          const k = i >> 2, r = Math.round(Math.hypot(k % w + .5 - m.e, Math.floor(k / w) + .5 - m.f) / scale);
          rings.set(r, (rings.get(r) || 0) + 1);
        }
      }
      const share = v => { const x = v * 100 / Math.max(1, seen); return `${x > 0 && x < .1 ? x.toFixed(3) : x.toFixed(1)} %`; };
      const where = [...rings.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([r, c]) => `${r} (${c})`).join(', ');
      return `(${w}×${h}): ${share(differ)} av punkterna skiljer, snitt ${(sum / Math.max(1, differ)).toFixed(1)} nivåer, högst ${top}. `
        + `Över 4 nivåer ${share(over4)}, över 16 nivåer ${share(over16)}${where ? `, mest vid radie ${where}` : ''}. `
        + `Samma bild två gånger: ${noise ? `${noise} punkter skiljer (brus)` : 'lika'}.`;
    }

    const results = [], pauses = [], hitches = [];
    let index = 0, phaseStart = 0, last = null, intervals = [], running = false, windowHitches = 0, windowWorst = 0;
    let everPlayed = false, lastRestart = -1e9, prevCore = 0, prevWave = 0, originalChecked = false;
    let before = { ...tally }, audioAt = null, audioChanged = 0, audioStill = 0;
    const inResults = () => ['original', 'master'].includes(engine.mode);
    const playing = () => !!audio?.getState?.().playing && inResults();
    const left = () => PHASES.slice(index).reduce((a, p) => a + p.span + SETTLE, 0) + (PASSES - (PHASES[index]?.pass ?? 0)) * 5000;
    const modeOf = phase => phase.pause ? null : STEPS[phase.step][1];
    function begin(now) {
      const phase = PHASES[index], mode = modeOf(phase);
      if (phase.pause) { apply(false); try { audio.pause(); } catch (_) { /* Mätningen fortsätter ändå. */ } }
      else {
        apply(!phase.base);
        if (mode === 'switch') pick(engine.mode === 'master' ? 'original' : 'master');
        else pick(mode);
      }
      phaseStart = now; last = null; intervals = []; running = true; windowHitches = 0; windowWorst = 0; audioStill = 0; audioChanged = now;
      const name = phase.pause ? 'pausat' : `${STEPS[phase.step][0]}, ${phase.base ? 'som nu' : 'grafikkretsen'}`;
      show(`<b>Varv ${Math.min(PASSES, (phase.pass ?? 0) + 1)} av ${PASSES}:</b> ${name}<br>Ungefär ${Math.max(1, Math.round(left() / 60000))} min kvar. Rör inte skärmen. ${lockLine()}`);
    }
    function endPhase() { running = false; }
    const mean = list => list.reduce((a, b) => a + b, 0) / Math.max(1, list.length);
    const fps = list => list.length ? list.length * 1000 / list.reduce((a, b) => a + b, 0) : 0;
    const share = (list, limit) => list.filter(v => v > limit).length * 100 / Math.max(1, list.length);
    const pct = v => `${v < 1 && v > 0 ? v.toFixed(1) : Math.round(v)} %`;
    const num = v => v.toFixed(1).replace('.', ',');
    function row(step, base) {
      const list = results.filter(x => x.step === step && x.base === base), all = list.flatMap(x => x.intervals);
      return { fps: fps(all), late: share(all, LATE), stall: share(all, STALL), hitches: list.reduce((a, x) => a + x.hitches, 0),
        worst: Math.max(0, ...list.map(x => x.worst)), still: Math.max(0, ...list.map(x => x.still)) };
    }
    function table() {
      const env = `${/iPhone|iPad/.test(navigator.userAgent) ? 'iPhone' : 'Dator'} · ${W.MastrifyCanvas?.webKit ? 'Safari' : 'annan'} · täthet ${W.devicePixelRatio} · ${W.innerWidth}px · skiva ${Math.round(engine.width)}px`;
      const base = results.filter(r => r.base);
      const perPass = Array.from({ length: PASSES }, (_, p) => Math.round(fps(base.filter(r => r.pass === p).flatMap(r => r.intervals))));
      let html = `<b>Klart. Ta skärmdumpar av hela rutan och skicka dem, rutan går att skrolla.</b><br>${env}<br>`
        + `Grafikkretsen: ${gpuState}<br>${checks.join('<br>') || 'Bildkoll: inte gjord.'}<br>`
        + `Avbrott: ${interruptions}. ${lockLine()}<br>`
        + `Pausad under testet: ${pauses.map(Math.round).join(' · ')} bilder/s<br>`
        + `Som nu per varv: ${perPass.join(' · ')}<br>`
        + `Grafikkretsen tappad: ${tally.lost} gånger`;
      STEPS.forEach(([title, mode], step) => {
        html += `<br><b>${title}${mode === 'switch' ? ' (med övergången)' : ''}</b><table><tr><td></td><td>bilder/s</td><td>sena</td><td>stopp</td><td>hack</td><td>längsta</td><td>ljud still</td></tr>`;
        for (const [label, b] of [['som nu', true], ['grafikkretsen', false]]) {
          const r = row(step, b);
          html += `<tr><td>${label}</td><td>${num(r.fps)}</td><td>${pct(r.late)}</td><td>${pct(r.stall)}</td><td>${r.hitches}</td><td>${Math.round(r.worst)} ms</td><td>${Math.round(r.still)} ms</td></tr>`;
        }
        html += '</table>';
      });
      html += '"hack" är rutor över 0,1 s. "ljud still" är längsta stunden ljudets klocka stod still medan låten spelade.';
      const worst = hitches.slice().sort((x, y) => y.d - x.d).slice(0, 10);
      html += `<br><b>Längsta hacken</b>${worst.length ? '' : ': inga över 0,1 s'}`;
      for (const h of worst) {
        html += `<br>${Math.round(h.d)} ms, ${h.name}${h.gpu ? ' med grafikkretsen' : ', som nu'}${h.trans ? ', i övergång' : ''}: `
          + `ritkod ${num(h.core)} ms, våg ${num(h.wave)} ms, uppladdning ${h.up} (${Math.round(h.upMs)} ms), läsning ${h.read} (${Math.round(h.readMs)} ms), `
          + `långsam kopiering ${h.slow} (${Math.round(h.slowMs)} ms), ljudet +${num(h.audio)} s`;
      }
      return html;
    }
    function finish() {
      endPhase();
      try { engine.setGpuDisc?.(gpuAtStart); } catch (_) { /* Ingen fara. */ }
      for (const f of unwrap) f();
      if (trackRender) track.renderAt = trackRender;
      try { lock?.release?.(); } catch (_) { /* Ingen fara. */ }
      box.classList.add('klar');
      show(table());
    }
    function loop(now) {
      if (index >= PHASES.length) { finish(); return; }
      // Mätningen börjar först när låten har spelat i resultatläget.
      if (!everPlayed) {
        if (!playing()) { requestAnimationFrame(loop); return; }
        everPlayed = true;
        // Uppvärmning och bildkoll i Master före första fönstret. Två rutor
        // väntas först, så att texten hinner synas under kollen.
        pick('master');
        show('<b>Bildkoll</b><br>Samma bildruta ritas som nu och med grafikkretsen. Rör inte skärmen.');
        const settle = () => {
          if (engine.transition || engine.playbackReveal) { requestAnimationFrame(settle); return; }
          requestAnimationFrame(() => requestAnimationFrame(() => { warmGpu(); imageCheck('Master'); requestAnimationFrame(loop); }));
        };
        requestAnimationFrame(settle);
        return;
      }
      // Släcktes skärmen eller byttes app görs fönstret om från början.
      if (interrupted) { interrupted = false; endPhase(); requestAnimationFrame(loop); return; }
      const phase = PHASES[index], pausePhase = !!phase.pause, mode = modeOf(phase), switching = mode === 'switch';
      if (!pausePhase && !playing()) {
        // I ett byte kan ljudet stå still en kort stund medan den andra
        // versionen startar. Det är en del av bytet och mäts.
        if (!(switching && running && now - phaseStart < 2000)) {
          if (running) endPhase();
          // Efter ett pausat steg, och när förhandslyssningen tar slut, startar
          // mätläget låten igen. Går det inte får man trycka play själv.
          if (now - lastRestart > 2500 && inResults()) {
            lastRestart = now;
            Promise.resolve().then(() => audio.play()).catch(() => {});
          }
          show(`<b>Varv ${Math.min(PASSES, (phase.pass ?? 0) + 1)} av ${PASSES}</b><br>Låten startar igen av sig själv. Gör den inte det, tryck play.`);
          requestAnimationFrame(loop); return;
        }
      }
      if (!running) begin(now);
      // Startar låten under ett pausat steg pausas den igen och steget börjar om.
      if (pausePhase && audio?.getState?.().playing) {
        try { audio.pause(); } catch (_) { /* Mätningen fortsätter ändå. */ }
        phaseStart = now; last = null; intervals = [];
      }
      const core = engine.lastCoreMs || 0, wms = waveMs;
      const state = audio?.getState?.(), at = state?.currentTime;
      // Övergångar räknas inte i Master och Original, bara i bytena, där
      // övergången är det man ser när man trycker.
      if (!switching && (engine.playbackReveal || engine.transition)) {
        phaseStart = now; last = null; prevCore = core; prevWave = wms; before = { ...tally }; audioAt = at; audioChanged = now;
        requestAnimationFrame(loop); return;
      }
      // Bildkoll i Original, en gång, när övergången dit är klar.
      if (mode === 'original' && !originalChecked && engine.mode === 'original') {
        originalChecked = true;
        imageCheck('Original');
        apply(!phase.base);
        phaseStart = performance.now(); last = null; before = { ...tally };
        requestAnimationFrame(loop); return;
      }
      const age = now - phaseStart;
      if (age >= SETTLE && last !== null) {
        const d = now - last;
        intervals.push(d);
        if (d > HITCH) {
          windowHitches++;
          hitches.push({ name: pausePhase ? 'pausat' : STEPS[phase.step][0], gpu: !pausePhase && !phase.base, d, core: prevCore, wave: prevWave,
            up: tally.up - before.up, upMs: tally.upMs - before.upMs, read: tally.read - before.read, readMs: tally.readMs - before.readMs,
            slow: tally.slow - before.slow, slowMs: tally.slowMs - before.slowMs, audio: Number.isFinite(at) && Number.isFinite(audioAt) ? at - audioAt : 0,
            trans: !!(engine.transition || engine.playbackReveal) });
        }
        if (d > windowWorst) windowWorst = d;
      }
      // Ljudets klocka: hur länge har den stått still medan låten spelar?
      if (Number.isFinite(at) && at !== audioAt) audioChanged = now;
      else if (state?.playing && age >= SETTLE) audioStill = Math.max(audioStill, now - audioChanged);
      if (age >= SETTLE) last = now;
      prevCore = core; prevWave = wms; before = { ...tally }; audioAt = at;
      if (age >= SETTLE + phase.span && intervals.length) {
        if (pausePhase) pauses.push(fps(intervals));
        else results.push({ step: phase.step, base: phase.base, pass: phase.pass, intervals, hitches: windowHitches, worst: windowWorst, still: audioStill });
        endPhase();
        index++;
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
  root.MastrifySpelprov = Object.freeze({ start });
})(window);
