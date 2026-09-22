# Mastrify frontend: backend contract

Everything needed to put the new Mastrify look (`dist-v2/`) on top of the
real engine and Stripe. This file is the whole handoff.

**With Cursor:** open the `mastrify-site` folder in Cursor, and add your
backend's folder to the same workspace (File → Add Folder to Workspace) so
the AI can see your engine's API. Then paste this into the chat (Agent
mode) and fill in the last line:

```
Read BACKEND-CONTRACT.md from top to bottom and follow it exactly.
Connect the site in dist-v2 to our real engine and Stripe by writing
dist-v2/backend.js: start from dist-v2/backend.example.js, and use
dist-v2/backend.mock.js as the reference for the exact shapes to return.
The look and the speed are locked ("The rule"): apart from backend.js,
change only setting values in dist-v2/config.js and, where the contract
says so, wording in dist-v2/studio-copy.js. Do not edit, reformat or
"improve" any other file in the site. When done, run npm run build and
npm run build:check, and go through the checklist in section 11.
Our engine's API: <where it lives, e.g. the folder or file with the routes>
```

This file is the only spec for this work. If your copy of the folder also
has `README.md`, `BACKEND_HANDOFF.md`, `HANDOFF-CLAUDE.md` or `dist/` (the
full project rather than the handoff package), ignore them: they belong to
the older prototype and the design team's log. Leave `dist/` alone.

The interface does not care how the engine works or where it runs. Everything
it calls goes through one small adapter object, `window.MastrifyBackend`,
with a handful of functions. Fill in that object with your engine's own
transport (REST, job queue with polling, WebSocket, SSE, anything) and the
interface works unchanged. Until an adapter is provided, the interface runs
an in-browser demo (`studio-service.js`): it measures the file locally,
speaks the same vocabulary, and processes no audio.

## The rule: the look and the speed are locked

**The design must not change, and the site must not get slower. Not a
pixel, not a millisecond.** Every colour, glow, size, animation and timing
in `dist-v2/` has been chosen and approved one by one, and the site has
been tuned to load and run as light as possible. The backend work is to
feed data into it, never to change how anything looks, moves or loads.
When the engine is plugged in, the site must look and feel exactly like the
demo does today.

You may edit exactly three files:

- `dist-v2/backend.js`: your adapter. All backend code goes here.
- `dist-v2/config.js`: setting values.
- `dist-v2/studio-copy.js`: wording only, about the same length, so nothing
  reflows.

Everything else in `dist-v2/` is locked. Do not edit, reformat, rename,
move, delete or add files there: no `.css`, no other `.js`, no `.html`, no
`assets/`.

Never:

- change colours, fonts, sizes, spacing, layout, borders, shadows, glows,
  animations, timings, easing or transitions, not even "just a little";
- add, remove or reorder elements, or add `<script>`, `<link>` or `<style>`
  tags to the pages;
- add libraries, SDKs, frameworks, fonts, icon sets, analytics, tag
  managers, cookie banners or chat widgets to the site;
- port the pages into React, Next.js, Vue or another framework, or wrap
  them in a framework layout (serve the files as they are, section 12);
- refactor, "clean up", modernise, reformat or run Prettier or
  `eslint --fix` on the sources, or change the build (`build-v2.mjs`,
  `package.json`);
- run `node build-v2.mjs --lock` (that approves design changes; only
  Linus does that).

If something in the look seems wrong or missing, do not fix it yourself:
send Linus a screenshot.

Keep `backend.js` light, so the site stays as fast as it is:

- At load, only define `window.MastrifyBackend`: no network requests, no
  timers, no heavy work until a function is called.
- Plain `fetch` (and `XMLHttpRequest` for the upload, if you want upload
  progress; both are built into the browser). No SDKs or libraries in the
  browser (Stripe Checkout is a redirect and needs no Stripe.js). The check
  fails above 40 KB.
- Call `onProgress` right away and then as often as you can, with `eta`
  when you know it, so the bar moves from the first second (section 2).
  Poll the engine at most every 500 to 1000 ms, or use SSE or a WebSocket.
- Stop everything (polling, uploads, sockets) when `signal` aborts or the
  job ends.
- Heavy work belongs on the server. Do not decode or process audio in
  `backend.js`; the interface already does what it needs itself (section 10).

**This is checked.** `design-lock.json` (project root) holds a fingerprint
of every locked file. `npm run build:check` compares them and fails,
naming the file, if anything was changed, added or removed; it also fails
when `backend.js` is over 40 KB or still the mock. `npm run build` prints
the same warning. It must pass before every deploy:

