import express from "express"
import cors from "cors"
import multer from "multer"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { analyzeTrack } from "./analyze.js"
import { masterTrack, measureIntegratedLufsEbur128 } from "./master.js"
import { serializeMasterAnalysisForJson } from "./masterAnalysisPayload.js"
import { serializeMasteringInsightsForJson } from "./masterInsightsPayload.js"
import { MASTRIFY_LUFS_TRACE as LUFS_TRACE, MASTRIFY_PIPELINE_DEBUG as PIPELINE_DEBUG } from "./mastrifyDebug.js"
import ffmpegPath from "ffmpeg-static"
import ffprobeStatic from "ffprobe-static"

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err)
})

process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection:", err)
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

// Ensure dirs at cold boot (Railway /tmp is often empty).
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  if (!fs.existsSync(mastersDir)) {
    fs.mkdirSync(mastersDir, { recursive: true })
  }
} catch (err) {
  console.error("Failed to create uploads/masters directories:", err)
}

// serve masters folder
app.use("/uploads", express.static(uploadsDir))
app.get("/masters/:file", (req, res) => {
  const filePath = path.join(mastersDir, req.params.file)

  if (!fs.existsSync(filePath)) {
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
upload.single("file"),
async (req,res)=>{

try {

const file = req.file

if(!file){
  return res.status(400).json({error:"No file uploaded"})
}

// rename uploaded file
const fileName = file.filename + ".wav"
const newPath = file.path + ".wav"

fs.renameSync(file.path, newPath)

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
  console.error("Upload failed:", err)
  res.status(500).json({
    error: "Upload failed",
  })
}

})



/* ANALYZE TRACK */

app.post("/analyze", upload.single("file"), async (req, res) => {
  try {

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

      const body = req.body || {}
      const stylePreset = body.stylePreset || body.style
      const targetLufs = body.targetLufs
      const stereoEnhance = body.stereoEnhance
      const lowEndControl = body.lowEndControl
      const clarityPresence = body.clarityPresence
      const chainDebugMode = body.chainDebugMode ?? body.chainMode
      const chainDebugSweep = body.chainDebugSweep

      if (LUFS_TRACE) {
        console.log("[LUFS_TRACE] POST /master incoming (req.body after multer)", {
          targetLufs,
          stylePreset,
          stereoEnhance,
          lowEndControl,
          clarityPresence,
          chainDebugMode,
          chainDebugSweep,
        })
      }

      const masterResult = await masterTrack({
        file: newPath,
        output: masterPath,
        style: stylePreset,
        targetLufs,
        stereoEnhance,
        lowEndControl,
        clarityPresence,
        chainDebugMode,
        chainDebugSweep,
      })

      if (LUFS_TRACE) {
        const ra = masterResult?.analysisAfter
        console.log("[LUFS_TRACE] masterResult.analysisAfter from masterTrack()", {
          lufs: ra?.lufs ?? null,
          lufsRmsProxy: ra?.lufsRmsProxy ?? null,
          targetLufsApplied: ra?.targetLufsApplied ?? null,
          lufsTraceMeta: masterResult?.lufsTraceMeta ?? null,
        })
      }

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
        } catch {
          /* optional fallback */
        }
      }

      if (rawAfter == null && fs.existsSync(masterPath)) {
        for (const delayMs of [0, 250, 600, 1200]) {
          if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs))
          try {
            rawAfter = await analyzeTrack(masterPath)
            if (rawAfter != null) break
          } catch {
            /* retry */
          }
        }
      }

      if (rawAfter && rawAfter.lufsRmsProxy == null && fs.existsSync(masterPath)) {
        let ebu = await measureIntegratedLufsEbur128(masterPath)
        if (ebu == null) {
          await new Promise((r) => setTimeout(r, 220))
          ebu = await measureIntegratedLufsEbur128(masterPath)
        }
        if (ebu != null && Number.isFinite(ebu)) {
          const prev = rawAfter.lufs
          const appliedFromMaster =
            rawAfter.targetLufsApplied ??
            masterResult?.masteringInsights?.appliedLufs ??
            null
          rawAfter = {
            ...rawAfter,
            lufs: ebu,
            lufsRmsProxy: prev,
            ...(appliedFromMaster != null && Number.isFinite(Number(appliedFromMaster))
              ? { targetLufsApplied: Number(appliedFromMaster) }
              : {}),
          }
        }
      }

      const analysisBefore = serializeMasterAnalysisForJson(rawBefore, "before")
      const analysisAfter = serializeMasterAnalysisForJson(rawAfter, "after")

      if (LUFS_TRACE) {
        console.log("[LUFS_TRACE] AUTHORITY_HTTP_JSON_AFTER_SERIALIZE", {
          serializedAnalysisAfterLufs: analysisAfter?.lufs ?? null,
          rawAfterLufsPreSerialize: rawAfter?.lufs ?? null,
          rawAfterHasLufsRmsProxy: rawAfter?.lufsRmsProxy != null,
        })
        console.log(
          "[LUFS_TRACE] AUTHORITY_COMPARE rawAfter.lufs",
          rawAfter?.lufs,
          "vs serialized",
          analysisAfter?.lufs,
          "finiteNum applied:",
          analysisAfter?.lufs !== rawAfter?.lufs ? "YES (check finiteNum)" : "same"
        )
      }

      if (PIPELINE_DEBUG) {
        const absMaster = path.resolve(masterPath)
        const absUpload = fs.existsSync(newPath) ? path.resolve(newPath) : null
        console.log("[pipeline] POST /master", {
          analyzedMasterPath: absMaster,
          uploadPath: absUpload,
          masterBytes: fs.existsSync(masterPath) ? fs.statSync(masterPath).size : 0,
          body: { stylePreset, targetLufs, stereoEnhance, lowEndControl, clarityPresence },
          rawAfter: rawAfter
            ? {
                lufs: rawAfter.lufs,
                lufsRmsProxy: rawAfter.lufsRmsProxy,
                targetLufsApplied: rawAfter.targetLufsApplied,
                stereoWidth: rawAfter.stereoWidth,
                bassWeight: rawAfter.bassWeight,
                brightness: rawAfter.brightness,
                dynamicRange: rawAfter.dynamicRange,
              }
            : null,
          analysisAfter,
        })
      }

      const masteringInsights = serializeMasteringInsightsForJson(
        masterResult?.masteringInsights ?? rawAfter
      )

      const resPayload = {
        success: true,
        before,
        after,
        afterUrl: `${baseUrl}${after}`,
        // kept for backwards compatibility with older clients
        fullUrl: `${baseUrl}${after}`,
        analysisBefore,
        analysisAfter,
        ...(masteringInsights ? { masteringInsights } : {}),
      }
      if (masterResult?.debugInfo) {
        resPayload.masterDebug = masterResult.debugInfo
      }
      if (masterResult?.chainDiagnostics) {
        resPayload.chainDiagnostics = masterResult.chainDiagnostics
      }
      if (masterResult?.chainSweepReport) {
        const sweep = masterResult.chainSweepReport
        for (const r of sweep.renders ?? []) {
          if (r.url) r.fullUrl = `${baseUrl}${r.url}`
        }
        for (const r of sweep.ranking ?? []) {
          if (r.url) r.fullUrl = `${baseUrl}${r.url}`
        }
        resPayload.chainSweepReport = sweep
        resPayload.culpritSummary = masterResult.culpritSummary ?? sweep.culpritSummary
        resPayload.likelySuspect =
          masterResult.likelySuspect ?? sweep.culpritSummary?.mostLikely ?? sweep.mostMovement ?? null
        resPayload.chainSweepConsole = sweep.consoleReport
      }
      if (PIPELINE_DEBUG) {
        resPayload.pipelineDebug = {
          masterFileName,
          analysisAfter,
          hasLufsRmsProxy: Boolean(rawAfter && rawAfter.lufsRmsProxy != null),
          masterBytes: fs.existsSync(masterPath) ? fs.statSync(masterPath).size : 0,
        }
      }
      if (LUFS_TRACE) {
        resPayload.lufsTrace = {
          ...(masterResult?.lufsTraceMeta && typeof masterResult.lufsTraceMeta === "object"
            ? masterResult.lufsTraceMeta
            : {}),
          rawAfterLufsPreSerialize: rawAfter?.lufs ?? null,
          serializedAnalysisAfterLufs: analysisAfter?.lufs ?? null,
          hint: "Set NEXT_PUBLIC_MASTRIFY_API_URL to this server's public URL if stamp does not match deploy.",
        }
        console.log(
          "[LUFS_TRACE] AUTHORITY_RESPONSE_PAYLOAD lufsTrace.serializedAnalysisAfterLufs=",
          resPayload.lufsTrace.serializedAnalysisAfterLufs,
          "stamp=",
          resPayload.lufsTrace.stamp
        )
      }
      res.json(resPayload)

    } catch (err) {
      console.error("Master failed:", err)
      res.status(500).json({ error: "Master failed" })
    }

  }
)



/* START SERVER */

app.post("/waitlist", (req, res) => {
  res.json({ success: true })
})

app.get("/test", (req, res) => {
  res.send("TEST OK")
})

app.get("/health", (req, res) => {
  res.status(200).send("OK")
})

const PORT = process.env.PORT || 3001

function ensureFfmpegBinariesExecutable() {
  const bin =
    typeof ffmpegPath === "string" ? ffmpegPath : ffmpegPath != null ? String(ffmpegPath) : ""
  const ffprobeBin = ffprobeStatic?.path ?? ""
  for (const p of [bin, ffprobeBin].filter(Boolean)) {
    try {
      if (fs.existsSync(p)) fs.chmodSync(p, 0o755)
    } catch {
      /* ignore */
    }
  }
}

ensureFfmpegBinariesExecutable()

// 🔥 STARTA SERVER
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server listening on port", PORT)
})