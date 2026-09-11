import { chromium } from "playwright"

const BASE = process.env.BASE_URL || "http://localhost:3100"
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

const CDP_URL = process.env.CDP_URL || ""

const SCENARIOS = [
  { name: "normal", qs: "" },
  { name: "disableAssistant", qs: "?disableAssistant=true" },
  { name: "disableOrbAnimations", qs: "?disableOrbAnimations=true" },
  { name: "disableWaveforms", qs: "?disableWaveforms=true" },
]

const PAGES = [
  { key: "homepage", path: "/landing" },
  { key: "analyze", path: "/analyze" },
  { key: "master", path: "/master/processing" },
  { key: "results", path: "/master/result" },
]

function round(n) {
  return Math.round(n * 100) / 100
}

async function getMetricsDelta(cdp, fn) {
  const before = await cdp.send("Performance.getMetrics")
  await fn()
  const after = await cdp.send("Performance.getMetrics")
  const map = (m) => Object.fromEntries(m.metrics.map((x) => [x.name, x.value]))
  const b = map(before)
  const a = map(after)
  const pick = [
    "TaskDuration",
    "ScriptDuration",
    "LayoutDuration",
    "RecalcStyleDuration",
    "JSHeapUsedSize",
    "Nodes",
  ]
  return Object.fromEntries(pick.map((k) => [k, round((a[k] ?? 0) - (b[k] ?? 0))]))
}

async function rafFpsEstimate(page, ms) {
  return await page.evaluate(async (durationMs) => {
    const t0 = performance.now()
    let frames = 0
    await new Promise((resolve) => {
      const tick = () => {
        frames++
        if (performance.now() - t0 >= durationMs) return resolve()
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    const elapsed = performance.now() - t0
    return { frames, elapsedMs: elapsed, fps: (frames / elapsed) * 1000 }
  }, ms)
}

async function scrollSweep(page, ms = 2500) {
  await page.evaluate(async (durationMs) => {
    const startY = window.scrollY
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    const t0 = performance.now()
    await new Promise((resolve) => {
      const tick = () => {
        const t = (performance.now() - t0) / durationMs
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        const y = startY + (maxY - startY) * eased
        window.scrollTo(0, y)
        if (t >= 1) return resolve()
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    window.scrollTo(0, startY)
  }, ms)
}

async function runOnce() {
  const browser = CDP_URL
    ? await chromium.connectOverCDP(CDP_URL)
    : await chromium.launch({
        executablePath: CHROME,
        headless: true,
        args: ["--disable-dev-shm-usage", "--no-sandbox"],
      })
  const context = await browser.newContext()

  const out = { baseUrl: BASE, pages: {} }

  for (const scenario of SCENARIOS) {
    out.pages[scenario.name] = {}
    for (const p of PAGES) {
      const page = await context.newPage()
      const requests = []
      page.on("requestfinished", (req) => {
        const url = req.url()
        if (url.startsWith(BASE)) {
          requests.push({ url, method: req.method(), resourceType: req.resourceType() })
        }
      })

      const cdp = await context.newCDPSession(page)
      await cdp.send("Performance.enable")

      const url = `${BASE}${p.path}${scenario.qs}`
      await page.goto(url, { waitUntil: "networkidle", timeout: 120000 })
      await page.waitForTimeout(600)

      const idleFps = await rafFpsEstimate(page, 1500)
      const idleMetrics = await getMetricsDelta(cdp, async () => page.waitForTimeout(1500))

      const scrollMetrics = await getMetricsDelta(cdp, async () => scrollSweep(page, 2600))
      const scrollFps = await rafFpsEstimate(page, 1500)

      out.pages[scenario.name][p.key] = {
        url,
        requestCount: requests.length,
        requestTypes: requests.reduce((acc, r) => {
          acc[r.resourceType] = (acc[r.resourceType] || 0) + 1
          return acc
        }, {}),
        fpsEstimateIdle: round(idleFps.fps),
        fpsEstimateAfterScroll: round(scrollFps.fps),
        metricsIdleDelta: idleMetrics,
        metricsScrollDelta: scrollMetrics,
      }

      await page.close()
    }
  }

  await context.close()
  await browser.close()
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`)
}

runOnce().catch((err) => {
  console.error(err)
  process.exit(1)
})

