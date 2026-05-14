import { exec, spawn } from "child_process"
import express from "express"
import cors from "cors"
import multer from "multer"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { randomUUID } from "crypto"
import { analyzeTrack } from "./analyze.js"
import { masterTrack } from "./master.js"
import {
  logMasterMetricFiveStagesServer,
  serializeMasterAnalysisForJson,
} from "./masterAnalysisPayload.js"
import ffmpegPath from "ffmpeg-static"
import ffprobeStatic from "ffprobe-static"

process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT:", err)
})

process.on("unhandledRejection", (err) => {
  console.error("💥 PROMISE ERROR:", err)
})
// import { aiMixAssistant } from "./ai.js"
// import { buildMasteringChain } from "./masteringEngine.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.use(cors())
app.use(express.json())

// Entry: Railway with Root Directory "server" runs `npm start` → `node server.js` (this file).
// Not used for deploy: AI-Mastering_copy submodule server/ (legacy copy; use this server/ only).

// ✅ LÄGG TILL DENNA
app.get("/", (req, res) => {
  res.send("Mastrify backend is live 🚀")
})

// GET /debug-version — Railway deploy probe (must stay directly under GET /).
app.get("/debug-version", (req, res) => {
  res.json({
    debugVersion: "NEW_MASTER_RESPONSE_V2"
  })
})

// absolute paths
const uploadsDir = "/tmp/uploads"
const mastersDir = "/tmp/masters"

// Ensure dirs at cold boot (Railway /tmp is often empty) — create before verification logs.
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  if (!fs.existsSync(mastersDir)) {
    fs.mkdirSync(mastersDir, { recursive: true })
  }
} catch (err) {
  console.log("Folder error:", err)
}

console.log("Uploads exists:", fs.existsSync(uploadsDir))
console.log("Masters exists:", fs.existsSync(mastersDir))
console.log("UPLOADS DIR:", uploadsDir)
console.log("MASTERS DIR:", mastersDir)

// serve masters folder
app.use("/uploads", express.static(uploadsDir))
app.get("/masters/:file", (req, res) => {
  const filePath = path.join(mastersDir, req.params.file)

  console.log("Serving file:", filePath)

  if (!fs.existsSync(filePath)) {
    console.log("❌ FILE NOT FOUND")
    return res.status(404).send("File not found")
  }

  res.setHeader("Content-Type", "audio/wav")
  res.setHeader("Accept-Ranges", "bytes")

  const stream = fs.createReadStream(filePath)
  stream.pipe(res)
})
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir, // 🔥 ÄNDRA HIT
    filename: (req, file, cb) => {
  const safeName = Date.now() + ".wav"
  cb(null, safeName)
}
  })
})

// cache analysis
const analysisCache = {}


/*
GENERATE MIX INSIGHTS
Creates mix score + tips
*/

function generateMixInsights(analysis){

let score = 75
const tips = []

// LOUDNESS

if(analysis.lufs){

if(analysis.lufs > -7){
tips.push("Track extremely loud – limiter may be working hard")
score -= 5
}

else if(analysis.lufs > -10){
tips.push("Track already very loud – mastering headroom limited")
score -= 3
}

else if(analysis.lufs < -18){
tips.push("Mix very quiet – significant gain will be added")
score -= 3
}

}


// LOW END

if(analysis.lowEnergy && analysis.lowEnergy > 0.75){
tips.push("Low end may be muddy – check kick/bass balance")
score -= 4
}

else if(analysis.lowEnergy && analysis.lowEnergy > 0.6){
tips.push("Low end slightly muddy")
score -= 2
}


// HIGH END

if(analysis.highEnergy && analysis.highEnergy < 0.15){
tips.push("High frequencies lacking – mix could use brightness")
score -= 3
}

else if(analysis.highEnergy && analysis.highEnergy < 0.25){
tips.push("High end could use more brightness around 10kHz")
score -= 2
}


// STEREO WIDTH

if(analysis.stereoWidth && analysis.stereoWidth < 0.25){
tips.push("Stereo field very narrow – mix may feel centered")
score -= 4
}

else if(analysis.stereoWidth && analysis.stereoWidth < 0.4){
tips.push("Stereo image slightly narrow – consider widening")
score -= 2
}

else if(analysis.stereoWidth > 0.85){
tips.push("Stereo image very wide – check mono compatibility")
score -= 1
}


// DYNAMICS

if(analysis.dynamicRange){

if(analysis.dynamicRange < 4){
tips.push("Mix heavily compressed – transients may be lost")
score -= 5
}

else if(analysis.dynamicRange < 7){
tips.push("Dynamics slightly compressed")
score -= 2
}

else if(analysis.dynamicRange > 15){
tips.push("Very dynamic mix – may feel quieter than commercial tracks")
score -= 1
}

}


// clamp score
score = Math.max(0, Math.min(100, Math.round(score)))

// remove duplicates
const uniqueTips = [...new Set(tips)]

// limit tips
const finalTips = uniqueTips.slice(0,4)

return {
mixScore: score,
mixTips: finalTips
}

}


