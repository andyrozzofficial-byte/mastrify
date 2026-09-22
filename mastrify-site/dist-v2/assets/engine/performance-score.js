/* Shared, bounded musical cues. Demo time is exactly twelve seconds periodic.
 * A local song may provide the same channels at its own playback position.
 */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, LOOP = 12;
  const flags = { grooves: true, edge: true, discovery: true, chain: true,
    polish: true, audio: true, awakening: true };
  const enabled = key => flags[key] !== false;
  root.MastrifyEffects = Object.freeze({ enabled,
    set(key, value) { if (Object.hasOwn(flags, key)) flags[key] = !!value; },
    snapshot: () => ({ ...flags }) });
  const clamp = v => Math.max(0, Math.min(1, Number(v) || 0));
  const mod = (v, n) => ((v % n) + n) % n;
  const delays = { source: 0, scan: .07, surface: .17, rim: .29, wall: .43, notes: .51 };
  function windowAt(time, start, length) {
    const age = mod(time - start, LOOP);
    return age < length ? Math.sin(Math.PI * age / length) ** 2 : 0;
  }
  function sample(phase, stage = 'surface') {
    const p = Number.isFinite(phase) ? mod(phase, TAU) : 0;
    const delay = enabled('chain') ? (delays[stage] || 0) : 0;
    const time = mod(p / TAU * LOOP - delay, LOOP);
    const audioState = root.MastrifyAudio?.getState();
    const processing = root.MastrifyProcessing?.getState();
    const reading = !!processing?.active;
    const realAudio = enabled('audio') && (reading ? audioState?.sources?.original?.loaded : audioState?.loaded);
    const sourceTime = reading ? (processing.demo ? processing.elapsed * processing.speed : processing.sourceTime) - delay * processing.speed : null;
    const data = realAudio ? (reading ? root.MastrifyAudio.sampleAt(sourceTime, 'original') : root.MastrifyAudio.sample(delay))
      : root.MastrifyPulse?.sample(time / LOOP * TAU) || {};
    const visual = reading && root.MastrifyProcessingMotion ? root.MastrifyProcessingMotion.sample(stage, data, processing) : data;
    const result = {};
    for (const key of ['level', 'bass', 'mid', 'air', 'rim', 'accent']) result[key] = clamp(visual[key]);
    // Actual stereo keeps its measured balance and side energy. The example
    // has a centered, symmetric image driven by the same delayed musical cue.
    result.left = realAudio ? clamp(visual.left) : result.level;
    result.right = realAudio ? clamp(visual.right) : result.level;
    result.width = realAudio ? clamp(visual.width)
      : clamp(result.level * (.25 + .35 * result.air + .15 * result.mid));
    // Attention visits three separated phrases. A single smooth polishing
    // glint is decorative, never an indication that actual mastering is done.
    const attention = Math.max(windowAt(time, 1.40, 1.75),
      .78 * windowAt(time, 4.78, 2.10), windowAt(time, 8.70, 1.65));
    result.discovery = realAudio ? clamp(result.accent * .8 + result.mid * .3) : attention;
    result.polish = windowAt(time, 10.40, 1.30) * (realAudio ? result.level : 1);
    result.realAudio = !!realAudio;
    result.processing = reading;
    result.raw = data;
    result.smoothed = reading && !!root.MastrifyProcessingMotion;
    result.sourceTime = sourceTime;
    return result;
  }
  root.MastrifyScore = Object.freeze({ sample, delays, LOOP_SECONDS: LOOP });
})(typeof window !== 'undefined' ? window : globalThis);
