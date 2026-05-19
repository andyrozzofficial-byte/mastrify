"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import CinematicBackground from "../components/CinematicBackground"
import MarketingPageAmbient from "../components/MarketingPageAmbient"
import MarketingDesktopHero from "../components/cinematic/MarketingDesktopHero"
import PremiumButton from "../components/PremiumButton"

const EASE = [0.22, 1, 0.36, 1] as const

const STEPS = [
  {
    title: "Upload your mix",
    body: "Bring a stereo mix you are proud of. The engine listens to your music as a whole — not just its loudness.",
    icon: UploadIcon,
  },
  {
    title: "Perceptual analysis",
    body: "We map dynamics, tone, stereo balance, and energy so decisions follow what the track actually needs.",
    icon: AnalysisIcon,
  },
  {
    title: "Dynamic & tonal shaping",
    body: "Movement and punch are preserved while the chain gently opens clarity where the mix allows it.",
    icon: DynamicsIcon,
  },
  {
    title: "Stereo & spatial refinement",
    body: "Width and depth are adjusted with care — enough presence for release, never a washed-out spread.",
    icon: StereoIcon,
  },
  {
    title: "Intelligent loudness",
    body: "Loudness is shaped musically toward your goal, with transparency when the material asks for restraint.",
    icon: LoudnessIcon,
  },
  {
    title: "Release-ready master",
    body: "You receive a polished master that still feels like your mix — ready for streaming and sharing.",
    icon: MasterIcon,
  },
] as const

const PHILOSOPHY = [
  {
    title: "Punch and movement stay",
    body: "Transient life and groove are treated as musical features, not problems to flatten away.",
  },
  {
    title: "Adapts to your material",
    body: "Dense, dynamic, or already-loud mixes each get a different amount of care — never a one-size chain.",
  },
  {
    title: "Earned processing",
    body: "When the mix is already balanced, the engine holds back instead of pushing for effect.",
  },
  {
    title: "Musical loudness",
    body: "Level is guided toward your target with judgment — not brute-force limiting for a number on a meter.",
  },
  {
    title: "Dynamic material respected",
    body: "Songs that breathe keep their contrast; the master supports the performance you captured.",
  },
  {
    title: "Reference-aware tone",
    body: "Optional reference tracks inform subtle tonal balance without copying someone else's level.",
  },
] as const

const TRUST = [
  "Transient-safe processing",
  "Adaptive loudness",
  "Stereo-aware analysis",
  "Musical dynamics preserved",
  "Reference-aware tonal balance",
  "Material-aware decisions",
] as const

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200/50">{children}</p>
  )
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4M4 18v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </svg>
  )
}

function AnalysisIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
      <path strokeLinecap="round" d="M4 18V6m4 12V10m4 8V8m4 10V4m4 14v-4" />
    </svg>
  )
}

function DynamicsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12c3-6 6-6 9 0s6 6 9 0" />
    </svg>
  )
}

function StereoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
      <circle cx="8" cy="12" r="3" />
      <circle cx="16" cy="12" r="3" />
      <path strokeLinecap="round" d="M11 12h2" />
    </svg>
  )
}

function LoudnessIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
      <path strokeLinecap="round" d="M4 14V10m4 12V6m4 16V4m4 14V8m4 10v-4" />
    </svg>
  )
}

function MasterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M12 3a9 9 0 100 18 9 9 0 000-18z" />
    </svg>
  )
}

