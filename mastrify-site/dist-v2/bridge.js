/* Light travels inside complete strokes, so no moving dash can expose an edge. */
(() => {
  let instance = 0;
  window.createMastrifyBridge = function (bridge, signal) {
    const svg = bridge.querySelector('svg');
    const defs = svg.querySelector('defs');
    const layer = svg.querySelector('.bridge-signals');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const ns = 'http://www.w3.org/2000/svg';
    const id = ++instance;
    const random = (min, max) => min + Math.random() * (max - min);
    const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    const make = (tag, attrs, parent) => {
      const node = document.createElementNS(ns, tag);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
      parent.append(node);
      return node;
    };
    const colors = ['#cba8ff', '#ded3ff', '#9edaff'];
    const lanes = [...svg.querySelectorAll('.bridge-strand')].map((path, line) => ({
      next: random(80, 1900),
      slots: Array.from({ length: 2 }, (_, slot) => {
        const gradient = make('linearGradient', {
          id: `bridge-light-${id}-${line}-${slot}`, gradientUnits: 'userSpaceOnUse',
          x1: -400, x2: -100, y1: 0, y2: 0
        }, defs);
        // Soft shoulders approach zero gradually at BOTH ends of each pulse.
        for (const [offset, opacity] of [[0,0],[.08,.005],[.2,.06],[.32,.28],[.43,.74],[.5,1],[.57,.74],[.68,.28],[.8,.06],[.92,.005],[1,0]]) {
          make('stop', { offset, 'stop-color': offset > .4 && offset < .6 ? '#f3efff' : colors[line], 'stop-opacity': opacity }, gradient);
        }
        const group = make('g', { class: `bridge-pulse${line === 0 ? ' bridge-pulse-main' : ''}`, stroke: `url(#${gradient.id})`, opacity: 0 }, layer);
        for (const part of ['glow', 'core']) make('path', { class: `bridge-pulse-${part}`, d: path.getAttribute('d') }, group);
        return { gradient, group, active: false, start: 0, duration: 0, width: 0, strength: 0 };
      })
    }));
    let frame = 0, last = null, elapsed = 0, visible = true, disposed = false;
    const allowed = () => !disposed && visible && !document.hidden && !motion.matches;
    function tick(now) {
      frame = 0;
      if (!allowed()) { last = null; return; }
      if (last !== null) elapsed += Math.max(0, now - last);
      last = now;
      for (const lane of lanes) {
        if (elapsed >= lane.next) {
          const pulse = lane.slots.find(p => !p.active);
          if (pulse) {
            pulse.active = true;
            pulse.start = elapsed;
            pulse.duration = random(3200, 6200);
            pulse.width = random(100, 190);
            pulse.strength = random(.6, 1);
          }
          // Independent timings permit overlaps, brief clusters and quieter gaps.
          lane.next = elapsed + (pulse ? (Math.random() < .25 ? random(300, 850) : random(1400, 3800)) : random(300, 900));
        }
        for (const pulse of lane.slots) {
          if (!pulse.active) continue;
          const progress = (elapsed - pulse.start) / pulse.duration;
          if (progress >= 1) {
            pulse.group.setAttribute('opacity', 0);
            pulse.active = false;
            continue;
          }
          const center = -pulse.width + progress * (960 + 2 * pulse.width);
          // Set position before opacity; a new pulse starts fully outside the line.
          pulse.gradient.setAttribute('x1', center - pulse.width);
          pulse.gradient.setAttribute('x2', center + pulse.width);
          pulse.group.setAttribute('opacity', pulse.strength * smooth(progress / .14) * smooth((1 - progress) / .16));
        }
      }
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      last = null;
      if (allowed()) frame = requestAnimationFrame(tick);
    }
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }, { rootMargin: '80px' });
    observer.observe(bridge);
    document.addEventListener('visibilitychange', sync, { signal });
    motion.addEventListener('change', sync, { signal });
    signal.addEventListener('abort', () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    }, { once: true });
    sync();
  };
})();
