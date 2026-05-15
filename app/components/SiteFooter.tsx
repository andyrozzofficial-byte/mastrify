"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import Link from "next/link"
import PremiumButton from "./PremiumButton"

const product = [
  { href: "/analyze", label: "Analyze" },
  { href: "/master", label: "Master" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
] as const

const support = [
  { href: "/how-it-works", label: "Why Mastrify" },
  { href: "mailto:support@mastrify.com", label: "Contact" },
  { href: "#privacy", label: "Privacy" },
] as const

function WaveMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M4 12c2-4 4 4 6 0s4 4 6 0 2 4 4 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SocialPlaceholder({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className="flex h-8 w-8 items-center justify-center rounded-full text-white/28 transition hover:bg-white/[0.04] hover:text-white/50"
      aria-label={`${label} (coming soon)`}
    >
      {children}
    </button>
  )
}

export default function SiteFooter() {
  const reduce = useReducedMotion()
  const year = new Date().getFullYear()

  return (
    <footer className="relative mt-auto overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/25 to-transparent"
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-violet-500/[0.06] to-transparent"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(88,28,135,0.1),transparent_55%),radial-gradient(ellipse_35%_30%_at_12%_40%,rgba(34,211,238,0.04),transparent_50%)]"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative mx-auto max-w-[1080px] px-5 pt-16 pb-4 md:px-10 md:pt-20"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <span id="privacy" className="sr-only">
          Privacy policy — placeholder anchor for footer Privacy link until a dedicated page exists.
        </span>

        {/* Embedded mastering CTA — not a floating widget */}
        <motion.div
          className="relative mb-16 border-b border-white/[0.05] pb-14 md:mb-16 md:pb-16"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="pointer-events-none absolute -left-8 top-1/2 h-32 w-48 -translate-y-1/2 rounded-full bg-violet-600/[0.06] blur-3xl"
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute right-0 top-0 h-24 w-40 rounded-full bg-cyan-500/[0.04] blur-3xl"
            aria-hidden
            animate={reduce ? undefined : { opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="max-w-md"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-200/40">Release ready</p>
              <h2 className="mt-2 text-[1.35rem] font-semibold tracking-[-0.02em] text-white/88 sm:text-[1.5rem]">
                Ready to master your track?
              </h2>
              <p className="mt-2.5 max-w-sm text-[13px] leading-relaxed text-white/32 md:text-[14px]">
                Studio-grade mastering shaped with musical restraint — pay only for what you export.
              </p>
            </motion.div>
            <PremiumButton href="/master" className="w-full shrink-0 sm:w-auto md:min-w-[200px]">
              Start mastering
            </PremiumButton>
          </motion.div>
        </motion.div>

        <div className="grid gap-12 md:grid-cols-12 md:gap-x-14 lg:gap-x-16">
          <motion.div
            className="md:col-span-5 lg:col-span-4"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link href="/" className="inline-flex items-center gap-2.5">
              <WaveMark className="h-5 w-5 shrink-0 text-violet-400/80" />
              <span className="text-[17px] font-semibold tracking-[-0.02em] text-white/88">Mastrify</span>
            </Link>
            <p className="mt-4 max-w-[18rem] text-[13px] leading-relaxed text-white/30">
              Intelligent mastering for music that deserves to be heard at its full emotional weight.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 gap-10 sm:gap-14 md:col-span-4 md:col-start-7 lg:col-span-4 lg:col-start-6"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/28">Product</p>
              <ul className="mt-4 space-y-3">
                {product.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-[13px] text-white/48 transition hover:text-white/78"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/28">Support</p>
              <ul className="mt-4 space-y-3">
                {support.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[13px] text-white/48 transition hover:text-white/78"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>

          <motion.div
            className="flex flex-col justify-end md:col-span-3 md:col-start-10 lg:col-span-4 lg:col-start-9"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/28">Follow</p>
            <motion.div
              className="mt-3 flex gap-1"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <SocialPlaceholder label="Instagram">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="3.5" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </SocialPlaceholder>
              <SocialPlaceholder label="TikTok">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.69V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 011.14.23V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.14-5.1v-7a8.16 8.16 0 004.45 1.33V7.95a5.7 5.7 0 01-4-.26z" />
                </svg>
              </SocialPlaceholder>
              <SocialPlaceholder label="X">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </SocialPlaceholder>
            </motion.div>
          </motion.div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-3 border-t border-white/[0.04] pt-8 md:mt-16 md:flex-row md:justify-between md:pt-9">
          <p className="text-[11px] text-white/24">© {year} Mastrify</p>
        </div>

        <p className="mt-8 pb-10 text-center text-[9px] font-normal uppercase tracking-[0.28em] text-white/16 md:pb-12">
          Designed &amp; engineered by{" "}
          <span className="tracking-[0.22em] text-white/22 transition duration-500 hover:text-violet-200/35">
            Lunov
          </span>
        </p>
      </motion.div>
    </footer>
  )
}
