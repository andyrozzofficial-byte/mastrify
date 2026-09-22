/* Mastrify backend adapter, empty skeleton. See BACKEND-CONTRACT.md.
 *
 * Copy this file to backend.js (same folder), fill in the five functions
 * with your own transport (REST, job queue with polling, WebSocket, SSE:
 * your choice), then run `npm run build` in the project root. The build
 * loads backend.js in every page shell after studio-copy.js and before
 * studio-service.js. Nothing else in the interface changes.
 *
 * This file is NOT loaded by the shells as it is.
 *
 * THE LOOK AND THE SPEED ARE LOCKED (BACKEND-CONTRACT.md, "The rule").
 * backend.js is the only code you write. Do not change any other file in
 * dist-v2 except setting values in config.js and wording in studio-copy.js:
 * no CSS, no markup, no animations, no extra scripts, no libraries.
 * Keep this adapter light: at load only define window.MastrifyBackend (no
 * requests, no timers), plain fetch, no SDKs (40 KB budget), call
 * onProgress right away, poll at most every 500 to 1000 ms, stop everything
 * when signal aborts. `npm run build:check` must say "design unchanged". */
(() => {
 'use strict';
 const config = () => window.MastrifyConfig || {};
 const copy = () => window.MastrifyCopy || null;
 const strings = () => (copy() && copy().STRINGS) || {};
 const cancelled = () => new DOMException('Operation cancelled', 'AbortError');

 window.MastrifyBackend = {
  mode: 'live',

  /* kind: 'analyze' | 'master'. file: File. settings: {style,target,width,low,clarity}.
   * previewWindow: {start,end,duration,cueTime,method,sourceDuration} or null.
   * signal: AbortSignal. onProgress({progress:0..1, phase:'...', eta:seconds left (optional)}).
   * Return the result object from BACKEND-CONTRACT.md section 3 or 4. */
  async process({ kind, file, settings, previewWindow, signal, onProgress }) {
   if (signal?.aborted) throw cancelled();
   onProgress?.({ progress: 0, phase: 'Listening to your mix' });
   // 1. Send the file and the settings to your engine.
   // 2. Report progress while it works (keep calling onProgress, with eta if
   //    your engine knows it; the bar is paced by it, see section 2).
   // 3. Stop and throw cancelled() if signal.aborted becomes true.
   // 4. Return the result. For a master, preview.audio must be a Blob of at most 40 s.
   throw new Error(strings().analysisFailed || 'Analysis failed. Please try again.');
  },

  /* The price for the dialog: {amount, currency, free, code, label}. Throw for an unknown code. */
  async quote({ resultId, discountCode, signal }) {
   if (signal?.aborted) throw cancelled();
   return { amount: 9, currency: 'USD', free: false, code: '', label: '' };
  },

  /* Either {redirect: url} (hosted payment page; the interface comes back to
   * /master?session_id=... and calls verify) or the receipt itself when paid
   * in place: {id,resultId,test:false,amount,currency,charged,free,code}.
   * Stripe: success_url https://mastrify.com/master?session_id={CHECKOUT_SESSION_ID}
   *         cancel_url  https://mastrify.com/master?checkout=cancelled
   * backend.mock.js shows the whole round trip working. */
  async checkout({ resultId, discountCode, signal }) {
   if (signal?.aborted) throw cancelled();
   throw new Error(strings().checkoutFailed || 'Could not start checkout. Please try again.');
  },

  /* After the hosted page sends the user back. query = the return URL's
   * parameters. Resolve with the receipt, or throw when not paid. Include
   * email (Stripe's customer_details.email) to prefill the email step. */
  async verify({ resultId, query, signal }) {
   if (signal?.aborted) throw cancelled();
   throw new Error(strings().verifyFailed || 'Could not verify payment.');
  },

  /* Resolve with a Blob: the full length mastered WAV for a paid result. */
  async download({ resultId, signal }) {
   if (signal?.aborted) throw cancelled();
   throw new Error('The full master download is not available yet.');
  },

  /* REQUIRED: after payment the user cannot close the email step until this
   * resolves (BACKEND-CONTRACT.md section 7). Queue the email with a download
   * link valid for 12 hours, then resolve with {sent:true, test:false, to:email}. */
  async email({ resultId, email, signal }) {
   if (signal?.aborted) throw cancelled();
   throw new Error(strings().emailFailed || 'Could not send email. Please try again.');
  }
 };
})();
