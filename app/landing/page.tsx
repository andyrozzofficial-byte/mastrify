"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import { supabase } from "../../lib/supabase"
import CinematicBackground from "../components/CinematicBackground"
import ScoreRing from "../components/ScoreRing"

const previewRows = [
  { label: "Low end", status: "Needs work", dot: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.55)]", statusClass: "text-rose-400" },
  {
    label: "Too much dynamic range",
    status: "Major issue",
    dot: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]",
    statusClass: "text-amber-300",
  },
  { label: "Stereo image", status: "Good", dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]", statusClass: "text-emerald-400" },
  { label: "Loudness", status: "Good", dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]", statusClass: "text-emerald-400" },
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
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase.from("waitlist").select("*", { count: "exact", head: true })

      if (count) setCount(count)
    }

    fetchCount()
  }, [])

  const handleSubmit = async () => {
    setErrorMsg("")

    if (!email) return setErrorMsg("Enter an email")
    if (!email.includes("@")) return setErrorMsg("Enter a valid email")

    setLoading(true)

    const { error } = await supabase.from("waitlist").insert([{ email }])

    setLoading(false)

    if (error) {
      if (error.message.includes("duplicate")) {
        setErrorMsg("You're already on the list 😉")
      } else {
        setErrorMsg("Something went wrong")
      }
      return
    }

    setSubmitted(true)
    setCount((prev) => prev + 1)
    setEmail("")
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-black px-5 pb-28 pt-8 text-white md:min-h-[calc(100vh-4rem)] md:px-10 md:pb-36 md:pt-12 lg:pt-16">
      <CinematicBackground intensity="strong" />

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 top-0 h-[min(720px,85vh)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-5%,rgba(124,58,237,0.18),transparent_58%),radial-gradient(ellipse_45%_50%_at_90%_20%,rgba(37,99,235,0.12),transparent_52%)]"
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
        />
      </motion.div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-col">
        {/* Hero */}
        <div className="grid items-start gap-14 pt-2 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-x-16 lg:gap-y-12 lg:pt-4 xl:gap-x-20">
          <div className="text-center lg:max-w-none lg:pr-2 lg:text-left">
            <div className="inline-flex rounded-full border border-purple-500/35 bg-purple-500/[0.08] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-purple-200/95 shadow-[0_0_28px_rgba(168,85,247,0.32)]">
              AI powered
            </div>

            <h1 className="mt-8 text-[2.5rem] font-extrabold leading-[1.06] tracking-[-0.035em] text-white sm:text-5xl lg:mt-10 lg:text-[3.5rem] lg:leading-[1.04] xl:text-[3.75rem]">
              Fix your mix{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent">before</span>
              <br />
              you master it.
            </h1>

            <p className="mx-auto mt-8 max-w-[28rem] text-[16px] leading-relaxed text-white/45 sm:text-[17px] lg:mx-0 lg:mt-9 lg:max-w-[30rem] lg:text-lg lg:leading-relaxed">
              AI shows you exactly what&apos;s holding your track back — before you release it.
            </p>

            <div className="mx-auto mt-10 flex w-full max-w-[28rem] flex-col gap-4 sm:max-w-none sm:flex-row sm:justify-center lg:mx-0 lg:mt-12 lg:max-w-none lg:justify-start">
              <Link
                href="/analyze"
                className="inline-flex min-h-[54px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#7c3aed] via-[#6366f1] to-[#2563eb] px-8 py-4 text-[15px] font-semibold text-white shadow-[0_0_44px_rgba(99,102,241,0.48),0_20px_56px_rgba(0,0,0,0.38)] transition hover:brightness-110 sm:min-w-[232px] sm:flex-none lg:min-h-[56px] lg:px-10 lg:text-base"
              >
                Analyze my mix — It&apos;s free
              </Link>
              <Link
                href="/master"
                className="inline-flex min-h-[54px] flex-1 items-center justify-center rounded-xl border border-white/22 bg-transparent px-8 py-4 text-[15px] font-semibold text-white/95 transition hover:border-white/38 hover:bg-white/[0.07] hover:shadow-[0_0_32px_rgba(255,255,255,0.07)] sm:min-w-[188px] sm:flex-none lg:min-h-[56px] lg:text-base"
              >
                Try Mastering
              </Link>
            </div>

            <div className="mx-auto mt-10 flex max-w-md flex-col items-start gap-4 sm:mx-auto sm:max-w-xl sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-10 sm:gap-y-3 lg:mx-0 lg:mt-12 lg:justify-start">
              <HeroCheck>Free analysis</HeroCheck>
              <HeroCheck>Instant feedback</HeroCheck>
              <HeroCheck>No signup</HeroCheck>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[440px] lg:mx-0 lg:max-w-none lg:pt-4">
            <div className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-gradient-to-br from-purple-600/22 via-transparent to-cyan-500/18 blur-3xl" />
            <div className="relative overflow-hidden rounded-[22px] border border-white/[0.12] bg-gradient-to-b from-white/[0.08] to-black/[0.74] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_40px_100px_rgba(0,0,0,0.58)] backdrop-blur-2xl md:rounded-3xl md:p-10 lg:p-11">
              <div className="flex flex-col-reverse items-center gap-9 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                <p className="max-w-[16rem] text-center text-[16px] leading-snug text-white/72 sm:max-w-[14rem] sm:text-left md:text-[17px] md:leading-snug">
                  Your mix is <span className="font-semibold text-white">44%</span> ready for release
                </p>
                <ScoreRing value={44} size={168} variant="percent" />
              </div>

              <div className="mt-9 space-y-0 divide-y divide-white/[0.07] rounded-xl border border-white/[0.07] bg-black/28">
                {previewRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3.5 md:px-5 md:py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.dot}`} />
                      <span className="truncate text-[13px] text-white/82 md:text-sm">{row.label}</span>
                    </div>
                    <span className={`shrink-0 text-[12px] font-medium md:text-[13px] ${row.statusClass}`}>{row.status}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/analyze"
                className="mt-8 flex min-h-[50px] w-full items-center justify-center rounded-xl border border-purple-500/38 bg-gradient-to-b from-white/[0.08] to-black/60 text-[15px] font-semibold text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_14px_44px_rgba(0,0,0,0.38)] transition hover:border-purple-400/50 hover:brightness-105"
              >
                Analyze your mix
              </Link>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="relative mx-auto mt-24 w-full md:mt-28 lg:mt-32">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[3px] w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-fuchsia-400/90 to-transparent opacity-90 blur-[6px] shadow-[0_0_28px_rgba(217,70,239,0.85),0_0_60px_rgba(168,85,247,0.45)]"
            aria-hidden
          />
        </div>

        {/* Trusted by + DAW row */}
        <div className="mx-auto mt-16 w-full text-center md:mt-20 lg:mt-24">
          <p className="text-[13px] text-white/36 md:text-sm">Trusted by 8,000+ producers and artists worldwide</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-11 gap-y-6 md:mt-12 md:gap-x-16 lg:gap-x-20">
            {dawLogos.map((name) => (
              <span
                key={name}
                className="select-none text-[11px] font-semibold uppercase tracking-[0.18em] text-white/22 transition hover:text-white/32 md:text-xs"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Waitlist */}
        <div className="relative mx-auto mt-24 w-full max-w-xl md:mt-28 lg:mt-32">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/25 to-cyan-500/20 blur-2xl" />
          <div className="relative flex flex-col gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.05] p-2 backdrop-blur-xl sm:flex-row sm:items-center">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Email for product updates"
              className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-white/35"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "…" : "Join waitlist"}
            </button>
          </div>
          {errorMsg && <p className="mt-2 text-center text-xs text-rose-400">{errorMsg}</p>}
          {submitted && <p className="mt-2 text-center text-xs text-emerald-400">You are on the list.</p>}
          {count > 0 ? (
            <p className="mt-3 text-center text-xs text-white/30">Join {count}+ producers exploring Mastrify</p>
          ) : (
            <p className="mt-3 text-center text-xs text-white/25">Ship cleaner mixes, faster</p>
          )}
        </div>
      </div>
    </div>
  )
}
