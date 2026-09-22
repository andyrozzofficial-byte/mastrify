/* A pretend live engine, for trying the live path before the real engine is
 * wired in. It runs the in-browser demo underneath but behaves like a real
 * backend: no TEST labels, progress with an eta, a checkout that "redirects"
 * and comes back like Stripe does, verify, download and email.
 *
 * Try it:   cp dist-v2/backend.mock.js dist-v2/backend.js && npm run build
 * Undo it:  rm dist-v2/backend.js && npm run build
 * Never deploy it. See BACKEND-CONTRACT.md, section 0.
 *
 * Discount codes: HALF (50%), FREE (free, paid in place). Any other code is
 * rejected. The redirect goes straight back to /master?session_id=mock_<id>
 * (Stripe would show its page in between). Add ?checkout=cancelled to the
 * URL by hand to see the cancel return. */
(() => {
 'use strict';
 const demo = () => window.MastrifyDemo;
 const receipt = (resultId, code) => {
  const amount = code === 'FREE' ? 0 : code === 'HALF' ? 4.5 : 9;
  return { id: 'mock_' + resultId.slice(0, 8), resultId, test: false, amount, currency: 'USD', charged: amount, free: amount === 0, code };
 };
 const masters = new Map();

 window.MastrifyBackend = {
  mode: 'live',

  // The demo reports its own progress over 36 s; this passes it on with an
  // eta, the way a real engine would.
  async process(args) {
   const result = await demo().process({ ...args, onProgress({ progress, phase }) {
    args.onProgress?.({ progress, phase, eta: Math.max(0, 36 * (1 - progress)) });
   } });
   if (result.kind === 'master') masters.set(result.id, result.audio);
   return { ...result, demo: false, audio: undefined };
  },

  async quote({ resultId, discountCode }) {
   const code = String(discountCode || '').trim().toUpperCase();
   if (code && code !== 'HALF' && code !== 'FREE') throw new Error('Invalid discount code.');
   const r = receipt(resultId, code);
   return { amount: r.amount, currency: 'USD', free: r.free, code, label: code ? 'Code applied' : '' };
  },

  async checkout({ resultId, discountCode }) {
   const code = String(discountCode || '').trim().toUpperCase();
   if (code === 'FREE') return receipt(resultId, code);            // paid in place
   return { redirect: `/master?session_id=mock_${encodeURIComponent(resultId)}` }; // stands in for Stripe
  },

  async verify({ resultId, query }) {
   if (query.session_id !== 'mock_' + resultId) throw new Error('Could not verify payment.');
   // Stripe knows the buyer's email; returning it prefills the email step
   return { ...receipt(resultId, ''), email: 'buyer@example.com' };
  },

  // The real engine returns the full-length master. The mock gives back the
  // original as a WAV (the demo changes no audio).
  async download({ resultId, signal }) {
   const source = masters.get(resultId) || window.MastrifySession?.file;
   if (!source) throw new Error('Could not prepare the WAV. Please try again.');
   return window.MastrifyFiles.wav(source, { signal });
  },

  async email({ email }) {
   return { sent: true, test: false, to: String(email || '').trim() };
  }
 };
})();