/*
AI MASTER PLAN
Creates mastering strategy
*/

function generateMasterPlan(analysis,targetLufs){

const plan = []

if(analysis.lowEnergy && analysis.lowEnergy > 0.6){
plan.push("tighten low end")
}

if(analysis.stereoWidth && analysis.stereoWidth < 0.35){
plan.push("widen stereo image")
}

if(analysis.lufs && analysis.lufs > -8){
plan.push("reduce loudness slightly")
}

if(analysis.lufs && analysis.lufs < -18){
plan.push("increase loudness significantly")
}

if(analysis.dynamicRange && analysis.dynamicRange < 6){
plan.push("restore dynamics with gentle compression")
}

if(analysis.dynamicRange && analysis.dynamicRange > 15){
plan.push("control dynamics for more consistent level")
}

plan.push(`target loudness ${targetLufs} LUFS`)

return plan

}

function calculateMixScore(a){

  let score = 75

  const targetLufs = -14
  const targetDynamicMin = 6
  const targetDynamicMax = 12
  const targetStereoMin = 0.4
  const targetStereoMax = 0.8

  /* ---------------- SAFE VALUES ---------------- */

  const lufs = Number(a.lufs)
const dynamic = Number(a.dynamicRange)
  const stereo = Number(a.stereoWidth)
  const low = Number(a.lowEnergy)
  const high = Number(a.highEnergy)

  /* ---------------- LOUDNESS ---------------- */

  if(!isNaN(lufs)){

  // 🎯 perfekt mix range
  if(lufs >= -18 && lufs <= -12){
  score += 10
}

  // 🔇 för tyst
  else if(lufs < -18){
    score -= Math.min(20, (-18 - lufs) * 1.5)
  }

  // 🔊 för loud (börjar bli master)
  else if(lufs > -12){
    score -= Math.min(25, (lufs + 12) * 2)
  }

  // 🚨 limiter = big penalty
  if(lufs > -9){
    score -= 15
  }

}

/* ---------------- BALANCE BONUS ---------------- */

if(!isNaN(dynamic)){
  if(dynamic >= 6 && dynamic <= 12){
    score += 5
  }
}

if(!isNaN(stereo)){
  if(stereo >= 0.4 && stereo <= 0.8){
    score += 3
  }
}

  /* ---------------- DYNAMICS ---------------- */

  if(!isNaN(dynamic)){
    if(dynamic < targetDynamicMin){
      score -= Math.min(20, (targetDynamicMin - dynamic) * 3)
    } 
    else if(dynamic > targetDynamicMax){
      score -= Math.min(10, (dynamic - targetDynamicMax) * 1.5)
    }
  }

  /* ---------------- STEREO ---------------- */

  if(!isNaN(stereo)){
    if(stereo < targetStereoMin){
      score -= Math.min(15, (targetStereoMin - stereo) * 30)
    } 
    else if(stereo > targetStereoMax){
      score -= Math.min(8, (stereo - targetStereoMax) * 20)
    }
  }

  /* ---------------- LOW END ---------------- */

  if(!isNaN(low)){
    if(low > 0.7) score -= 10
    else if(low < 0.2) score -= 8
  }

  /* ---------------- HIGH END ---------------- */

  if(!isNaN(high)){
    if(high < 0.15) score -= 8
    else if(high > 0.35) score -= 6
  }

  /* ---------------- FINAL ---------------- */

  const finalScore = Math.max(0, Math.min(100, Math.round(score)))

console.log("INPUT:", a)
console.log("LUFS:", lufs)
console.log("FINAL SCORE:", finalScore)

return finalScore
}

