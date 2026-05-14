"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import CinematicBackground from "../components/CinematicBackground"
import { getHistory, type HistoryEntry } from "../../lib/history"

type Tab = "all" | "analysis" | "master"

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>("all")
  const [q, setQ] = useState("")

  const rows = useMemo(() => {
    const all = getHistory()
    const filtered =
      tab === "all" ? all : all.filter((e) => (tab === "analysis" ? e.kind === "analysis" : e.kind === "master"))
    const qq = q.trim().toLowerCase()
    if (!qq) return filtered
    return filtered.filter((e) => e.name.toLowerCase().includes(qq))
  }, [tab, q])

  const formatTime = (t: number) => {
    const d = new Date(t)
    const diff = Date.now() - t
    if (diff < 86_400_000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`
    return d.toLocaleDateString()
  }

  return (
    <div className="relative min-h-screen text-white">
      <CinematicBackground />
      <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-14 md:pt-20">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400/70">Library</p>
        <h1 className="mt-3 text-center text-3xl font-bold tracking-tight text-transparent md:text-4xl bg-gradient-to-r from-white via-purple-100 to-cyan-100/90 bg-clip-text">
          Projects
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm text-white/45">
          Recent analyses and masters on this device. Clear browser data to reset.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            {(
              [
                ["all", "All"],
                ["analysis", "Analysis"],
                ["master", "Masters"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                  tab === id
                    ? "bg-white/[0.1] text-white ring-1 ring-white/15"
                    : "text-white/45 hover:bg-white/[0.04] hover:text-white/80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by filename…"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-purple-400/40 sm:max-w-xs"
          />
        </div>

        <div className="mt-8 space-y-2">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12 text-center text-sm text-white/45 backdrop-blur-xl">
              No entries yet. Run a{" "}
              <Link href="/analyze" className="text-purple-300 hover:underline">
                free analysis
              </Link>{" "}
              or{" "}
              <Link href="/master" className="text-cyan-300/90 hover:underline">
                AI master
              </Link>
              .
            </div>
          ) : (
            rows.map((e: HistoryEntry) => (
              <div
                key={e.id}
                className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        e.kind === "analysis"
                          ? "bg-purple-500/20 text-purple-200"
                          : "bg-cyan-500/15 text-cyan-200"
                      }`}
                    >
                      {e.kind}
                    </span>
                    <span className="truncate font-medium text-white/90">{e.name}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40">
                    {e.mixQuality != null && <span>Score {Math.round(e.mixQuality)}</span>}
                    {e.lufs != null && <span>{e.lufs.toFixed(1)} LUFS</span>}
                    <span>{formatTime(e.createdAt)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {e.kind === "master" && e.masteredUrl && (
                    <a
                      href={`${e.masteredUrl}?download=1`}
                      download
                      className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-medium text-white/85 hover:bg-white/10"
                    >
                      Download
                    </a>
                  )}
                  <Link
                    href={e.kind === "analysis" ? "/analyze" : "/master"}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55 hover:text-white/85"
                  >
                    New
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
