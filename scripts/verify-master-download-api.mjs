#!/usr/bin/env node
/**
 * Verifies POST /master/download (desktop app, Mastrify Master) against the real server/server.js:
 * payment check, the full WAV byte for byte via /masters/<file>?download=1, no email sent, and that the
 * website's POST /master/deliver behaves as before. Only the payment checks are faked
 * (scripts/master-download-test). Railway storage mode (no Supabase env), so nothing leaves this machine.
 * Usage: node scripts/verify-master-download-api.mjs
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import net from "node:net"
import crypto from "node:crypto"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
let failures = 0, checks = 0
const check = (ok, msg) => { checks++; if (!ok) { failures++; console.log("  FAIL " + msg) } else console.log("  ok   " + msg) }

const freePort = () => new Promise((r) => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)) }) })
const port = await freePort()
const API = `http://127.0.0.1:${port}`
const key = `desk_test_${crypto.randomBytes(4).toString("hex")}.wav`
const spyLog = path.join(os.tmpdir(), `master-download-spy-${process.pid}.jsonl`)

// En riktig liten WAV i den privata mappen, som efter POST /master.
function wav(seconds = 2, rate = 44100) {
  const n = seconds * rate, data = Buffer.alloc(n * 4)
  for (let i = 0; i < n; i++) { const v = Math.round(8000 * Math.sin((2 * Math.PI * 220 * i) / rate)); data.writeInt16LE(v, i * 4); data.writeInt16LE(v, i * 4 + 2) }
  const h = Buffer.alloc(44)
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20)
  h.writeUInt16LE(2, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(data.length, 40)
  return Buffer.concat([h, data])
}
const master = wav()
const privateDir = "/tmp/masters-private", publicDir = "/tmp/masters"
fs.mkdirSync(privateDir, { recursive: true })
fs.writeFileSync(path.join(privateDir, key), master)
fs.rmSync(path.join(publicDir, key), { force: true })

const env = { ...process.env, PORT: String(port), TEST_OBJECT_KEY: key, SPY_LOG: spyLog }
for (const k of Object.keys(env)) if (/^(SUPABASE_|RESEND_|STRIPE_)/.test(k)) delete env[k]
env.MASTRIFY_DOWNLOAD_LINK_SECRET = "verify-master-download-test"   // signs the email link in /master/deliver
const server = spawn(process.execPath, ["--import", path.join(ROOT, "scripts/master-download-test/register.mjs"), "server.js"], { cwd: path.join(ROOT, "server"), env, stdio: ["ignore", "pipe", "pipe"] })
let out = ""
server.stdout.on("data", (d) => { out += d }); server.stderr.on("data", (d) => { out += d })
const cleanup = () => { server.kill(); fs.rmSync(path.join(privateDir, key), { force: true }); fs.rmSync(path.join(publicDir, key), { force: true }); fs.rmSync(spyLog, { force: true }) }

try {
  for (let i = 0; i < 100 && !/listening on port/.test(out); i++) await new Promise((r) => setTimeout(r, 100))
  if (!/listening on port/.test(out)) throw new Error("server did not start:\n" + out)
  const post = async (p, body) => { const r = await fetch(API + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, json: await r.json().catch(() => null) } }
  const spy = () => (fs.existsSync(spyLog) ? fs.readFileSync(spyLog, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [])

  console.log("POST /master/download")
  let r = await post("/master/download", { objectKey: key })
  check(r.status === 400 && r.json?.error === "Missing download details", `no payment reference -> 400 (${r.status} ${r.json?.error})`)
  r = await post("/master/download", { objectKey: key, stripeSessionId: "cs_test_unpaid" })
  check(r.status === 402 && r.json?.success === false, `unpaid checkout -> 402 (${r.status} ${r.json?.error})`)
  r = await post("/master/download", { objectKey: "someone_else.wav", stripeSessionId: "cs_test_paid" })
  check(r.status === 403, `payment for another master -> 403 (${r.status} ${r.json?.error})`)
  check(!fs.existsSync(path.join(publicDir, key)), "nothing made public before a verified payment")
  const before = await fetch(`${API}/masters/${key}?download=1`)
  check(before.status === 404, `the WAV is not downloadable before payment (${before.status})`)

  r = await post("/master/download", { objectKey: key, stripeSessionId: "cs_test_paid", trackTitle: "Night Drive" })
  check(r.status === 200 && r.json?.success === true, `paid checkout -> 200 (${r.status})`)
  check(r.json?.playbackUrl === `${API}/masters/${key}`, `playbackUrl is /masters/<file> (${r.json?.playbackUrl})`)
  const dl = await fetch(r.json.playbackUrl + "?download=1")
  const got = Buffer.from(await dl.arrayBuffer())
  check(dl.status === 200, `GET /masters/<file>?download=1 -> 200 (${dl.status})`)
  check(/^attachment;/.test(dl.headers.get("content-disposition") || ""), `served as an attachment (${dl.headers.get("content-disposition")})`)
  check(dl.headers.get("content-type") === "audio/wav", `audio/wav (${dl.headers.get("content-type")})`)
  check(got.equals(master), `the full WAV, byte for byte (${got.length} of ${master.length} bytes)`)
  check(got.toString("ascii", 0, 4) === "RIFF" && got.toString("ascii", 8, 12) === "WAVE", "valid RIFF/WAVE header")

  r = await post("/master/download", { objectKey: key, freeOrderId: "free_test_order" })
  check(r.status === 200 && r.json?.playbackUrl, `free code order -> 200 (${r.status})`)
  r = await post("/master/download", { objectKey: key, freeOrderId: "nope" })
  check(r.status === 402, `unknown free order -> 402 (${r.status})`)

  const calls = spy()
  check(!calls.some((c) => c.name === "deliverMasterExportEmail"), "no email delivery from /master/download")
  const rec = calls.filter((c) => c.name === "recordMasteredExportDownload")
  check(rec.length === 2, `export recorded once per successful download call (${rec.length})`)
  check(rec[0]?.args.email === "buyer@example.com" && rec[0]?.args.amountCents === 900 && rec[0]?.args.stripeSessionId === "cs_test_paid",
    `paid export recorded with the Stripe buyer email and amount (${JSON.stringify(rec[0]?.args)})`)
  check(rec[0]?.result?.reason === "supabase_not_configured", `no database here, so nothing stored (${JSON.stringify(rec[0]?.result)})`)

  console.log("POST /master/deliver (website, unchanged)")
  r = await post("/master/deliver", { objectKey: key, stripeSessionId: "cs_test_paid" })
  check(r.status === 400 && r.json?.error === "Missing delivery details", `still requires an email (${r.status} ${r.json?.error})`)
  r = await post("/master/deliver", { email: "artist@example.com", objectKey: key, stripeSessionId: "cs_test_paid" })
  check(r.status === 200 && r.json?.success === true && r.json?.downloadPageUrl !== undefined, `still delivers with an email (${r.status} ${r.json?.error || ""})`)
  check(spy().some((c) => c.name === "deliverMasterExportEmail" && c.args.email === "artist@example.com"), "still hands the email to deliverMasterExportEmail")
} catch (err) {
  failures++
  console.log("  FAIL " + (err?.stack || err))
  console.log(out)
} finally {
  cleanup()
}
console.log(`${failures === 0 ? "PASS" : "FAIL"}: master download ${checks} check(s), ${failures} failure(s)`)
process.exit(failures === 0 ? 0 : 1)