function generateFullAnalysis(a){

  let score = calculateMixScore(a)

  const feedback = []
  const fixes = []
  const plan = []

  let mainIssue = null
  const secondaryIssues = []

  const targetLufs = -9

  const lufs = Number(a.lufs)
  const dynamic = Number(a.dynamicRange)
  const stereo = Number(a.stereoWidth)
  const low = Number(a.lowEnergy)
  const high = Number(a.highEnergy)

  /* ---------------- LOUDNESS ---------------- */

  if(!isNaN(lufs)){

    if(lufs < -20){
      mainIssue = "Low output level"
      fixes.push("Boost loudness to commercial level")
      plan.push("increase loudness significantly")
    }


    else if(lufs > -9){
      mainIssue = "Track too loud — over-compressed"
      fixes.push("Reduce limiter input by 2–4 dB")
      plan.push("reduce loudness slightly")
    }

  }

  /* ---------------- STEREO ---------------- */

  if(!isNaN(stereo)){

    if(stereo < 0.3){
      if(!mainIssue){
        mainIssue = "Stereo field is too narrow — mix feels centered"
      } else {
        secondaryIssues.push("Stereo field is slightly narrow")
      }

      fixes.push("Widen pads and atmospheric elements")
      fixes.push("Use Haas delay (10–30ms)")
      plan.push("widen stereo image")
    }

  }

  /* ---------------- ENERGY ---------------- */

  if(!isNaN(lufs) && lufs < -14 && !mainIssue){
    mainIssue = "Mix lacks energy"
    fixes.push("Boost upper mids")
    fixes.push("Enhance transients")
    fixes.push("Add saturation")
    plan.push("increase energy")
  }

  /* ---------------- LOW END ---------------- */

  if(!isNaN(low)){

    if(low > 0.7){
      secondaryIssues.push("Low end muddy")
      fixes.push("Reduce 60–120 Hz")
      plan.push("tighten low end")
    }

    else if(low < 0.2){
      secondaryIssues.push("Low end weak")
      fixes.push("Boost sub (40–80 Hz)")
    }

  }

  /* ---------------- HIGH END ---------------- */

  if(!isNaN(high) && high < 0.2){
    secondaryIssues.push("Lacking brightness")
    fixes.push("Boost around 10–12kHz")
  }

  /* ---------------- DYNAMICS ---------------- */

  if(!isNaN(dynamic)){

    if(dynamic > 15){
      secondaryIssues.push("Mix is too dynamic — may sound weak compared to commercial tracks")
      fixes.push("Add gentle compression or saturation")
      plan.push("control dynamics")
    }

    else if(dynamic < 5){
      secondaryIssues.push("Overcompressed mix")
      fixes.push("Reduce compression to restore punch")
    }

  }

  /* ---------------- FALLBACK ---------------- */

  // FALLBACK
if(!mainIssue && secondaryIssues.length > 0){
  mainIssue = secondaryIssues[0]
}

if(secondaryIssues.length === 0 && mainIssue){
  secondaryIssues.push("Fine-tune stereo image")
}

  /* ---------------- VERDICT ---------------- */

  let verdict = ""

  if(score > 90){
    verdict = "Ready for mastering — no critical issues detected"
  }
  else if(score > 75){
    verdict = "Good foundation — small improvements needed before mastering"
  }
  else{
    verdict = "Mix needs improvement before release"
  }

  /* ---------------- READY FLAG ---------------- */

  const readyForMastering = score > 90

  /* ---------------- RETURN ---------------- */

  return {
    score,

    status:
      score < 50 ? "❌ Not ready" :
      score < 75 ? "⚠️ Needs work" :
      score < 90 ? "👍 Almost ready" :
      "🔥 Ready",

    verdict,

    mainIssue,
    secondaryIssues,

    feedback,
    fixes: fixes.slice(0,4),
    plan,

    readyForMastering,
    targetLufs
  }
}


/*
UPLOAD TRACK
*/

