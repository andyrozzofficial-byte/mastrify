/* Direct source-time bass response, restored from the life4 presentation.
 * No onset selection, beat clock or accumulated displacement. */
(function (root) {
  'use strict';
  const clamp = x => Math.max(0, Math.min(1, Number(x) || 0));
  const ZERO = Object.freeze({ amount: 0, strength: 0, age: 0, nextIn: 0, duration: 0, available: false });
  function sample(phase, score) {
    if (score?.processing) return ZERO;
    if (score?.realAudio) {
      const audio = root.MastrifyAudio, state = audio?.getState();
      if (!state?.loaded || !state.playing) return ZERO;
    }
    // The engine supplies the undelayed source score. Keep the original
    // continuous bass curve; real audio never falls back to a demo beat.
    const bass = score?.realAudio ? score.bass
      : score?.bass ?? root.MastrifyPulse?.sample(phase)?.bass ?? 0;
    const x = clamp(((Number(bass) || 0) - .10) / .90);
    const amount = x * x * (3 - 2 * x);
    return { ...ZERO, amount, strength: amount, available: !!score?.realAudio };
  }
  function project(amount, original, master) {
    // Perspective projection around the spindle: depth moves toward the
    // viewer while the supporting collar stays fixed behind the record.
    const depth = clamp(amount) * (27 * clamp(original) + 48 * clamp(master));
    return { depth, scale: 700 / (700 - depth) };
  }
  root.MastrifyPlaybackDepth = Object.freeze({ sample, project });
})(typeof window !== 'undefined' ? window : globalThis);
