/* Suspend invisible work without changing the scene's geometry or appearance. */
(function (root) {
  'use strict';

  const effectSelector = [
    '[data-visibility-effect]',
    '.cta-compositor',
    '.header nav a',
    '.hero-copy h1 span',
    '.sound-comparison td:last-child>span',
    '.job-checklist',
    '.sound-sketch',
    '.score-ring',
    '.guide-dialog .preset-name',
    '#continue-flow',
    '#compare-master',
    '#audio-play',
    '.neural-bridge'
  ].join(',');
  const pausedAttribute = 'data-visibility-paused';

  function create({ lp, wave, onChange, rootMargin = '80px' } = {}) {
    const document = root.document;
    if (!document) throw new Error('Visibility tracking needs a document.');
    let disposed = false, snapshot;
    // The first observer delivery is asynchronous. Keep the first frame visible.
    let lpVisible = true, waveVisible = true;
    const decorations = new Map();
    const hasObserver = typeof root.IntersectionObserver === 'function';

    function notify() {
      if (disposed) return;
      const documentVisible = !document.hidden;
      const lpPaint = documentVisible && !!lp && lpVisible;
      const wavePaint = documentVisible && !!wave && waveVisible;
      if (snapshot && snapshot.lpPaint === lpPaint && snapshot.wavePaint === wavePaint
          && snapshot.documentVisible === documentVisible) return;
      snapshot = Object.freeze({ lpPaint, wavePaint, documentVisible, workNeeded: lpPaint || wavePaint });
      if (typeof onChange === 'function') onChange(snapshot);
    }

    function syncDecoration(node, state) {
      const paused = document.hidden || !state.visible;
      if (paused) {
        if (node.getAttribute(pausedAttribute) !== 'true') node.setAttribute(pausedAttribute, 'true');
      } else if (node.hasAttribute(pausedAttribute)) node.removeAttribute(pausedAttribute);
    }

    function restoreDecoration(node, state) {
      if (state.originalAttribute === null) node.removeAttribute(pausedAttribute);
      else node.setAttribute(pausedAttribute, state.originalAttribute);
    }

    const sceneObserver = hasObserver ? new root.IntersectionObserver(entries => {
      if (disposed) return;
      for (const entry of entries) {
        if (entry.target === lp) lpVisible = entry.isIntersecting;
        if (entry.target === wave) waveVisible = entry.isIntersecting;
      }
      notify();
    }, { rootMargin }) : null;

    const effectObserver = hasObserver ? new root.IntersectionObserver(entries => {
      if (disposed) return;
      for (const entry of entries) {
        const state = decorations.get(entry.target);
        if (!state) continue;
        state.visible = entry.isIntersecting;
        syncDecoration(entry.target, state);
      }
    }, { rootMargin }) : null;

    function registerDecoration(node) {
      if (decorations.has(node) || !node.isConnected) return;
      const state = { visible: true, originalAttribute: node.getAttribute(pausedAttribute) };
      decorations.set(node, state);
      syncDecoration(node, state);
      effectObserver?.observe(node);
    }

    function pruneDecorations() {
      for (const [node, state] of decorations) {
        if (node.isConnected) continue;
        effectObserver?.unobserve(node);
        restoreDecoration(node, state);
        decorations.delete(node);
      }
    }

    function refreshDecorations(scope = document) {
      if (disposed || !scope) return;
      pruneDecorations();
      if (scope.matches?.(effectSelector)) registerDecoration(scope);
      scope.querySelectorAll?.(effectSelector).forEach(registerDecoration);
    }

    function visibilityChanged() {
      if (disposed) return;
      for (const [node, state] of decorations) syncDecoration(node, state);
      notify();
    }

    // Only structural changes matter. Ignore the frequent text and attribute
    // updates from playback/progress; scan newly inserted subtrees, not the page.
    const mutations = typeof root.MutationObserver === 'function' ? new root.MutationObserver(records => {
      if (disposed) return;
      let removedElements = false;
      for (const record of records) {
        for (const node of record.addedNodes) if (node.nodeType === 1) refreshDecorations(node);
        if (!removedElements) removedElements = [...record.removedNodes].some(node => node.nodeType === 1);
      }
      if (removedElements) pruneDecorations();
    }) : null;

    function dispose() {
      if (disposed) return;
      disposed = true;
      sceneObserver?.disconnect();
      effectObserver?.disconnect();
      mutations?.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
      root.removeEventListener?.('pagehide', dispose);
      for (const [node, state] of decorations) restoreDecoration(node, state);
      decorations.clear();
    }

    if (lp) sceneObserver?.observe(lp);
    if (wave) sceneObserver?.observe(wave);
    refreshDecorations();
    if (document.documentElement) mutations?.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', visibilityChanged);
    root.addEventListener?.('pagehide', dispose);
    notify();

    return Object.freeze({ getState: () => snapshot, refreshDecorations, dispose });
  }

  root.MastrifyVisibility = Object.freeze({ create });
})(typeof window !== 'undefined' ? window : globalThis);