export default function HowItWorksClient() {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className="marketing-page-root relative min-h-screen overflow-x-clip text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      <CinematicBackground intensity="strong" marketingLite />

      <MarketingPageAmbient />

      <MarketingDesktopHero>
        <span className="hero-eyebrow-pill">Intelligent mastering</span>

        <h1 className="marketing-hero-title">
          How your music becomes
          <span className="marketing-hero-title-accent">release-ready</span>
        </h1>

        <p className="hero-lead lg:mx-0">
          Mastrify listens like an engineer who cares about the song — preserving dynamics, emotional movement, and the
          identity of your mix while bringing it to a confident, streaming-ready level.
        </p>

        <ul className="marketing-hero-bullets">
          <li className="flex gap-2.5">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/70" aria-hidden />
            Perceptual processing that follows the music, not a fixed template
          </li>
          <li className="flex gap-2.5">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-400/60" aria-hidden />
            Transparency when your material already speaks clearly
          </li>
          <li className="flex gap-2.5 max-lg:hidden">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/70" aria-hidden />
            Loudness and tone shaped with restraint and intent
          </li>
        </ul>

        <motion.div
          className="mobile-cta-stack marketing-hero-cta"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: EASE }}
        >
          <PremiumButton href="/master" className="w-full sm:w-auto sm:px-9">
            Start mastering
          </PremiumButton>
          <PremiumButton href="/analyze" variant="secondary" className="w-full sm:w-auto sm:px-9">
            Analyze a mix first
          </PremiumButton>
        </motion.div>
      </MarketingDesktopHero>

      <section className="page-container section-rhythm relative z-10 border-t border-white/[0.05]">
        <div className="w-full">
          <Reveal className="text-center">
            <SectionLabel>The path to your master</SectionLabel>
            <h2 className="mt-3 text-[1.65rem] font-semibold tracking-[-0.02em] text-white sm:text-[2rem]">
              Six stages of intelligent care
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-white/68 md:text-[15px]">
              Each step is deliberate — built to support your mix, not overwrite it.
            </p>
          </Reveal>

          <motion.div
            className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: reduce ? 0 : 0.08 } },
            }}
          >
            {STEPS.map((step, i) => (
              <motion.article
                key={step.title}
                variants={{
                  hidden: reduce ? {} : { opacity: 0, y: 18 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
                }}
                className="marketing-stage-card transition duration-300 hover:border-white/[0.1] hover:bg-white/[0.045]"
              >
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/[0.06] blur-xl"
                  aria-hidden
                />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-gradient-to-br from-violet-500/15 to-cyan-500/10 text-violet-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-medium tabular-nums text-white/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-0.5 text-[15px] font-semibold tracking-[-0.01em] text-white/92">{step.title}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-white/70">{step.body}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="page-container section-rhythm relative z-10">
        <div className="w-full">
          <div className="overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-black/40 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_32px_80px_rgba(0,0,0,0.5)] md:p-10 lg:p-12">
            <Reveal>
              <SectionLabel>Mastering philosophy</SectionLabel>
              <h2 className="mt-3 max-w-2xl text-[1.65rem] font-semibold leading-[1.15] tracking-[-0.02em] text-white sm:text-[2rem]">
                Smart transparency — the mix stays yours
              </h2>
              <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-white/72 md:text-[15px]">
                Great mastering is often about what you choose not to do. Mastrify earns each move of the chain — so
                punch, space, and emotion survive the journey to release.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {PHILOSOPHY.map((item, i) => (
                <Reveal key={item.title} delay={i * 0.05}>
                  <div className="rounded-xl border border-white/[0.06] bg-black/30 px-4 py-4 transition hover:border-white/[0.09] hover:bg-black/40 md:px-5 md:py-5">
                    <h3 className="text-[14px] font-semibold text-violet-100/90">{item.title}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-white/68">{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="page-container section-rhythm relative z-10 border-t border-white/[0.05]">
        <motion.div className="w-full">
          <div className="marketing-split-grid grid gap-10">
            <Reveal>
              <SectionLabel>Before you upload</SectionLabel>
              <h2 className="mt-3 text-[1.65rem] font-semibold tracking-[-0.02em] text-white sm:text-[2rem]">
                Give your mix a little room to breathe
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-white/72 md:text-[15px]">
                Clean, unclipped mixes with some dynamic space usually produce the most transparent masters. You do not
                need to hit a specific peak level — just avoid slamming the bus if you want the most open result.
              </p>
              <p className="mt-4 text-[14px] leading-relaxed text-white/68 md:text-[15px]">
                Already heavily limited or loud? That is fine. The engine reads the material and adapts — supporting
                what is there instead of fighting it.
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="rounded-[1.15rem] border border-white/[0.07] bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_56px_rgba(0,0,0,0.4)] backdrop-blur-xl md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/64">Helpful habits</p>
                <ul className="mt-5 space-y-4">
                  {[
                    "Leave a little headroom on your stereo bus — not for rules, but for clarity.",
                    "Check that nothing is clipping before export; distortion limits what mastering can recover.",
                    "Trust your ears: if the mix already feels finished, choose a gentler loudness goal.",
                    "Use analyze first if you are unsure — it highlights what the song may need.",
                  ].map((tip) => (
                    <li key={tip} className="flex gap-3 text-[13px] leading-relaxed text-white/75">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-400/60" aria-hidden />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </motion.div>
      </section>

      {/* Trust */}
      <section className="relative z-10 pb-14 pt-2 md:pb-28 md:pt-4">
        <div className="mx-auto max-w-[1080px] px-5 md:px-10">
          <Reveal className="text-center">
            <SectionLabel>Built for real music</SectionLabel>
            <h2 className="mt-3 text-[1.5rem] font-semibold tracking-[-0.02em] text-white sm:text-[1.75rem]">
              Engineered for trust at every stage
            </h2>
          </Reveal>

          <Reveal delay={0.08} className="mt-8 flex flex-wrap justify-center gap-2 md:gap-2.5">
            {TRUST.map((label) => (
              <span
                key={label}
                className="rounded-full border border-white/[0.07] bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md transition hover:border-white/[0.1] hover:text-white/88"
              >
                {label}
              </span>
            ))}
          </Reveal>

          <Reveal delay={0.15} className="mt-14 text-center">
            <p className="text-[14px] text-white/66">Ready when your mix is.</p>
            <Link
              href="/master"
              className="mt-5 inline-flex min-h-[52px] items-center justify-center rounded-xl bg-gradient-to-r from-[#5b21b6] via-[#4f46e5] to-[#1d4ed8] px-10 text-[15px] font-semibold text-white shadow-[0_0_14px_rgba(99,102,241,0.12),0_10px_28px_rgba(0,0,0,0.38)] ring-1 ring-white/[0.08] transition hover:brightness-[1.06]"
            >
              Master your track
            </Link>
          </Reveal>
        </div>
      </section>
    </motion.div>
  )
}
