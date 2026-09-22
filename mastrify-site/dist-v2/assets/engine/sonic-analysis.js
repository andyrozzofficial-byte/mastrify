/* A magnified source-peak reading above Sonic Flow's unchanged overview.
 * The 64 inputs are unsigned raw peak magnitudes, not synthesized PCM.
 * Active processing may ease their display in visual time; stored source
 * peaks and the overview remain exact.
 * The host owns time, source selection, progress, and visibility transitions.
 */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, POINTS = 64;
  const clamp = value => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  const units = new Float32Array(POINTS);
  const peaks = new Float32Array(POINTS);
  const traceY = new Float32Array(POINTS);
  const tagLabels = ['BASS', 'MID', 'AIR'];
  const hologramBlue = '#fcf6ff';
  const meterKeys = ['bass', 'mid', 'air'];
  // What the scan prints follows the checklist the visitor reads below it.
  // Every reading is measured in the uploaded file, at the source position
  // where that annotation appeared. Nothing here describes a processed result.
  const ANALYZE_STEPS = [['PEAK', 'RMS', 'CREST'], ['WIDTH', 'BAL'], ['BASS', 'MID', 'AIR'],
    ['LEVEL', 'RMS'], ['TRANSIENT', 'PEAK'], ['TIME', 'CH', 'RMS']];
  const MASTER_STEPS = [['RMS', 'PEAK'], ['BASS', 'MID', 'AIR'], ['CREST', 'PEAK'],
    ['WIDTH', 'BAL'], ['TARGET', 'CHARACTER']];
  const decibels = value => Number.isFinite(value) && value > 1e-7 ? 20 * Math.log10(value) : null;
  const timecode = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const readoutCache = [null, null, null];
  const tagBrackets = new Path2D('M3-4H0V-1M0 1V4H3');
  const meterTargets = new Float64Array(3), meterDisplay = new Float64Array(3);
  const meterClock = { initialized: false, elapsed: 0, generation: null, source: null };
  for (let index = 0; index < POINTS; index++) units[index] = index / (POINTS - 1);
  const status = { active: false, source: 'example', sourceTime: null,
    peak: 0, displayPeak: 0, smoothing: false, points: POINTS, amount: 0,
    metersSource: 'unavailable', meterUnits: 'dBFS', meterPanels: 0, meterAnnotations: 0, metersSmoothing: false,
    metersRms: { bass: 0, mid: 0, air: 0 }, metersDbFS: { bass: null, mid: null, air: null } };

  function overviewAt(g, u, bottom = false) {
    const position = clamp(u) * 255, index = Math.floor(position);
    const left = g.bars[index], right = g.bars[Math.min(255, index + 1)];
    const blend = position - index;
    return bottom ? left.bottom + (right.bottom - left.bottom) * blend
      : left.top + (right.top - left.top) * blend;
  }

  function readPeaks(g, frame) {
    let peak = 0;
    status.sourceTime = Number.isFinite(frame.sourceTime) ? frame.sourceTime : null;
    if (frame.hasSource) {
      const sample = root.MastrifyAudio?.sampleWaveformAt;
      const values = typeof sample === 'function' && status.sourceTime !== null
        ? sample(status.sourceTime, 'original') : null;
      status.source = values ? 'audio' : 'unavailable';
      // Copy the shared scratch immediately. Never retain or mutate audio's
      // buffer, and never replace a silent/missing source with example motion.
      for (let index = 0; index < POINTS; index++) {
        const value = values ? clamp(values[index]) : 0;
        peaks[index] = value; peak = Math.max(peak, value);
      }
    } else {
      status.source = 'example'; status.sourceTime = null;
      // The same prepared example supplies this detail; no new random data.
      for (let index = 0; index < POINTS; index++) {
        const u = clamp(frame.readheadU + (units[index] - .5) * .16);
        const top = overviewAt(g, u), bottom = overviewAt(g, u, true);
        const value = clamp((bottom - top) / (2 * g.scale));
        peaks[index] = value; peak = Math.max(peak, value);
      }
    }
    status.peak = peak;
    return peak;
  }

  function readMeters(frame) {
    const read = root.MastrifyAudio?.sampleMetersAt;
    const measured = frame.hasSource && typeof read === 'function' && Number.isFinite(frame.sourceTime)
      ? read(frame.sourceTime, 'original') : null;
    const source = frame.hasSource ? (measured ? 'audio' : 'unavailable') : 'demo';
    status.metersSource = source;
    for (let band = 0; band < 3; band++) {
      const key = meterKeys[band], raw = measured?.[key];
      // These are raw RMS measurements. Neither file normalization nor the
      // listener's comparison gain changes the reported dBFS value.
      const rms = Number.isFinite(raw) && raw > 0 ? raw : 0;
      status.metersRms[key] = rms;
      meterTargets[band] = source === 'demo' ? clamp(frame.score?.[key]) : rms;
    }
    const state = frame.processingState;
    const timed = !!state?.active && Number.isFinite(state.elapsed);
    const elapsed = timed ? state.elapsed : 0;
    const dt = elapsed - meterClock.elapsed;
    const reset = !timed || !meterClock.initialized || meterClock.source !== source
      || meterClock.generation !== state.generation || dt < 0 || dt > .25;
    status.metersSmoothing = timed;
    for (let band = 0; band < 3; band++) {
      const target = meterTargets[band];
      if (reset) meterDisplay[band] = target;
      else if (dt > 1e-8) {
        const time = target > meterDisplay[band] ? .10 : .28;
        meterDisplay[band] += (target - meterDisplay[band]) * (1 - Math.exp(-dt / time));
        if (target === 0 && meterDisplay[band] < 1e-7) meterDisplay[band] = 0;
      }
      const rms = meterDisplay[band];
      status.metersDbFS[meterKeys[band]] = source === 'audio' && rms > 0 ? 20 * Math.log10(rms) : null;
    }
    // Paused/repeated frames have the same elapsed time and never advance the
    // display filter. Seeks and new processing generations seed their targets.
    meterClock.initialized = timed;
    meterClock.elapsed = elapsed; meterClock.generation = state?.generation;
    meterClock.source = source;
  }

  // A single annotation's reading. The backend may later supply its own live
  // values through processingState.readings; measured file values are the
  // fallback, never an invented one.
  function readout(key, at, state) {
    const audio = root.MastrifyAudio;
    const source = audio?.getState?.().sources?.original;
    if (!source?.loaded || typeof audio.sampleMetersAt !== 'function') return null;
    const supplied = state?.readings?.[key];
    const meters = audio.sampleMetersAt(at, 'original');
    const cue = typeof audio.sampleAt === 'function' ? audio.sampleAt(at, 'original') : null;
    const window = typeof audio.sampleWaveformAt === 'function' ? audio.sampleWaveformAt(at, 'original') : null;
    let loudest = 0;
    if (window) for (let index = 0; index < window.length; index++) if (window[index] > loudest) loudest = window[index];
    const peak = decibels(loudest), level = decibels(meters.level);
    const band = key === 'BASS' ? 'bass' : key === 'MID' ? 'mid' : key === 'AIR' ? 'air' : null;
    const weight = clamp(band ? cue?.[band] : cue?.level);
    const value = number => Number.isFinite(supplied) ? supplied : number;
    if (band) return { label: key, value: value(decibels(meters[band])), digits: 1, unit: ' dBFS', weight, span: 6 };
    switch (key) {
      case 'PEAK': return { label: key, value: value(peak), digits: 1, unit: ' dBFS', weight, span: 6 };
      case 'LEVEL': return { label: key, value: value(level), digits: 1, unit: ' dBFS', weight, span: 6 };
      case 'RMS': return { label: key, value: value(source.rmsDbFS), digits: 1, unit: ' dBFS', weight, span: 6 };
      case 'CREST': return { label: key, digits: 1, unit: ' dB', weight, span: 5,
        value: value(peak === null || level === null ? null : peak - level) };
      case 'WIDTH': return { label: key, value: value(clamp(cue?.width) * 100), digits: 0, unit: ' %', weight, span: 20 };
      case 'TRANSIENT': return { label: key, value: value(clamp(cue?.accent) * 100), digits: 0, unit: ' %', weight, span: 20 };
      case 'BAL': {
        const port = clamp(cue?.left), starboard = clamp(cue?.right), sum = port + starboard;
        return sum <= 1e-6 ? null
          : { text: `BAL ${Math.round(port / sum * 100)} / ${Math.round(starboard / sum * 100)}`, weight };
      }
      case 'TIME': return { text: `${timecode(at)} / ${timecode(source.duration)}`, weight };
      case 'CH': return source.channels ? { text: `${source.channels} CH`, weight } : null;
      case 'TARGET': return Number.isFinite(state?.goal)
        ? { label: key, value: state.goal, digits: 0, unit: ' LUFS', weight, span: 4 } : null;
      case 'CHARACTER': return state?.character ? { text: String(state.character).toUpperCase(), weight } : null;
      default: return null;
    }
  }

  function drawReadoutlets(ctx, g, frame, left, span, opacity) {
    readMeters(frame);
    if (g.usable < 120 || status.displayPeak <= 1e-7) return;
    // The small electronic annotations have a beginning and an end again.
    // One shared visual clock owns typing, fade and position; a paused frame
    // neither changes characters nor creates another annotation.
    const seconds = frame.processingState?.active && Number.isFinite(frame.processingState.elapsed)
      ? frame.processingState.elapsed : ((Number(frame.phase) || 0) / TAU) * 12;
    const count = g.usable >= 300 ? 3 : 2;
    const sourcePresence = Math.min(1, Math.sqrt(status.displayPeak * 16));
    const randomAt = seed => { const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return value - Math.floor(value); };
    const smooth = value => { const x = clamp(value); return x * x * (3 - 2 * x); };
    const period = 3.6, visibleFor = 1.7;
    ctx.save();
    try {
      ctx.globalCompositeOperation = 'source-over';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 8px ui-monospace, SFMono-Regular, Menlo, monospace';
      const state = frame.processingState;
      const steps = state?.kind === 'analyze' ? ANALYZE_STEPS : state?.kind === 'master' ? MASTER_STEPS : null;
      const stepKeys = steps ? steps[Math.min(steps.length - 1, Math.floor(clamp(state.progress) * steps.length))] : null;
      for (let item = 0; item < count; item++) {
        const band = count === 2 && item === 1 ? 2 : item;
        const clock = seconds - item * 1.12;
        if (clock < 0) continue;
        const event = Math.floor(clock / period), age = clock - event * period;
        if (age >= visibleFor) continue;
        const seed = event * 7 + (stepKeys ? item : band) * 19 + 1;
        let reading = null;
        if (stepKeys) {
          // Read the file where this annotation appeared, not where the scan
          // has since moved on to. A repeated frame recomputes the same text.
          const at = Math.max(0, (event * period + item * 1.12) * (Number(state.speed) || 0));
          const key = stepKeys[(item + event) % stepKeys.length];
          const held = readoutCache[item];
          reading = held && held.key === key && held.event === event ? held.reading
            : (readoutCache[item] = { key, event, reading: readout(key, at, state) }).reading;
        }
        if (!reading) {
          const measured = status.metersSource === 'audio';
          reading = { label: tagLabels[band], value: measured ? status.metersDbFS[meterKeys[band]] : null,
            digits: 1, unit: ' dBFS', span: 6, plain: !measured, weight: clamp(frame.score?.[meterKeys[band]]) };
        }
        const value = clamp(reading.weight);
        if (value <= .00001) continue;
        const written = reading.text !== undefined || reading.plain;
        const settled = written ? null : reading.value === null ? '−∞' : reading.value.toFixed(reading.digits);
        const head = reading.text !== undefined ? reading.text : reading.plain ? reading.label : `${reading.label} `;
        const fullText = written ? head : head + settled + reading.unit;
        // The label types in as before. The number then swings in and settles,
        // like a needle finding its reading; where it lands is the measurement.
        const typing = clamp(age / .30);
        // A short resolving terminal character supplies the former Matrix feel.
        const cursor = typing < 1 ? '01▌'[Math.floor(age * 23 + seed) % 3] : '';
        let text;
        if (typing < 1) text = head.slice(0, Math.floor(head.length * typing)) + cursor;
        else if (written || reading.value === null) text = fullText;
        else {
          const roll = clamp((age - .30) / .46), eased = 1 - (1 - roll) ** 3;
          const swing = (randomAt(seed + 11) < .5 ? -1 : 1) * reading.span * (.45 + .55 * randomAt(seed + 3));
          text = head + (reading.value + swing * (1 - eased)).toFixed(reading.digits).padStart(settled.length) + reading.unit;
        }
        const fade = smooth(age / .10) * (1 - smooth((age - 1.16) / .54));
        const alpha = opacity * .84 * Math.sqrt(value) * sourcePresence * fade;
        if (alpha <= .00001 || !text) continue;
        // Reserve both corners for the complete value while characters type,
        // plus the one extra character a swinging reading can occupy.
        const width = ctx.measureText(settled === null ? fullText : fullText + '0').width + 12;
        const minX = Math.min(g.pad + g.usable - width - 8, Math.max(g.pad + 8, left - span * .16));
        const maxX = Math.max(minX, Math.min(g.pad + g.usable - width - 8, left + span * 1.10 - width));
        const x = minX + Math.max(0, maxX - minX) * randomAt(seed);
        const u = clamp((x + width * .5 - g.pad) / g.usable);
        const top = overviewAt(g, u), bottom = overviewAt(g, u, true);
        // Sample the waveform locally, then choose a new position only while
        // the previous event is invisible. No floating permanent text row.
        const inset = 7, available = Math.max(0, bottom - top - inset * 2);
        if (available < 2) continue;
        const y = top + inset + available * (.14 + .72 * randomAt(seed + 5));
        status.meterAnnotations++;
        ctx.save();
        try {
          const center = x + width * .5;
          ctx.strokeStyle = hologramBlue; ctx.lineWidth = .6;
          ctx.globalAlpha = alpha * .52;
          ctx.beginPath(); ctx.moveTo(center, Math.max(top + 1, y - 10));
          ctx.lineTo(center, y - 4.8); ctx.stroke();
          ctx.translate(center, y);
          ctx.globalAlpha = alpha;
          ctx.save(); ctx.translate(-width * .5, 0); ctx.stroke(tagBrackets); ctx.restore();
          ctx.save(); ctx.translate(width * .5, 0); ctx.scale(-1, 1); ctx.stroke(tagBrackets); ctx.restore();
          ctx.fillStyle = hologramBlue; ctx.globalAlpha = alpha * .92;
          ctx.fillText(text, 0, .15);
          ctx.beginPath(); ctx.moveTo(-3, 5.5); ctx.lineTo(-3 + 6 * value, 5.5);
          ctx.lineWidth = .8; ctx.globalAlpha = alpha * .8; ctx.stroke();
        } finally { ctx.restore(); }
      }
    } finally { ctx.restore(); }
  }

  function draw(ctx, g, frame) {
    const amount = clamp(frame?.amount);
    status.active = amount > .00001;
    status.amount = amount;
    status.smoothing = false;
    status.displayPeak = 0;
    status.meterPanels = 0;
    status.meterAnnotations = 0;
    if (!status.active || !g?.bars || g.bars.length !== 256) return;
    readPeaks(g, frame);
    let displayPeaks = peaks;
    if (frame.processingState?.active && typeof root.MastrifyProcessingMotion?.waveform === 'function') {
      displayPeaks = root.MastrifyProcessingMotion.waveform('sonic', peaks, frame.processingState);
      status.smoothing = true;
    }
    let peak = 0;
    for (let index = 0; index < POINTS; index++) peak = Math.max(peak, clamp(displayPeaks[index]));
    status.displayPeak = peak;
    const p = Number.isFinite(frame.phase) ? ((frame.phase % TAU) + TAU) % TAU : 0;
    const motion = peak > 1e-7 ? p : 0;
    const score = frame.score || {};
    const bass = clamp(score.bass), mid = clamp(score.mid), air = clamp(score.air);
    const w = g.width, h = g.height, headU = clamp(frame.readheadU);
    const scanX = g.pad + headU * g.usable;
    const span = g.usable * .275;
    const left = Math.max(g.pad, Math.min(g.pad + g.usable - span, scanX - span * .72));
    const right = left + span;
    const baseline = Math.min(34, Math.max(25, g.middle - g.scale - 5));
    const detailScale = Math.min(21, baseline - 8);
    const top = baseline - detailScale - 4;
    const depth = Math.min(5.8, Math.max(3.5, h * .026));
    const settle = peak > 1e-7 ? .65 + .35 * Math.sin(motion) : .65;
    for (let index = 0; index < POINTS; index++) traceY[index] = baseline - clamp(displayPeaks[index]) * detailScale;

    ctx.save();
    try {
      ctx.beginPath(); ctx.rect(g.pad - 1, 2, g.usable + 2, h - 4); ctx.clip();
      ctx.shadowBlur = 0; ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
      ctx.filter = 'none'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const opacity = ctx.globalAlpha * amount;
      const ink = ctx.createLinearGradient(left, 0, right, 0);
      ink.addColorStop(0, 'rgba(133,80,239,0)');
      ink.addColorStop(.12, 'rgba(176,111,255,.68)');
      ink.addColorStop(.44, 'rgba(202,180,255,1)');
      ink.addColorStop(.64, 'rgba(208,240,255,1)');
      ink.addColorStop(.89, 'rgba(91,179,255,.85)');
      ink.addColorStop(1, 'rgba(79,155,246,0)');
      const recess = ctx.createLinearGradient(left, 0, right, 0);
      recess.addColorStop(0, 'rgba(4,9,22,0)');
      recess.addColorStop(.12, 'rgba(4,9,22,.62)');
      recess.addColorStop(.86, 'rgba(4,9,22,.62)');
      recess.addColorStop(1, 'rgba(4,9,22,0)');
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = recess; ctx.globalAlpha = opacity;
      ctx.beginPath(); ctx.moveTo(left, top + depth); ctx.lineTo(left + depth, top);
      ctx.lineTo(right, top); ctx.lineTo(right - depth, baseline + depth + 3);
      ctx.lineTo(left, baseline + depth + 3); ctx.closePath(); ctx.fill();

      // Sparse links return the magnified excerpt to real overview samples.
      // A supplied peak rate makes each fine-bin timestamp exact. Without it,
      // the detail links only to its exact source read position.
      const rate = Number.isFinite(frame.peakRate) && frame.peakRate > 0 ? frame.peakRate : 0;
      const duration = Number.isFinite(frame.sourceDuration) && frame.sourceDuration > 0 ? frame.sourceDuration : 0;
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = ink;
      ctx.beginPath();
      for (let index = 7; index < POINTS; index += 12) {
        let sourceU = headU;
        if (frame.hasSource && duration && status.sourceTime !== null) {
          sourceU = clamp((status.sourceTime + (rate ? (index - 31.5) / rate : 0)) / duration);
        } else if (!frame.hasSource) sourceU = clamp(headU + (units[index] - .5) * .16);
        const x = left + units[index] * span;
        const sourceX = g.pad + sourceU * g.usable;
        const sourceY = overviewAt(g, sourceU);
        ctx.moveTo(x, traceY[index] + depth); ctx.lineTo(sourceX, sourceY);
        ctx.moveTo(sourceX - 2, sourceY); ctx.lineTo(sourceX + 2, sourceY);
      }
      ctx.lineWidth = .65; ctx.globalAlpha = opacity * (.17 + .17 * mid); ctx.stroke();

      // The reading frame persists at silence; no sample acquires a fake
      // amplitude, comb height, or replacement oscillation when the input is 0.
      ctx.beginPath();
      for (let rail = 0; rail < 3; rail++) {
        const y = baseline - detailScale * rail / 2;
        ctx.moveTo(left, y + depth); ctx.lineTo(left + depth, y); ctx.lineTo(right, y);
      }
      for (let index = 0; index < POINTS; index += 8) {
        const x = left + units[index] * span;
        ctx.moveTo(x, top + 1); ctx.lineTo(x, baseline + depth);
      }
      ctx.lineWidth = .55; ctx.globalAlpha = opacity * .16; ctx.stroke();

      // Three contour planes share the same source-derived display values and
      // rigid offsets. Temporal easing never changes the stored raw peaks.
      for (let plane = 2; plane >= 0; plane--) {
        const xOffset = plane * depth * .7;
        const yOffset = plane * depth * .52 * (1 + .12 * settle);
        ctx.beginPath();
        for (let index = 0; index < POINTS; index++) {
          const x = left + units[index] * span + xOffset, y = traceY[index] + yOffset;
          if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineWidth = plane === 0 ? 1.3 : .85;
        ctx.globalAlpha = opacity * (plane === 0 ? .78 + .18 * air : plane === 1 ? .26 : .13);
        ctx.stroke();
        if (plane === 0 && peak > 1e-7) {
          ctx.lineWidth = 3.8; ctx.globalAlpha = opacity * .11; ctx.stroke();
        }
      }
      ctx.beginPath();
      for (let index = 0; index < POINTS; index++) {
        const x = left + units[index] * span;
        ctx.moveTo(x, baseline); ctx.lineTo(x, traceY[index]);
      }
      ctx.lineWidth = .65; ctx.globalAlpha = opacity * (.13 + .16 * bass); ctx.stroke();
      if (peak > 1e-7) {
        const sweep = ((motion / TAU + .13) % 1 + 1) % 1;
        const sweepX = left + span * sweep, reach = span * .11;
        const read = ctx.createLinearGradient(sweepX - reach, 0, sweepX + reach, 0);
        read.addColorStop(0, 'rgba(126,138,255,0)');
        read.addColorStop(.5, 'rgba(183,235,255,1)');
        read.addColorStop(1, 'rgba(82,185,255,0)');
        ctx.strokeStyle = read;
        ctx.lineWidth = 1.1;
        ctx.globalAlpha = opacity * (.40 + .36 * mid) * Math.sin(Math.PI * sweep) ** 2;
        ctx.stroke();
      }
      ctx.strokeStyle = ink; ctx.beginPath();
      for (let index = 7; index < POINTS; index += 8) {
        const x = left + units[index] * span, y = traceY[index];
        ctx.moveTo(x + 1.25, y); ctx.arc(x, y, 1.25, 0, TAU);
      }
      ctx.lineWidth = .7; ctx.globalAlpha = opacity * (.49 + .25 * air); ctx.stroke();

      // Compact, unlabelled band rails use the actual three source cues.
      const railWidth = span * .18, railY = baseline + depth + 1;
      for (let band = 0; band < 3; band++) {
        const value = band === 0 ? bass : band === 1 ? mid : air;
        const start = left + span * (.12 + band * .27);
        ctx.beginPath(); ctx.moveTo(start, railY); ctx.lineTo(start + railWidth, railY);
        ctx.lineWidth = .55; ctx.globalAlpha = opacity * .22; ctx.stroke();
        if (value > 0) {
          ctx.beginPath(); ctx.moveTo(start, railY); ctx.lineTo(start + railWidth * value, railY);
          ctx.lineWidth = 1.35; ctx.globalAlpha = opacity * (.40 + .38 * value); ctx.stroke();
        }
      }
      drawReadoutlets(ctx, g, frame, left, span, opacity);
    } finally { ctx.restore(); }
  }

  root.MastrifySonicAnalysis = Object.freeze({ draw, getStatus: () => ({ ...status,
    metersRms: { ...status.metersRms }, metersDbFS: { ...status.metersDbFS } }) });
})(typeof window !== 'undefined' ? window : globalThis);
