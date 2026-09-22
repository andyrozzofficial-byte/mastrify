/* Local-file playback and precomputed musical envelopes. Audio never leaves
 * this browser. Playback interpolates prepared energy and fine peak arrays.
 */
(function (root) {
  'use strict';

  const MAX_BYTES = 100 * 1024 * 1024;
  const MAX_DURATION = 20 * 60;
  // This same file is the short-lived analysis worker. PCM is copied in
  // bounded chunks; AudioBuffer views are never sent. Loaded on its own, the
  // page's exact versioned URL is used. Inside a bundle (build-v2.mjs)
  // currentScript is the bundle, so the build names this file's URL instead.
  const OWN_SCRIPT = typeof document !== 'undefined' ? document.currentScript?.src || '' : '';
  const ANALYSIS_WORKER_URL = typeof document === 'undefined' ? null
    : /\/audio-reactivity\.js(\?|$)/.test(OWN_SCRIPT) ? OWN_SCRIPT
    : root.MastrifyAssetURLs?.analysis || '/assets/engine/audio-reactivity.js';
  const MAX_ANALYSIS_CHUNK_BYTES = 512 * 1024;
  const CHANNELS = ['level', 'bass', 'mid', 'air', 'rim', 'accent', 'left', 'right', 'width'];
  const WAVEFORM_POINTS = 64, WAVEFORM_BIN_SECONDS = .004;
  const ZERO = Object.freeze({ level: 0, bass: 0, mid: 0, air: 0, rim: 0, accent: 0, left: 0, right: 0, width: 0 });
  const METER_CHANNELS = ['level', 'bass', 'mid', 'air'];
  const ZERO_METERS = Object.freeze({ level: 0, bass: 0, mid: 0, air: 0 });
  const ZERO_KICK = Object.freeze({ amount: 0, strength: 0, age: 0, nextIn: null, duration: 0, available: false });
  const clamp = value => Math.max(0, Math.min(1, value));
  const now = () => root.performance ? root.performance.now() : Date.now();
  // På iPhone och iPad går volymen på ett ljudelement inte att sätta från
  // skript: värdet ignoreras och läses alltid tillbaka som 1, enligt Apples
  // egen dokumentation. A/B-bytet här bygger på att båda tagningarna spelar
  // samtidigt och att den ena står på noll. På iOS låter därför båda lika
  // högt, och den "tysta" justeras dessutom ungefär tre gånger i sekunden,
  // vilket hörs och syns som hack. Där spelar vi bara en tagning åt gången
  // och byter med den äldre omstartsvägen, som redan finns för det här fallet.
  const VOLUME_WORKS = (() => {
    try {
      const probe = typeof document !== 'undefined' && document.createElement ? document.createElement('audio') : null;
      if (!probe) return true;
      probe.volume = .5;
      return Math.abs(probe.volume - .5) < .01;
    } catch (_) { return true; }
  })();
  // Uppmätt på Linus iPhone 19 sep: där GÅR volymen att sätta, så kontrollen
  // ovan släppte igenom den andra tagningen. Två ljudelement som spelar
  // samtidigt och där det tysta hoppas om nästan fyra gånger i sekunden gav
  // 43 bilder per sekund och nio hack i sekunden med motorn helt stoppad,
  // mot 60 och noll vid paus. Version 28, som spelade en tagning åt gången,
  // flöt. På telefoner och plattor spelar vi därför alltid en tagning åt
  // gången, oavsett volymen. Datorer behåller det glappfria bytet.
  const PHONE_OR_TABLET = (() => {
    try {
      const nav = root.navigator;
      if (!nav) return false;
      return /iPhone|iPad|iPod|Android/i.test(nav.userAgent || '')
        || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
    } catch (_) { return false; }
  })();
  const DUAL_TAKE = VOLUME_WORKS && !PHONE_OR_TABLET;
  const yieldToUI = () => new Promise(resolve => root.setTimeout(resolve, 0));
  const cancelled = () => {
    const error = new Error('Audio loading was cancelled.');
    error.name = 'AbortError';
    return error;
  };

  // Butterworth low-pass filters avoid turning a narrow bass tone into equal
  // energy in all three bands. Separate filter states prevent phase cancellation.
  function lowPass(sampleRate, frequency) {
    const w = 2 * Math.PI * Math.min(frequency, sampleRate * .45) / sampleRate;
    const cos = Math.cos(w), alpha = Math.sin(w) / Math.SQRT2;
    const a0 = 1 + alpha;
    return { b0: (1 - cos) / (2 * a0), b1: (1 - cos) / a0,
      b2: (1 - cos) / (2 * a0), a1: -2 * cos / a0, a2: (1 - alpha) / a0 };
  }

  // A private, unity-peak band-pass for kick identification. Cascading two
  // sections favours the 90–130 Hz body without accepting every sub-bass note.
  // It never replaces the broad display bands or changes playback samples.
  function kickBandPass(sampleRate) {
    const w = 2 * Math.PI * Math.min(110, sampleRate * .45) / sampleRate;
    const cos = Math.cos(w), alpha = Math.sin(w) / 4; // Q = 2 per section.
    const a0 = 1 + alpha;
    return { b0: alpha / a0, b1: 0, b2: -alpha / a0,
      a1: -2 * cos / a0, a2: (1 - alpha) / a0 };
  }

  // Histogram percentiles are bounded linear work, without a blocking sort of
  // a long recording. Silence contributes neither gain nor noise amplification.
  function percentile(values) {
    let maximum = 0, count = 0;
    for (let i = 0; i < values.length; i++) {
      if (values[i] > 1e-7) { maximum = Math.max(maximum, values[i]); count++; }
    }
    if (!count || maximum <= 0) return 0;
    const bins = new Uint32Array(1024);
    for (let i = 0; i < values.length; i++) {
      if (values[i] > 1e-7) bins[Math.min(1023, Math.floor(values[i] / maximum * 1023))]++;
    }
    const target = Math.ceil(count * .95);
    let seen = 0;
    for (let i = 0; i < bins.length; i++) {
      seen += bins[i];
      if (seen >= target) return maximum * (i + 1) / 1024;
    }
    return maximum;
  }

  async function analyzeBassOnsets(bass, fullBand, broadBass, focusBand, frameRate, duration, check) {
    // An 83–117 ms local power window rejects carrier-cycle RMS ripple. The
    // detector then compares actual neighbouring bass levels, never the
    // separately normalized display envelope or an assumed tempo grid.
    const count = bass.length, half = Math.max(2, Math.round(frameRate * .05));
    const lookBack = Math.max(1, Math.round(frameRate * .05));
    const history = Math.max(1, Math.round(frameRate * .45));
    const prefix = new Float64Array(count + 1), fullPrefix = new Float64Array(count + 1);
    const broadPrefix = new Float64Array(count + 1), broadSmooth = new Float64Array(count);
    const smooth = new Float64Array(count), fullSmooth = new Float64Array(count);
    // A relative rise in filter leakage is not a kick. Require audible low-end
    // power and low-end prominence in the new attack, excluding steady backing.
    const sourceFloor = Math.max(.0003, percentile(fullBand) * .008);
    const novelty = new Float64Array(count), candidates = [];
    // The kick's 90–130 Hz body can be brief, followed by a much deeper tail.
    // Inspect its short attack separately instead of requiring that narrow
    // band to dominate the whole 100 ms bass window. The wider signal below
    // retains the established onset timing, strength and return envelope.
    const hasKickBody = at => {
      const first = Math.max(0, at - Math.ceil(frameRate * .08));
      const beforeEnd = Math.max(first, at - 1);
      let baseBass = 0, baseFocus = 0;
      for (let j = first; j < beforeEnd; j++) {
        baseBass += bass[j] ** 2; baseFocus += focusBand[j] ** 2;
      }
      const samples = Math.max(1, beforeEnd - first);
      baseBass /= samples; baseFocus /= samples;
      let peakBass = 0, peakFocus = 0;
      for (let j = Math.max(0, at - 1); j <= Math.min(count - 1, at + Math.ceil(frameRate * .05)); j++) {
        peakBass = Math.max(peakBass, bass[j]);
        peakFocus = Math.max(peakFocus, focusBand[j]);
      }
      const bodyRise = Math.sqrt(Math.max(0, peakFocus ** 2 - baseFocus));
      const attackRise = Math.sqrt(Math.max(0, peakBass ** 2 - baseBass));
      return bodyRise >= sourceFloor * .35 && bodyRise >= attackRise * .20;
    };
    // A held bass note can attack as sharply as a kick. Require the added
    // low-end body to decay after its transient, without rejecting a steady
    // bass bed underneath it. This examines source samples once at load time;
    // it neither schedules beats nor changes the accepted pulse's envelope.
    const hasTransientDecay = at => {
      const beforeFirst = Math.max(0, at - Math.ceil(frameRate * .10));
      const beforeEnd = Math.max(beforeFirst, at - Math.ceil(frameRate * .025));
      let baseline = 0;
      for (let j = beforeFirst; j < beforeEnd; j++) baseline += bass[j] ** 2;
      baseline /= Math.max(1, beforeEnd - beforeFirst);
      let peak = 0;
      for (let j = Math.max(0, at - 1); j <= Math.min(count - 1, at + Math.ceil(frameRate * .065)); j++) {
        peak = Math.max(peak, bass[j] ** 2);
      }
      const tailFirst = at + Math.ceil(frameRate * .10);
      const tailEnd = Math.min(count, at + Math.ceil(frameRate * .18) + 1);
      // A real hit at the file edge need not have an observable full tail.
      if (tailEnd - tailFirst < Math.max(2, Math.round(frameRate * .035))) return true;
      let tail = 0;
      for (let j = tailFirst; j < tailEnd; j++) tail += bass[j] ** 2;
      tail /= tailEnd - tailFirst;
      return Math.max(0, tail - baseline) <= Math.max(0, peak - baseline) * .56;
    };
    let deadline = now() + 8;
    for (let i = 0; i < count; i++) {
      prefix[i + 1] = prefix[i] + bass[i] * bass[i];
      fullPrefix[i + 1] = fullPrefix[i] + fullBand[i] * fullBand[i];
      broadPrefix[i + 1] = broadPrefix[i] + broadBass[i] * broadBass[i];
    }
    for (let i = 0; i < count; i++) {
      const first = Math.max(0, i - half), end = Math.min(count, i + half + 1);
      smooth[i] = Math.sqrt(Math.max(0, prefix[end] - prefix[first]) / (end - first));
      fullSmooth[i] = Math.sqrt(Math.max(0, fullPrefix[end] - fullPrefix[first]) / (end - first));
      broadSmooth[i] = Math.sqrt(Math.max(0, broadPrefix[end] - broadPrefix[first]) / (end - first));
      if (i >= lookBack) novelty[i] = Math.max(0, Math.log((smooth[i] + 1e-7) / (smooth[i - lookBack] + 1e-7)));
    }
    // At the source edge there is no previous silence to assume. Only count
    // an initial transient if its early energy actually decays afterwards;
    // starting a constant sine therefore does not create a synthetic beat.
    const mean = (from, to) => {
      const first = Math.min(count, Math.max(0, Math.floor(from * frameRate)));
      const end = Math.min(count, Math.max(first + 1, Math.ceil(to * frameRate)));
      return end > first ? Math.sqrt(Math.max(0, prefix[end] - prefix[first]) / (end - first)) : 0;
    };
    if (duration >= .22) {
      const early = mean(0, .055), settled = mean(.14, .22);
      const earlyFull = Math.sqrt(fullPrefix[Math.min(count, Math.ceil(.055 * frameRate))]
        / Math.min(count, Math.ceil(.055 * frameRate)));
      if (early > sourceFloor && early > earlyFull * .38 && early > settled * 1.65) {
        const rise = Math.log((early + 1e-7) / (settled + 1e-7));
        let initialAt = 0, initialRise = -Infinity;
        for (let j = 0; j < Math.min(count, Math.ceil(.055 * frameRate)); j++) {
          const step = bass[j] - (j ? bass[j - 1] : 0);
          if (step > initialRise) { initialRise = step; initialAt = j; }
        }
        if (hasKickBody(initialAt) && hasTransientDecay(initialAt)) {
          candidates.push({ time: initialAt / frameRate, strength: clamp(1 - Math.exp(-2 * rise)), novelty: rise });
        }
      }
    }
    for (let i = 1; i < count - 1; i++) {
      if ((i & 2047) === 2047 && now() >= deadline) {
        check(); await yieldToUI(); check(); deadline = now() + 8;
      }
      if (novelty[i] < .14 || novelty[i] < novelty[i - 1] || novelty[i] <= novelty[i + 1] || smooth[i] < sourceFloor) continue;
      let local = 0, samples = 0;
      for (let j = Math.max(0, i - history); j < i - lookBack; j++) {
        local += Math.min(novelty[j], .7); samples++;
      }
      // Adapt to recent bass fluctuation, retaining small relative rises in
      // limited material while rejecting steady carrier ripple and noise.
      const threshold = Math.max(.14, (samples ? local / samples : 0) * 2.8 + .035);
      if (novelty[i] < threshold) continue;
      // A continuous bass bed must not lend its weight to a snare or vocal
      // transient. The increase itself needs meaningful low-frequency power.
      const bassRise = Math.max(0, smooth[i] - smooth[i - lookBack]);
      const addedBass = Math.sqrt(Math.max(0, smooth[i] ** 2 - smooth[i - lookBack] ** 2));
      const addedFull = Math.sqrt(Math.max(0, fullSmooth[i] ** 2 - fullSmooth[i - lookBack] ** 2));
      const addedBroad = Math.sqrt(Math.max(0, broadSmooth[i] ** 2 - broadSmooth[i - lookBack] ** 2));
      // A limited mix may duck its highs and keep total RMS constant. The
      // nested bass-band comparison still rejects low-mid filter leakage.
      if (bassRise < sourceFloor * .5 || addedBass < addedFull * .38 || addedBass < addedBroad * .40) continue;
      // Locate the strongest actual attack near the smoothed candidate, so
      // look-ahead used during preanalysis does not make the visual hit early.
      let at = i, strongest = -Infinity;
      for (let j = Math.max(0, i - half - 1); j <= Math.min(count - 1, i + half + 1); j++) {
        const before = ((j > 0 ? bass[j - 1] : 0) + (j > 1 ? bass[j - 2] : 0)) * .5;
        const rise = bass[j] - before;
        if (rise > strongest) { strongest = rise; at = j; }
      }
      // A slowly swelling bass note is not a drum attack. Compare the
      // fastest 25–33 ms rise with the nearby low-end peak (including the
      // following 160 ms), so fades near silence cannot win on ratio alone.
      let attackPeak = 0;
      for (let j = Math.max(0, at - 2); j <= Math.min(count - 1, at + Math.ceil(frameRate * .16)); j++) {
        attackPeak = Math.max(attackPeak, bass[j]);
      }
      if (strongest < attackPeak * .24 || !hasKickBody(at) || !hasTransientDecay(at)) continue;
      const event = { time: at / frameRate, strength: clamp(1 - Math.exp(-2 * novelty[i])), novelty: novelty[i] };
      const previous = candidates[candidates.length - 1];
      // Multiple neighbouring peaks from one attack form one event. This is
      // a minimum separation, not a BPM estimate or synthesized beat clock.
      if (previous && event.time - previous.time < .18) {
        if (event.novelty > previous.novelty) candidates[candidates.length - 1] = event;
      } else candidates.push(event);
    }
    check();
    return candidates.map((event, index) => {
      const next = candidates[index + 1];
      const interval = next ? next.time - event.time : .50;
      const gap = next ? Math.min(.045, interval * .14) : .04;
      return { time: event.time, strength: event.strength,
        duration: Math.max(0, Math.min(.82, interval - gap, duration - event.time)) };
    });
  }

  // Summarises one analysis into the numbers the studio's demo cards read.
  // Integrated level uses 3 s blocks with a relative -20 dB gate (no
  // K-weighting, so it is shown as an approximation). Range is the 10th to
  // 95th percentile spread of the gated blocks. Shares are mean band RMS
  // over the active frames; spreads are their standard deviation.
  function buildProfile(raw, stereoRaw, envelopes, frameRate, metrics) {
    const level = raw[0], n = level.length;
    const win = Math.max(1, Math.round(frameRate * 3)), hop = Math.max(1, Math.round(frameRate * .5));
    const blocks = [];
    for (let s = 0; s + win <= n; s += hop) {
      let sum = 0;
      for (let i = s; i < s + win; i++) sum += level[i] * level[i];
      const r = Math.sqrt(sum / win);
      if (r > 1e-5) blocks.push(20 * Math.log10(r));
    }
    if (!blocks.length && metrics.rms > 1e-5) blocks.push(20 * Math.log10(metrics.rms));
    blocks.sort((a, b) => a - b);
    const loudest = blocks.length ? blocks[blocks.length - 1] : -Infinity;
    const gated = blocks.filter(v => v > loudest - 20);
    const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
    let power = 0;
    for (const v of gated) power += Math.pow(10, v / 10);
    const loudness = gated.length ? 10 * Math.log10(power / gated.length) : null;
    const range = gated.length > 1 ? pct(gated, .95) - pct(gated, .1) : 0;
    let mean = 0;
    for (const v of gated) mean += v;
    mean = gated.length ? mean / gated.length : 0;
    let variance = 0;
    for (const v of gated) variance += (v - mean) * (v - mean);
    const movement = gated.length > 1 ? clamp(Math.sqrt(variance / gated.length) / 6) : 0;
    let bass = 0, mid = 0, air = 0, count = 0, accent = 0, widthSum = 0, widthSq = 0, bassSum = 0, bassSq = 0;
    for (let i = 0; i < n; i++) {
      if (level[i] <= 1e-4) continue;
      const total = raw[1][i] + raw[2][i] + raw[3][i] || 1e-9, share = raw[1][i] / total;
      bass += raw[1][i]; mid += raw[2][i]; air += raw[3][i];
      bassSum += share; bassSq += share * share;
      widthSum += stereoRaw[2][i]; widthSq += stereoRaw[2][i] * stereoRaw[2][i];
      accent += envelopes.accent[i]; count++;
    }
    const total = bass + mid + air || 1e-9;
    const spread = (sum, sq) => count > 1 ? Math.sqrt(Math.max(0, sq / count - (sum / count) * (sum / count))) : 0;
    const peakDb = metrics.peak > 1e-6 ? 20 * Math.log10(metrics.peak) : null;
    return {
      loudness: Number.isFinite(loudness) ? loudness : (metrics.rmsDbFS ?? null),
      peakDb, crest: peakDb !== null && metrics.rmsDbFS !== null ? peakDb - metrics.rmsDbFS : null,
      range, movement, accent: count ? accent / count : 0,
      width: metrics.width, widthSpread: metrics.channels > 1 ? spread(widthSum, widthSq) : 0,
      bassShare: bass / total, midShare: mid / total, airShare: air / total, bassSpread: spread(bassSum, bassSq),
      channels: metrics.channels, frames: count
    };
  }

  async function analyzeChannels(input, sampleRate, options = {}) {
    if (!Array.isArray(input) || !input.length || !Number.isFinite(sampleRate) || sampleRate <= 0) {
      throw new Error('The file contains no readable audio.');
    }
    const channels = input.slice(0, 2);
    if (channels.some(channel => !channel || !Number.isFinite(channel.length) || channel.length < 1)) {
      throw new Error('The file contains no readable audio.');
    }
    const length = Math.min(...channels.map(channel => channel.length));
    const duration = length / sampleRate;
    if (duration > MAX_DURATION) throw new Error('Choose a track no longer than 20 minutes.');
    const frameSize = Math.max(1, Math.round(sampleRate / 60));
    const frameRate = sampleRate / frameSize;
    const count = Math.ceil(length / frameSize);
    const raw = Array.from({ length: 4 }, () => new Float32Array(count));
    const top = new Float32Array(256), bottom = new Float32Array(256);
    const stereoRaw = Array.from({ length: 3 }, () => new Float32Array(count));
    let stereoReference = .00001, sumLeft = 0, sumRight = 0, sumCross = 0;
    // Integer sample boundaries give ~4 ms bins at no more than 250 Hz.
    // One Float32 peak per bin costs at most 1.2 MB for a twenty-minute file.
    const peakBinSize = Math.max(1, Math.ceil(sampleRate * WAVEFORM_BIN_SECONDS));
    const peakRate = sampleRate / peakBinSize;
    const peaks = new Float32Array(Math.ceil(length / peakBinSize));
    let peakMaximum = 0;
    const bassFilter = lowPass(sampleRate, 180), airFilter = lowPass(sampleRate, 3500);
    // Preserve the approved wider kick envelope; the focused band only adds
    // short-attack evidence. Both are analysis-only, never playback filters.
    // The current LP uses the approved broad bass envelope, not this optional
    // onset diagnostic. Direct analyzeChannels callers retain its default.
    const includeKickDiagnostics = options.includeKickDiagnostics !== false;
    const kickFilter = includeKickDiagnostics ? lowPass(sampleRate, 120) : null;
    const kickRaw = includeKickDiagnostics ? new Float32Array(count) : null;
    const focusFilter = includeKickDiagnostics ? kickBandPass(sampleRate) : null;
    const focusRaw = includeKickDiagnostics ? new Float32Array(count) : null;
    const filters = channels.map(() => ({ bass1: 0, bass2: 0, high1: 0, high2: 0,
      kick1: 0, kick2: 0, kick3: 0, kick4: 0, focus1: 0, focus2: 0, focus3: 0, focus4: 0 }));
    const check = () => { if (options.shouldCancel && options.shouldCancel()) throw cancelled(); };
    let deadline = now() + 8;
    check();

    // A worker can pull a small frame-aligned slice instead of retaining a
    // second full-song PCM allocation. The filter states span chunk boundaries.
    let pcm = channels, pcmOffset = 0, pcmEnd = options.readChunk ? 0 : length;
    const framesPerChunk = Math.max(1, Math.floor(MAX_ANALYSIS_CHUNK_BYTES / (channels.length * 4 * frameSize)));
    for (let frame = 0; frame < count; frame++) {
      const start = frame * frameSize, end = Math.min(length, start + frameSize);
      if (start >= pcmEnd) {
        check();
        const nextEnd = Math.min(length, start + framesPerChunk * frameSize);
        pcm = await options.readChunk(start, nextEnd); check();
        if (!Array.isArray(pcm) || pcm.length !== channels.length
            || pcm.some(channel => channel.length !== nextEnd - start)) throw new Error('The file contains no readable audio.');
        pcmOffset = start; pcmEnd = nextEnd;
      }
      let levelSum = 0, bassSum = 0, lowMidSum = 0, kickSum = 0, focusSum = 0, leftSum = 0, rightSum = 0, crossSum = 0;
      for (let channel = 0; channel < channels.length; channel++) {
        const data = pcm[channel], state = filters[channel];
        let peakBin = Math.floor(start / peakBinSize), nextPeakBin = (peakBin + 1) * peakBinSize;
        for (let i = start; i < end; i++) {
          const source = data[i - pcmOffset];
          const value = Number.isFinite(source) ? Math.max(-1, Math.min(1, source)) : 0;
          if (i >= nextPeakBin) { peakBin++; nextPeakBin += peakBinSize; }
          // Measure channels independently: opposite stereo polarities add
          // detail instead of cancelling it. No per-bin loudness compression.
          const magnitude = Math.abs(value);
          if (magnitude > peaks[peakBin]) peaks[peakBin] = magnitude;
          if (magnitude > peakMaximum) peakMaximum = magnitude;
          const low = bassFilter.b0 * value + state.bass1;
          state.bass1 = bassFilter.b1 * value - bassFilter.a1 * low + state.bass2;
          state.bass2 = bassFilter.b2 * value - bassFilter.a2 * low;
          if (includeKickDiagnostics) {
            const kickLow = kickFilter.b0 * value + state.kick1;
            state.kick1 = kickFilter.b1 * value - kickFilter.a1 * kickLow + state.kick2;
            state.kick2 = kickFilter.b2 * value - kickFilter.a2 * kickLow;
            const kick = kickFilter.b0 * kickLow + state.kick3;
            state.kick3 = kickFilter.b1 * kickLow - kickFilter.a1 * kick + state.kick4;
            state.kick4 = kickFilter.b2 * kickLow - kickFilter.a2 * kick;
            kickSum += kick * kick;
            const focused = focusFilter.b0 * value + state.focus1;
            state.focus1 = focusFilter.b1 * value - focusFilter.a1 * focused + state.focus2;
            state.focus2 = focusFilter.b2 * value - focusFilter.a2 * focused;
            const body = focusFilter.b0 * focused + state.focus3;
            state.focus3 = focusFilter.b1 * focused - focusFilter.a1 * body + state.focus4;
            state.focus4 = focusFilter.b2 * focused - focusFilter.a2 * body;
            focusSum += body * body;
          }
          const high = airFilter.b0 * value + state.high1;
          state.high1 = airFilter.b1 * value - airFilter.a1 * high + state.high2;
          state.high2 = airFilter.b2 * value - airFilter.a2 * high;
          if (channel === 0) leftSum += value * value;
          else {
            rightSum += value * value;
            const other = pcm[0][i - pcmOffset];
            crossSum += value * (Number.isFinite(other) ? Math.max(-1, Math.min(1, other)) : 0);
          }
          levelSum += value * value; bassSum += low * low;
          lowMidSum += high * high;
          const bin = Math.min(255, Math.floor(i / length * 256));
          if (value > top[bin]) top[bin] = value;
          if (-value > bottom[bin]) bottom[bin] = -value;
        }
      }
      if (channels.length === 1) { rightSum = leftSum; crossSum = leftSum; }
      const sampleCount = end - start;
      stereoRaw[0][frame] = Math.sqrt(leftSum / sampleCount);
      stereoRaw[1][frame] = Math.sqrt(rightSum / sampleCount);
      const stereoPower = leftSum + rightSum;
      stereoRaw[2][frame] = stereoPower > 1e-14
        ? Math.sqrt(clamp((stereoPower - 2 * crossSum) / (2 * stereoPower))) : 0;
      stereoReference = Math.max(stereoReference, stereoRaw[0][frame], stereoRaw[1][frame]);
      sumLeft += leftSum; sumRight += rightSum; sumCross += crossSum;
      const divisor = sampleCount * channels.length;
      raw[0][frame] = Math.sqrt(levelSum / divisor);
      raw[1][frame] = Math.sqrt(bassSum / divisor);
      if (includeKickDiagnostics) {
        kickRaw[frame] = Math.sqrt(kickSum / divisor);
        focusRaw[frame] = Math.sqrt(focusSum / divisor);
      }
      // Split band powers after accumulating RMS. Subtracting the filtered
      // waveforms would mistake their phase delay for extra high-frequency
      // energy, especially on a clean low bass note.
      raw[2][frame] = Math.sqrt(Math.max(0, lowMidSum - bassSum) / divisor);
      raw[3][frame] = Math.sqrt(Math.max(0, levelSum - lowMidSum) / divisor);
      if ((frame & 7) === 7 && now() >= deadline) {
        check(); await yieldToUI(); check(); deadline = now() + 8;
      }
    }
    check();
    await yieldToUI();
    check();

    // Preserve raw peak amplitude across original/master files; no per-file
    // gain is baked into either overview or fine waveform data.
    for (let i = 0; i < peaks.length; i++) {
      if (peaks[i] <= 1e-7) peaks[i] = 0;
    }

    const levelReference = Math.max(.00001, percentile(raw[0]));
    const references = [levelReference,
      Math.max(levelReference * .52, percentile(raw[1])),
      Math.max(levelReference * .52, percentile(raw[2])),
      Math.max(levelReference * .52, percentile(raw[3]))];
    const envelopes = Object.fromEntries(CHANNELS.map(name => [name, new Float32Array(count)]));
    const attacks = [.032, .04, .025, .018], releases = [.15, .17, .12, .095];
    const attack = attacks.map(seconds => Math.exp(-1 / (frameRate * seconds)));
    const release = releases.map(seconds => Math.exp(-1 / (frameRate * seconds)));
    const previous = [0, 0, 0, 0];
    const accentRelease = Math.exp(-1 / (frameRate * .14));
    let accent = 0, left = 0, right = 0, width = 0;
    deadline = now() + 8;
    for (let frame = 0; frame < count; frame++) {
      // A genuinely silent source frame is exactly zero, including filter and
      // release tails; a pause likewise produces no visual response.
      if (raw[0][frame] <= 1e-7) {
        previous.fill(0); accent = 0; left = 0; right = 0; width = 0;
      } else {
        let onset = 0;
        for (let band = 0; band < 4; band++) {
          const target = clamp(Math.pow(raw[band][frame] / references[band], .9));
          const coefficient = target > previous[band] ? attack[band] : release[band];
          const value = target + coefficient * (previous[band] - target);
          const weight = band === 0 ? 3.5 : band === 2 ? 1.4 : band === 3 ? .8 : .5;
          onset += Math.max(0, value - previous[band]) * weight;
          previous[band] = value;
        }
        accent = Math.max(clamp(onset), accent * accentRelease);
        // One shared linear scale and smoothing coefficient retain channel
        // balance. Width is the measured side/total RMS ratio, not random pan.
        const nextLeft = stereoRaw[0][frame] / stereoReference;
        const nextRight = stereoRaw[1][frame] / stereoReference;
        const stereoCoefficient = Math.max(nextLeft, nextRight) > Math.max(left, right) ? attack[0] : release[0];
        left = nextLeft + stereoCoefficient * (left - nextLeft);
        right = nextRight + stereoCoefficient * (right - nextRight);
        const nextWidth = stereoRaw[2][frame];
        width = channels.length === 1 ? 0 : nextWidth + attack[0] * (width - nextWidth);
      }
      for (let band = 0; band < 4; band++) envelopes[CHANNELS[band]][frame] = clamp(previous[band]);
      envelopes.left[frame] = clamp(left); envelopes.right[frame] = clamp(right);
      envelopes.width[frame] = clamp(width);
      envelopes.accent[frame] = clamp(accent);
      envelopes.rim[frame] = clamp(previous[0] * .55 + previous[1] * .3 + accent * .35);
      if ((frame & 1023) === 1023 && now() >= deadline) {
        check(); await yieldToUI(); check(); deadline = now() + 8;
      }
    }
    check();
    const rmsLeft = Math.sqrt(sumLeft / length), rmsRight = Math.sqrt(sumRight / length);
    const rms = Math.sqrt((sumLeft + sumRight) / (2 * length));
    const stereoPower = sumLeft + sumRight;
    const metrics = { rms, rmsLeft, rmsRight, peak: peakMaximum,
      rmsDbFS: rms > 0 ? 20 * Math.log10(rms) : null,
      width: channels.length === 1 || stereoPower <= 1e-14 ? 0
        : Math.sqrt(clamp((stereoPower - 2 * sumCross) / (2 * stereoPower))),
      channels: channels.length };
    // v2: a compact perceptual profile for the studio's analysis cards
    // (loudness, range, balance, energy). Read-only numbers, no playback use.
    metrics.profile = buildProfile(raw, stereoRaw, envelopes, frameRate, metrics);
    const meters = Object.fromEntries(METER_CHANNELS.map((name, index) => [name, raw[index]]));
    const bassOnsets = includeKickDiagnostics
      ? await analyzeBassOnsets(kickRaw, raw[0], raw[1], focusRaw, frameRate, duration, check) : [];
    return { waveform: Array.from({ length: 256 }, (_, i) => ({ top: top[i], bottom: bottom[i] })),
      envelopes, frameRate, peaks, peakRate, duration, metrics, channelsAnalyzed: channels.length,
      meters, bassOnsets, kickDiagnostics: includeKickDiagnostics };
  }

  // The same script is the worker entry point. No player, DOM or playback
  // singleton is created there; it only runs the exact analysis above.
  if (typeof document === 'undefined' && typeof root.postMessage === 'function'
      && typeof root.importScripts === 'function') {
    let receiveChunk = null, busy = false;
    root.onmessage = async event => {
      const request = event.data;
      if (request?.type === 'chunk') {
        const resolve = receiveChunk; receiveChunk = null;
        resolve?.(request.channels); return;
      }
      if (request?.type !== 'analyze' || busy) return;
      busy = true;
      try {
        const channels = Array.from({ length: request.channelCount }, () => ({ length: request.length }));
        const result = await analyzeChannels(channels, request.sampleRate, {
          includeKickDiagnostics: request.includeKickDiagnostics,
          readChunk: (start, end) => new Promise(resolve => {
            receiveChunk = resolve; root.postMessage({ type: 'chunk', start, end });
          })
        });
        const arrays = [result.peaks, ...Object.values(result.envelopes), ...Object.values(result.meters)];
        root.postMessage({ type: 'result', result }, arrays.map(array => array.buffer));
      } catch (error) {
        root.postMessage({ type: 'error', name: error.name, message: error.message });
      } finally { busy = false; receiveChunk = null; }
    };
    return;
  }

  async function analyzeForLoad(channels, sampleRate, slot, ticket, options) {
    const check = () => { if (ticket !== slot.generation || options.signal?.aborted) throw cancelled(); };
    check();
    let worker = null;
    if (ANALYSIS_WORKER_URL && typeof root.Worker === 'function') {
      try { worker = new root.Worker(ANALYSIS_WORKER_URL); } catch (_) { /* CSP or unavailable worker: yield on the main thread. */ }
    }
    if (worker) {
      try {
        const result = await new Promise((resolve, reject) => {
          let done = false, timeout;
          const finish = (error, value) => {
            if (done) return; done = true;
            root.clearTimeout(timeout); slot.aborters.delete(abort);
            worker.onmessage = worker.onerror = worker.onmessageerror = null;
            error ? reject(error) : resolve(value);
          };
          const abort = () => finish(cancelled());
          const failed = () => finish(new Error('Audio analysis worker was unavailable.'));
          // A stale/blocked worker must not leave an upload pending forever.
          const watch = () => { root.clearTimeout(timeout); timeout = root.setTimeout(failed, 15000); };
          slot.aborters.add(abort);
          worker.onerror = worker.onmessageerror = failed;
          worker.onmessage = event => {
            if (done) return;
            try {
              check(); watch();
              const message = event.data;
              if (message?.type === 'chunk') {
                const { start, end } = message;
                const length = Math.min(...channels.map(channel => channel.length));
                if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > length
                    || (end - start) * channels.length * 4 > MAX_ANALYSIS_CHUNK_BYTES) return failed();
                const pcm = channels.map(channel => channel.slice(start, end));
                worker.postMessage({ type: 'chunk', channels: pcm }, pcm.map(channel => channel.buffer));
              } else if (message?.type === 'result') finish(null, message.result);
              else if (message?.type === 'error') failed();
            } catch (error) { finish(error); }
          };
          try {
            watch(); check();
            worker.postMessage({ type: 'analyze', sampleRate,
              length: Math.min(...channels.map(channel => channel.length)), channelCount: channels.length,
              includeKickDiagnostics: options.includeKickDiagnostics });
          } catch (error) { finish(error); }
        });
        check(); return result;
      } catch (error) {
        check();
        if (error.name === 'AbortError') throw error;
        // Original PCM was never detached. Retry the same math cooperatively
        // if worker startup, CSP, transfer or memory allocation failed.
      } finally { worker.terminate(); }
    }
    return analyzeChannels(channels, sampleRate, {
      includeKickDiagnostics: options.includeKickDiagnostics,
      shouldCancel: () => ticket !== slot.generation || options.signal?.aborted
    });
  }

  const SLOT_NAMES = ['original', 'master'];
  const slots = Object.fromEntries(SLOT_NAMES.map(id => [id, { id, generation: 0,
    analysis: null, player: null, url: null, name: '', pendingSeek: null, sourceOffset: 0, full: null, playerOffset: 0,
    mix: id === 'original' ? 1 : 0, decoders: new Set(), aborters: new Set() }]));
  let selected = 'original', transport = 0, wantsPlayback = false, levelMatched = false;
  let previewWindow = null, previewTimer = null;
  // Sant medan fingret drar på vågen och ljudet väntar på släppet (se seek).
  let dragWaiting = false;
  const listeners = new Set(), waveformSample = new Float32Array(WAVEFORM_POINTS);
  const waveformAtSample = new Float32Array(WAVEFORM_POINTS);

  // A musical highlight heuristic, not semantic chorus recognition. Compare
  // sustained entries with their lead-in, rather than isolated hits.
  function choosePreview(analysis) {
    const duration = Math.max(0, Number(analysis?.duration) || 0), length = Math.min(40, duration);
    if (duration <= 40) return { start: 0, end: duration, duration, cueTime: 0, method: 'short-track' };
    const level = analysis.meters?.level || [], bass = analysis.meters?.bass || [], rate = analysis.frameRate || 60;
    const count = Math.ceil(duration * 2), power = new Float64Array(count + 1), low = new Float64Array(count + 1);
    for (let bin = 0; bin < count; bin++) {
      let a = 0, b = 0, n = 0;
      for (let i = Math.floor(bin * rate / 2); i < Math.min(level.length, Math.floor((bin + 1) * rate / 2)); i++) {
        a += (Number.isFinite(level[i]) ? level[i] : 0) ** 2;
        b += (Number.isFinite(bass[i]) ? bass[i] : 0) ** 2; n++;
      }
      power[bin + 1] = power[bin] + a / Math.max(1, n); low[bin + 1] = low[bin] + b / Math.max(1, n);
    }
    const mean = (p, from, to) => { const a = Math.max(0, Math.floor(from * 2)), b = Math.min(count, Math.ceil(to * 2)); return (p[b] - p[a]) / Math.max(1, b - a); };
    const average = power[count] / count;
    if (!(average > 1e-12)) return { start: 0, end: length, duration: length, cueTime: 0, method: 'silence' };
    let cue = 5, best = -Infinity, bestSustain = -Infinity, sustainCue = 5;
    for (let t = 5; t <= duration - 8; t += .5) {
      const before = mean(power, t - 5, t), after = mean(power, t, t + 2);
      const sustained = Math.min(after, mean(power, t + 2, t + 4), mean(power, t + 4, t + 6), mean(power, t + 6, t + 8)), entry = Math.max(0, after - before);
      const bassEntry = Math.max(0, mean(low, t, t + 2) - mean(low, t - 5, t));
      // Non-overlapping entry and tail windows prevent one loud transient
      // from winning. A mild early preference resolves repeated equal hooks.
      const score = (entry + .35 * bassEntry) * Math.min(1, sustained / Math.max(after, 1e-12))
        + .12 * sustained - .025 * average * t / duration;
      if (sustained > bestSustain) { bestSustain = sustained; sustainCue = t; }
      if (entry > average * .16 && sustained > average * .45 && score > best) { best = score; cue = t; }
    }
    const method = best === -Infinity ? 'sustained-section' : 'energy-entry';
    if (best === -Infinity) cue = sustainCue;
    const start = Math.max(0, Math.min(duration - length, cue - 5));
    return { start, end: start + length, duration: length, cueTime: cue, method };
  }
  function bounds(slot, window = previewWindow) {
    const duration = slot.analysis?.duration || 0;
    if (!window) return { start: 0, end: duration };
    return { start: Math.max(0, Math.min(duration, window.start - slot.sourceOffset)),
      end: Math.max(0, Math.min(duration, window.end - slot.sourceOffset)) };
  }
  function cancelPreviewTimer() { root.clearTimeout(previewTimer); previewTimer = null; }
  function enforcePreview() {
    cancelPreviewTimer();
    if (!previewWindow) return;
    const slot = slots[selected], player = slot.player;
    if (!player || !slot.analysis) return;
    const { start, end } = bounds(slot), at = position(slot);
    // Medan fingret drar spelar spelaren vidare där den var och läget visar
    // fingret. Når det som hörs slutet stoppas uppspelningen, men läget som
    // fingret visar lämnas orört tills fingret släpper.
    const heard = dragWaiting && Number.isFinite(player.currentTime) ? player.currentTime + slot.playerOffset : at;
    if (dragWaiting && heard >= end) {
      if (wantsPlayback || !player.paused) { wantsPlayback = false; transport++; cancelStepTimer(); player.pause(); partnerOf(slot)?.player.pause(); }
      return;
    }
    if (at < start) { slot.pendingSeek = start; applyPendingSeek(slot); }
    if (at >= end) {
      const wasPlaying = wantsPlayback || !player.paused;
      wantsPlayback = false;
      if (wasPlaying) { transport++; cancelStepTimer(); player.pause(); partnerOf(slot)?.player.pause(); }
      if (at !== end) { slot.pendingSeek = end; applyPendingSeek(slot); }
      return;
    }
    if (!player.paused) previewTimer = root.setTimeout(() => { enforcePreview(); notify(); },
      Math.max(5, (end - heard) / Math.max(.1, player.playbackRate || 1) * 1000));
  }
  function setPreviewWindow(value) {
    pause();
    if (!value || !Number.isFinite(value.start) || !Number.isFinite(value.end)
        || value.start < 0 || value.end <= value.start || value.end - value.start > 40.001)
      throw new Error('The preview must contain at most 40 seconds.');
    previewWindow = Object.freeze({ start: value.start, end: value.end, sourceDuration: value.sourceDuration || slots.original.analysis?.duration || value.end });
    for (const slot of Object.values(slots)) if (slot.player && slot.analysis) {
      slot.previewWave = null; slot.previewRms = null; slot.pendingSeek = bounds(slot).start; applyPendingSeek(slot);
    }
    applyGains(); notify(); return previewWindow;
  }
  function clearPreviewWindow() {
    if (!previewWindow && !SLOT_NAMES.some(id => slots[id].full)) return;
    pause(); previewWindow = null;
    for (const slot of Object.values(slots)) { dropClip(slot); slot.previewWave = null; slot.previewRms = null; }
    applyGains(); notify();
  }

  function slotAt(id = selected) {
    if (!SLOT_NAMES.includes(id)) throw new RangeError('Choose original or master.');
    return slots[id];
  }
  function position(slot) {
    const time = slot.pendingSeek !== null ? slot.pendingSeek : slot.player ? slot.player.currentTime + slot.playerOffset : NaN;
    return slot.analysis && Number.isFinite(time) ? Math.max(0, Math.min(slot.analysis.duration, time)) : 0;
  }
  function referenceRms(slot) {
    if (!previewWindow) return slot.analysis?.metrics.rms || 0;
    if (slot.previewRms != null) return slot.previewRms;
    const a=slot.analysis, range=bounds(slot), values=a?.meters?.level;
    if (!values) return a?.metrics.rms || 0;
    let sum=0, weight=0;
    const first=range.start*a.frameRate, last=range.end*a.frameRate;
    for(let i=Math.floor(first);i<Math.min(values.length,Math.ceil(last));i++) {
      const w=Math.max(0,Math.min(last,i+1)-Math.max(first,i));
      sum+=values[i]*values[i]*w; weight+=w;
    }
    return slot.previewRms=Math.sqrt(sum/Math.max(1,weight));
  }
  function gainFor(slot) {
    const a = referenceRms(slots.original), b = referenceRms(slots.master);
    // A silent reference has no meaningful match level; retain unmuted playback.
    if (!levelMatched || !(a > 1e-7) || !(b > 1e-7) || !slot.analysis) return 1;
    return clamp(Math.min(a, b) / referenceRms(slot));
  }
  function applyGains() {
    for (const slot of Object.values(slots)) if (slot.player) slot.player.volume = clamp(gainFor(slot) * slot.mix);
  }
  // Both takes run together on one shared source clock. Switching is a level
  // move, never a pause, a seek and a restart, so A/B has no gap. The take
  // that goes quiet is realigned while nobody can hear it.
  //
  // Ett hårt nivåsteg mellan två olika vågformer hörs dock som ett klick, även
  // när bytet i övrigt är sömlöst: utsignalen hoppar från den ena tagningens
  // momentanvärde till den andras. Nivån flyttas därför över SWAP_MS med en
  // kurva vars lutning är noll i båda ändar, så steget försvinner. Tolv
  // millisekunder är för kort för att uppfattas som en toning, och eftersom de
  // två tagningarna är samma framförande är rak överblandning rätt: ingen
  // svacka, ingen puckel. Ingen paus, ingen sökning, ingen omstart.
  const SWAP_MS = 12;
  let swapRamp = null;
  function settleMix() {
    for (const slot of Object.values(slots)) slot.mix = slot.id === selected ? 1 : 0;
    applyGains();
  }
  function cancelFade() { if (swapRamp) { swapRamp.stop(); swapRamp = null; } }
  function blendToSelected(instant) {
    // Ett byte mitt i ett byte fortsätter från nuvarande nivå, aldrig från noll.
    if (swapRamp) { swapRamp.stop(); swapRamp = null; }
    const steps = Object.values(slots).map(slot => ({ slot, from: slot.mix, to: slot.id === selected ? 1 : 0 }));
    const moves = steps.some(step => Math.abs(step.to - step.from) > 1e-4);
    // Utan MessageChannel finns ingen klocka finare än en bildruta. En ramp i
    // fyra hack låter sämre än ett rent byte, så då byter vi rent.
    const Channel = root.MessageChannel;
    if (instant || !moves || typeof Channel !== 'function' || !root.performance) { settleMix(); return; }
    const started = now(), channel = new Channel();
    let live = true;
    const stop = () => { live = false; channel.port1.onmessage = null; };
    channel.port1.onmessage = () => {
      if (!live) return;
      const at = Math.min(1, (now() - started) / SWAP_MS);
      const shape = .5 - .5 * Math.cos(Math.PI * at);
      for (const step of steps) step.slot.mix = step.from + (step.to - step.from) * shape;
      applyGains();
      if (at < 1) { channel.port2.postMessage(0); return; }
      stop();
      if (swapRamp && swapRamp.stop === stop) swapRamp = null;
      settleMix();
    };
    swapRamp = { stop };
    channel.port2.postMessage(0);
  }
  function partnerOf(slot) {
    const other = slots[slot.id === 'original' ? 'master' : 'original'];
    return other !== slot && other.analysis && other.player ? other : null;
  }
  function sourceNow(slot) { return position(slot) + slot.sourceOffset; }
  // Two audio elements drift, and a start call has its own latency, so the
  // quiet take can end up tens of milliseconds behind. Left alone that becomes
  // a small jump backwards the moment you switch to it. Corrections therefore
  // happen on whichever take is silent, often and tightly.
  const STEP_TOLERANCE = .003, STEP_INTERVAL = 250;
  let stepTimer = null;
  function alignSlot(slot, sourceTime) {
    if (!slot || !slot.analysis || !slot.player || !Number.isFinite(sourceTime)) return;
    const range = bounds(slot);
    const want = Math.max(range.start, Math.min(range.end, sourceTime - slot.sourceOffset));
    if (Math.abs(position(slot) - want) < STEP_TOLERANCE) return;
    slot.pendingSeek = want; applyPendingSeek(slot);
  }
  function cancelStepTimer() {
    if (stepTimer !== null) { root.clearTimeout(stepTimer); stepTimer = null; }
  }
  function keepInStep() {
    cancelStepTimer();
    // Medan fingret drar står det som hörs kvar och läget visar fingret; den
    // tysta tagningen rättas först när fingret släppt (seek anropar oss igen).
    if (dragWaiting) return;
    const slot = slots[selected], partner = partnerOf(slot);
    if (!runningInStep(slot) || !runningInStep(partner)) return;
    alignSlot(partner, sourceNow(slot));
    stepTimer = root.setTimeout(keepInStep, STEP_INTERVAL);
  }
  function runningInStep(slot) {
    return !!(slot && slot.player && slot.analysis && !slot.player.paused && !slot.player.ended);
  }
  function sourceState(slot) {
    return { loaded: !!slot.analysis, name: slot.name, duration: slot.analysis?.duration || 0,
      rms: slot.analysis?.metrics.rms || 0, rmsDbFS: slot.analysis?.metrics.rmsDbFS ?? null, profile: slot.analysis?.metrics.profile || null,
      channels: slot.analysis?.channelsAnalyzed || 0, peakRate: slot.analysis?.peakRate || 0, outputGain: gainFor(slot) };
  }
  function getState() {
    const slot = slots[selected], range = bounds(slot), duration = range.end - range.start;
    const currentTime = Math.max(0, Math.min(duration, position(slot) - range.start));
    return { loaded: !!slot.analysis,
      playing: !!(slot.analysis && slot.player && !slot.player.paused && !slot.player.ended && currentTime < duration),
      currentTime, duration, sourceTime: position(slot) + slot.sourceOffset,
      sourceDuration: previewWindow?.sourceDuration || slot.analysis?.duration || 0, preview: previewWindow, name: slot.name, selected,
      sources: { original: sourceState(slots.original), master: sourceState(slots.master) },
      levelMatched, outputGain: gainFor(slot),
      canCompare: !!(slots.original.analysis && slots.master.analysis),
      matchingAvailable: !!(referenceRms(slots.original) > 1e-7 && referenceRms(slots.master) > 1e-7) };
  }
  function notify() {
    const state = getState();
    for (const listener of listeners) { try { listener(state); } catch (_) { /* Isolate observers. */ } }
  }
  function applyPendingSeek(slot) {
    if (slot.pendingSeek === null || !slot.player || !slot.analysis) return true;
    try {
      const target = Math.max(0, Math.min(slot.analysis.duration, slot.pendingSeek)) - slot.playerOffset;
      const length = slot.player.duration;
      slot.player.currentTime = Math.max(0, Number.isFinite(length) ? Math.min(length, target) : target);
      slot.pendingSeek = null;
      return true;
    } catch (_) { return false; }
  }
  function createPlayer(slot) {
    if (typeof root.Audio !== 'function') throw new Error('Your browser cannot play audio here.');
    const player = new root.Audio();
    player.preload = 'auto';
    const changed = () => {
      if (slot.player !== player) return;
      if (player.ended && selected === slot.id) wantsPlayback = false;
      if (selected === slot.id) enforcePreview();
      notify();
    };
    for (const event of ['play', 'playing', 'pause', 'ended', 'timeupdate', 'seeking', 'seeked', 'ratechange', 'error']) player.addEventListener(event, changed);
    player.addEventListener('loadedmetadata', () => {
      if (slot.player !== player) return;
      applyPendingSeek(slot); notify();
    });
    return player;
  }
  function disposePlayer(player, url) {
    if (player) { player.pause(); player.removeAttribute('src'); player.load(); }
    if (url) root.URL.revokeObjectURL(url);
  }
  function closeDecoder(slot, decoder) {
    slot.decoders.delete(decoder);
    try { return Promise.resolve(decoder.close()).catch(() => {}); } catch (_) { return Promise.resolve(); }
  }
  function cancelLoad(slot) {
    slot.generation++;
    for (const cancel of Array.from(slot.aborters)) cancel();
    for (const decoder of Array.from(slot.decoders)) closeDecoder(slot, decoder);
  }
  function waitForMetadata(player, slot, ticket) {
    if (player.readyState >= 1) return Promise.resolve();
    return new Promise((resolve, reject) => {
      let timer;
      const finish = error => {
        player.removeEventListener('loadedmetadata', ready);
        player.removeEventListener('error', failed);
        slot.aborters.delete(abort); root.clearTimeout(timer);
        error ? reject(error) : resolve();
      };
      const ready = () => finish(ticket === slot.generation ? null : cancelled());
      const failed = () => finish(new Error('This file could be read but cannot be played by your browser.'));
      const abort = () => finish(cancelled());
      player.addEventListener('loadedmetadata', ready);
      player.addEventListener('error', failed);
      slot.aborters.add(abort);
      timer = root.setTimeout(failed, 20000);
      if (ticket !== slot.generation) abort();
    });
  }

  async function load(file, id = 'original', { signal, includeKickDiagnostics = false, sourceOffset = 0 } = {}) {
    if (signal?.aborted) throw cancelled();
    const slot = slotAt(id);
    cancelLoad(slot);
    const ticket = slot.generation;
    if (!file || typeof file.arrayBuffer !== 'function' || !Number.isFinite(file.size)) throw new Error('Choose an audio file from your device.');
    if (file.size > MAX_BYTES) throw new Error('Choose an audio file smaller than 100 MiB.');
    if (file.size <= 0) throw new Error('This file is empty. Choose another file.');
    const Context = root.AudioContext || root.webkitAudioContext;
    if (!Context) throw new Error('Your browser cannot read this audio file.');
    const check = () => { if (ticket !== slot.generation || signal?.aborted) throw cancelled(); };
    const onAbort = () => { if (ticket === slot.generation) cancelLoad(slot); };
    signal?.addEventListener('abort', onAbort, { once: true });
    let decoder = null, freshURL = null, candidate = null;
    try {
      const bytes = await file.arrayBuffer(); check();
      decoder = new Context(); slot.decoders.add(decoder);
      const buffer = await decoder.decodeAudioData(bytes); check();
      if (!buffer || !Number.isFinite(buffer.duration) || buffer.duration <= 0) throw new Error('The file contains no readable audio.');
      if (buffer.duration > MAX_DURATION) throw new Error('Choose a track no longer than 20 minutes.');
      await closeDecoder(slot, decoder); decoder = null; check();
      const channels = Array.from({ length: Math.min(2, buffer.numberOfChannels) }, (_, i) => buffer.getChannelData(i));
      const result = await analyzeForLoad(channels, buffer.sampleRate, slot, ticket, { signal, includeKickDiagnostics }); check();
      if (root.MastrifyPlaybackBands) result.playbackBands = await root.MastrifyPlaybackBands.analyze(channels, buffer.sampleRate, { signal, shouldCancel: () => ticket !== slot.generation }); check();
      freshURL = root.URL.createObjectURL(file); candidate = createPlayer(slot);
      candidate.src = freshURL;
      const ready = waitForMetadata(candidate, slot, ticket); candidate.load();
      await ready; check();
      // Commit only after decoding and playable metadata both succeed. The old
      // source, including active playback, survives any failed replacement.
      dropClip(slot);
      const oldPlayer = slot.player, oldURL = slot.url;
      if (selected === id) { transport++; wantsPlayback = false; }
      slot.player = candidate; candidate = null;
      slot.url = freshURL; freshURL = null;
      slot.analysis = result; slot.pendingSeek = null;
      if (id === 'original') clearPreviewWindow();
      slot.sourceOffset = Math.max(0, Number(sourceOffset) || 0); slot.previewWaves = null; slot.previewWave = null; slot.previewRms = null;
      slot.name = typeof file.name === 'string' ? file.name : 'Your track';
      disposePlayer(oldPlayer, oldURL); applyGains(); notify();
      return { waveform: result.waveform, name: slot.name, duration: result.duration, slot: id };
    } catch (error) {
      if (candidate || freshURL) disposePlayer(candidate, freshURL);
      if (ticket !== slot.generation || error.name === 'AbortError') throw cancelled();
      if (error instanceof Error && /^Choose |^This file |^The file |^Your browser /.test(error.message)) throw error;
      throw new Error('Could not read this audio file. Try a WAV or MP3 file.');
    } finally { signal?.removeEventListener('abort', onAbort); if (decoder) await closeDecoder(slot, decoder); }
  }

  // Förhandslyssningen i resultatet (Linus 20 sep: i Original låg bilden en
  // sekund efter ljudet, i Master inte). Master spelas från en kort WAV av
  // förhandsbiten, där varje sökning är exakt. Original spelades från hela
  // den uppladdade filen, sökt långt in i låten, och i en komprimerad fil
  // (mp3, m4a) hamnar Safari inte exakt där den säger: ljudet och bilden,
  // som läser analysen vid spelarens tid, kom isär. Under förhandslyssningen
  // spelar Original därför en lika kort WAV av samma bit. Klippets tid
  // räknas om till låtens tid med playerOffset; analysen är hela låtens.
  // Hela filens spelare sparas och tas tillbaka när förhandslyssningen tas
  // bort (clearPreviewWindow), när en ny fil laddas och vid clear().
  async function useClip(id, file, start, { signal } = {}) {
    if (signal?.aborted) throw cancelled();
    const slot = slotAt(id);
    if (!slot.analysis || !slot.player) throw new Error('Choose an audio file first.');
    const offset = Math.max(0, Number(start) || 0), ticket = slot.generation;
    const url = root.URL.createObjectURL(file), candidate = createPlayer(slot);
    const onAbort = () => { if (ticket === slot.generation) cancelLoad(slot); };
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      candidate.src = url;
      const ready = waitForMetadata(candidate, slot, ticket); candidate.load(); await ready;
      if (ticket !== slot.generation || signal?.aborted) throw cancelled();
      dropClip(slot);
      const at = position(slot);
      if (selected === id) { transport++; wantsPlayback = false; cancelStepTimer(); }
      slot.player.pause();
      slot.full = { player: slot.player, url: slot.url };
      slot.player = candidate; slot.url = url; slot.playerOffset = offset;
      slot.pendingSeek = at; applyPendingSeek(slot);
      applyGains(); notify();
    } catch (error) { disposePlayer(candidate, url); throw error; }
    finally { signal?.removeEventListener('abort', onAbort); }
  }
  function dropClip(slot) {
    if (!slot.full) return;
    const at = position(slot), clip = slot.player, clipURL = slot.url;
    if (selected === slot.id) { transport++; wantsPlayback = false; cancelStepTimer(); }
    slot.player = slot.full.player; slot.url = slot.full.url; slot.full = null; slot.playerOffset = 0;
    disposePlayer(clip, clipURL);
    slot.pendingSeek = at; applyPendingSeek(slot);
  }
  async function duplicateOriginal(file, { signal } = {}) {
    if (signal?.aborted) throw cancelled();
    const original = slots.original, slot = slots.master;
    if (!original.analysis) throw new Error('Choose an audio file first.');
    cancelLoad(slot);
    const ticket = slot.generation, originalGeneration = original.generation;
    const url = root.URL.createObjectURL(file), candidate = createPlayer(slot);
    const onAbort = () => { if (ticket === slot.generation) cancelLoad(slot); };
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      candidate.src = url;
      const ready = waitForMetadata(candidate, slot, ticket); candidate.load(); await ready;
      if (ticket !== slot.generation || originalGeneration !== original.generation || signal?.aborted) throw cancelled();
      disposePlayer(slot.player, slot.url);
      slot.player = candidate; slot.url = url; slot.analysis = original.analysis;
      slot.name = original.name; slot.pendingSeek = null; slot.sourceOffset = 0; slot.previewWaves = null; slot.previewWave = null; slot.previewRms = null;
      applyGains(); notify();
    } catch (error) { disposePlayer(candidate, url); throw error; }
    finally { signal?.removeEventListener('abort', onAbort); }
  }

  function sampleAnalysis(analysis, time) {
    if (!analysis || !Number.isFinite(time) || time < 0 || time >= analysis.duration) return ZERO;
    const position = time * analysis.frameRate, last = analysis.envelopes.level.length - 1;
    const lower = Math.min(last, Math.floor(position)), upper = Math.min(last, lower + 1), blend = position - lower;
    const result = {};
    for (const channel of CHANNELS) {
      const values = analysis.envelopes[channel];
      result[channel] = clamp(values[lower] + (values[upper] - values[lower]) * blend);
    }
    return result;
  }
  function sample(delaySeconds = 0) {
    const { analysis, player: audio, playerOffset } = slots[selected];
    if (!analysis || !audio || audio.paused || audio.ended) return ZERO;
    const current = audio.currentTime + playerOffset;
    if (!Number.isFinite(current) || current < 0 || current >= analysis.duration) return ZERO;
    return sampleAnalysis(analysis, current - Math.max(0, Number.isFinite(delaySeconds) ? delaySeconds : 0));
  }
  // Absolute source seconds, independent of selected slot, playback and gain.
  // Returns the same nine bounded analyzed envelopes as sample(). Missing
  // sources and non-finite/out-of-range times (including duration) return zero.
  // This is a read-only lookup: no seeking, player changes or notifications.
  function sampleAt(seconds, slotId = 'original') {
    return sampleAnalysis(slotAt(slotId).analysis, seconds);
  }
  // Raw per-band RMS, with no track normalization or listening gain. These
  // readings are source amplitudes suitable for 20*log10(value) dBFS labels.
  function sampleMetersAt(seconds, slotId = 'original') {
    const analysis = slotAt(slotId).analysis;
    if (!analysis || !Number.isFinite(seconds) || seconds < 0 || seconds >= analysis.duration) return ZERO_METERS;
    const position = seconds * analysis.frameRate, last = analysis.meters.level.length - 1;
    const lower = Math.min(last, Math.floor(position)), upper = Math.min(last, lower + 1), blend = position - lower;
    const result = {};
    for (const name of METER_CHANNELS) {
      const values = analysis.meters[name];
      result[name] = Math.max(0, values[lower] + (values[upper] - values[lower]) * blend);
    }
    return result.level <= 1e-7 ? ZERO_METERS : result;
  }
  function sampleKickAt(seconds, slotId = 'original') {
    const analysis = slotAt(slotId).analysis;
    if (!analysis || analysis.kickDiagnostics === false || !Number.isFinite(seconds) || seconds < 0 || seconds >= analysis.duration) return ZERO_KICK;
    const events = analysis.bassOnsets;
    let low = 0, high = events.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (events[middle].time <= seconds) low = middle + 1; else high = middle;
    }
    const event = low ? events[low - 1] : null, next = events[low];
    const nextIn = next ? Math.max(0, next.time - seconds) : null;
    if (!event) return { amount: 0, strength: 0, age: 0, nextIn, duration: 0, available: true };
    const age = seconds - event.time, duration = event.duration;
    const attack = Math.min(.042, duration * .22);
    let shape = 0;
    if (duration > 0 && age < duration) {
      const u = clamp(age < attack ? age / attack : (age - attack) / (duration - attack));
      const eased = u * u * u * (10 - 15 * u + 6 * u * u);
      shape = age < attack ? eased : 1 - eased;
    }
    return { amount: clamp(shape * event.strength), strength: event.strength, age, nextIn, duration, available: true };
  }
  // Shared scratch output: consumers may read it until the next call but must
  // not mutate or retain it. This function allocates no playback-frame objects.
  function sampleWaveform(delaySeconds = 0) {
    const { analysis, player: audio, playerOffset } = slots[selected];
    if (!analysis || !audio || audio.paused || audio.ended) return waveformSample.fill(0);
    const current = audio.currentTime + playerOffset;
    if (!Number.isFinite(current) || current < 0 || current >= analysis.duration) return waveformSample.fill(0);
    const time = current - Math.max(0, Number.isFinite(delaySeconds) ? delaySeconds : 0);
    return sampleWaveformAnalysis(analysis, time, waveformSample);
  }
  // Raw 64-point peak excerpt (~256 ms) centered on absolute source seconds.
  // No per-file normalization or output-gain scaling. Silence, a missing slot
  // or a time outside [0, duration) returns zeros. Uses its own reusable array;
  // read it before the next sampleWaveformAt() call, without retaining/mutating.
  function sampleWaveformAt(seconds, slotId = 'original') {
    return sampleWaveformAnalysis(slotAt(slotId).analysis, seconds, waveformAtSample);
  }
  function sampleWaveformAnalysis(analysis, time, output) {
    output.fill(0);
    if (!analysis || !Number.isFinite(time) || time < 0 || time >= analysis.duration) return output;
    const values = analysis.peaks, rate = analysis.peakRate;
    // Peak bins represent their midpoints; interpolation moves the whole
    // excerpt smoothly instead of jumping by one bin every four milliseconds.
    const center = time * rate - .5;
    const lower = Math.floor(center), fraction = center - lower;
    const before = lower >= 0 && lower < values.length ? values[lower] : 0;
    const after = lower + 1 >= 0 && lower + 1 < values.length ? values[lower + 1] : 0;
    // A silent read position stays silent even when the surrounding window
    // contains a nearby hit; no synthetic fallback or lingering response.
    if (before + (after - before) * fraction <= 1e-7) return output;
    const half = (WAVEFORM_POINTS - 1) / 2;
    for (let i = 0; i < WAVEFORM_POINTS; i++) {
      const position = center + i - half;
      const index = Math.floor(position), blend = position - index;
      const left = index >= 0 && index < values.length ? values[index] : 0;
      const right = index + 1 >= 0 && index + 1 < values.length ? values[index + 1] : 0;
      output[i] = clamp(left + (right - left) * blend);
    }
    return output;
  }

  function currentRequest(ticket, slot, player) {
    return ticket === transport && selected === slot.id && slot.player === player;
  }
  async function startPlayer(slot, ticket) {
    const player = slot.player;
    // Let a seek issued immediately after select() replace its queued position.
    await Promise.resolve();
    if (!currentRequest(ticket, slot, player) || !wantsPlayback) throw cancelled();
    if (!applyPendingSeek(slot)) {
      wantsPlayback = false; notify();
      throw new Error('Could not seek in this audio. Try again.');
    }
    try { await player.play(); }
    catch (_) {
      if (!currentRequest(ticket, slot, player) || !wantsPlayback) throw cancelled();
      wantsPlayback = false; notify();
      throw new Error('Audio could not start. Press Play again.');
    }
    if (!currentRequest(ticket, slot, player) || !wantsPlayback) {
      // A→B→A can have two outstanding play() promises for the same player.
      // Never pause a newer valid request merely because an older one settled.
      if (selected !== slot.id || slot.player !== player || !wantsPlayback) player.pause();
      throw cancelled();
    }
    enforcePreview(); notify();
    startPartner(slot, ticket);
  }
  function startPartner(slot, ticket) {
    if (!DUAL_TAKE) return;
    const partner = partnerOf(slot);
    if (!partner || !wantsPlayback || transport !== ticket) return;
    alignSlot(partner, sourceNow(slot));
    // The quiet take is a convenience, never a requirement: if it refuses to
    // start, A/B simply falls back to the older restart path.
    try { const started = partner.player.play(); if (started && started.catch) started.catch(() => {}); }
    catch (_) { /* Silent take is optional. */ }
    // Its start has latency, so settle it once shortly after and then keep it.
    cancelStepTimer();
    stepTimer = root.setTimeout(keepInStep, 90);
  }
  async function select(id) {
    const next = slotAt(id);
    if (selected === id) return getState();
    flushSeek();
    if (!next.analysis) {
      // An empty slot is a valid preview state, never a fallback to the other
      // source. Keep the loaded file available while stopping its transport.
      transport++; wantsPlayback = false;
      slots[selected].player?.pause();
      selected = id; next.pendingSeek = null;
      notify(); return getState();
    }
    const previous = slots[selected];
    if (runningInStep(previous) && runningInStep(next)) {
      // Land the take being switched to exactly where the listener already is,
      // while it is still at zero level, and only then ramp. Nothing jumps.
      alignSlot(next, sourceNow(previous));
      selected = id;
      blendToSelected();
      alignSlot(previous, sourceNow(next));
      enforcePreview(); notify(); keepInStep();
      return getState();
    }
    const time = position(previous) + previous.sourceOffset - next.sourceOffset;
    const resume = wantsPlayback || getState().playing;
    const ticket = ++transport;
    previous.player?.pause(); next.player.pause();
    selected = id;
    blendToSelected(true);
    const range = bounds(next);
    next.pendingSeek = Math.max(range.start, Math.min(time, range.end));
    wantsPlayback = resume && next.pendingSeek < range.end;
    applyPendingSeek(next); applyGains(); notify();
    if (wantsPlayback) await startPlayer(next, ticket);
    return getState();
  }
  async function play() {
    const slot = slots[selected];
    if (!slot.analysis) throw new Error('Choose an audio file first.');
    flushSeek();
    const ticket = ++transport;
    const range = bounds(slot);
    if (slot.player.ended || position(slot) >= range.end || position(slot) < range.start) slot.pendingSeek = range.start;
    wantsPlayback = true; blendToSelected(true);
    await startPlayer(slot, ticket);
  }
  function pause() {
    flushSeek();
    cancelPreviewTimer(); cancelFade(); cancelStepTimer();
    transport++; wantsPlayback = false;
    for (const slot of Object.values(slots)) slot.player?.pause();
    blendToSelected(true); notify();
  }
  // Spolning. Uppmätt på Linus iPhone. Prov9: att flytta den andra, pausade
  // versionen vid varje hopp tog spolningen ner till 7 bilder/s; den flyttas
  // därför bara med när den själv spelar i takt (på datorn), annars läggs den
  // rätt när man byter till den (select) eller när den startar (startPartner).
  // Prov11, tio gånger var från vanlig uppspelning: ljudhopp högst var 150:e
  // ms gav 26 bilder/s, ett hopp varje bildruta 45,5 och inga hopp förrän
  // fingret släpper 47,6 med minst sena rutor. Medan fingret drar sätts därför
  // bara läget som väntande hopp, så att bilden och tiden följer fingret
  // varje bildruta, och ljudet hoppar när fingret släpper. Spolar man på
  // något annat sätt hoppar ljudet direkt.
  function commitSeek(slot) {
    dragWaiting = false;
    applyPendingSeek(slot);
    const partner = partnerOf(slot);
    if (runningInStep(partner)) alignSlot(partner, sourceNow(slot));
  }
  // Ett hopp som väntar på släppet görs innan uppspelningen byter läge, så
  // att spelaren aldrig står kvar på ett annat ställe än det som visas.
  function flushSeek() {
    if (!dragWaiting) return;
    const slot = slots[selected];
    if (slot.pendingSeek !== null && slot.player && slot.analysis) commitSeek(slot); else dragWaiting = false;
  }
  // Mätläget (?prov=spel) kan sätta MastrifyDragSeek = 'frame': då hoppar
  // ljudet varje bildruta medan fingret drar, som före prov11.
  function seek(seconds, options) {
    const slot = slots[selected];
    if (!slot.analysis || !slot.player) return;
    const range = bounds(slot);
    slot.pendingSeek = Math.max(range.start, Math.min(range.end, range.start + (Number.isFinite(seconds) ? seconds : 0)));
    if (slot.pendingSeek >= range.end) { transport++; wantsPlayback = false; cancelStepTimer(); slot.player.pause(); partnerOf(slot)?.player.pause(); }
    if (options?.drag === true && slot.pendingSeek < range.end && root.MastrifyDragSeek !== 'frame') dragWaiting = true;
    else commitSeek(slot);
    enforcePreview(); notify(); keepInStep();
  }
  function clear(id) {
    dragWaiting = false; cancelPreviewTimer();
    if (id === undefined || id === 'original') previewWindow = null;
    const targets = id === undefined ? SLOT_NAMES.map(name => slots[name]) : [slotAt(id)];
    if (targets.some(slot => slot.id === selected)) { transport++; wantsPlayback = false; }
    for (const slot of targets) {
      cancelLoad(slot);
      const player = slot.player, url = slot.url, full = slot.full;
      slot.player = null; slot.analysis = null; slot.url = null; slot.name = ''; slot.pendingSeek = null; slot.sourceOffset = 0; slot.previewWaves = null; slot.previewWave = null; slot.previewRms = null;
      slot.full = null; slot.playerOffset = 0;
      disposePlayer(player, url); if (full) disposePlayer(full.player, full.url);
    }
    if (id === undefined) selected = 'original';
    applyGains(); notify();
  }
  function samplePlaybackBands(delaySeconds = 0) {
    const state = getState();
    if (!state.playing) return root.MastrifyPlaybackBands?.zero;
    return root.MastrifyPlaybackBands?.sample(slots[selected].analysis?.playbackBands, Math.max(0, position(slots[selected]) - delaySeconds));
  }
  function readStringBand(values, rate, at, start, end) {
    if (!values || at < start || at >= end) return 0;
    const p = at * rate, i = Math.floor(p), next = Math.min(i + 1, values.length - 1);
    return i < values.length ? clamp(values[i] + (values[next] - values[i]) * (p - i)) : 0;
  }
  // Caller-owned buffers: three 33-point histories, oldest to newest. The low
  // string follows the LP's bass envelope; mid/high use the exact collar lights.
  // Source time (not animation time) makes pauses, seeks and A/B deterministic.
  function sampleStringBands(levels, history, sourceSeconds, slotId = selected) {
    levels.fill(0); history.fill(0);
    const slot = slotAt(slotId), a = slot.analysis;
    if (!a || levels.length !== 3 || history.length !== 99) return false;
    const time = sourceSeconds === undefined ? position(slot) : sourceSeconds - slot.sourceOffset;
    const start = previewWindow ? Math.max(0, Math.min(a.duration, previewWindow.start - slot.sourceOffset)) : 0;
    const end = previewWindow ? Math.max(0, Math.min(a.duration, previewWindow.end - slot.sourceOffset)) : a.duration;
    if (!Number.isFinite(time) || time < start || time >= end) return false;
    for (let band = 0; band < 3; band++) {
      const fft = band > 0 && a.playbackBands?.values;
      const values = band === 0 ? a.envelopes.bass : fft ? fft[band] : null;
      const rate = band === 0 ? a.frameRate : a.playbackBands?.frameRate;
      const span = band === 0 ? 2.4 : band === 1 ? 1.8 : 1.2;
      for (let i = 0; i < 33; i++) history[band * 33 + i] = readStringBand(values, rate, time - (1 - i / 32) * span, start, end);
      levels[band] = history[band * 33 + 32];
    }
    return true;
  }
  function getWaveform(id = selected, window = previewWindow) {
    const slot = slotAt(id), a = slot.analysis;
    if (!a) return null;
    const range = bounds(slot, window);
    if (!window) return a.waveform;
    const key=`${range.start}:${range.end}`;
    const cache=slot.previewWaves ||= new Map();
    if (!cache.has(key)) {
      const step = (range.end - range.start) / 256;
      const wave = Array.from({ length: 256 }, (_, i) => {
        let peak = 0;
        for (let j = Math.floor((range.start + i * step) * a.peakRate); j < Math.min(a.peaks.length, Math.ceil((range.start + (i + 1) * step) * a.peakRate)); j++) peak = Math.max(peak, a.peaks[j]);
        return { top: peak, bottom: peak };
      });
      if(cache.size>=3)cache.delete(cache.keys().next().value);cache.set(key,wave);
    }
    return cache.get(key);
  }
  function setLevelMatch(value) { levelMatched = !!value; applyGains(); notify(); return levelMatched; }
  function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    try { listener(getState()); } catch (_) { /* Isolate observers. */ }
    return () => listeners.delete(listener);
  }
  root.MastrifyAudio = Object.freeze({ load, duplicateOriginal, select, getState, sample, sampleAt, sampleWaveform, sampleWaveformAt, sampleMetersAt, sampleKickAt,
    play, pause, seek, clear, setLevelMatch, getWaveform, samplePlaybackBands, sampleStringBands, subscribe, analyzeChannels,
    choosePreview, suggestPreview: () => choosePreview(slots.original.analysis), setPreviewWindow, clearPreviewWindow, useClip });
})(typeof window !== 'undefined' ? window : globalThis);
