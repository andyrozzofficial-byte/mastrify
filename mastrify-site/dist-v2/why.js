/* Why Mastrify: rullningen på den här sidan.
   Två mekanismer, inga fler. IntersectionObserver avslöjar innehållet en gång
   var, och en enda rAF-samlad rullningspassning skriver ett tal som CSS läser.
   Per bildruta läses exakt en rektangel och skrivs en egenskap, så webbläsaren
   får hålla sig till komposit-arbete och rullningen förblir 60 fps. */
window.MastrifyWhy = (() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let events = null;          // AbortController för den monterade sidan
  let reveal = null;          // IntersectionObserver för avslöjandena
  let brainHome = null;       // dit hjärnan ska tillbaka
  let method = null, stages = null, items = [], readout = null;
  let geometry = [];          // cachad höjd per steg; läses om vid resize
  let frame = 0, lastProgress = -1, lastCurrent = -1;

  /* Avslöjandet sker en gång per element. Elementet får behålla sitt läge
     efteråt, och will-change släpps när övergången är över. */
  function observeReveals(root) {
    reveal = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const node = entry.target;
        reveal.unobserve(node);
        node.setAttribute('data-shown', '');
        const delay = (Number(node.style.getPropertyValue('--i')) || 0) * 68;
        setTimeout(() => node.setAttribute('data-settled', ''), 900 + delay);
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    for (const node of root.querySelectorAll('[data-reveal]')) reveal.observe(node);
  }

  /* Höjderna ändras bara när layouten gör det. Mät då, aldrig per bildruta. */
  function measure() {
    if (!stages) return;
    geometry = items.map((li) => li.offsetTop + li.offsetHeight * 0.34);
    lastProgress = -1;
    lastCurrent = -1;
    read();
  }

  function read() {
    if (!stages || !method) return;
    const rect = stages.getBoundingClientRect();
    const anchor = innerHeight * 0.55;
    const span = rect.height || 1;

    const progress = Math.max(0, Math.min(1, (anchor - rect.top) / span));
    if (Math.abs(progress - lastProgress) > 0.002) {
      lastProgress = progress;
      method.style.setProperty('--stage-progress', progress.toFixed(4));
      if (progress > 0.001) method.setAttribute('data-engaged', '');
      else method.removeAttribute('data-engaged');
    }

    let current = -1;
    for (let i = 0; i < geometry.length; i++) {
      if (rect.top + geometry[i] <= anchor) current = i; else break;
    }
    if (current === lastCurrent) return;
    lastCurrent = current;
    for (let i = 0; i < items.length; i++) {
      const li = items[i];
      if (i === current) { li.setAttribute('data-current', ''); li.removeAttribute('data-passed'); }
      else { li.removeAttribute('data-current'); if (i < current) li.setAttribute('data-passed', ''); else li.removeAttribute('data-passed'); }
    }
    const last = items.length - 1;
    if (current === last && last >= 0) method.setAttribute('data-complete', '');
    else method.removeAttribute('data-complete');
    if (readout) {
      const label = current < 0 ? `STAGE 00 / 0${items.length}` : `STAGE 0${current + 1} / 0${items.length}`;
      if (readout.textContent !== label) readout.textContent = label;
    }
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; read(); });
  }

  function mount() {
    unmount();
    const root = document.getElementById('page-content');
    const slot = document.getElementById('brain-slot');
    if (!root) return;
    events = new AbortController();
    const signal = events.signal;

    // Hjärnan flyttas hit och tillbaka; den skapas aldrig om, så motorn,
    // synlighetsvakten och alla id-referenser i site.js står kvar orörda.
    const brain = document.getElementById('brain');
    if (slot && brain) { brainHome = brain.parentNode; slot.appendChild(brain); }

    method = document.getElementById('why-method');
    stages = root.querySelector('.why-stages');
    items = stages ? Array.from(stages.children) : [];
    readout = root.querySelector('.why-brain-readout b');

    if (!reduced.matches) observeReveals(root);
    else for (const node of root.querySelectorAll('[data-reveal]')) node.setAttribute('data-shown', '');

    if (stages) {
      measure();
      addEventListener('scroll', schedule, { passive: true, signal });
      addEventListener('resize', measure, { passive: true, signal });
      // Typsnitt som landar sent flyttar stegen; mät om när de är på plats.
      if (document.fonts?.ready) document.fonts.ready.then(() => { if (stages) measure(); }).catch(() => {});
    }
  }

  function unmount() {
    // Hjärnan måste hem innan sidans innehåll byts ut, annars kastas den bort.
    const brain = document.getElementById('brain');
    if (brainHome && brain && brain.parentNode !== brainHome) brainHome.appendChild(brain);
    brainHome = null;
    reveal?.disconnect(); reveal = null;
    events?.abort(); events = null;
    cancelAnimationFrame(frame); frame = 0;
    method = null; stages = null; items = []; readout = null; geometry = [];
    lastProgress = -1; lastCurrent = -1;
  }

  return { mount, unmount };
})();