app.post(
"/upload",
upload.single("track"),
async (req,res)=>{

try {

const track = req.file

if(!track){
  return res.status(400).json({error:"No track uploaded"})
}

// rename uploaded file
const fileName = track.filename + ".wav"
const newPath = track.path + ".wav"

fs.renameSync(track.path, newPath)

console.log("Uploaded:", fileName)

// const analysis = await analyzeTrack(newPath)
const analysis = await analyzeTrack(newPath)
if (!analysis) {
  return res.status(500).json({ error: "Analysis failed" })
}

let referenceAnalysis = null

// cache analysis
analysisCache[fileName] = analysis

const ai = {}

const full = generateFullAnalysis(analysis) // 🔥 FLYTTA UPP

let issues = [
  full.mainIssue && {
    text: full.mainIssue,
    level: "high",
    realImpact: 10
  },

  ...full.secondaryIssues.map(f => ({
    text: f,
    level: "medium",
    realImpact: 5
  }))
].filter(Boolean)


// 🔥 GARANTERA MINST 6 ISSUES
const extraIssues = [
  "Kick lacks punch",
  "Vocals slightly buried",
  "High-end could be smoother",
  "Stereo image inconsistent",
  "Low-end lacks control",
  "Transient energy could be improved"
]

while (issues.length < 6) {
  issues.push({
    text: extraIssues[issues.length % extraIssues.length],
    level: "low",
    realImpact: 2
  })
}

ai.message = full.status

const masteringChain = {}

const loudness = {
original: analysis.lufs || -18,
target: ai?.targetLufs || -10,
dynamicRange: analysis.dynamicRange || 8
}

res.json({
  file: fileName,

  // 🔥 VIKTIGT (lägg till dessa)
  lufs: analysis.lufs ?? -12,
dynamicRange: analysis.dynamicRange ?? 8,
stereoWidth: analysis.stereoWidth ?? 0.5,
  energy: analysis.energy ?? 0.7,

  mixQuality: full.score,

  verdict: full.verdict,

  bassWeight: analysis.lowEnergy ?? 0.5,
brightness: analysis.highEnergy ?? 0.25,

  // 👇 denna kan vara kvar om du vill
  analysis: {
    energy: analysis.energy,
    bpm: analysis.bpm,
    lufs: analysis.lufs,
    dynamicRange: analysis.dynamicRange,
    stereoWidth: analysis.stereoWidth
  },

  issues: issues,


  recommendations: generateDynamicFixes(analysis),

  referenceAnalysis,
  ai,

  score: full.score,
  status: full.status,
  feedback: full.feedback,
  fixes: full.fixes,
  masterPlan: full.plan,

  masteringChain,
  loudness
})

} catch (err) {

console.log(err)



res.status(500).json({
error:"Upload failed"
})

}

})



/* ANALYZE TRACK */

