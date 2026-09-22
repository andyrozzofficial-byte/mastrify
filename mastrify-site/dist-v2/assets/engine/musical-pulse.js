/* One musical phrase drives the reader, record edge and Sonic Flow together.
 * Designed demo data, not analysis of an uploaded song. No independent clock.
 * Every attack and release is smooth and repeats exactly after twelve seconds.
 */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const LOOP = 12;
  const smooth = x => x * x * (3 - 2 * x);
  // Time, duration, strength, bass, midrange, air. A small pickup, an accent,
  // then space to settle: three different phrases, not a metronomic beat.
  const cues = [
    [.38, .58, .42, .14, .38, 1],
    [1.06, .72, .78, .35, 1, .28],
    [1.91, .78, 1, 1, .58, .22],
    [2.55, .54, .36, .10, .24, 1],
    [4.28, .52, .35, .18, 1, .45],
    [4.86, .65, .62, 1, .32, .18],
    [5.49, .90, 1, .68, 1, .56],
    [6.18, .48, .45, .12, .37, 1],
    [8.36, .64, .65, .25, .62, 1],
    [9.15, .58, .43, .17, 1, .38],
    [9.78, .95, 1, 1, .72, .35],
    [10.57, .50, .32, .10, .25, 1]
  ];
  function envelope(age, duration) {
    if (age <= 0 || age >= duration) return 0;
    const t = age / duration;
    return t < .18 ? smooth(t / .18) : 1 - smooth((t - .18) / .82);
  }
  function sample(phase) {
    const p = Number.isFinite(phase) ? ((phase % TAU) + TAU) % TAU : 0;
    const seconds = p / TAU * LOOP;
    let level = 0, bass = 0, mid = 0, air = 0, rim = 0, accent = 0;
    for (const cue of cues) {
      const age = ((seconds - cue[0]) % LOOP + LOOP) % LOOP;
      const hit = envelope(age, cue[1]) * cue[2];
      level += hit;
      bass += hit * cue[3]; mid += hit * cue[4]; air += hit * cue[5];
      accent += hit * cue[2] * cue[2];
      // A brief response follows the readout, with a slightly longer release.
      rim += envelope(age - .07, cue[1] * 1.35) * cue[2];
    }
    return { level: Math.min(1, level), bass: Math.min(1, bass),
      mid: Math.min(1, mid), air: Math.min(1, air),
      rim: Math.min(1, rim), accent: Math.min(1, accent) };
  }
  root.MastrifyPulse = Object.freeze({ sample, LOOP_SECONDS: LOOP });
})(typeof window !== 'undefined' ? window : globalThis);
