"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import CinematicBackground from "../../components/CinematicBackground"
import { btnMastrifySecondaryCore } from "../../components/buttonEffects"
import {
  masterFileDownloadName,
  triggerMasterFileDownload,
} from "../../../lib/masterDownload"
import { PUBLIC_BACKEND_API_BASE } from "../../../lib/publicBackendUrl"

type DownloadSession = {
  playbackUrl: string
  expiresAt: string
  trackTitle: string | null
}

export default function SecureDownloadClient() {
  const searchParams = useSearchParams()
  const query = useMemo(() => {
    const key = searchParams.get("key")?.trim() || ""
    const exp = searchParams.get("exp")?.trim() || ""
    const sig = searchParams.get("sig")?.trim() || ""
    return { key, exp, sig }
  }, [searchParams])

  const [session, setSession] = useState<DownloadSession | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [downloadError, setDownloadError] = useState("")

  useEffect(() => {
    if (!query.key || !query.exp || !query.sig) {
      setError("This download link is invalid.")
      setLoading(false)
      return
    }

    let cancelled = false
    const params = new URLSearchParams(query)

    void (async () => {
      setLoading(true)
      setError("")
      try {
        const res = await fetch(`${PUBLIC_BACKEND_API_BASE}/master/download-session?${params.toString()}`)
        const data = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok || data?.success === false || typeof data?.playbackUrl !== "string") {
          throw new Error(data?.error || "Could not open your secure download")
        }
        setSession({
          playbackUrl: data.playbackUrl.trim(),
          expiresAt: typeof data.expiresAt === "string" ? data.expiresAt : query.exp,
          trackTitle: typeof data.trackTitle === "string" ? data.trackTitle : null,
        })
      } catch (err) {
        if (!cancelled) {
          setSession(null)
          setError(err instanceof Error ? err.message : "Could not open your secure download")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [query])

  const handleDownload = async () => {
    if (!session?.playbackUrl) return
    setDownloadLoading(true)
    setDownloadError("")
    try {
      await triggerMasterFileDownload(
        session.playbackUrl,
        masterFileDownloadName(session.playbackUrl, session.trackTitle),
      )
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed. Please try again.")
    } finally {
      setDownloadLoading(false)
    }
  }

  const heading = session?.trackTitle ? `Your master of "${session.trackTitle}" is ready!` : "Your master is ready!"

  return (
    <div className="relative min-h-[100dvh] overflow-x-clip text-white">
      <CinematicBackground intensity="subtle" />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-5 py-12">
        {loading ? (
          <p className="text-center text-sm text-white/65">Opening your secure download…</p>
        ) : error ? (
          <div className="rounded-2xl border border-white/[0.08] bg-black/45 p-6 text-center backdrop-blur-md">
            <h1 className="text-xl font-semibold tracking-tight text-white">Download unavailable</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/68">{error}</p>
          </div>
        ) : session ? (
          <div className="rounded-2xl border border-white/[0.08] bg-black/45 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-200/55">Secure download</p>
            <h1 className="mt-3 text-[1.45rem] font-semibold leading-snug tracking-[-0.02em] text-white sm:text-[1.65rem]">
              {heading}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/68">
              Preview your master below, then download the full-quality WAV export.
            </p>

            <audio
              controls
              playsInline
              preload="metadata"
              src={session.playbackUrl}
              className="mt-6 w-full"
            />

            <div className="mt-5 flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={downloadLoading}
                className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-xl px-5 text-[13px] font-semibold sm:w-auto sm:min-w-[12rem] ${btnMastrifySecondaryCore}`}
              >
                {downloadLoading ? "Preparing download…" : "Download Master"}
              </button>
              {downloadError ? (
                <p className="text-center text-[11px] text-rose-300/85">{downloadError}</p>
              ) : null}
            </div>

            <p className="mt-5 text-center text-[11px] leading-relaxed text-white/45">
              Your secure download link remains active for 12 hours.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
