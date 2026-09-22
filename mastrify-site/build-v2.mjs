#!/usr/bin/env node
/* Build for dist-v2: turns the 45 scripts and 13 stylesheets into three
 * files the browser loads (mastrify.css, mastrify-base.js, mastrify-app.js)
 * and writes them into the eleven page shells. Sources stay where they are
 * and are the only files anyone edits.
 *
 *   node build-v2.mjs            minified bundles (what the site ships)
 *   node build-v2.mjs --dev      shells load every source file, no bundles
 *   node build-v2.mjs --check    exit 1 if the bundles are out of date, or
 *                                if the design differs from design-lock.json
 *   node build-v2.mjs --lock     approve the current design (writes
 *                                design-lock.json). Design owner only.
 *
 * Options: --root <dir> (default dist-v2), --backend <file> (default
 * backend.js when it exists in the root). The backend adapter is loaded
 * between the two bundles: after studio-copy.js, before studio-service.js,
 * exactly where BACKEND-CONTRACT.md puts it.
 *
 * Scripts are minified with terser (npm install). Without it the script
 * bundles are plain concatenations: same behaviour, larger files. CSS is
 * only stripped of comments and spare whitespace, never rewritten, so every
 * computed style stays byte-for-byte what the sources say. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = name => args.includes(name);
const option = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const ROOT = path.resolve(HERE, option('--root', 'dist-v2'));
const DEV = flag('--dev'), CHECK = flag('--check'), PLAIN = flag('--no-minify'), LOCK = flag('--lock');

// Load order is the order the shells used before bundling. Do not sort.
const CSS = ['site.css', 'controls.css', 'navigation-light.css', 'studio-entry.css', 'refinement.css', 'journey.css',
  'visibility-work.css', 'why.css', 'legal.css', 'v2.css', 'report.css', 'ready.css', 'process.css', 'sharp.css'];
const BASE = ['canvas-runtime.js', 'assets/engine/musical-pulse.js', 'assets/engine/performance-score.js',
  'assets/engine/playback-bands.js', 'assets/engine/audio-reactivity.js', 'assets/engine/processing-flow.js',
  'assets/engine/processing-motion.js', 'assets/engine/living-surface.js', 'assets/engine/vinyl.js',
  'assets/engine/rim-spectrum.js', 'assets/engine/music-notes.js', 'assets/engine/core-field.js',
  'assets/engine/standby-matter.js', 'assets/engine/master-finish.js', 'assets/engine/playback-depth.js',
  'assets/engine/transition-portal.js', 'assets/engine/radial-deploy.js', 'assets/engine/analysis-radial.js',
  'assets/engine/plasma-reveal.js', 'assets/engine/shadow-mixer.js', 'assets/engine/gpu-disc.js',
  'assets/engine/engine.js', 'assets/engine/sonic-analysis.js', 'assets/engine/contour-field.js',
  { file: 'assets/engine/wave-bodies.js', when: '[?&]wave=(relief|prism|tube|horizon|silk|glass)(&|$)' },
  'assets/engine/track.js', 'copy.js', 'content.js', 'legal.js', 'legal-motion.js', 'bridge.js', 'config.js', 'studio-copy.js'];
const APP = ['studio-service.js', 'ready-views.js', 'process-views.js', 'issue-sketches.js', 'report-views.js', 'journey.js', 'control-light.js',
  'interaction.js', 'contact.js', 'assets/engine/playback-band-glow.js', 'visibility-work.js', 'why.js', 'site.js'];
const SHELLS = ['index.html', '404.html', 'about/index.html', 'analyze/index.html', 'blog/index.html', 'contact/index.html',
  'how-it-works/index.html', 'master/index.html', 'pricing/index.html', 'privacy/index.html', 'terms/index.html'];

const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const hash = text => crypto.createHash('sha256').update(text).digest('hex').slice(0, 10);
const fileOf = entry => typeof entry === 'string' ? entry : entry.file;
const url = rel => `/${rel}?v=${hash(read(rel))}`;

// Design lock. The look and the speed of dist-v2 are approved and fixed.
// design-lock.json (project root) holds a fingerprint of every file that
// makes up the look. The only files outside it are the ones the backend
// work is allowed to touch: backend.js (and its example/mock), the settings
// in config.js, the texts in studio-copy.js, and the generated bundles
// (those are checked against the sources instead). --check fails when any
// locked file was changed, added or removed.
const LOCK_FILE = path.join(HERE, 'design-lock.json');
const OPEN_FILES = /^(backend(\.[\w-]+)?\.js|config\.js|studio-copy\.js|mastrify\.css|mastrify-(base|app)\.js(\.map)?)$/;
const TEXT = /\.(html|css|js|mjs|json|txt|xml|svg|md|webmanifest)$/i;
const BACKEND_BUDGET = 40 * 1024;
function lockedFiles(dir = ROOT, rel = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;                 // .DS_Store and friends
    const r = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) { if (!/-lab$/.test(entry.name)) out.push(...lockedFiles(path.join(dir, entry.name), r)); }
    else if (entry.isFile() && !(rel === '' && OPEN_FILES.test(entry.name))) out.push(r);
  }
  return out.sort();
}
function fingerprint(rel) {
  let data = fs.readFileSync(path.join(ROOT, rel));
  if (TEXT.test(rel)) {
    let text = data.toString('utf8').replace(/\r\n/g, '\n');
    // what the build writes between the markers is checked separately
    if (SHELLS.includes(rel)) text = text.replace(/<!--css-->[\s\S]*?<!--\/css-->/, '<!--css--><!--/css-->').replace(/<!--js-->[\s\S]*?<!--\/js-->/, '<!--js--><!--/js-->');
    data = Buffer.from(text);
  }
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
}
function designState() { return Object.fromEntries(lockedFiles().map(rel => [rel, fingerprint(rel)])); }
function designDiff() {
  if (!fs.existsSync(LOCK_FILE)) return { missingLock: true, changed: [], added: [], removed: [] };
  const approved = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8')).files || {}, now = designState();
  return {
    changed: Object.keys(now).filter(rel => rel in approved && approved[rel] !== now[rel]),
    added: Object.keys(now).filter(rel => !(rel in approved)),
    removed: Object.keys(approved).filter(rel => !(rel in now))
  };
}
function designProblems() {
  const d = designDiff(), lines = [], dir = path.relative(HERE, ROOT) || '.';
  if (d.missingLock) return ['design-lock.json is missing (it belongs in the project root).'];
  for (const rel of d.changed) lines.push(`changed: ${dir}/${rel}`);
  for (const rel of d.added) lines.push(`added:   ${dir}/${rel}`);
  for (const rel of d.removed) lines.push(`removed: ${dir}/${rel}`);
  return lines;
}
function backendProblems(backendRel) {
  if (!backendRel) return [];
  const file = path.join(ROOT, backendRel), lines = [];
  if (!fs.existsSync(file)) return [`${backendRel} not found.`];
  const size = fs.statSync(file).size;
  if (size > BACKEND_BUDGET) lines.push(`${backendRel} is ${(size / 1024).toFixed(0)} KB; the budget is ${BACKEND_BUDGET / 1024} KB. The adapter is transport code: no libraries, SDKs or frameworks in it (BACKEND-CONTRACT.md, "The rule").`);
  const mock = path.join(ROOT, 'backend.mock.js');
  if (fs.existsSync(mock) && fs.readFileSync(mock, 'utf8') === fs.readFileSync(file, 'utf8')) lines.push(`${backendRel} is still backend.mock.js (the pretend engine). Never deploy it.`);
  return lines;
}
const LOCK_HELP = 'The look and the speed of the site are locked (BACKEND-CONTRACT.md, "The rule"). Undo these changes, for example: git checkout -- <file>. Only the design owner runs --lock.';

async function tools() {
  const out = {};
  try { out.terser = PLAIN ? null : (await import('terser')).minify; } catch (_) { out.terser = null; }
  return out;
}

// Scripts that only a test flag needs load on demand, never for normal visits.
const lazyLoader = entry => `if(new RegExp(${JSON.stringify(entry.when)}).test(location.search)){var s=document.createElement('script');s.src=${JSON.stringify(url(entry.file))};document.head.appendChild(s);}`;

// Files the bundles fetch on their own, with content-hash versions: the
// analysis worker (inside a bundle document.currentScript is the bundle, not
// audio-reactivity.js) and the PDF report, which loads on first download.
const workerUrls = () => `window.MastrifyAssetURLs=${JSON.stringify({ analysis: url('assets/engine/audio-reactivity.js'), reportPdf: url('report-pdf.js') })};`;

async function bundleJs(list, name, t, prelude = '') {
  const parts = prelude ? [prelude] : [], sections = [];
  let line = prelude ? 2 : 0;
  for (const entry of list) {
    const rel = fileOf(entry);
    let code, map = null;
    if (typeof entry !== 'string') code = lazyLoader(entry);
    else if (t.terser) {
      const result = await t.terser({ [rel]: read(rel) }, {
        ecma: 2020, module: false, toplevel: false,
        compress: { passes: 2, negate_iife: false }, mangle: true,
        format: { comments: false, ascii_only: false },
        sourceMap: { includeSources: true, root: '/' }
      });
      code = result.code; map = JSON.parse(result.map);
    } else code = read(rel);
    code = code.replace(/\s*$/, '');
    if (map) sections.push({ offset: { line, column: 0 }, map });
    parts.push(code);
    line += code.split('\n').length + 1;
  }
  let text = `${parts.join('\n;\n')}\n`;
  let mapText = null;
  if (sections.length) {
    mapText = JSON.stringify({ version: 3, file: name, sections });
    text += `//# sourceMappingURL=${name}.map\n`;
  }
  return { text, mapText };
}

// Comments out, whitespace collapsed, spaces dropped next to { } ; , and
// after a colon. Strings and url(...) are copied untouched. Nothing else.
function tidyCss(source) {
  let out = '', i = 0;
  const n = source.length, last = () => out[out.length - 1];
  while (i < n) {
    const c = source[i];
    if (c === '/' && source[i + 1] === '*') { const end = source.indexOf('*/', i + 2); i = end < 0 ? n : end + 2; if (out && !/\s/.test(last())) out += ' '; continue; }
    if (c === '"' || c === "'") { let j = i + 1; while (j < n && source[j] !== c) j += source[j] === '\\' ? 2 : 1; out += source.slice(i, j + 1); i = j + 1; continue; }
    if ((c === 'u' || c === 'U') && /^url\(/i.test(source.slice(i, i + 4))) { const end = source.indexOf(')', i); out += source.slice(i, end + 1); i = end + 1; continue; }
    // Custom properties keep their value text exactly (it is read back raw).
    if (c === '-' && source[i + 1] === '-' && /[{;]\s*$/.test(out)) {
      let j = i, depth = 0;
      while (j < n) { const d = source[j]; if (d === '"' || d === "'") { j++; while (j < n && source[j] !== d) j += source[j] === '\\' ? 2 : 1; } else if (d === '(') depth++; else if (d === ')') depth--; else if ((d === ';' || d === '}') && depth <= 0) break; j++; }
      out += source.slice(i, j).replace(/\s+$/, ''); i = j; continue;
    }
    if (/\s/.test(c)) { while (i < n && /\s/.test(source[i])) i++; out += ' '; continue; }
    if (c === '{' || c === '}' || c === ';' || c === ',') { if (last() === ' ') out = out.slice(0, -1); out += c; i++; while (i < n && /\s/.test(source[i])) i++; continue; }
    if (c === ':') { out += c; i++; while (i < n && /\s/.test(source[i])) i++; continue; }
    out += c; i++;
  }
  return out.replace(/;}/g, '}').trim();
}
function bundleCss() {
  const parts = CSS.map(rel => tidyCss(read(rel)));
  return `/* mastrify.css: built from ${CSS.join(', ')}. Edit those, then run node build-v2.mjs. */\n${parts.join('\n')}\n`;
}

