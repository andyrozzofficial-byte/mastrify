"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import CinematicBackground from "../CinematicBackground"
import CinematicDivider from "../CinematicDivider"

const EASE = [0.22, 1, 0.36, 1] as const

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

      <main className="relative z-10 mx-auto w-full max-w-[720px] px-5 pb-14 pt-8 md:px-10 md:pb-16 md:pt-10">
        <motion.header
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <span className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-200/70">
            {label}
          </span>
          <h1 className="mt-5 text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-white/95 sm:text-[2.25rem]">
            {title}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted md:text-[16px]">{lead}</p>
        </motion.header>

        <CinematicDivider className="my-10 md:my-12" />

        <div className="space-y-9 md:space-y-10">
          {sections.map((section, i) => (
            <motion.section
              key={section.title}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-24px" }}
              transition={{ duration: 0.55, delay: i * 0.04, ease: EASE }}
              className="rounded-xl border border-white/[0.07] bg-black/[0.28] p-5 backdrop-blur-md md:p-6"
            >
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-white/90">{section.title}</h2>
              <motion.div className="mt-3 space-y-2.5 text-[14px] leading-relaxed text-muted-strong [&_li]:flex [&_li]:gap-2.5 [&_ul]:space-y-2">
                {section.body}
              </motion.div>
            </motion.section>
          ))}
        </div>

        {children ? <div className="mt-10">{children}</div> : null}

        <p className="mt-12 text-center text-[11px] text-muted-soft">
          Last updated {new Date().getFullYear()}. Questions?{" "}
          <a href="/contact" className="text-violet-200/70 underline-offset-2 hover:text-violet-200/90 hover:underline">
            Contact us
          </a>
          .
        </p>
      </main>
    </motion.div>
  )
}
