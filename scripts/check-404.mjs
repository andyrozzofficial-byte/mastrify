#!/usr/bin/env node
/**
 * Checks how the site answers real pages and wrong addresses.
 *
 *   npm run test:404 -- <base-url>     e.g. http://localhost:3000 or a Vercel preview URL
 *
 * - every page in sitemap.xml and every known page answers 200
 * - the installers answer 200 (checked with HEAD, nothing is downloaded)
 * - kept redirects still redirect (/access -> /master)
 * - unknown addresses answer 404 with the designed "Page not found" page, without any redirect
 *
 * Optional: VERCEL_BYPASS=<token> for a protected Vercel preview (Protection Bypass for Automation).
 */
const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "")
const bypass = process.env.VERCEL_BYPASS ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS } : {}
const fails = []

async function get(path, method = "GET") {
  const r = await fetch(base + path, { method, redirect: "manual", headers: bypass })
  const text = method === "GET" && (r.status === 200 || r.status === 404) ? await r.text() : ""
  return {
    status: r.status,
    location: r.headers.get("location"),
    title: (text.match(/<title>([^<]*)/) || [])[1] || "",
  }
}

function check(ok, label, detail) {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`)
  if (!ok) fails.push(`${label}: ${detail}`)
}

const sitemapRes = await fetch(base + "/sitemap.xml", { headers: bypass })
const sitemap = sitemapRes.ok ? await sitemapRes.text() : ""
check(sitemapRes.ok, "200  /sitemap.xml", `status ${sitemapRes.status}`)
const fromSitemap = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)

const pages = [...new Set([
  ...fromSitemap,
  "/", "/about", "/analyze", "/master", "/pricing", "/how-it-works", "/blog", "/contact", "/privacy", "/terms",
  "/tools", "/help", "/landing", "/flow", "/robots.txt",
  "/mastrify.css", "/og-image.png", "/tools/img/meter.jpg",
])]
for (const path of pages) {
  const r = await get(path)
  check(r.status === 200, `200  ${path}`, `got ${r.status}${r.location ? " -> " + r.location : ""}`)
}

const installers = [
  "/downloads/audio-tools/1.0.0/Mastrify-Audio-Tools-1.0.0-macOS.dmg",
  "/downloads/audio-tools/1.0.0/Mastrify-Audio-Tools-1.0.0-Windows.exe",
  "/downloads/desktop/0.1.0/Mastrify-Installer-macOS.pkg",
  "/downloads/desktop/0.1.0/Mastrify-Installer-Windows.exe",
]
for (const path of installers) {
  const r = await get(path, "HEAD")
  check(r.status === 200, `200  ${path}`, `got ${r.status}`)
}

const redirects = { "/access": "/master", "/access/anything": "/master" }
for (const [path, to] of Object.entries(redirects)) {
  const r = await get(path)
  const ok = r.status >= 300 && r.status < 400 && r.location && new URL(r.location, base).pathname === to
  check(ok, `3xx  ${path} -> ${to}`, `got ${r.status} ${r.location}`)
}

const unknown = [
  "/this-does-not-exist", "/404", "/blog/old-post", "/pricing/extra", "/about/team",
  "/nope?utm_source=google&gclid=test", "/ai-mastering",
]
for (const path of unknown) {
  const r = await get(path)
  const ok = r.status === 404 && /Page not found/.test(r.title) && !r.location
  check(ok, `404  ${path}`, `got ${r.status} "${r.title}"${r.location ? " -> " + r.location : ""}`)
}

// Typical attack probes: Vercel's firewall may block them with 403 before they reach the site.
// Either answer is fine, as long as there is no redirect and no page.
const probes = ["/index.php", "/wp-login.php"]
for (const path of probes) {
  const r = await get(path)
  const ok = (r.status === 404 || r.status === 403) && !r.location
  check(ok, `404/403  ${path}`, `got ${r.status}${r.location ? " -> " + r.location : ""}`)
}

if (fails.length) {
  console.log(`\n${fails.length} FAILED:\n${fails.join("\n")}`)
  process.exit(1)
}
console.log(`\nPASS: ${pages.length + installers.length + 1} addresses 200, ${Object.keys(redirects).length} redirects kept, ${unknown.length} wrong addresses 404, ${probes.length} probes 404/403`)
