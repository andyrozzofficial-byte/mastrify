/* Presentation inertia in real processing seconds. Decoded audio data and the
 * 256-point overview stay untouched; only the light/motion response is damped.
 * Every stage advances once per clock value, regardless of draw-call count. */
(function (root) {
  'use strict';
  const CHANNELS = ['level','bass','mid','air','rim','accent','left','right','width'];
  const energyStates = new Map(), detailStates = new Map();
  const bounded = value => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  const timeOf = state => Number.isFinite(state?.elapsed) ? state.elapsed : 0;
  function prepare(states, stage, state, create) {
    const time = timeOf(state), generation = state?.generation ?? 0;
    let cache = states.get(stage);
    const dt = cache ? time - cache.time : 0;
    const reset = !cache || cache.generation !== generation || dt < -1e-8 || dt > .25;
    if (!cache) { cache = { value: create(), time, generation }; states.set(stage, cache); }
    if (reset) { cache.generation = generation; cache.time = time; }
    return { cache, reset, dt: reset ? 0 : Math.max(0, dt), time };
  }
  function approach(current, target, dt, attack, release) {
    const tau = target > current ? attack : release;
    const value = current + (target - current) * -Math.expm1(-dt / tau);
    return value < 1e-6 && target === 0 ? 0 : bounded(value);
  }
  function sample(stage, raw, state) {
    if (!state?.active) return raw;
    const frame = prepare(energyStates, stage, state, () => Object.fromEntries(CHANNELS.map(key => [key, 0])));
    const output = frame.cache.value;
    if (!frame.reset && frame.dt < 1e-8) return output;
    for (const key of CHANNELS) {
      const target = bounded(raw?.[key]);
      output[key] = frame.reset ? target : approach(output[key], target, frame.dt, .13, .30);
    }
    frame.cache.time = frame.time;
    return output;
  }
  function waveform(stage, raw, state) {
    if (!state?.active) return raw;
    const frame = prepare(detailStates, stage, state, () => new Float32Array(64));
    const output = frame.cache.value;
    if (!frame.reset && frame.dt < 1e-8) return output;
    for (let index = 0; index < output.length; index++) {
      const target = bounded(raw?.[index]);
      output[index] = frame.reset ? target : approach(output[index], target, frame.dt, .16, .26);
    }
    frame.cache.time = frame.time;
    return output;
  }
  function reset() { energyStates.clear(); detailStates.clear(); }
  root.MastrifyProcessingMotion = Object.freeze({ sample, waveform, reset });
})(typeof window !== 'undefined' ? window : globalThis);
