import ffmpeg from "fluent-ffmpeg"
import ffmpegPath from "ffmpeg-static"
import ffprobePath from "ffprobe-static"
import fs from "fs"
import { spawn } from "child_process"
import { analyzeTrack } from "./analyze.js"

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath)
}
if (ffprobePath?.path) {
  ffmpeg.setFfprobePath(ffprobePath.path)
}

const mastersDir = "/tmp/masters"
if (!fs.existsSync(mastersDir)) {
  fs.mkdirSync(mastersDir, { recursive: true })
}

/** Wait until the mastered file exists, is non-empty, and size is stable (ffmpeg flush). */
async function waitForMasterOutputReady(filePath) {
  let stable = 0
  let lastSize = -1
  for (let i = 0; i < 120; i++) {
    if (!fs.existsSync(filePath)) {
      await new Promise((r) => setTimeout(r, 25))
      continue
    }
    const sz = fs.statSync(filePath).size
    if (sz <= 0) {
      await new Promise((r) => setTimeout(r, 25))
      continue
    }
    if (sz === lastSize) {
      stable++
      if (stable >= 2) {
        await new Promise((r) => setTimeout(r, 90))
        const sz2 = fs.statSync(filePath).size
        if (sz2 === sz) return sz2
        stable = 0
      }
    } else {
      stable = 0
    }
    lastSize = sz
    await new Promise((r) => setTimeout(r, 20))
  }
  return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0
}

export async function masterTrack({
  file,
  output,
  reference,
  style,
  targetLufs,
  mode,
}) {
  if (!file) throw new Error("File missing")

  if (!style) style = "STREAM"
  if (!mode) mode = "normal"

  let referenceAnalysis = null
  if (reference) {
    const refPath = reference
    referenceAnalysis = await analyzeTrack(refPath)
  }

  if (!reference) {
    if (style === "STREAM") targetLufs = -14
    if (style === "CLUB") targetLufs = -11
    if (style === "LOUD") targetLufs = -10
    if (style === "WARM") targetLufs = -13
    if (style === "FESTIVAL") targetLufs = -9
  }

  if (referenceAnalysis?.lufs) {
    targetLufs = referenceAnalysis.lufs
  }

  targetLufs = parseFloat(targetLufs || -14)

  const input = file
  const outputPath = output

  if (!outputPath) {
    throw new Error("❌ Output path missing")
  }

  if (!fs.existsSync(input)) {
    throw new Error("Input file not found")
  }

  const probeResult = await new Promise((resolve) => {
    ffmpeg.ffprobe(file, (err, data) => {
      resolve({ err, data })
    })
  })

  if (probeResult?.err) {
    throw new Error(`ffprobe failed: ${probeResult.err.message || probeResult.err}`)
  }

  let stagingDb = 0
  let preAnalysis = null
  try {
    preAnalysis = await analyzeTrack(input)
    const raw = typeof preAnalysis.lufs === "number" ? preAnalysis.lufs : -18
    const stagingTarget = -15
    stagingDb = stagingTarget - raw
    stagingDb = Math.max(-12, Math.min(6, stagingDb))
  } catch {
    /* staging optional */
  }

  const safeIntegratedLufs = Math.min(targetLufs, -9)

  const tone =
    style === "WARM"
      ? {
          lowHz: 72,
          lowGain: 1.12,
          mudGain: -1.15,
          mudWideGain: -0.45,
          airHz: 12500,
          airGain: 0.16,
          dipAboveAirHz: 15500,
          dipAboveAirGain: -0.35,
        }
      : style === "LOUD" || style === "FESTIVAL"
        ? {
            lowHz: 82,
            lowGain: 1.02,
            mudGain: -1.25,
            mudWideGain: -0.5,
            airHz: 13000,
            airGain: 0.18,
            dipAboveAirHz: 15500,
            dipAboveAirGain: -0.45,
          }
        : {
            lowHz: 78,
            lowGain: 1.06,
            mudGain: -1.12,
            mudWideGain: -0.4,
            airHz: 13000,
            airGain: 0.2,
            dipAboveAirHz: 15500,
            dipAboveAirGain: -0.38,
          }

  const volumeStaging =
    stagingDb === 0 ? "" : `volume=${stagingDb.toFixed(2)}dB,`

  const audioFilter =
    `highpass=f=25,` +
    volumeStaging +
    `equalizer=f=200:t=q:w=1:g=${tone.mudGain},` +
    `equalizer=f=320:t=q:w=1:g=${tone.mudWideGain},` +
    `equalizer=f=${tone.lowHz}:t=q:w=0.92:g=${tone.lowGain},` +
    `equalizer=f=9800:t=q:w=1:g=0.32,` +
    `acompressor=threshold=-18dB:ratio=1.55:attack=30:release=240,` +
    `equalizer=f=${tone.airHz}:t=q:w=1.15:g=${tone.airGain},` +
    `equalizer=f=${tone.dipAboveAirHz}:t=q:w=1:g=${tone.dipAboveAirGain},` +
    `loudnorm=I=${safeIntegratedLufs}:LRA=10:TP=-1:linear=true`

  await new Promise((resolve, reject) => {
    let settled = false
    let cmdRef = null

    const timeoutId = setTimeout(() => {
      if (settled) return
      settled = true
      try {
        cmdRef?.kill("SIGKILL")
      } catch {
        /* ignore */
      }
      reject(new Error("Mastering timed out"))
    }, 60_000)

    try {
      fs.chmodSync(ffmpegPath, 0o755)
    } catch {
      /* ignore */
    }

    const args = [
      "-y",
      "-i",
      file,
      "-vn",
      "-ar",
      "44100",
      "-ac",
      "2",
      "-c:a",
      "pcm_s16le",
      "-f",
      "wav",
      "-af",
      audioFilter,
      outputPath,
    ]

    const ff = spawn(ffmpegPath, args, { shell: false })
    cmdRef = ff

    ff.on("close", (code) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)

      if (code === 0) {
        resolve()
      } else {
        reject(new Error("ffmpeg failed"))
      }
    })

    ff.on("error", (err) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      console.error("[master] ffmpeg spawn error:", err?.message || err)
      reject(err)
    })
  })

  await waitForMasterOutputReady(outputPath)

  let analysisBefore = preAnalysis
  if (!analysisBefore) {
    try {
      analysisBefore = await analyzeTrack(input)
    } catch {
      analysisBefore = null
    }
  }

  let analysisAfter = null
  const delays = [0, 200, 450]
  for (let attempt = 0; attempt < delays.length && !analysisAfter; attempt++) {
    try {
      if (delays[attempt] > 0) await new Promise((r) => setTimeout(r, delays[attempt]))
      analysisAfter = await analyzeTrack(outputPath)
    } catch {
      /* retry */
    }
  }

  return {
    path: outputPath,
    analysisBefore,
    analysisAfter,
  }
}
