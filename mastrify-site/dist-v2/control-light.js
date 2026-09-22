/* Keep the approved button light on cached moving layers. */
(() => {
  'use strict';
  const controls = new Set();
  const choicePulses = new Map();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const choiceSelector = 'input[type="radio"][name="master-style"],input[type="radio"][name="loudness-target"]';

  // Native radio selection and the journey's settings update happen immediately.
  // This separate edge layer only acknowledges an actual mouse/touch/keyboard
  // selection; restoring settings never replays it or moves the label contents.
  function pulseChoice(event) {
    const input = event.target;
    if (!event.isTrusted || !input?.matches?.(choiceSelector) || !input.checked) return;
    const label = input.closest('.character,.target-choice');
    if (!label) return;
    choicePulses.get(input.name)?.stop();
    if (reducedMotion.matches) return;
    const layer = document.createElement('span');
    layer.className = 'choice-selection-pulse';
    layer.setAttribute('aria-hidden', 'true');
    let timeout;
    const pulse = { stop() {
      clearTimeout(timeout);
      layer.remove();
      if (choicePulses.get(input.name) === pulse) choicePulses.delete(input.name);
    } };
    choicePulses.set(input.name, pulse);
    layer.addEventListener('animationend', pulse.stop, { once: true });
    label.append(layer);
    // Cleanup also completes if CSS animation is disabled or the view is hidden.
    timeout = setTimeout(pulse.stop, 850);
  }
  const stopChoicePulses = () => {
    for (const pulse of choicePulses.values()) pulse.stop();
  };
  document.addEventListener('change', pulseChoice);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) stopChoicePulses();
  });
  window.addEventListener('pagehide', stopChoicePulses);
  const measure = button => {
    const rect = button.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return (Math.ceil(Math.hypot(rect.width + 2, rect.height + 2)) + 2) + 'px';
  };
  const applySize = (button, value) => {
    if (!value) return;
    if (button.style.getPropertyValue('--cta-compositor-diameter') !== value)
      button.style.setProperty('--cta-compositor-diameter', value);
  };
  const resize = new ResizeObserver(entries => {
    const sizes = entries.map(entry => measure(entry.target));
    entries.forEach((entry, index) => applySize(entry.target, sizes[index]));
  });
  const visibility = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.dataset.lightVisible = String(entry.isIntersecting);
  }, { rootMargin: '40px' });
  function refresh() {
    stopChoicePulses();
    for (const button of controls) if (!button.isConnected) {
      resize.unobserve(button); visibility.unobserve(button); controls.delete(button);
    }
    const pending = [...document.querySelectorAll('a.button[href="/master"], #start-mastering, #compare-master, #continue-flow')].filter(button => !controls.has(button));
    const sizes = pending.map(measure);
    for (const [index, button] of pending.entries()) {
      const rim = document.createElement('span'), sweep = document.createElement('span');
      rim.className = 'cta-compositor-rim'; sweep.className = 'cta-compositor-sweep';
      rim.setAttribute('aria-hidden', 'true'); sweep.setAttribute('aria-hidden', 'true');
      applySize(button, sizes[index]); button.append(rim, sweep);
      button.classList.add('cta-compositor'); button.dataset.lightVisible = 'false';
      controls.add(button); resize.observe(button); visibility.observe(button);
    }
  }
  window.MastrifyControlLights = Object.freeze({ refresh });
  window.addEventListener('pagehide', () => { resize.disconnect(); visibility.disconnect(); controls.clear(); }, { once: true });
  refresh();
})();