```
design unchanged (matches design-lock.json)
bundles and pages are up to date
```

If it prints `DESIGN LOCK`, undo the listed changes (for example
`git checkout -- dist-v2/<file>`, or copy the file back from the original
package). The same rules are in
`.cursor/rules/mastrify-design-lock.mdc`, which Cursor applies to every
request in this project automatically, so its AI follows them too.

## 0. Start here

The whole job is one file you write (`dist-v2/backend.js`) and a few
settings. Every screen, animation, the PDF report and the checkout dialog are
done and already read the data described below.

1. **Run it.** Put the folder under git first, so every change can be seen
   and undone: `git init && git add -A && git commit -m "Mastrify design
   handoff"`. Then, in the project root: `npm install` (once), `npm run build`,
   then serve the folder, for example
   `python3 -m http.server 8789 --directory dist-v2`, and open
   `http://localhost:8789/analyze`. You see the demo ("TEST MODE",
   "Engine demo · about 36 seconds").
2. **See the live path before writing anything.**
   `cp dist-v2/backend.mock.js dist-v2/backend.js && npm run build`, reload.
   The site now behaves exactly as it will with a real backend: no test
   labels, the progress bar paced with an eta, a checkout that redirects and
   comes back like Stripe (`/master?session_id=mock_…`), verify, Download
   WAV, email. Codes: `HALF`, `FREE`. `backend.mock.js` is also the best
   reference for the shapes the functions return.
   Undo: `rm dist-v2/backend.js && npm run build`.
3. **Write the real adapter.** `cp dist-v2/backend.example.js dist-v2/backend.js`
   and fill in `process`, `quote`, `checkout`, `verify`, `download`, `email`
   (sections 2 to 7). `npm run build` after every change to it.
4. **Settings** in `dist-v2/config.js`: `processingSeconds` (section 2),
   `checkoutReturnParam`, `supportEndpoint` (section 8), `supportEmail`,
   `siteUrl`.
5. **Stripe** success and cancel URLs, set in your server where it creates
   the Checkout Session (section 5).
6. **Build, check, deploy:** `npm run build`, then `npm run build:check`
   (must say "design unchanged"), go through section 11, upload
   (section 12). Section 13 lists the usual mistakes.

What you touch, and what you leave:

| File | |
| --- | --- |
| `dist-v2/backend.js` | Yours. The only code you have to write. Picked up by the build automatically. |
| `dist-v2/config.js` | Settings (URLs, endpoints, `processingSeconds`, `checkoutReturnParam`). Values only. |
| `dist-v2/studio-copy.js` | Every text in the studio (issue library, tips, phases, readiness tiers, UI strings, the live processing hint "Typically 30–60 seconds · Do not close this window", the email confirmation). Wording only, about the same length. |
| `dist-v2/backend.example.js` | Empty skeleton to copy. |
| `dist-v2/backend.mock.js` | The pretend live engine from step 2. Never deploy it as `backend.js` (the check fails). |
| `dist-v2/mastrify.css`, `mastrify-base.js`, `mastrify-app.js` (+ `.map`) | **Generated** by `npm run build`. Never edit; your edits are overwritten. |
| **everything else in `dist-v2/`** | **The look, including the record engine in `assets/engine/`. Locked: do not edit anything (see "The rule"; the check fails). It reads the data below, so nothing in it needs to change for the backend.** |

Other files worth knowing (read them, never edit them):

| File | Role |
| --- | --- |
| `dist-v2/studio-service.js` | The demo adapter. The last lines: `window.MastrifyDemo = demo; window.MastrifyService = window.MastrifyBackend || demo;` |
| `dist-v2/journey.js` | The studio flow (upload, settings, processing, results, checkout, email). Calls your adapter. |
| `dist-v2/report-views.js`, `ready-views.js`, `process-views.js` | Draw the analysis report, the master card and the processing card from the result objects. |
| `dist-v2/issue-sketches.js` | The animated illustration for every issue (section 3). |
| `dist-v2/report-pdf.js` | The designed PDF report, drawn in the browser from the analysis result. |
| `dist-v2/assets/engine/processing-flow.js` | Paces the progress bar (section 2). |
| `build-v2.mjs` | The build and the design check (section 1). |
| `design-lock.json` | Fingerprints of the approved design. Read by `npm run build:check`. Never edit or regenerate it. |
| `.cursor/rules/mastrify-design-lock.mdc` | "The rule" for Cursor's AI, applied to every request. Keep it. |

## 1. Wiring

