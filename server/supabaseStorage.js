import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

const DEFAULT_SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7 // 7 days

let storageClient = null

function envTruthy(name) {
  const v = process.env[name]
  return v === "1" || v === "true" || v === "yes"
}

export function getMastersBucket() {
  return (
    process.env.SUPABASE_BUCKET_MASTERS ||
    process.env.SUPABASE_BUCKET ||
    process.env.SUPABASE_STORAGE_BUCKET ||
    "masters"
  )
}

export function isSupabaseStorageConfigured() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
}

export function isStorageRequired() {
  return envTruthy("MASTRIFY_STORAGE_REQUIRED")
}

export function isStorageFallbackEnabled() {
  return envTruthy("MASTRIFY_STORAGE_FALLBACK")
}

function getStorageClient() {
  if (!isSupabaseStorageConfigured()) {
    throw new Error("Supabase storage is not configured")
  }
  if (!storageClient) {
    storageClient = createClient(
      process.env.SUPABASE_URL.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
      {
        auth: { persistSession: false, autoRefreshToken: false },
      }
    )
  }
  return storageClient
}

/** Safe object key inside the masters bucket (no path traversal). */
export function masterObjectKey(masterFileName) {
  const base = path.basename(String(masterFileName || ""))
  if (!base || base === "." || base.includes("..")) {
    throw new Error("Invalid master file name")
  }
  return base
}

export function safeUnlink(filePath) {
  if (!filePath) return
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch (err) {
    console.warn("[storage] failed to unlink tmp file:", filePath, err?.message || err)
  }
}

function signedUrlTtlSec() {
  const n = Number(process.env.MASTRIFY_SIGNED_URL_TTL_SEC)
  return Number.isFinite(n) && n > 60 ? Math.floor(n) : DEFAULT_SIGNED_URL_TTL_SEC
}

/**
 * Upload mastered WAV to private Supabase bucket.
 */
export async function uploadMasterWav(localPath, objectKey) {
  const bucket = getMastersBucket()
  const key = masterObjectKey(objectKey)
  const body = fs.readFileSync(localPath)
  const { error } = await getStorageClient().storage.from(bucket).upload(key, body, {
    contentType: "audio/wav",
    upsert: true,
    cacheControl: "3600",
  })
  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`)
  }
  return { bucket, objectKey: key }
}

/**
 * Signed URL for inline playback (Range-friendly for Safari).
 */
export async function createMasterPlaybackSignedUrl(objectKey) {
  const bucket = getMastersBucket()
  const key = masterObjectKey(objectKey)
  const expiresIn = signedUrlTtlSec()
  const { data, error } = await getStorageClient()
    .storage.from(bucket)
    .createSignedUrl(key, expiresIn, { download: false })
  if (error || !data?.signedUrl) {
    throw new Error(`Supabase signed URL failed: ${error?.message || "missing signedUrl"}`)
  }
  return data.signedUrl
}

/**
 * Persist master to Supabase when configured; optional Railway URL fallback.
 * Cleans up local tmp only after successful Supabase upload.
 */
export async function persistMasterExport({
  localMasterPath,
  localUploadPath,
  masterFileName,
  railwayPlaybackUrl,
}) {
  const objectKey = masterObjectKey(masterFileName)
  const afterPath = `/masters/${objectKey}`

  if (!isSupabaseStorageConfigured()) {
    if (isStorageRequired()) {
      throw new Error("Supabase storage required but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing")
    }
    return {
      after: afterPath,
      afterUrl: railwayPlaybackUrl,
      fullUrl: railwayPlaybackUrl,
      storage: "railway",
      objectKey,
    }
  }

  try {
    await uploadMasterWav(localMasterPath, objectKey)
    const signedUrl = await createMasterPlaybackSignedUrl(objectKey)
    safeUnlink(localMasterPath)
    safeUnlink(localUploadPath)
    console.log("[storage] master persisted to Supabase", {
      bucket: getMastersBucket(),
      objectKey,
      ttlSec: signedUrlTtlSec(),
    })
    return {
      after: afterPath,
      afterUrl: signedUrl,
      fullUrl: signedUrl,
      storage: "supabase",
      objectKey,
    }
  } catch (err) {
    console.error("[storage] Supabase persist failed:", err?.message || err)
    if (isStorageFallbackEnabled()) {
      console.warn("[storage] MASTRIFY_STORAGE_FALLBACK=1 — serving master from Railway /tmp")
      return {
        after: afterPath,
        afterUrl: railwayPlaybackUrl,
        fullUrl: railwayPlaybackUrl,
        storage: "railway-fallback",
        objectKey,
        storageError: err?.message || String(err),
      }
    }
    throw err
  }
}
