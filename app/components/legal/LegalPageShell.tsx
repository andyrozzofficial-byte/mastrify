"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import CinematicBackground from "../CinematicBackground"
import CinematicDivider from "../CinematicDivider"

const EASE = [0.22, 1, 0.36, 1] as const

const PROSE =
  "text-[15px] leading-[1.75] text-muted-strong [&_p]:leading-[1.75] [&_p+_p]:mt-4 [&_ul]:mt-1 [&_ul]:space-y-3.5 [&_li]:flex [&_li]:items-start [&_li]:gap-3 [&_li]:leading-[1.7]"

export type LegalSection = {
  title: string
  body: ReactNode
  /** Slightly narrower measure for dense legal paragraphs */
  narrow?: boolean
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
      className="relative min-h-screen overflow-hidden text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <CinematicBackground intensity="strong" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)]"
        aria-hidden
      />

      <main className="relative z-10 mx-auto w-full max-w-[640px] px-5 pb-24 pt-12 md:px-8 md:pb-28 md:pt-16">
        <motion.header
          className="max-w-[34rem]"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <span className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-200/70">
            {label}
          </span>
          <h1 className="mt-7 text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-white/95 sm:text-[2.35rem]">
            {title}
          </h1>
          <p className="mt-6 text-[16px] leading-[1.72] text-muted md:text-[17px] md:leading-[1.78]">{lead}</p>
        </motion.header>

        <CinematicDivider className="my-12 md:my-14" />

        <div className="space-y-0">
          {sections.map((section, i) => (
            <div key={section.title}>
              {i > 0 ? (
                <div
                  className="mb-12 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent md:mb-14"
                  aria-hidden
                />
              ) : null}
              <motion.section
                initial={reduce ? false : { opacity: 0, y: 10 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-32px" }}
                transition={{ duration: 0.55, delay: i * 0.03, ease: EASE }}
                className="rounded-[1.15rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.035] to-black/[0.32] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-md md:p-8"
              >
                <h2 className="text-[17px] font-semibold leading-snug tracking-[-0.02em] text-white/92">
                  {section.title}
                </h2>
                <div
                  className={`mt-6 ${PROSE} ${section.narrow ? "mx-auto max-w-[32rem]" : "max-w-[36rem]"}`}
                >
                  {section.body}
                </div>
              </motion.section>
            </div>
          ))}
        </div>

        {children ? <div className="mt-14 md:mt-16">{children}</div> : null}

        <p className="mt-16 border-t border-white/[0.06] pt-8 text-center text-[10px] leading-relaxed tracking-[0.04em] text-white/38 md:mt-20">
          Last updated {year}. Questions?{" "}
          <a
            href="/contact"
            className="text-white/48 underline-offset-2 transition hover:text-violet-200/75 hover:underline"
          >
            Contact us
          </a>
          .
        </p>
      </main>
    </motion.div>
  )
}
