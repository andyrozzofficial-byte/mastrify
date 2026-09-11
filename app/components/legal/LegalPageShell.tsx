"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import CinematicBackground from "../CinematicBackground"

const EASE = [0.22, 1, 0.36, 1] as const

const PROSE =
  "text-[15px] leading-[1.75] text-muted-strong [&_p]:leading-[1.75] [&_p+_p]:mt-4 [&_ul]:mt-1 [&_ul]:space-y-3.5 [&_li]:flex [&_li]:items-start [&_li]:gap-3 [&_li]:leading-[1.7]"

export type LegalSection = {
  title: string
  body: ReactNode
}

type Props = {
  label: string
  title: string
  lead: string
  sections: LegalSection[]
  children?: ReactNode
}

export default function LegalPageShell({ label, title, lead, sections, children }: Props) {
  const reduce = useReducedMotion()
  const year = new Date().getFullYear()

  return (
    <motion.div
      className="marketing-page-root relative min-h-screen overflow-x-clip text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <CinematicBackground intensity="strong" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)]"
        aria-hidden
      />

      <main className="page-container page-hero-pad relative z-10 mx-auto w-full max-w-[720px] pb-20 pt-10 sm:pb-24 sm:pt-12 md:pb-28 md:pt-16">
        <motion.header
          className="mx-auto max-w-[34rem] text-center"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <span className="hero-eyebrow-pill">{label}</span>
          <h1 className="mt-5 text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-white/95 sm:text-[2.35rem]">
            {title}
          </h1>
          <p className="hero-lead mx-auto mt-5 max-w-lg">{lead}</p>
        </motion.header>

        <div className="mx-auto mt-10 max-w-[540px] space-y-5 sm:mt-12 md:mt-14 md:space-y-6">
          {sections.map((section, i) => (
            <motion.section
              key={section.title}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-32px" }}
              transition={{ duration: 0.55, delay: i * 0.03, ease: EASE }}
              className="rounded-[1.15rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.035] to-black/[0.32] p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-7 md:p-8"
            >
              <h2 className="text-[17px] font-semibold leading-snug tracking-[-0.02em] text-white/92">
                {section.title}
              </h2>
              <div className={`mx-auto mt-5 max-w-[28rem] text-left ${PROSE}`}>{section.body}</div>
            </motion.section>
          ))}
        </div>

        {children ? <div className="mx-auto mt-12 max-w-[540px] md:mt-14">{children}</div> : null}

        <p className="mx-auto mt-14 max-w-md border-t border-white/[0.06] pt-8 text-center text-[11px] leading-relaxed tracking-[0.02em] text-white/40 md:mt-16">
          Last updated {year}. Questions?{" "}
          <a
            href="/contact"
            className="text-white/55 underline-offset-2 transition hover:text-violet-200/75 hover:underline"
          >
            Contact us
          </a>
          .
        </p>
      </main>
    </motion.div>
  )
}