function writeShells(cssTags, jsTags) {
  for (const rel of SHELLS) {
    const file = path.join(ROOT, rel);
    let html = fs.readFileSync(file, 'utf8');
    const css = `<!--css-->${cssTags}<!--/css-->`, js = `<!--js-->${jsTags}<!--/js-->`;
    if (html.includes('<!--css-->')) html = html.replace(/<!--css-->[\s\S]*?<!--\/css-->/, css);
    else {
      const first = html.indexOf('<link rel="stylesheet"'), lastLink = html.lastIndexOf('<link rel="stylesheet"'), end = html.indexOf('>', lastLink) + 1;
      if (first < 0) throw new Error(`${rel}: no stylesheets found`);
      html = html.slice(0, first) + css + html.slice(end);
    }
    if (html.includes('<!--js-->')) html = html.replace(/<!--js-->[\s\S]*?<!--\/js-->/, js);
    else {
      const first = html.indexOf('<script src="'), end = html.lastIndexOf('</script>') + '</script>'.length;
      if (first < 0) throw new Error(`${rel}: no scripts found`);
      html = html.slice(0, first) + js + html.slice(end);
    }
    fs.writeFileSync(file, html);
  }
}

async function main() {
  if (LOCK) {
    const files = designState();
    fs.writeFileSync(LOCK_FILE, JSON.stringify({ note: 'Approved design of dist-v2. Written by node build-v2.mjs --lock (design owner only). Checked by npm run build:check.', approved: new Date().toISOString().slice(0, 10), files }, null, 1) + '\n');
    console.log(`design-lock.json: ${Object.keys(files).length} files approved`); return;
  }
  const backendRel = option('--backend', fs.existsSync(path.join(ROOT, 'backend.js')) ? 'backend.js' : null);
  // Loads like the bundles around it (fetchpriority=low), except in --dev.
  const backendTag = backendRel ? `<script src="${url(backendRel)}"${DEV ? '' : ' fetchpriority="low"'}></script>` : '';
  const link = href => `<link rel="stylesheet" href="${href}">`, script = src => `<script src="${src}"></script>`;
  if (DEV) {
    const tag = entry => script(url(fileOf(entry)));
    writeShells(CSS.map(rel => link(url(rel))).join(''), BASE.map(tag).join('') + backendTag + APP.map(tag).join(''));
    console.log(`dev shells: ${CSS.length} stylesheets, ${BASE.length + APP.length} scripts${backendRel ? ` + ${backendRel}` : ''}`);
    return;
  }
  const t = await tools();
  if (!t.terser && !PLAIN) console.warn('terser is not installed (npm install): writing unminified script bundles.');
  const css = bundleCss(), base = await bundleJs(BASE, 'mastrify-base.js', t, workerUrls()), app = await bundleJs(APP, 'mastrify-app.js', t);
  const outputs = { 'mastrify.css': css, 'mastrify-base.js': base.text, 'mastrify-app.js': app.text };
  if (base.mapText) outputs['mastrify-base.js.map'] = base.mapText;
  if (app.mapText) outputs['mastrify-app.js.map'] = app.mapText;
  const tags = shellTags(css, base.text, app.text, backendTag);
  if (CHECK) {
    let failed = false;
    const design = designProblems();
    if (design.length) { failed = true; console.error(`DESIGN LOCK: the design differs from the approved one.\n  ${design.join('\n  ')}\n${LOCK_HELP}`); }
    else console.log('design unchanged (matches design-lock.json)');
    const budget = backendProblems(backendRel);
    if (budget.length) { failed = true; console.error(budget.join('\n')); }
    const stale = Object.entries(outputs).filter(([rel, text]) => !fs.existsSync(path.join(ROOT, rel)) || fs.readFileSync(path.join(ROOT, rel), 'utf8') !== text).map(([rel]) => rel);
    const shells = SHELLS.filter(rel => { const html = fs.readFileSync(path.join(ROOT, rel), 'utf8'); return !html.includes(`<!--css-->${tags.css}<!--/css-->`) || !html.includes(`<!--js-->${tags.js}<!--/js-->`); });
    if (stale.length || shells.length) { failed = true; console.error(`out of date: ${[...stale, ...shells].join(', ')}. Run npm run build`); }
    else console.log('bundles and pages are up to date');
    if (failed) process.exit(1);
    return;
  }
  for (const [rel, text] of Object.entries(outputs)) fs.writeFileSync(path.join(ROOT, rel), text);
  writeShells(tags.css, tags.js);
  const kb = n => `${(n / 1024).toFixed(0)} KB`;
  console.log(`mastrify.css ${kb(css.length)} · mastrify-base.js ${kb(base.text.length)} · mastrify-app.js ${kb(app.text.length)}${backendRel ? ` · backend: ${backendRel}` : ''}${t.terser ? '' : ' (unminified)'}`);
  const design = designProblems(), budget = backendProblems(backendRel);
  if (design.length) console.warn(`\nWARNING, DESIGN LOCK: the design differs from the approved one.\n  ${design.join('\n  ')}\n${LOCK_HELP}\nnpm run build:check fails until this is undone.`);
  if (budget.length) console.warn(`\nWARNING: ${budget.join('\nWARNING: ')}`);
}

// The tags the build writes between the markers of every page shell.
// fetchpriority=low: the stylesheet gets the bandwidth first, so the page
// paints as early as it did with separate files; the scripts follow.
function shellTags(css, baseText, appText, backendTag) {
  const late = src => `<script src="${src}" fetchpriority="low"></script>`;
  return { css: `<link rel="stylesheet" href="/mastrify.css?v=${hash(css)}">`, js: late(`/mastrify-base.js?v=${hash(baseText)}`) + backendTag + late(`/mastrify-app.js?v=${hash(appText)}`) };
}
main().catch(error => { console.error(error); process.exit(1); });
