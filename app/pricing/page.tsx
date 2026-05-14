"use client"

import { motion } from "framer-motion"
import CinematicBackground from "../components/CinematicBackground"

export default function Pricing() {
  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <CinematicBackground intensity="strong" />

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_88%_52%_at_50%_0%,rgba(124,58,237,0.14),transparent_55%),radial-gradient(ellipse_48%_42%_at_80%_20%,rgba(34,211,238,0.07),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[28%] h-[min(420px,70vh)] w-[min(92vw,36rem)] -translate-x-1/2 rounded-[3rem] bg-[radial-gradient(ellipse_58%_44%_at_50%_50%,rgba(109,40,217,0.08),rgba(217,70,239,0.03)_50%,transparent_70%)] blur-3xl"
        aria-hidden
      />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[520px] flex-col items-center justify-start px-5 pb-14 pt-7 sm:max-w-[580px] md:max-w-[640px] md:px-8 md:pb-16 md:pt-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative w-full max-w-lg md:max-w-xl"
        >
          <div
            className="pointer-events-none absolute -inset-4 rounded-[1.75rem] bg-gradient-to-br from-purple-500/18 via-fuchsia-500/8 to-cyan-400/12 opacity-90 blur-2xl md:-inset-6 md:rounded-[2rem]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(280px,70vw)] w-[min(420px,95%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_40%_36%_at_50%_50%,rgba(147,51,234,0.12),transparent_62%)] blur-2xl"
            aria-hidden
          />

          <div className="relative overflow-hidden rounded-[1.35rem] border border-white/[0.14] bg-gradient-to-b from-black/[0.55] to-black/[0.92] p-9 shadow-[0_0_0_1px_rgba(167,139,250,0.12),0_0_28px_rgba(88,28,135,0.14),0_32px_72px_rgba(0,0,0,0.65)] ring-1 ring-fuchsia-500/10 backdrop-blur-2xl md:rounded-[1.5rem] md:p-11 lg:p-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-purple-600/12 blur-3xl" aria-hidden />

            <div className="relative text-center">
              <span className="inline-flex rounded-full border border-purple-500/35 bg-purple-500/[0.08] px-3.5 py-1 text-[9px] font-bold uppercase tracking-[0.26em] text-purple-200/95">
                Full export
              </span>

              <h1 className="mt-5 text-[1.85rem] font-extrabold leading-[1.08] tracking-tight text-white sm:text-[2.1rem] md:mt-6 md:text-[2.35rem]">
                Unlock full master
              </h1>

              <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-white/38 sm:text-[15px]">
                Download your track in full studio quality — one simple unlock.
              </p>

              <div className="mx-auto mt-8 text-[3.25rem] font-bold tabular-nums leading-none tracking-tight text-white sm:text-[3.75rem] md:mt-9 md:text-[4.25rem]">
                49 kr
              </div>

              <ul className="mx-auto mt-8 max-w-sm space-y-3 text-left text-[14px] leading-snug text-white/55 sm:text-[15px] md:mt-9">
                <li className="flex gap-3">
                  <span className="mt-0.5 text-emerald-400/90" aria-hidden>
                    ✓
                  </span>
                  <span>Full quality WAV</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 text-emerald-400/90" aria-hidden>
                    ✓
                  </span>
                  <span>Release-ready loudness</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 text-emerald-400/90" aria-hidden>
                    ✓
                  </span>
                  <span>Ready for Spotify &amp; streaming</span>
                </li>
              </ul>

              <button
                type="button"
                onClick={() => {
                  localStorage.setItem("unlocked", "true")
                  window.location.href = "/app"
                }}
                className="mt-8 w-full rounded-xl bg-gradient-to-r from-[#5b21b6] via-[#4338ca] to-[#0e7490] px-8 py-4 text-[15px] font-semibold text-white shadow-[0_0_22px_rgba(91,33,182,0.28),0_0_14px_rgba(14,116,144,0.14),inset_0_1px_0_rgba(255,255,255,0.12),0_14px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/10 transition duration-300 hover:brightness-110 sm:text-[16px] md:mt-9"
              >
                Pay &amp; unlock
              </button>

              <p className="mt-5 text-center text-[11px] text-white/28 sm:text-xs">Test mode — no real payment yet</p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