The page shells do not list the source files by hand any more. The site
ships three built files (`mastrify.css`, `mastrify-base.js`,
`mastrify-app.js`) made by `build-v2.mjs` in the project root from the
sources in `dist-v2/`. Edit the sources, never the built files, then run:

```sh
npm install          # once, for terser (the minifier)
npm run build        # = node build-v2.mjs, rewrites bundles + all 11 shells
npm run build:dev    # shells load every source file (for debugging)
npm run build:check  # fails if the design changed, or the bundles are stale
```

To plug in the engine, save your adapter as `dist-v2/backend.js` and run
the build. It is picked up automatically and loaded between the two
bundles, which is exactly after `config.js` and `studio-copy.js` and before
`studio-service.js`:

```html
<script src="/mastrify-base.js?v=..."></script>  <!-- ... config.js, studio-copy.js -->
<script src="/backend.js?v=..."></script>        <!-- your adapter -->
<script src="/mastrify-app.js?v=..."></script>   <!-- studio-service.js, ... -->
```

The adapter must set `window.MastrifyBackend` synchronously at load. It may
read `window.MastrifyConfig` and `window.MastrifyCopy`.

```js
window.MastrifyBackend = {
  mode: 'live',                 // anything but 'demo' hides the test labels
  async process({kind, file, settings, previewWindow, signal, onProgress}) {},
  async quote({resultId, discountCode, signal}) {},     // price for the dialog
  async checkout({resultId, discountCode, signal}) {},  // {redirect} or a receipt
  async verify({resultId, query, signal}) {},           // after a hosted page
  async download({resultId, signal}) {},                // the full WAV
  async email({resultId, email, signal}) {},            // the download link
};
```

`mode`: the interface shows "TEST MODE", "Engine demo · about 36 seconds",
"Export · $9.00 test" and similar labels only when `mode === 'demo'`.

## 2. `process({kind, file, settings, previewWindow, signal, onProgress})`

Called once when the user starts an analysis or a master. Must return a
result object (section 3 or 4) or throw.

Input:

