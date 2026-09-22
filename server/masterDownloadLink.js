import crypto from "crypto"

const DEFAULT_SITE_URL = "https://www.mastrify.com"

function downloadLinkSecret() {
  return (
    process.env.MASTRIFY_DOWNLOAD_LINK_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.STRIPE_SECRET_KEY?.trim() ||
    ""
  )
}

function siteBaseUrl() {
  const raw = process.env.MASTRIFY_SITE_URL?.trim() || DEFAULT_SITE_URL
  return raw.replace(/\/+$/, "")
}

function signPayload(objectKey, expiresAt) {
  const secret = downloadLinkSecret()
  if (!secret) throw new Error("Download link secret not configured")
  return crypto.createHmac("sha256", secret).update(`${objectKey}:${expiresAt}`).digest("base64url")
}

export function buildMasterDownloadPageUrl(objectKey, expiresAt) {
  const key = typeof objectKey === "string" ? objectKey.trim() : ""
  const exp = typeof expiresAt === "string" ? expiresAt.trim() : ""
  if (!key || !exp) throw new Error("Missing download page parameters")
  const sig = signPayload(key, exp)
  const params = new URLSearchParams({
    key,
    exp,
    sig,
  })
  return `${siteBaseUrl()}/master/download?${params.toString()}`
}

export function verifyMasterDownloadLink(objectKey, expiresAt, sig) {
  const key = typeof objectKey === "string" ? objectKey.trim() : ""
  const exp = typeof expiresAt === "string" ? expiresAt.trim() : ""
  const signature = typeof sig === "string" ? sig.trim() : ""
  if (!key || !exp || !signature) {
    return { ok: false, status: 400, error: "Invalid download link" }
  }

  const secret = downloadLinkSecret()
  if (!secret) {
    return { ok: false, status: 500, error: "Download link verification unavailable" }
  }

  const expected = signPayload(key, exp)
  let expectedBuf
  let sigBuf
  try {
    expectedBuf = Buffer.from(expected)
    sigBuf = Buffer.from(signature)
  } catch {
    return { ok: false, status: 403, error: "Invalid download link" }
  }
  if (expectedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expectedBuf, sigBuf)) {
    return { ok: false, status: 403, error: "Invalid download link" }
  }

  const expiresMs = Date.parse(exp)
  if (!Number.isFinite(expiresMs) || Date.now() > expiresMs) {
    return { ok: false, status: 410, error: "This download link has expired" }
  }

  if (key.includes("..") || key.includes("/") || key.includes("\\")) {
    return { ok: false, status: 400, error: "Invalid download link" }
  }

  return { ok: true, objectKey: key, expiresAt: exp }
}
