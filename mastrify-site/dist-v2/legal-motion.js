/* Privacy och Terms: rullningen på de två sidorna.
   Två mekanismer, inga fler. En IntersectionObserver avslöjar innehållet en
   gång var, och en andra håller reda på vilket avsnitt man läser just nu, så
   skenan till vänster lyser på rätt rad. Ingen rullningslyssnare, ingenting
   som mäter per bildruta.

   Routern byter ut hela #page-content vid varje sidbyte, så en MutationObserver
   ser när det händer och startar om. Direktlyssnare på elementen hade följt
   med i soporna. */
(() => {
  'use strict';
  const PAGES = new Set(['privacy', 'terms']);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let rise = null, spy = null;

  function stop() {
    rise?.disconnect(); spy?.disconnect();
    rise = spy = null;
  }

  function start() {
    stop();
    if (!PAGES.has(document.body.dataset.page)) return;
    const root = document.getElementById('page-content');
    if (!root) return;

    const risers = root.querySelectorAll('[data-rise]');
    if (reduced.matches) {
      for (const node of risers) node.setAttribute('data-shown', '');
    } else {
      rise = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          rise.unobserve(entry.target);
          entry.target.setAttribute('data-shown', '');
        }
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
      for (const node of risers) rise.observe(node);
    }

    const parts = [...root.querySelectorAll('.doc-sections > li')];
    const rows = [...root.querySelectorAll('.doc-index > li')];
    if (!parts.length || parts.length !== rows.length) return;

    // Observatören väcks bara när ett avsnitt passerar läsbandet, aldrig per
    // bildruta. Då, och bara då, läses rektanglarna om.
    const mark = () => {
      // Läsraden ligger strax under sidans överkant. Det avsnitt som raden
      // står i är det man läser; ligger den mellan två tas det närmast över.
      const line = innerHeight * 0.14;
      let at = 0;
      for (let i = 0; i < parts.length; i++) {
        const box = parts[i].getBoundingClientRect();
        if (box.top <= line) at = i;
        if (box.top <= line && box.bottom > line) { at = i; break; }
      }
      rows.forEach((row, i) => row.toggleAttribute('data-current', i === at));
    };
    spy = new IntersectionObserver(mark, { rootMargin: '-10% 0px -82% 0px', threshold: 0 });
    for (const part of parts) spy.observe(part);
    mark();
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.doc-index button');
    if (!button) return;
    const target = document.getElementById(button.dataset.target);
    target?.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
  });

  function watch() {
    const host = document.getElementById('page-content');
    if (host) new MutationObserver(start).observe(host, { childList: true });
    start();
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', watch, { once: true });
  else watch();
})();
