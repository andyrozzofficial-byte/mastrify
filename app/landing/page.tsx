"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import type { ReactNode } from "react"
import CinematicBackground from "../components/CinematicBackground"
import ScoreRing from "../components/ScoreRing"

const previewRows = [
  { label: "Low end", status: "Needs work", dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.38)]", statusClass: "text-rose-400" },
  {
    label: "Too much dynamic range",
    status: "Major issue",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.32)]",
    statusClass: "text-amber-300",
  },
  { label: "Stereo image", status: "Good", dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.28)]", statusClass: "text-emerald-400" },
  { label: "Loudness", status: "Good", dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.28)]", statusClass: "text-emerald-400" },
]

const dawLogos = ["Ableton", "FL Studio", "Logic Pro", "Pro Tools", "Studio One"]

function HeroCheck({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[14px] text-white/65 md:text-[15px]">
      <span
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/[0.05] text-[9px] font-bold text-cyan-200/95"
        aria-hidden
      >
        ✓
      </span>
      <span>{children}</span>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="relative overflow-hidden bg-black px-5 pb-10 pt-4 text-white md:px-10 md:pb-12 md:pt-5 lg:pt-5">
      <CinematicBackground intensity="strong" />

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 top-0 h-[min(680px,78vh)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(ellipse_88%_58%_at_50%_-8%,rgba(124,58,237,0.15),transparent_58%),radial-gradient(ellipse_42%_48%_at_88%_18%,rgba(34,211,238,0.08),transparent_50%)]"
          animate={{ opacity: [0.88, 1, 0.88] }}
          transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
        />
      </motion.div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-col pb-0">
        {/* Hero */}
        <div className="grid items-start gap-8 pt-0 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-x-14 lg:gap-y-6 lg:pt-0 xl:gap-x-16">
          <div className="text-center lg:max-w-none lg:pr-2 lg:text-left">
            <div className="inline-flex rounded-full border border-purple-500/38 bg-purple-500/[0.1] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-purple-200/95 shadow-[0_0_22px_rgba(168,85,247,0.22)]">
              AI powered
            </div>

            <h1 className="mt-5 text-[2.65rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-white sm:text-[2.85rem] lg:mt-6 lg:text-[3.65rem] lg:leading-[1.03] xl:text-[4rem]">
              Fix your mix{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent">before</span>
              <br />
              you master it.
            </h1>

            <p className="mx-auto mt-5 max-w-[29rem] text-[16px] leading-relaxed text-white/45 sm:text-[17px] lg:mx-0 lg:mt-6 lg:max-w-[31rem] lg:text-lg lg:leading-relaxed">
              AI shows you exactly what&apos;s holding your track back — before you release it.
            </p>

            <div className="mx-auto mt-7 flex w-full max-w-[29rem] flex-col gap-3.5 sm:max-w-none sm:flex-row sm:justify-center lg:mx-0 lg:mt-8 lg:max-w-none lg:justify-start">
              <Link
                href="/analyze"
                className="inline-flex min-h-[56px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#7c3aed] via-[#6366f1] to-[#2563eb] px-8 py-4 text-[15px] font-semibold text-white shadow-[0_0_34px_rgba(99,102,241,0.36),0_22px_56px_rgba(0,0,0,0.48)] transition hover:brightness-110 sm:min-w-[240px] sm:flex-none lg:min-h-[58px] lg:px-10 lg:text-base"
              >
                Analyze my mix — It&apos;s free
              </Link>
              <Link
                href="/master"
                className="inline-flex min-h-[56px] flex-1 items-center justify-center rounded-xl border border-white/22 bg-transparent px-8 py-4 text-[15px] font-semibold text-white/95 transition hover:border-white/38 hover:bg-white/[0.07] hover:shadow-[0_0_22px_rgba(255,255,255,0.05)] sm:min-w-[192px] sm:flex-none lg:min-h-[58px] lg:text-base"
              >
                Try Mastering
              </Link>
            </div>

            <div className="mx-auto mt-7 flex max-w-md flex-col items-start gap-3 sm:mx-auto sm:max-w-xl sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-2.5 lg:mx-0 lg:mt-8 lg:justify-start">
              <HeroCheck>Free analysis</HeroCheck>
              <HeroCheck>Instant feedback</HeroCheck>
              <HeroCheck>No signup</HeroCheck>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[500px] lg:mx-0 lg:max-w-none lg:pt-0">
            {/* Stronger purple / cyan halo behind preview card */}
            <div
              className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-purple-500/22 via-fuchsia-500/8 to-cyan-400/16 opacity-90 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -inset-12 rounded-[2.5rem] bg-gradient-to-tr from-purple-600/14 via-transparent to-cyan-500/12 blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <div className="overflow-hidden rounded-[22px] border border-white/[0.13] bg-gradient-to-b from-white/[0.09] to-black/[0.76] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_44px_110px_rgba(0,0,0,0.62)] backdrop-blur-2xl md:rounded-3xl md:p-11 lg:p-12">
                <div className="flex flex-col-reverse items-center gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <p className="max-w-[17rem] text-center text-[16px] leading-snug text-white/72 sm:max-w-[15rem] sm:text-left md:text-[17px] md:leading-snug">
                    Your mix is <span className="font-semibold text-white">44%</span> ready for release
                  </p>
                  <ScoreRing value={44} size={192} variant="percent" />
                </div>

                <div className="mt-6 space-y-0 divide-y divide-white/[0.07] rounded-xl border border-white/[0.08] bg-black/30">
                  {previewRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3.5 md:px-5 md:py-[15px]">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.dot}`} />
                        <span className="truncate text-[13px] text-white/85 md:text-[14px]">{row.label}</span>
                      </div>
                      <span className={`shrink-0 text-[12px] font-medium md:text-[13px] ${row.statusClass}`}>{row.status}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/analyze"
                  className="mt-6 flex min-h-[52px] w-full items-center justify-center rounded-xl border border-purple-500/42 bg-gradient-to-b from-white/[0.09] to-black/60 text-[15px] font-semibold text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_16px_48px_rgba(0,0,0,0.4)] transition hover:border-purple-400/55 hover:brightness-105"
                >
                  Analyze your mix
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="relative mx-auto mt-10 w-full md:mt-11 lg:mt-12">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[3px] w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-fuchsia-400/70 to-transparent opacity-90 blur-[6px] shadow-[0_0_18px_rgba(217,70,239,0.45),0_0_40px_rgba(168,85,247,0.22)]"
            aria-hidden
          />
        </div>

        {/* Trusted by + DAW row */}
        <div className="mx-auto mt-6 w-full max-w-[920px] md:mt-7">
          <p className="text-center text-[13px] leading-relaxed text-white/42 md:text-sm">
            Trusted by 8,000+ producers and artists worldwide
          </p>
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5 sm:gap-x-9 md:mt-6 md:gap-x-11 lg:gap-x-12">
            {dawLogos.map((name) => (
              <li key={name}>
                <span className="block select-none text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30 transition hover:text-white/40 md:text-xs">
                  {name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