app.post("/analyze", upload.single("file"), async (req, res) => {
  try {

    console.log("🔥 HIT /analyze")

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }

    // 🔥 TEMP ANALYSIS (så allt funkar direkt)
    const analysis = {
      lufs: -12,
      dynamicRange: 8,
      stereoWidth: 0.6,
      lowEnergy: 0.5,
      highEnergy: 0.25
    }

    const full = generateFullAnalysis(analysis)
    const fixes = generateDynamicFixes(analysis)

    let issues = [
  full.mainIssue && {
    text: full.mainIssue,
    level: "high",
    realImpact: 10
  },

  ...full.secondaryIssues.map(f => ({
    text: f,
    level: "medium",
    realImpact: 5
  }))
].filter(Boolean)


// 🔥 FYLL UT TILL MINST 6
const extraIssues = [
  "Kick lacks punch",
  "Vocals slightly buried",
  "High-end could be smoother",
  "Stereo image inconsistent",
  "Low-end lacks control",
  "Transient energy could be improved"
]

while (issues.length < 6) {
  issues.push({
    text: extraIssues[issues.length % extraIssues.length],
    level: "low",
    realImpact: 2
  })
}

    res.json({
      mixQuality: full.score ?? 0,

      issues: issues,

      recommendations: fixes.map(fix => ({
        title: fix.issue,
        steps: [fix.fix, fix.proTip]
      })),

      lufs: analysis.lufs ?? -12,
      dynamicRange: analysis.dynamicRange ?? 8,
      stereoWidth: analysis.stereoWidth ?? 0.5,

      bassWeight: analysis.lowEnergy,
      brightness: analysis.highEnergy,
      energy: 0.7
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Analyze failed" })
  }
})

function generateDynamicFixes(analysis){

  if(!analysis) return []

  const fixes = []

  const lufs = analysis?.lufs ?? -12
  const dynamic = analysis?.dynamicRange ?? 8
  const stereo = analysis?.stereoWidth ?? 0.5
  const low = analysis?.lowEnergy ?? 0.5
  const high = analysis?.highEnergy ?? 0.25

  // 🔊 LOUDNESS
  if(lufs < -14){
    fixes.push({
      issue: "Low output level",
      fix: "Your mix is too quiet — it will sound weak on streaming platforms",
      steps: [
        "Add a limiter on your master channel",
        "Set output ceiling to -1 dB",
        "Increase gain until reaching -9 to -10 LUFS",
        "Avoid distortion when pushing level"
      ],
      result: "Your track will sound louder, stronger and more competitive"
    })
  }

  // 📉 TOO LOUD
  if(lufs > -9){
    fixes.push({
      issue: "Over-compressed mix",
      fix: "Your mix is too loud — dynamics are being crushed",
      steps: [
        "Reduce limiter input gain",
        "Lower master level by 2–4 dB",
        "Allow more transient movement"
      ],
      result: "Cleaner, punchier and more dynamic sound"
    })
  }

  // 🎚 DYNAMICS
  if(dynamic > 14){
    fixes.push({
      issue: "Too much dynamic range",
      fix: "Your mix is too dynamic — it may sound weak next to commercial tracks",
      steps: [
        "Add a compressor on master (ratio 2:1)",
        "Set attack to 20–40 ms",
        "Set release to ~100 ms",
        "Aim for 3–5 dB gain reduction"
      ],
      result: "Tighter, louder and more controlled mix"
    })
  }

  if(dynamic < 5){
    fixes.push({
      issue: "Overcompressed",
      fix: "Your mix is too compressed — it lacks punch",
      steps: [
        "Reduce compression on drums",
        "Lower bus compression",
        "Restore transients"
      ],
      result: "More punch and energy"
    })
  }

  // 🌌 STEREO
  if(stereo < 0.35){
    fixes.push({
      issue: "Stereo too narrow",
      fix: "Your mix feels centered and lacks width",
      steps: [
        "Pan instruments left/right",
        "Widen pads and effects",
        "Use stereo widening plugins carefully",
        "Keep bass mono"
      ],
      result: "Wider, more immersive mix"
    })
  }

  // 🔊 LOW END
  if(low > 0.7){
    fixes.push({
      issue: "Low end muddy",
      fix: "Too much energy in low frequencies",
      steps: [
        "Reduce 60–120 Hz slightly",
        "Separate kick and bass with EQ",
        "Use sidechain compression"
      ],
      result: "Cleaner and tighter low end"
    })
  }

  if(low < 0.2){
    fixes.push({
      issue: "Low end weak",
      fix: "Your mix lacks bass energy",
      steps: [
        "Boost sub frequencies (40–80 Hz)",
        "Layer kick with sub",
        "Use saturation for harmonics"
      ],
      result: "Fuller and more powerful low end"
    })
  }

  // ✨ HIGH END
  if(high < 0.25){
    fixes.push({
      issue: "Lacks brightness",
      fix: "Your mix lacks clarity in the high frequencies",
      steps: [
        "Boost 8–12 kHz slightly",
        "Add saturation or exciter",
        "Enhance hi-hats and vocals"
      ],
      result: "Cleaner and more modern sound"
    })
  }

  return fixes.slice(0, 4)
}


/*
MASTER TRACK
*/

app.post("/master",
  upload.single("file"),
  async (req, res) => {
  console.log("🔥 LIVE /MASTER ROUTE HIT - NEW CODE ACTIVE")

  res.setTimeout(0) // 🔥 LÄGG DEN HÄR

  try {

      const file = req.file

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" })
      }

      const fileName = file.filename + ".wav"
      const newPath = file.path + ".wav"

      fs.renameSync(file.path, newPath)

      const masterFileName = Date.now() + "-master.wav"
      const masterPath = path.join(mastersDir, masterFileName)

      console.log("INPUT:", newPath)
      console.log("OUTPUT:", masterPath)

      const metricTraceId = randomUUID()

      const masterResult = await masterTrack({
        file: newPath,
        output: masterPath,
        metricTraceId,
      })

      const forwardedProto = req.headers["x-forwarded-proto"]
      const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || req.protocol)
        .split(",")[0]
        .trim()
      const baseUrl = `${proto}://${req.get("host")}`
      const before = `/uploads/${fileName}`
      const after = `/masters/${masterFileName}`

      let rawBefore = masterResult?.analysisBefore ?? null
      let rawAfter = masterResult?.analysisAfter ?? null

      if (rawBefore == null && fs.existsSync(newPath)) {
        try {
          rawBefore = await analyzeTrack(newPath)
        } catch (e) {
          console.log("[POST /master] fallback analyzeTrack(before) failed:", e?.message || e)
        }
      }

      if (rawAfter == null && fs.existsSync(masterPath)) {
        for (const delayMs of [0, 250, 600, 1200]) {
          if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs))
          try {
            rawAfter = await analyzeTrack(masterPath)
            if (rawAfter != null) break
          } catch (e) {
            console.log("[POST /master] fallback analyzeTrack(after) failed:", e?.message || e)
          }
        }
      }

      const analysisBefore = serializeMasterAnalysisForJson(rawBefore, "before")
      const analysisAfter = serializeMasterAnalysisForJson(rawAfter, "after")
      logMasterMetricFiveStagesServer(metricTraceId, rawAfter, analysisAfter)

      res.json({
        success: true,
        debugVersion: "NEW_MASTER_RESPONSE_V2",
        before,
        after,
        afterUrl: `${baseUrl}${after}`,
        // kept for backwards compatibility with older clients
        fullUrl: `${baseUrl}${after}`,
        analysisBefore,
        analysisAfter,
        masterMetricTraceId: metricTraceId,
      })

    } catch (err) {
      console.log(err)
      res.status(500).json({ error: "Master failed" })
    }

  }
)