| Field | Type | Notes |
| --- | --- | --- |
| `kind` | `'analyze'` or `'master'` | Which flow. |
| `file` | `File` | The user's upload. Accepted by the interface: wav, wave, aiff, aif, flac, mp3, m4a, aac, ogg, oga, opus, caf, mp4, webm, or any `audio/*` type. |
| `settings` | object | `{style, target, width, low, clarity}`. `style` is one of `Balanced`, `Warm`, `Punchy`, `Club`, `Open`. `target` is `-14`, `-13`, `-11` or `-9` (LUFS). `width`, `low`, `clarity` are integers 0 to 100. Same object for analysis (defaults) and master (user's choice). |
| `previewWindow` | object or `null` | Master only. The 40 second window the browser suggests for the A/B audition: `{start, end, duration, cueTime, method, sourceDuration}` in seconds. `method` is `'short-track'`, `'silence'` or an energy based pick. You may honour it or choose your own window, but the returned `preview` must be at most 40 seconds. |
| `signal` | `AbortSignal` | Aborted when the user cancels, changes file or leaves the page. Stop work and reject with an error whose `name` is `'AbortError'` (the interface then stays silent). |
| `onProgress` | function | Call with `{progress, phase, eta}` as often as you like. `progress` is 0 to 1 and should only grow. `phase` is a short label for screen readers. `eta` is optional: the seconds you still expect to need. The whole processing card (the main percentage and all six (analysis) or five (master) rows) is driven by this one number; the rows are slices of it, named from `MastrifyCopy.PHASES`. |

How the bar moves: it never shows more than your last `progress`, and it
never jumps. It paces itself over the time the job is expected to take:
your `eta` if you send one; otherwise how long earlier jobs took in this
browser (it times every finished job, per kind, scaled by track length);
otherwise `MastrifyConfig.processingSeconds` (`{analyze: 30, master: 45}`,
set it to your engine's usual time). So an engine that reports 90% after a
second and then works for twenty more shows a steady bar instead of one that
sits on 90%. Past about 85% of the expected time it slows down instead of
stopping. For a master, the browser then prepares the A/B audition (it
loads your preview; a second or two): that is part of the bar too, so it
keeps moving through it and never waits at 100%. It learns how long that
takes on each computer. Then the bar glides to 100% (under half a second)
and the result opens. Report as often as you can; sending `eta` gives
the smoothest bar on the very first job.

The upload is part of the wait, so report it too: for example the upload
as 0 to 0.15 (with `XMLHttpRequest`'s `upload.onprogress`) and the engine's
own progress as 0.15 to 1. Upload a file once: remember your engine's id
for that `File`, so an analysis followed by a master of the same track does
not upload it again. If your engine counts 0 to 100, divide by 100.

`processingSeconds`: the usual time from pressing Start to the result for a
typical 3 to 4 minute track, upload included. Time a few real jobs and set
it to that, and make the hint the user reads during processing
(`processingHint` in `studio-copy.js`, "Typically 30–60 seconds") match.

Errors: throw an `Error` with a user facing `message`. It is shown in the
studio's error line (any error whose `name` is not `'AbortError'`). The
texts are ready in `MastrifyCopy.STRINGS`: `uploadFailed`,
`analysisFailed`, `analysisFailedNetwork`, `analysisNoData`,
`masterFailed`, `masterFailedNetwork`. Your API may answer errors with 4xx
or 5xx; the browser's own "Failed to load resource" console lines for them
are harmless.

## 3. Analysis result (`kind === 'analyze'`)

```json
{
  "id": "a1f3...",                      
  "kind": "analyze",
  "demo": false,
  "createdAt": "2026-09-21T12:00:00Z",
  "name": "BABADIMMA KALL.wav",
  "settings": {"style": "Balanced", "target": -14, "width": 50, "low": 50, "clarity": 50},
  "analysis": {
    "readiness": 87,
    "summary": "Your mix is release-ready. Mastering can focus on level and polish",
    "recommendation": "Ready for a final master",
    "focus": "Keep the balance you have. Choose a loudness goal and let the engine hold back where it should.",
    "highlights": [
      "Integrated loudness sits around −16.5 LUFS, a solid starting point for mastering.",
      "Dynamics are consistent and controlled.",
      "The low end is controlled and supportive."
    ],
    "metrics": [
      {"label": "Loudness",  "value": "Controlled", "detail": "≈ −16.5 LUFS",  "description": "Sensible headroom for mastering to work with."},
      {"label": "Dynamics",  "value": "Glued",      "detail": "6.9 dB range",  "description": "Tight and consistent, with peaks under control."},
      {"label": "Stereo",    "value": "Focused",    "detail": "23% width",     "description": "A tight, centered image with a little space at the sides."},
      {"label": "Low end",   "value": "Balanced",   "detail": "48%",           "description": "Low end feels controlled and supportive."},
      {"label": "Tone",      "value": "Even",       "detail": "Even",          "description": "Lows, mids and highs sit in proportion."},
      {"label": "Energy",    "value": "Punchy",     "detail": "High energy",   "description": "The track pushes forward with conviction.", "explanation": "Overall movement and intensity across the arrangement."},
      {"label": "Presence",  "value": "Clear",      "detail": "Clear",         "description": "The lead elements have space to speak."},
      {"label": "Highs",     "value": "Smooth",     "detail": "Smooth",        "description": "Keep the sheen gentle and natural."}
    ],
    "insights": [
      {"metric": "Stereo", "title": "Fine-tune stereo image", "subtitle": "Stereo field could feel more immersive",
       "text": "Widen reverbs and ear candy while keeping kick, bass, and vocal anchored in the center.",
       "gain": 5, "severity": "main", "tips": "stereo"}
    ],
    "tips": {"title": "Stereo too narrow", "subtitle": "Your mix feels centered and lacks width",
             "items": ["Widen pads, FX and synth layers (NOT bass)", "Pan percussion slightly left/right",
                       "Use stereo imaging on high frequencies only", "Keep kick and bass fully mono for power"]},
    "profile": {"loudness": -16.5, "range": 6.9, "width": 0.23, "channels": 2,
                "bassShare": 0.48, "midShare": 0.41, "airShare": 0.09, "accent": 0.31},
    "measured": true
  }
}
```

Field by field:

- `id`: unique string. Used for checkout, download and email.
- `demo`: `false` for a real engine. When `true` the interface adds
  "in-browser measurement", "Illustrative report" and "approximate" labels.
- `name`: shown as the track name. Usually `file.name`.
- `analysis.readiness`: integer 0 to 100. Drives the ring and the number.
- `summary`, `recommendation`, `focus`: the headline, the pill and the
  closing line of the readiness card. `MastrifyCopy.READINESS` has the
  live tiers (`min`, `headline`, `recommendation`, `focus`) if you want to
  derive them from the score.
- `highlights`: up to three sentences, shown as bullets.
- `metrics`: exactly these eight, in this order, with these `label`
  values: `Loudness`, `Dynamics`, `Stereo`, `Low end`, `Tone`, `Energy`,
  `Presence`, `Highs`. The interface shows `Tone` as "Brightness" and
  `Presence` as "Clarity". `value` is the one word status shown large,
  `detail` the small readout on the same row (use a real minus sign,
  `−`, in numbers), `description` the sentence in the expanded card,
  `explanation` an optional "what this describes" paragraph (without it
  the interface shows its own default text for that metric).
- `insights`: the issues, most important first, at most four. `metric`
  must be one of the eight labels above; it colours the card and picks
  the illustration. `title`, `subtitle` and `text` (the advice) can come
  straight from `MastrifyCopy.ISSUES`, which is the live site's library.
  `gain` is the readiness lift in percent points, shown as "+5%" and as
  "87% → 92%". `severity` is optional: `'main'`, `'medium'` or `'low'`;
  without it the first insight is main. The opened issue shows an animated
  illustration: picked by the exact `title` (all 16 issues in
  `MastrifyCopy.ISSUES` have their own), otherwise by `metric`. So reuse the
  library's titles where you can; a new title still gets its metric's
  drawing. A new drawing is design work: ask Linus (`issue-sketches.js`
  is locked).
- `insights[].tips` (optional): the key of the tips group that fits the
  issue (`level`, `dynamics`, `stereo` or `brightness`). The PDF report
  prints that group under the issue. Every issue in `MastrifyCopy.ISSUES`
  has its key in `tips`, so copy it from there.
- `tips`: the tips group for the main issue, or `null`. Pass the group from
  `MastrifyCopy.TIPS` as it is (`{title, subtitle, items}`); the report
  shows "ACTION TIPS · " and the `title`, then the items.
- `profile`: optional. If present, the eight tiles get a scale bar with
  the measured position. Units: `loudness` LUFS (scale −26 to −6),
  `range` dB (0 to 20), `width` 0 to 1 (0 mono, 1 wide), `bassShare`,
  `midShare`, `airShare` 0 to 1 (band shares of RMS energy), `accent`
  0 to 0.5 (transient accent), `channels` 1 or 2. Leave a field out and
  that tile shows no bar.
- `measured`: `true` when the numbers are real measurements.

## 4. Master result (`kind === 'master'`)

```json
{
  "id": "m7c0...",
  "kind": "master",
  "demo": false,
  "createdAt": "2026-09-21T12:03:00Z",
  "name": "BABADIMMA KALL.wav",
  "settings": {"style": "Punchy", "target": -11, "width": 50, "low": 50, "clarity": 50},
  "preview": {
    "audio": "<Blob, WAV or any decodable audio, the mastered window, max 40 s>",
    "sourceStart": 58.0,
    "duration": 40.0,
    "sourceDuration": 177.4,
    "cueTime": 61.2,
    "method": "energy"
  },
  "masterName": "Punchy Master",
  "tags": ["DYNAMIC", "FOCUSED"],
  "loudnessNotes": ["Adaptive loudness protection applied", "Preserved punch and dynamics", "Smart loudness shaping for your mix"],
  "comparison": [
    {"label": "Loudness",     "family": "level", "before": "≈ −20.8 LUFS", "after": "Spotify Loud Optimized", "afterDetail": "≈ −11.0 LUFS target", "pos": {"before": 0.26, "after": 0.75}},
    {"label": "Dynamics",     "family": "level", "before": "Consistent", "beforeDetail": "0.9 dB range", "after": "Preserved", "afterDetail": "Minimal touch", "pos": {"before": 0.05, "after": 0.05}},
    {"label": "Stereo image", "family": "space", "before": "Balanced", "beforeDetail": "33% width", "after": "Focused", "pos": {"before": 0.33, "after": 0.33}},
    {"label": "Low end",      "family": "space", "before": "Heavy", "after": "Grounded", "pos": {"before": 0.72, "after": 0.75}},
    {"label": "Presence",     "family": "drive", "before": "Clear", "after": "Natural detail", "pos": {"before": 0.59, "after": 0.63}}
  ]
}
```

- `preview`: required. The interface loads `preview.audio` into the
  Master side of the A/B player and cuts the same window out of the
  user's original for the Original side, so `sourceStart` and `duration`
  must describe where in the source the preview comes from. `duration`
  at most 40, `sourceStart + duration` at most `sourceDuration`.
  `cueTime` and `method` are optional and only informational. The full length master is not sent here; it is fetched
  with `download()` after payment.
- `masterName`: the kicker on the card. Use
  `MastrifyCopy.masterName(settings)` (the names the site uses, for example
  "Streaming Master"), unless your engine has its own names you would rather
  show; then tell Linus. `tags`: up to four, shown in uppercase after the
  fixed TRANSIENT-SAFE mark (`MastrifyCopy.masterTags(settings, profile)`
  gives the site's four).
  `loudnessNotes`: the three check lines (`MastrifyCopy.loudnessNotes`).
- `comparison`: rows of "A closer listen", in this order. `label` is
  free text, `family` picks the colour: `level`, `space`, `tone` or
  `drive`. `before`/`after` are the words, `beforeDetail`/`afterDetail`
  the small mono lines. `pos` is optional; with it the row shows a
  before/after bar (both values 0 to 1 on a scale you choose per row,
  for example loudness mapped from −26 to −6 LUFS). Without `pos` the
  row has no bar.
- `analysis` is optional on a master result; nothing on the master page
  reads it.

## 5. Payment: `quote`, `checkout`, `verify`

The checkout dialog is backend driven. Three functions, all with `signal`:

**`quote({resultId, discountCode, signal})`** (recommended). Called when the
dialog opens and whenever the user applies or clears a code. Resolve with
the price to show:

```json
{"amount": 9, "currency": "USD", "free": false, "code": "", "label": ""}
```

`amount` and `currency` feed the price line (formatted in the browser),
`free` turns the button into "Continue, free". `label` is optional text for
the code line ("Code applied · 50% off"). Throw an `Error` for an unknown
code; its message is shown and the code is dropped. Without `quote` the
dialog shows $9.00 and no code validation.

**`checkout({resultId, discountCode, signal})`**. Called when the user
confirms. Two ways to answer:

1. Hosted payment page (Stripe Checkout or similar): resolve with
   `{"redirect": "https://checkout.stripe.com/c/pay/..."}`. The interface
   shows "Redirecting to checkout…", stores the master and the original
   file in the browser (IndexedDB), and navigates to that URL. Your success
   URL must bring the user back to `/master` with a query parameter that
   identifies the payment, by default `session_id`
   (`MastrifyConfig.checkoutReturnParam`). A `checkout` parameter works too.
   On return the interface restores the master, loads the audition, and
   calls `verify`.

   With Stripe Checkout, create the session in your server with these
   URLs (absolute, on the site's own domain):

   ```
   success_url: https://mastrify.com/master?session_id={CHECKOUT_SESSION_ID}
   cancel_url:  https://mastrify.com/master?checkout=cancelled
   ```

   Both must be on the same origin as the site (the stored master lives in
   that origin's IndexedDB) and the user must come back in the same browser.
   `?checkout=cancelled` restores the master with the Export button and the
   line "Checkout cancelled. Your master is still here." (no verify call).
   `verify` should ask your server whether that `session_id` is paid, and
   your server should ask Stripe directly (retrieve the session and check
   `payment_status === 'paid'`) rather than wait for a webhook, which can
   arrive a few seconds later. If you do rely on the webhook, retry for a
   few seconds before rejecting. Never trust the query string alone.
   What the return does: the value of `session_id` (or your
   `checkoutReturnParam`) is passed to `verify` in `query`;
   `checkout=cancelled` restores the master without calling `verify`; any
   other `checkout=…` value also calls `verify` with the whole query.
2. Paid in place (a free code, or a payment handled inside your adapter):
   resolve with the receipt directly:

```json
{"id": "pi_3N...", "resultId": "m7c0...", "test": false, "amount": 9, "currency": "USD", "charged": 9, "free": false, "code": ""}
```

Reject with a message on failure (`MastrifyCopy.STRINGS.checkoutFailed` is
"Could not start checkout. Please try again.").

**`verify({resultId, query, signal})`**. Called once after a return from a
hosted page. `query` is the return URL's parameters as an object, for
example `{"session_id": "cs_test_..."}`. Resolve with the receipt above when
the payment went through; the interface then shows "Download WAV" and opens
the email dialog. Reject with a message when it did not
(`MastrifyCopy.STRINGS.verifyFailed` is "Could not verify payment."); the
interface shows the master with the Export button again so the user can
retry.

The interface reads `receipt.resultId` (must equal the current master),
`receipt.free`, `receipt.test` and, if present, `receipt.email` (the
buyer's email from Stripe; it prefills the required email step, section 7).
Send `test: false` in production (`true`
shows the demo's "Test checkout complete · $0 charged" line).

The price also appears as fixed text on the Export button ("Export · $9.00"),
the pricing page and the terms. If the price ever changes, tell Linus; those
texts are part of the locked design.

If the user returns and the stored master is gone (another browser, cleared
storage), the interface shows the normal "No master in this session" state.
The email with the download link is the safety net for that case.

## 6. `download({resultId, signal})`

Called when the paid user clicks "Download WAV". Must resolve with a
`Blob` of the full length master (WAV). The interface names the file
"<track> - Mastrify master.wav". Reject with a message on failure ("Could
not prepare the WAV. Please try again." is the fallback text).

## 7. `email({resultId, email, signal})` (required)

After payment, entering an email is **required**. The dialog ("Payment
complete. Enter your email…") has no close button and no "Not now",
Escape does not close it, and it reopens if the browser closes it. It
closes itself once `email()` resolves. The reason is support: if the direct
download ever fails, the user still has the link in their inbox.

So `email()` must work every time. Resolve with
`{"sent": true, "test": false, "to": "user@example.com"}` as soon as your
server has queued the email; the dialog then shows "Sent to … The link
stays valid for 12 hours." for a moment, closes, and the line stays on the
export card. The download link must stay valid for **12 hours** (that is
what the text promises; if it ever changes, change `emailSent` in
`studio-copy.js`, where `{to}` is the address). Reject with a message and
it is shown in the dialog, where the user can try again
(`STRINGS.emailInvalid` for a bad address, `STRINGS.emailFailed`
otherwise; the browser already refuses an empty or malformed address).
Answer quickly and retry sending on your server rather than rejecting.

Recommended safety net: Stripe Checkout already collects the buyer's email
(`customer_details.email`). Return it from `verify()` as `receipt.email`
and the field is filled in for the user (section 5), and have your server
send the link to that address as well, so a user who closes the tab before
the dialog still gets it.

## 8. Support tickets

`contact.js` posts the contact form as JSON to
`MastrifyConfig.supportEndpoint` (`/api/support` by default):

```json
{"topic": "Mastering", "name": "…", "email": "…", "message": "…", "page": "/contact", "sentAt": "2026-09-21T12:00:00Z"}
```

Any 2xx means received. On a non-2xx answer, a network error, or no answer
within `supportTimeout` ms (6000), the interface opens the user's mail app
with the same text addressed to `supportEmail`. The path is yours (set
`supportEndpoint`); your server must deliver the ticket somewhere a person
reads it, for example as an email to `supportEmail` or into your help desk.

## 9. Optional telemetry

The live site posts page views and pipeline events to
`/api/track/pageview`, `/api/track/pipeline`, `/api/track/master-complete`
and `/api/track/master-failed`. The interface does not do this today. If
you want it, keep it in `backend.js` too: pipeline events inside
`process()` (start, complete, fail), and page views from the
`mastrify:route` event, which the site fires on `document` after every page
change, the first load included:

```js
document.addEventListener('mastrify:route', e =>
  navigator.sendBeacon('/api/track/pageview', JSON.stringify({ path: e.detail.path })));
```

`sendBeacon` never blocks the page. Nothing in the interface depends on
telemetry, and no tracking script goes into the pages.

## 10. Things the browser already has

- `window.MastrifyAudio.getState().sources.original.profile`: the quick
  in-browser measurement of the uploaded file (same fields as
  `analysis.profile` above, plus `crest`, `peakDb`, `movement`,
  `widthSpread`, `bassSpread`). Free to use, for example to show a first
  estimate while the engine works, or to skip. A real engine should
  measure the file itself.
- `window.MastrifyFiles.wav(file, {start, duration, signal})`: cuts a
  WAV clip out of the original in the browser. Used for the Original side
  of the audition.
- `window.MastrifyFiles.report(result, {duration})`: returns a Promise of
  the designed PDF report (A4, the site's look: readiness ring, the eight
  tiles, main issue, other signals with tips, next step; text searchable).
  Drawn in the browser from the analysis result above by `report-pdf.js`,
  which loads on the first download. The backend does not need to make a
  PDF; if it fills `analysis` as described, the report follows.
- `window.MastrifyCopy`: every string the live site uses. Prefer it over
  hardcoding text in the backend, so copy stays in one place.

## 11. Checklist for going live

1. `dist-v2/backend.js` exists and `npm run build` has run (the shells show it between the two bundles).
2. `mode` is not `'demo'`.
3. `process()` reports `progress` up to 1 and returns `demo: false`.
4. Analysis: eight metrics in order, insights with `metric` and `gain`.
5. Master: `preview.audio` at most 40 s with `sourceStart`, `duration`,
   `sourceDuration`; `masterName`, `tags`, `loudnessNotes`, `comparison`.
6. `quote()` returns the real price; `checkout()` returns a `redirect` or a
   receipt; `verify()` confirms the return; `download()` returns the WAV.
7. `email()` implemented and reliable (the email step after payment
   cannot be skipped), the link valid for 12 hours; `verify()` returns the
   Stripe email as `receipt.email`; support endpoint answers 2xx.
8. The success URL of the hosted page points at `/master?session_id=...`
   (or set `checkoutReturnParam` in `config.js`), the cancel URL at
   `/master?checkout=cancelled`.
9. `node tests/v2-studio.cjs` still passes (it tests the demo adapter and
   the copy, not your backend).
10. `config.js`: `processingSeconds` set to the usual time of a real job,
    upload included (section 2); `processingHint` in `studio-copy.js`
    matches it.
11. `npm run build:check` passes: "design unchanged" and "bundles and
    pages are up to date" (it also fails when `backend.js` is still the
    mock or over 40 KB).
12. **Looks identical:** open every page and both studio flows next to the
    demo (step 1 of section 0). Same colours, same glow, same animations,
    same layout, on desktop and on a phone. The only visible difference
    allowed is that the test labels are gone.
13. **Feels as fast:** pages open just as quickly as the demo; the progress
    bar moves from the first second, also during the upload, and never sits
    still or jumps; the result opens as quickly as in the demo. In DevTools' Network tab each page
    loads the same files as the demo plus `backend.js`, and nothing else
    until the user starts a job.

## 12. Deploying

The site is static files; no server code is needed for the look.

- Run `npm run build`, then upload the whole `dist-v2/` folder as the site
  root. Every page is a folder with its own `index.html` (`/analyze` is
  `analyze/index.html`), so any static host works. Configure the host to
  answer unknown paths with `404.html`.
- Not needed in production, safe to leave out: `analyze-lab/`, `sonic-lab/`,
  `wave-lab/`, `backend.example.js`, `backend.mock.js`, `*.map`. Keep the
  rest, including the source files next to the bundles: a few are fetched
  on their own (`report-pdf.js`, the workers in `assets/engine/`).
- All URLs in the site are absolute (`/mastrify.css`, `/analyze`), so it
  must be served at the domain root. If mastrify.com runs on an app
  framework, put the folder in its public/static directory and let the
  routes `/`, `/analyze`, `/master`, `/pricing`, `/how-it-works`, `/about`,
  `/blog`, `/contact`, `/privacy`, `/terms` serve those `index.html` files
  as they are. Do not render them through the framework's layout, templates
  or components, and let it add nothing to them.
- Caching: `*.html` with `Cache-Control: no-cache`. The bundles and
  `backend.js` carry a content hash in `?v=` (the build writes it), so they
  can be cached for a year.
- Speed on the host: compression on (Brotli or gzip, for `.html`, `.css`,
  `.js`, `.json`, `.svg`), HTTP/2 or newer. Turn off every host feature that
  rewrites or injects into the pages (for example Cloudflare Rocket Loader,
  email obfuscation, automatic minifying or "optimising", injected analytics
  or consent scripts): they change how the site loads and runs.
- Your API: simplest on the same domain (for example `/api/...`, no CORS).
  On another domain, allow the site's origin with CORS.

## 13. When something is off

- **`npm run build:check` says `DESIGN LOCK`.** A locked file was changed,
  added or removed (often by an editor's formatter or by an AI "fixing"
  something). Undo exactly the listed files (`git checkout -- <file>`);
  never regenerate the lock. If a design change is really needed, it goes
  through Linus.
- **A change does not show.** A source file was edited but `npm run build`
  did not run (`npm run build:check` says so), or a generated file
  (`mastrify-app.js`, `mastrify.css`) was edited directly and then
  overwritten. Edit the sources, build again.
- **"TEST MODE" / "Engine demo" still shows.** `backend.js` is not in the
  pages: run `npm run build` (the shells then list `/backend.js` between the
  two bundles), or your adapter's `mode` is `'demo'`.
- **The bar stands still, then jumps.** The engine reports progress rarely.
  Report more often and send `eta`; set `processingSeconds` (section 2).
- **An issue has no illustration.** Its `metric` is not one of the eight
  labels; use one of them (section 3).
- **After payment the user sees an empty studio.** The success URL is on a
  different origin, lacks `session_id`, or the user came back in another
  browser (the email link is the safety net). See section 5.
- **Cancel shows "Could not verify payment."** The cancel URL lacks
  `?checkout=cancelled`.
- **Download fails.** `download()` must resolve with a `Blob` of the full
  master, only after the payment is confirmed on your server.
