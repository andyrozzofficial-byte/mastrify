#!/usr/bin/env node
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const DIST = path.join(ROOT, "mastrify-site/dist-v2")
const PUBLIC = path.join(ROOT, "public")
const LINUS = path.join(PUBLIC, "linus")

const ROUTE_DIRS = [
  "analyze",
  "master",
  "pricing",
  "how-it-works",
  "about",
  "blog",
  "contact",
  "privacy",
  "terms",
]

const EXCLUDE_ROOT = new Set([
  "robots.txt",
  "sitemap.xml",
  "backend.example.js",
  "backend.mock.js",
  "index.html",
  "404.html",
])

function rmrf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function copyFile(src, dest) {
  mkdirp(path.dirname(dest))
  fs.copyFileSync(src, dest)
}

function copyDir(src, dest) {
  mkdirp(dest)
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name)
    const to = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(from, to)
    } else {
      fs.copyFileSync(from, to)
    }
  }
}

if (!fs.existsSync(DIST)) {
  console.error(`sync-dist-v2: missing ${DIST} (run mastrify-site build first)`)
  process.exit(1)
}

rmrf(LINUS)
mkdirp(LINUS)
copyFile(path.join(DIST, "index.html"), path.join(LINUS, "index.html"))

for (const route of ROUTE_DIRS) {
  const src = path.join(DIST, route, "index.html")
  if (!fs.existsSync(src)) {
    console.error(`sync-dist-v2: missing ${src}`)
    process.exit(1)
  }
  copyFile(src, path.join(LINUS, route, "index.html"))
}

for (const entry of fs.readdirSync(DIST, { withFileTypes: true })) {
  const name = entry.name

  if (entry.isDirectory()) {
    if (ROUTE_DIRS.includes(name)) continue
    if (name === "assets") {
      copyDir(path.join(DIST, "assets"), path.join(PUBLIC, "assets"))
    }
    continue
  }

  if (EXCLUDE_ROOT.has(name)) continue
  if (name.endsWith(".html")) continue
  if (name.endsWith(".map")) continue

  copyFile(path.join(DIST, name), path.join(PUBLIC, name))
}

console.log("sync-dist-v2: synced dist-v2 → public/linus + public root assets")