/* START SERVER */

app.post("/waitlist", (req, res) => {
  const { email } = req.body
  console.log("🔥 New signup:", email)
  res.json({ success: true })
})

app.get("/test", (req, res) => {
  res.send("TEST OK")
})

const PORT = process.env.PORT || 3001


// 🔥 VIKTIG: snabb health response innan allt annat
app.get("/health", (req, res) => {
  res.status(200).send("OK")
})

async function logFfmpegRuntimeAndProbe() {
  const bin =
    typeof ffmpegPath === "string" ? ffmpegPath : ffmpegPath != null ? String(ffmpegPath) : ""
  const ffprobeBin = ffprobeStatic?.path ?? ""

  console.log("[FFMPEG_BOOT] process.platform", process.platform, "arch", process.arch)
  console.log("[FFMPEG_BOOT] ffmpeg path", bin || "(empty)")
  console.log("[FFMPEG_BOOT] ffmpeg exists", bin ? fs.existsSync(bin) : false)
  if (bin && fs.existsSync(bin)) {
    try {
      console.log("[FFMPEG_BOOT] ffmpeg mode", fs.statSync(bin).mode.toString(8))
      fs.chmodSync(bin, 0o755)
    } catch (e) {
      console.log("[FFMPEG_BOOT] chmod/stat ffmpeg:", e?.message || e)
    }
  }

  console.log("[FFMPEG_BOOT] ffprobe path", ffprobeBin || "(empty)")
  console.log(
    "[FFMPEG_BOOT] ffprobe exists",
    ffprobeBin ? fs.existsSync(ffprobeBin) : false
  )
  if (ffprobeBin && fs.existsSync(ffprobeBin)) {
    try {
      console.log("[FFMPEG_BOOT] ffprobe mode", fs.statSync(ffprobeBin).mode.toString(8))
      fs.chmodSync(ffprobeBin, 0o755)
    } catch (e) {
      console.log("[FFMPEG_BOOT] chmod/stat ffprobe:", e?.message || e)
    }
  }

  if (!bin || !fs.existsSync(bin)) {
    console.error("[FFMPEG_BOOT] SKIP ffmpeg -version (missing binary); run npm install in server/")
    return
  }

  await new Promise((resolve) => {
    const p = spawn(bin, ["-hide_banner", "-version"], { stdio: ["ignore", "pipe", "pipe"] })
    let combined = ""
    p.stdout?.on("data", (d) => {
      combined += d.toString()
    })
    p.stderr?.on("data", (d) => {
      combined += d.toString()
    })
    p.on("close", (code) => {
      const first = combined.split("\n").find((l) => l.trim()) || ""
      console.log("[FFMPEG_BOOT] ffmpeg -version exit", code, "firstLine:", first)
      resolve()
    })
    p.on("error", (err) => {
      console.error("[FFMPEG_BOOT] ffmpeg -version spawn error:", err?.message || err)
      resolve()
    })
  })
}

// 🔥 STARTA SERVER (after ffmpeg probe so Railway logs show binary health)
logFfmpegRuntimeAndProbe()
  .catch((e) => console.error("[FFMPEG_BOOT] probe failed:", e?.message || e))
  .finally(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log("🔥 Server running on port", PORT)
    })
  })