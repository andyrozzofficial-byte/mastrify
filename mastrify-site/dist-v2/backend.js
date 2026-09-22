/* Mastrify live backend adapter (Fas 0.4 analyze · Fas 0.5 master · Fas 0.6 quote/checkout).
 *
 * Thin bridge between Linus dist-v2 UI and the existing Mastrify stack.
 * Does NOT replace or modify server/, mastering, Stripe, email, or Next.js APIs.
 *
 * Wiring target (unchanged production):
 *   Railway  POST /upload, POST /master, POST /master/deliver
 *   Next.js  POST /api/discount/validate, POST /api/discount/redeem
 *            POST /api/checkout/session, GET /api/checkout/verify
 *
 * See mastrify-site/BACKEND-CONTRACT.md and Fas 0 integration plan.
 * Run `npm run build` in mastrify-site/ after editing this file.
 */
(() => {
  "use strict"

  /** @typedef {'analyze'|'master'} ProcessKind */
  /** @typedef {{style:string,target:number,width:number,low:number,clarity:number}} StudioSettings */
  /** @typedef {{objectKey:string,trackTitle:string,previewUrl:string,expiresAt:string|null,file:File|null,stripeSessionId:string,freeOrderId:string}} SessionRecord */

  const RAILWAY_API = "https://mastrify-backend-production.up.railway.app"
  const MASTER_PRICE_USD = 9
  const UPLOAD_PROGRESS = 0.15
  /** Railway masterPreview.js — 30 s clip from 60 s in the mastered file. */
  const RAILWAY_PREVIEW_START = 60
  const RAILWAY_PREVIEW_DURATION = 30

  /** Linus studio labels → existing Railway stylePreset values (server/master.js). */
  const STYLE_TO_PRESET = {
    Balanced: "STREAM",
    Warm: "WARM",
    Punchy: "LOUD",
    Club: "CLUB",
    Open: "FESTIVAL",
  }

  /** resultId → session metadata for checkout / verify / download / email (Fas 0.6+). */
  const sessions = new Map()
  /** Same File → last Railway /upload JSON (analyze then master without re-upload). */
  const uploadCache = new Map()

  const config = () => window.MastrifyConfig || {}
  const copy = () => window.MastrifyCopy || null
  const strings = () => (copy() && copy().STRINGS) || {}
  const cancelled = () => new DOMException("Operation cancelled", "AbortError")

  function assertNotAborted(signal) {
    if (signal?.aborted) throw cancelled()
  }

  function notImplemented(phase, detail) {
    return new Error(`Adapter skeleton (${phase}): ${detail}`)
  }

  function railwayUrl(path) {
    const p = path.startsWith("/") ? path : `/${path}`
    return `${RAILWAY_API}${p}`
  }

  function apiUrl(path) {
    const p = path.startsWith("/") ? path : `/${path}`
    return p
  }

  async function postJson(path, body, signal) {
    assertNotAborted(signal)
    const response = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    })
    assertNotAborted(signal)
    const text = await response.text()
    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch (_) {}
    return { response, data }
  }

  function requireCheckoutSession(resultId) {
    const session = getSession(resultId)
    if (!session?.objectKey) {
      throw new Error(strings().checkoutFailed || "Could not start checkout. Please try again.")
    }
    return session
  }

  function quoteFromValidate(data, fallbackCode) {
    const finalCents = Number(data.finalCents)
    const free = Boolean(data.isFree)
    const code = (typeof data.code === "string" && data.code) || fallbackCode
    const pct = Number(data.percentOff) || 0
    const label = free
      ? "Free code applied · $0.00"
      : pct > 0
        ? `Code applied · ${pct}% off`
        : data.finalLabel
          ? `Code applied · ${data.finalLabel}`
          : "Code applied"
    return {
      amount: free ? 0 : (Number.isFinite(finalCents) ? finalCents : MASTER_PRICE_USD * 100) / 100,
      currency: "USD",
      free,
      code,
      label,
    }
  }

  function receiptFromPayment({ id, resultId, amount, free, code }) {
    const value = free ? 0 : Number.isFinite(amount) ? amount : MASTER_PRICE_USD
    return {
      id: id || uuid(),
      resultId,
      test: false,
      amount: value,
      currency: "USD",
      charged: value,
      free: !!free,
      code: code || "",
    }
  }

  function stylePresetFromSettings(settings) {
    const style = settings && settings.style
    return STYLE_TO_PRESET[style] || STYLE_TO_PRESET.Balanced
  }

  function targetLufsFromSettings(settings) {
    const t = Number(settings && settings.target)
    return Number.isFinite(t) ? t : -14
  }

  function saveSession(resultId, record) {
    sessions.set(resultId, record)
  }

  function getSession(resultId) {
    return sessions.get(resultId) || null
  }

  /** @param {SessionRecord} partial */
  function mergeSession(resultId, partial) {
    const prev = getSession(resultId) || {}
    const next = { ...prev, ...partial }
    saveSession(resultId, next)
    return next
  }

  function uuid() {
    const source = typeof crypto !== "undefined" ? crypto : null
    if (source && typeof source.randomUUID === "function") return source.randomUUID()
    const bytes = new Uint8Array(16)
    if (source && typeof source.getRandomValues === "function") source.getRandomValues(bytes)
    else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  function fileKey(file) {
    return `${file.name}:${file.size}:${file.lastModified}`
  }

  function num(...values) {
    for (const value of values) {
      const n = Number(value)
      if (Number.isFinite(n)) return n
    }
    return NaN
  }

  /** Railway serves a 30 s clip from 60 s; Linus requires sourceStart + duration <= sourceDuration. */
  function resolvePreviewMetadata(previewWindow) {
    const sourceDuration = Math.max(0, num(previewWindow.sourceDuration, previewWindow.end, 0))
    const longTrackMin = RAILWAY_PREVIEW_START + RAILWAY_PREVIEW_DURATION

    if (sourceDuration >= longTrackMin - 0.01) {
      return {
        sourceStart: RAILWAY_PREVIEW_START,
        duration: RAILWAY_PREVIEW_DURATION,
        sourceDuration,
        cueTime: Number.isFinite(previewWindow.cueTime) ? previewWindow.cueTime : RAILWAY_PREVIEW_START,
        method: previewWindow.method || "energy",
      }
    }

    let start = Number.isFinite(previewWindow.start) ? previewWindow.start : 0
    start = Math.max(0, Math.min(start, sourceDuration))

    let duration = num(previewWindow.duration, 0)
    if (!(duration > 0) && Number.isFinite(previewWindow.end)) {
      duration = previewWindow.end - (Number.isFinite(previewWindow.start) ? previewWindow.start : 0)
    }
    if (!(duration > 0) && sourceDuration > 0 && sourceDuration <= 40) {
      start = 0
      duration = sourceDuration
    }
    if (!(duration > 0) && sourceDuration > 0) {
      duration = Math.min(40, sourceDuration - start)
    }

    duration = Math.min(Math.max(0, duration), 40)
    if (sourceDuration > 0) duration = Math.min(duration, Math.max(0, sourceDuration - start))

    const method =
      sourceDuration <= 40 && start === 0 && duration >= sourceDuration - 0.01
        ? "short-track"
        : previewWindow.method || "energy"

    return {
      sourceStart: start,
      duration,
      sourceDuration: sourceDuration > 0 ? sourceDuration : duration,
      cueTime: Number.isFinite(previewWindow.cueTime) ? previewWindow.cueTime : start,
      method,
    }
  }

  function isSafariBrowser() {
    if (typeof navigator === "undefined") return false
    const ua = navigator.userAgent || ""
    const isWebKit = /WebKit/i.test(ua)
    const isNonSafari = /Chrome|Chromium|CriOS|Edg|OPR|FxiOS/i.test(ua)
    return isWebKit && !isNonSafari
  }

  function phasesForKind(kind) {
    const rows = copy()?.PHASES?.[kind === "analyze" ? "analyze" : "master"]
    if (Array.isArray(rows) && rows.length) return rows.map((row) => row[0])
    return kind === "analyze"
      ? ["Reading dynamics", "Mapping stereo field", "Listening to tonal balance", "Evaluating loudness", "Tracing transient energy", "Building your mix portrait"]
      : ["Listening to your mix", "Balancing tone", "Shaping dynamics", "Refining stereo space", "Finishing your master"]
  }

  function phaseAt(progress, kind) {
    const phases = phasesForKind(kind)
    const index = Math.min(phases.length - 1, Math.floor(Math.max(0, Math.min(1, progress)) * phases.length))
    return phases[index]
  }

  function absoluteRailwayUrl(urlOrPath) {
    if (!urlOrPath) return ""
    const value = String(urlOrPath)
    if (/^https?:\/\//i.test(value)) return value
    return railwayUrl(value.startsWith("/") ? value : `/${value}`)
  }

  function normalizeSettings(settings) {
    const style = settings && settings.style
    const styles = copy()?.STYLES || []
    const allowed = styles.map((s) => s.id)
    return {
      style: allowed.includes(style) ? style : "Balanced",
      target: [-14, -13, -11, -9].includes(Number(settings?.target)) ? Number(settings.target) : -14,
      width: Math.max(0, Math.min(100, Math.round(Number(settings?.width) || 50))),
      low: Math.max(0, Math.min(100, Math.round(Number(settings?.low) || 50))),
      clarity: Math.max(0, Math.min(100, Math.round(Number(settings?.clarity) || 50))),
    }
  }

  const fmt = (v) => (Number.isFinite(v) ? (v < 0 ? "−" : "") + Math.abs(v).toFixed(1) : "—")
  const lufsText = (v) => (Number.isFinite(v) ? `≈ ${fmt(v)} LUFS` : "—")
  const pctOf = (v) => `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`

  function normaliseProfile(profile) {
    const p = profile || {}
    return {
      loudness: Number.isFinite(p.loudness) ? p.loudness : -18,
      crest: Number.isFinite(p.crest) ? p.crest : 10,
      range: Number.isFinite(p.range) ? p.range : 8,
      width: Number.isFinite(p.width) ? p.width : 0.4,
      widthSpread: Number(p.widthSpread) || 0,
      bassShare: Number.isFinite(p.bassShare) ? p.bassShare : 0.45,
      midShare: Number.isFinite(p.midShare) ? p.midShare : 0.4,
      airShare: Number.isFinite(p.airShare) ? p.airShare : 0.15,
      bassSpread: Number(p.bassSpread) || 0,
      accent: Number(p.accent) || 0,
      movement: Number(p.movement) || 0,
      channels: Number(p.channels) || 2,
      measured: !!profile,
    }
  }

  function describeProfile(p) {
    const C = copy()
    const loud =
      p.loudness > -9
        ? ["Hot", "Very little headroom is left; mastering will focus on tone and control rather than level."]
        : p.loudness > -14
          ? ["Release level", "Already close to streaming level, so the master can stay transparent."]
          : p.loudness > -20
            ? ["Controlled", "Headroom is healthy, with room to lift level in mastering without crushing dynamics."]
            : ["Quiet", "Plenty of headroom. The master can bring the whole song up without strain."]
    const dyn =
      p.crest < 7
        ? ["Dense", "The level barely moves. A gentle touch keeps it from feeling flat."]
        : p.range < 4
          ? ["Consistent", "The level stays even across the arrangement, with transients intact."]
          : p.range < 8
            ? ["Glued", "Tight and consistent, with peaks under control."]
            : p.range < 14
              ? ["Open", "Big swings between loud and soft. A touch more glue could feel more release-ready."]
              : ["Very open", "Wide swings between sections. Some glue will help small speakers."]
    const ste =
      p.channels < 2
        ? ["Mono", "A single channel. Width will not change in mastering."]
        : p.width < 0.18
          ? ["Narrow", "The image sits close to the center; pads and effects could use more room."]
          : p.width < 0.3
            ? ["Focused", "A tight, centered image with a little space at the sides."]
            : p.width < 0.5
              ? ["Balanced", "A stable center with room at the sides."]
              : ["Wide", "The stereo field feels open and spacious, with good depth for streaming and clubs."]
    const low =
      p.bassShare < 0.25
        ? ["Light", "The foundation could carry more weight."]
        : p.bassShare < 0.72
          ? ["Balanced", "Low end feels controlled and supportive, a solid anchor for the rest of the mix."]
          : ["Heavy", "The low end leads the mix; keep it controlled so it stays clean."]
    const tone =
      p.airShare > 0.18
        ? ["Bright", "Lots of top-end energy. Keep an eye on harshness."]
        : p.airShare < 0.025
          ? ["Dark", "The top end is soft; a little air could open it up."]
          : p.bassShare > 0.6
            ? ["Warm", "Weight below, gentle above. A little air could open the top end."]
            : ["Even", "Lows, mids and highs sit in a natural balance."]
    const energy = (C?.ENERGY?.levels || []).find((level) => {
      try {
        return level.when(p)
      } catch (_) {
        return false
      }
    }) || { id: "Steady", text: "Energy feels even and controlled across the arrangement.", level: "Medium energy" }
    const pres =
      p.midShare < 0.2
        ? ["Soft", "Vocals and leads sit slightly behind the mix."]
        : p.midShare < 0.5
          ? ["Clear", "The lead elements have space to speak."]
          : ["Forward", "Mids lead the mix; detail is upfront."]
    const high =
      p.airShare > 0.2
        ? ["Edgy", "Top end could feel silkier and less edgy."]
        : p.airShare > 0.05
          ? ["Smooth", "Keep the sheen gentle and natural."]
          : ["Soft", "Top end could use more air and presence."]
    return [
      { label: "Loudness", value: loud[0], description: loud[1], detail: lufsText(p.loudness) },
      { label: "Dynamics", value: dyn[0], description: dyn[1], detail: `${fmt(p.range)} dB range` },
      { label: "Stereo", value: ste[0], description: ste[1], detail: p.channels < 2 ? "Mono" : `${pctOf(p.width)} width` },
      { label: "Low end", value: low[0], description: low[1], detail: pctOf(p.bassShare) },
      { label: "Tone", value: tone[0], description: tone[1], detail: tone[0] },
      { label: "Energy", value: energy.id, description: energy.text, detail: energy.level, explanation: C?.ENERGY?.description },
      { label: "Presence", value: pres[0], description: pres[1], detail: pres[0] },
      { label: "Highs", value: high[0], description: high[1], detail: high[0] },
    ]
  }

  function buildAnalysis(profile, readinessOverride) {
    const C = copy()
    const p = normaliseProfile(profile)
    const metrics = describeProfile(p)
    let issues = (C?.ISSUES || []).filter((issue) => {
      try {
        return issue.when(p)
      } catch (_) {
        return false
      }
    })
    const seen = new Set()
    issues = issues.filter((issue) => (seen.has(issue.metric) ? false : (seen.add(issue.metric), true)))
    issues.sort((a, b) => b.gain - a.gain)
    issues = issues.slice(0, 4)
    const insights = issues.map((issue, index) => ({
      title: issue.title,
      subtitle: issue.subtitle,
      text: issue.advice,
      metric: issue.metric,
      severity: index === 0 ? "main" : index === 1 ? "medium" : "low",
      gain: issue.gain,
      tips: issue.tips,
    }))
    let readiness =
      Number.isFinite(readinessOverride) && readinessOverride >= 0
        ? Math.round(readinessOverride)
        : 92 - issues.reduce((sum, issue) => sum + issue.gain, 0) - (p.loudness < -22 ? 4 : 0)
    readiness = Math.max(0, Math.min(100, Math.round(readiness)))
    const tier = (C?.READINESS || []).find((t) => readiness >= t.min) || {
      headline: "A strong foundation, with room for a final polish.",
      recommendation: "",
      focus: "",
    }
    const good = metrics.filter((m) =>
      ["Release level", "Controlled", "Consistent", "Glued", "Open", "Balanced", "Wide", "Even", "Warm", "Clear", "Smooth", "Punchy", "Steady", "Driven"].includes(m.value),
    )
    const highlights = []
    for (const m of good) {
      if (m.label === "Stereo") highlights.push("Stereo width feels open enough for a modern, release-ready master.")
      else if (m.label === "Dynamics") {
        highlights.push(m.value === "Open" ? "Dynamics have room to breathe. Light bus glue can make the drop hit harder." : "Dynamics are consistent and controlled.")
      } else if (m.label === "Loudness") highlights.push(`Integrated loudness sits around ${fmt(p.loudness)} LUFS, a solid starting point for mastering.`)
      else if (m.label === "Low end") highlights.push("The low end is controlled and supportive.")
      else if (m.label === "Tone") highlights.push("Tonal balance is even across lows, mids and highs.")
      if (highlights.length >= 3) break
    }
    if (!highlights.length) highlights.push(`Integrated loudness sits around ${fmt(p.loudness)} LUFS.`)
    const tipKey = (insights.find((i) => i.tips) || {}).tips
    const tips = tipKey && C ? C.TIPS[tipKey] : null
    return {
      readiness,
      summary: tier.headline,
      recommendation: tier.recommendation,
      focus: tier.focus,
      highlights,
      metrics,
      insights,
      tips,
      measured: p.measured,
      profile: {
        loudness: p.loudness,
        range: p.range,
        width: p.width,
        channels: p.channels,
        bassShare: p.bassShare,
        midShare: p.midShare,
        airShare: p.airShare,
        accent: p.accent,
      },
    }
  }

  function profileFromMasterAnalysis(analysis) {
    if (!analysis || typeof analysis !== "object") return null
    return profileFromRailway({
      lufs: analysis.lufs,
      dynamicRange: analysis.dynamicRange,
      stereoWidth: analysis.stereoWidth,
      bassWeight: analysis.bassWeight,
      brightness: analysis.brightness,
      energy: analysis.energy,
    })
  }

  function buildMasterComparison(settings, beforeProfile, afterProfile, afterRaw) {
    const C = copy()
    const before = normaliseProfile(beforeProfile)
    const after = normaliseProfile(afterProfile || beforeProfile)
    const bm = describeProfile(before)
    const by = (label) => bm.find((m) => m.label === label) || {}
    const target = Number(settings.target)
    const wide = Number(settings.width) > 60
    const tight = Number(settings.low) <= 40
    const bright = Number(settings.clarity) > 60
    const u = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0))
    const afterLufs = num(afterRaw?.lufs, afterRaw?.targetLufsApplied, target)
    const targetLabel = C ? C.target(target).profile : `${target} LUFS`
    const drB = before.range
    const drA = after.range
    return [
      {
        label: "Loudness",
        family: "level",
        before: lufsText(before.loudness),
        after: targetLabel,
        afterDetail: lufsText(afterLufs),
        pos: { before: u((before.loudness + 26) / 20), after: u((afterLufs + 26) / 20) },
      },
      {
        label: "Dynamics",
        family: "level",
        before: by("Dynamics").value,
        beforeDetail: by("Dynamics").detail,
        after: drA < 4 ? "Preserved" : "Punch preserved",
        afterDetail: drA < 4 ? "Minimal touch" : `≈ ${fmt(drA)} dB`,
        pos: { before: u(drB / 20), after: u(drA / 20) },
      },
      {
        label: "Stereo image",
        family: "space",
        before: by("Stereo").value,
        beforeDetail: by("Stereo").detail,
        after: after.channels < 2 ? "Mono" : wide ? "Open & spacious" : "Focused",
        pos: {
          before: u(before.channels < 2 ? 0 : before.width),
          after: u(after.channels < 2 ? 0 : wide ? Math.min(1, after.width + 0.18) : Math.max(0.3, after.width)),
        },
      },
      {
        label: "Low end",
        family: "space",
        before: by("Low end").value,
        after: tight ? "Tight low-end" : settings.style === "Club" ? "Full lows" : "Grounded",
        pos: {
          before: u(before.bassShare),
          after: u(tight ? after.bassShare * 0.85 : settings.style === "Club" ? after.bassShare + 0.1 : after.bassShare + 0.03),
        },
      },
      {
        label: "Presence",
        family: "drive",
        before: by("Presence").value,
        after: bright ? "Clear" : "Natural detail",
        pos: { before: u(before.midShare / 0.7), after: u((bright ? after.midShare + 0.08 : after.midShare + 0.03) / 0.7) },
      },
    ]
  }

  function profileFromRailway(data) {
    const lufs = num(data.lufs, data.analysis?.lufs, -18)
    const range = num(data.dynamicRange, data.analysis?.dynamicRange, 8)
    const width = num(data.stereoWidth, data.analysis?.stereoWidth, 0.4)
    const bassShare = num(data.bassWeight, 0.45)
    const airShare = num(data.brightness, 0.15)
    const rawEnergy = data.energy ?? data.analysis?.energy
    const accent =
      typeof rawEnergy === "string"
        ? { high: 0.28, medium: 0.16, low: 0.07 }[rawEnergy] ?? 0.16
        : num(rawEnergy, 0.5) * 0.35
    const movement =
      typeof rawEnergy === "string"
        ? { high: 0.35, medium: 0.15, low: 0.08 }[rawEnergy] ?? 0.15
        : accent * 1.1
    return {
      loudness: lufs,
      crest: range,
      range,
      width,
      widthSpread: 0,
      bassShare,
      midShare: Math.max(0.15, Math.min(0.55, 0.85 - bassShare - airShare)),
      airShare,
      bassSpread: 0,
      accent,
      movement,
      channels: width < 0.02 ? 1 : 2,
      measured: true,
    }
  }

  function parseJsonError(responseText, status, network, kind) {
    const s = strings()
    let detail = ""
    try {
      const body = JSON.parse(responseText)
      if (body && typeof body.error === "string") detail = body.error
    } catch (_) {}
    if (kind === "master") {
      if (status === 0 || network) throw new Error(s.masterFailedNetwork || "Mastering failed. Check your connection.")
      throw new Error(detail || s.masterFailed || "Mastering failed. Please try again.")
    }
    if (status === 0 || network) throw new Error(s.analysisFailedNetwork || "Analysis failed. Check your connection.")
    if (status >= 400 && status < 500) throw new Error(detail || s.uploadFailed || "Upload failed")
    throw new Error(detail || s.analysisFailed || "Analysis failed. Please try again.")
  }

  async function fetchBlob(url, signal) {
    assertNotAborted(signal)
    const response = await fetch(absoluteRailwayUrl(url), { signal })
    if (signal?.aborted) throw cancelled()
    if (!response.ok) {
      throw new Error(strings().masterFailed || "Mastering failed. Please try again.")
    }
    return response.blob()
  }

  function postFormData(url, formData, signal, onProgress, kind) {
    if (isSafariBrowser()) return postFormDataFetch(url, formData, signal, onProgress, kind)
    return postFormDataXhr(url, formData, signal, onProgress, kind)
  }

  function postFormDataXhr(url, formData, signal, onProgress, kind) {
    return new Promise((resolve, reject) => {
      assertNotAborted(signal)
      const xhr = new XMLHttpRequest()
      const totalSec = config().processingSeconds?.[kind] ?? 30
      let uploadDone = false
      let started = performance.now()
      let paceTimer = null
      let lastProgress = 0

      const report = (progress, eta) => {
        const p = Math.max(lastProgress, Math.min(0.995, progress))
        lastProgress = p
        onProgress?.({ progress: p, phase: phaseAt(p, kind), eta })
      }

      const cleanup = () => {
        if (paceTimer) clearInterval(paceTimer)
        signal?.removeEventListener("abort", onAbort)
      }

      const onAbort = () => {
        xhr.abort()
        cleanup()
        reject(cancelled())
      }

      signal?.addEventListener("abort", onAbort, { once: true })

      xhr.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) return
        const p = (event.loaded / event.total) * UPLOAD_PROGRESS
        report(p, Math.max(0, totalSec * (1 - p)))
      })

      xhr.upload.addEventListener("loadend", () => {
        uploadDone = true
        started = performance.now()
      })

      paceTimer = setInterval(() => {
        if (signal?.aborted) return
        const elapsed = (performance.now() - started) / 1000
        const base = uploadDone ? UPLOAD_PROGRESS : 0
        const span = 1 - UPLOAD_PROGRESS
        const paced = base + Math.min(span * 0.92, (elapsed / totalSec) * span)
        report(paced, Math.max(0, totalSec - elapsed))
      }, 220)

      xhr.addEventListener("load", () => {
        cleanup()
        if (signal?.aborted) return reject(cancelled())
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText)
            report(0.96, 1)
            resolve(data)
          } catch (_) {
            reject(new Error(kind === "master" ? strings().masterFailed || "Mastering failed. Please try again." : strings().analysisNoData || "Analysis returned no data"))
          }
          return
        }
        try {
          parseJsonError(xhr.responseText, xhr.status, false, kind)
        } catch (err) {
          reject(err)
        }
      })

      xhr.addEventListener("error", () => {
        cleanup()
        reject(new Error(kind === "master" ? strings().masterFailedNetwork || "Mastering failed. Check your connection." : strings().analysisFailedNetwork || "Analysis failed. Check your connection."))
      })

      xhr.addEventListener("abort", () => {
        cleanup()
        reject(cancelled())
      })

      xhr.open("POST", url)
      xhr.send(formData)
    })
  }

  async function postFormDataFetch(url, formData, signal, onProgress, kind) {
    assertNotAborted(signal)
    const totalSec = config().processingSeconds?.[kind] ?? (kind === "master" ? 45 : 30)
    const started = performance.now()
    let lastProgress = 0
    const paceTimer = setInterval(() => {
      if (signal?.aborted) return
      const elapsed = (performance.now() - started) / 1000
      const p = Math.max(lastProgress, Math.min(0.995, elapsed / totalSec))
      lastProgress = p
      onProgress?.({ progress: p, phase: phaseAt(p, kind), eta: Math.max(0, totalSec - elapsed) })
    }, 220)

    try {
      const response = await fetch(url, { method: "POST", body: formData, signal })
      clearInterval(paceTimer)
      const text = await response.text()
      if (signal?.aborted) throw cancelled()
      if (!response.ok) parseJsonError(text, response.status, false, kind)
      let data
      try {
        data = JSON.parse(text)
      } catch (_) {
        throw new Error(kind === "master" ? strings().masterFailed || "Mastering failed. Please try again." : strings().analysisNoData || "Analysis returned no data")
      }
      onProgress?.({ progress: 0.96, phase: phaseAt(0.96, kind), eta: 1 })
      return data
    } catch (err) {
      clearInterval(paceTimer)
      if (signal?.aborted || err?.name === "AbortError") throw cancelled()
      if (err instanceof Error && /Analysis|Upload|Master|connection|data/i.test(err.message)) throw err
      throw new Error(kind === "master" ? strings().masterFailedNetwork || "Mastering failed. Check your connection." : strings().analysisFailedNetwork || "Analysis failed. Check your connection.")
    }
  }

  async function railwayUpload(file, signal, onProgress) {
    const key = fileKey(file)
    const cached = uploadCache.get(key)
    if (cached) {
      onProgress?.({ progress: 1, phase: phaseAt(1, "analyze"), eta: 0 })
      return cached
    }
    const formData = new FormData()
    formData.append("file", file)
    formData.append("mode", "mix")
    const data = await postFormData(railwayUrl("/upload"), formData, signal, onProgress, "analyze")
    if (!data || typeof data !== "object") {
      throw new Error(strings().analysisNoData || "Analysis returned no data")
    }
    uploadCache.set(key, data)
    return data
  }

  async function processAnalyze({ file, settings, signal, onProgress }) {
    if (!file?.size) throw new Error(strings().rejectUpload || "Choose an audio file first.")
    assertNotAborted(signal)
    onProgress?.({ progress: 0, phase: phaseAt(0, "analyze"), eta: config().processingSeconds?.analyze ?? 30 })

    const data = await railwayUpload(file, signal, onProgress)
    assertNotAborted(signal)

    const normalized = normalizeSettings(settings)
    const profile = profileFromRailway(data)
    const readiness = num(data.mixQuality, data.score)
    const analysis = buildAnalysis(profile, readiness)
    const resultId = uuid()
    const objectKey = typeof data.file === "string" ? data.file : ""

    mergeSession(resultId, {
      objectKey,
      trackTitle: file.name,
      previewUrl: "",
      expiresAt: null,
      file: null,
      stripeSessionId: "",
      freeOrderId: "",
    })

    onProgress?.({ progress: 1, phase: phaseAt(1, "analyze"), eta: 0 })

    return {
      id: resultId,
      kind: "analyze",
      demo: false,
      createdAt: new Date().toISOString(),
      name: file.name,
      settings: normalized,
      analysis,
    }
  }

  async function processMaster({ file, settings, previewWindow, signal, onProgress }) {
    if (!file?.size) throw new Error(strings().rejectUpload || "Choose an audio file first.")
    if (
      !previewWindow ||
      !(previewWindow.duration > 0) ||
      previewWindow.duration > 40 ||
      !Number.isFinite(previewWindow.start)
    ) {
      throw new Error(strings().masterFailed || "Mastering failed. Please try again.")
    }

    assertNotAborted(signal)
    const normalized = normalizeSettings(settings)
    onProgress?.({ progress: 0, phase: phaseAt(0, "master"), eta: config().processingSeconds?.master ?? 45 })

    const formData = new FormData()
    formData.append("file", file)
    formData.append("stylePreset", stylePresetFromSettings(normalized))
    formData.append("targetLufs", String(targetLufsFromSettings(normalized)))
    formData.append("stereoEnhance", String(normalized.width))
    formData.append("lowEndControl", String(normalized.low))
    formData.append("clarityPresence", String(normalized.clarity))
    formData.append("trackTitle", file.name)

    const data = await postFormData(railwayUrl("/master"), formData, signal, onProgress, "master")
    assertNotAborted(signal)

    if (!data || typeof data !== "object") {
      throw new Error(strings().masterFailed || "Mastering failed. Please try again.")
    }

    const previewUrl = data.previewAfterMp3Url || data.previewAfterMp3
    if (!previewUrl) {
      throw new Error(strings().masterFailed || "Mastering failed. Please try again.")
    }

    onProgress?.({ progress: 0.97, phase: phaseAt(0.97, "master"), eta: 1 })
    const previewAudio = await fetchBlob(previewUrl, signal)
    assertNotAborted(signal)

    const preview = {
      audio: previewAudio,
      ...resolvePreviewMetadata(previewWindow),
    }

    const beforeProfile = profileFromMasterAnalysis(data.analysisBefore)
    const afterProfile = profileFromMasterAnalysis(data.analysisAfter)
    const comparison = buildMasterComparison(normalized, beforeProfile, afterProfile, data.analysisAfter)
    const C = copy()
    const beforeNorm = normaliseProfile(beforeProfile)
    const masterName = C ? C.masterName(normalized) : "Smart Master"
    const tags = C ? C.masterTags(normalized, beforeNorm) : []
    const loudnessNotes = C ? C.loudnessNotes(normalized, beforeNorm) : []

    const objectKey =
      (typeof data.objectKey === "string" && data.objectKey) ||
      (typeof data.object_key === "string" && data.object_key) ||
      ""
    const expiresAt =
      (typeof data.expiresAt === "string" && data.expiresAt) ||
      (typeof data.expires_at === "string" && data.expires_at) ||
      null

    const resultId = uuid()
    mergeSession(resultId, {
      objectKey,
      trackTitle: file.name,
      previewUrl: absoluteRailwayUrl(previewUrl),
      expiresAt,
      file,
      stripeSessionId: "",
      freeOrderId: "",
      analysisBefore: data.analysisBefore || null,
      analysisAfter: data.analysisAfter || null,
      masteringInsights: data.masteringInsights || null,
    })

    onProgress?.({ progress: 1, phase: phaseAt(1, "master"), eta: 0 })

    return {
      id: resultId,
      kind: "master",
      demo: false,
      createdAt: new Date().toISOString(),
      name: file.name,
      settings: normalized,
      preview,
      masterName,
      tags,
      loudnessNotes,
      comparison,
    }
  }

  window.MastrifyBackend = {
    mode: "live",

    /**
     * Fas 0.4 — analyze: POST /upload (FormData: file, mode=mix)
     * Fas 0.5 — master:  POST /master (FormData: file, stylePreset, targetLufs, sliders, trackTitle)
     */
    async process({ kind, file, settings, previewWindow, signal, onProgress }) {
      assertNotAborted(signal)

      if (kind === "analyze") {
        return processAnalyze({ file, settings, signal, onProgress })
      }
      if (kind === "master") {
        return processMaster({ file, settings, previewWindow, signal, onProgress })
      }
      throw new Error(strings().analysisFailed || "Analysis failed. Please try again.")
    },

    async quote({ resultId, discountCode, signal }) {
      assertNotAborted(signal)
      void resultId
      const code = String(discountCode || "").trim()
      if (!code) {
        return { amount: MASTER_PRICE_USD, currency: "USD", free: false, code: "", label: "" }
      }
      const { response, data } = await postJson("/api/discount/validate", { code }, signal)
      if (!response.ok || !data?.valid) {
        throw new Error(data?.error || strings().invalidCode || "Invalid discount code.")
      }
      return quoteFromValidate(data, code.toUpperCase())
    },

    async checkout({ resultId, discountCode, signal }) {
      assertNotAborted(signal)
      const session = requireCheckoutSession(resultId)
      const code = String(discountCode || "").trim()

      if (code) {
        const validated = await postJson("/api/discount/validate", { code }, signal)
        if (!validated.response.ok || !validated.data?.valid) {
          throw new Error(validated.data?.error || strings().invalidCode || "Invalid discount code.")
        }
        if (validated.data.isFree) {
          const redeemed = await postJson(
            "/api/discount/redeem",
            { code: validated.data.code || code, objectKey: session.objectKey },
            signal,
          )
          if (!redeemed.response.ok || !redeemed.data?.ok || !redeemed.data?.freeOrderId) {
            throw new Error(redeemed.data?.error || strings().checkoutFailed || "Could not start checkout. Please try again.")
          }
          const normalized = validated.data.code || code.toUpperCase()
          mergeSession(resultId, { freeOrderId: redeemed.data.freeOrderId, stripeSessionId: "" })
          return receiptFromPayment({ id: redeemed.data.freeOrderId, resultId, amount: 0, free: true, code: normalized })
        }
      }

      const payload = {
        objectKey: session.objectKey,
        trackTitle: session.trackTitle || "",
        returnPath: "/master",
      }
      if (code) payload.promoCode = code

      const { response, data } = await postJson("/api/checkout/session", payload, signal)
      if (!response.ok || !data?.url) {
        if (data?.isFree) {
          throw new Error(
            data.error || "This code makes your master free. Apply the code, then continue without Stripe checkout.",
          )
        }
        throw new Error(data?.error || strings().checkoutFailed || "Could not start checkout. Please try again.")
      }

      mergeSession(resultId, {
        stripeSessionId: typeof data.sessionId === "string" ? data.sessionId : "",
        trackTitle: session.trackTitle,
        objectKey: session.objectKey,
      })
      return { redirect: data.url }
    },

    async verify({ resultId, query, signal }) {
      assertNotAborted(signal)
      void resultId
      void query
      throw notImplemented("0.6", "GET /api/checkout/verify not wired yet")
    },

    async download({ resultId, signal }) {
      assertNotAborted(signal)
      void resultId
      throw notImplemented("0.7", "full master download not wired yet")
    },

    async email({ resultId, email, signal }) {
      assertNotAborted(signal)
      void resultId
      void email
      throw notImplemented("0.7", "POST /master/deliver not wired yet")
    },
  }
})()
