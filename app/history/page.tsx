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
    const diff = Date.now() - t
    if (diff < 60_000) return "Just now"
    if (diff < 86_400_000) return `${Math.floor(diff / 60_000)} min ago`
    if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`
    return new Date(t).toLocaleDateString()
  }

  return (
    <div className="relative min-h-screen text-white">
      <CinematicBackground intensity="strong" />
      <div className="relative mx-auto w-full max-w-6xl px-5 pb-28 pt-14 md:px-10 md:pt-20">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400/80">Library</p>
        <h1 className="mt-4 text-center text-4xl font-bold tracking-tight text-transparent md:text-5xl bg-gradient-to-r from-white via-purple-100 to-cyan-100/90 bg-clip-text">
          Projects
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base text-white/50">
          Analyses and masters from this browser. Sync across devices is not available yet.
        </p>

        <div className="mt-12 flex flex-col gap-6 rounded-3xl border border-white/[0.1] bg-gradient-to-b from-white/[0.05] to-black/50 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_32px_88px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
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
                  className={`rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition ${
                    tab === id
                      ? "bg-gradient-to-r from-purple-500/30 to-cyan-500/20 text-white ring-1 ring-white/15 shadow-[0_0_14px_rgba(139,92,246,0.12)]"
                      : "border border-white/10 bg-black/30 text-white/45 hover:border-white/20 hover:text-white/85"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative w-full lg:max-w-sm">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-white/30">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search projects…"
                className="w-full rounded-2xl border border-white/12 bg-black/40 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-purple-400/40 focus:ring-1 focus:ring-purple-500/30"
              />
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.06]">
            <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-white/10 bg-white/[0.03] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 md:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]">
              <span>Track</span>
              <span className="hidden md:block">Stats</span>
              <span className="hidden md:block">When</span>
              <span className="text-right">Actions</span>
            </div>

            {rows.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-white/45">
                No projects yet. Run a{" "}
                <Link href="/analyze" className="font-medium text-purple-300 hover:underline">
                  free analysis
                </Link>{" "}
                or start{" "}
                <Link href="/master" className="font-medium text-cyan-300/90 hover:underline">
                  AI mastering
                </Link>
                .
              </div>
            ) : (
              rows.map((e: HistoryEntry) => (
                <div
                  key={e.id}
                  className="grid grid-cols-1 items-center gap-4 border-b border-white/[0.05] px-5 py-4 transition last:border-0 hover:bg-white/[0.02] md:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-14 shrink-0 items-end justify-center gap-px rounded-lg border border-white/10 bg-black/40 px-1 pb-1">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <span
                          key={i}
                          className="w-0.5 rounded-sm bg-gradient-to-t from-purple-500/50 to-cyan-400/60"
                          style={{ height: `${30 + (i % 4) * 18}%` }}
                        />
                      ))}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            e.kind === "analysis"
                              ? "bg-purple-500/25 text-purple-200 ring-1 ring-purple-400/20"
                              : "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/20"
                          }`}
                        >
                          {e.kind}
                        </span>
                        <span className="truncate font-medium text-white/95">{e.name}</span>
                      </div>
                      <p className="mt-1 text-xs text-white/40 md:hidden">{formatTime(e.createdAt)}</p>
                    </div>
                  </div>
                  <div className="hidden text-sm text-white/55 md:block">
                    {e.mixQuality != null && <span>{Math.round(e.mixQuality)} score</span>}
                    {e.lufs != null && (
                      <span className="ml-2 text-white/40">
                        {e.mixQuality != null ? " · " : ""}
                        {e.lufs.toFixed(1)} LUFS
                      </span>
                    )}
                    {e.mixQuality == null && e.lufs == null && "—"}
                  </div>
                  <div className="hidden text-sm text-white/45 md:block">{formatTime(e.createdAt)}</div>
                  <div className="flex justify-end gap-2">
                    {e.kind === "master" && e.masteredUrl && (
                      <a
                        href={`${e.masteredUrl}?download=1`}
                        download
                        className="rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/90 transition hover:border-cyan-400/35 hover:bg-white/[0.1]"
                      >
                        Download
                      </a>
                    )}
                    <Link
                      href={e.kind === "analysis" ? "/analyze" : "/master"}
                      className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/55 transition hover:border-white/25 hover:text-white"
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
    </div>
  )
}
