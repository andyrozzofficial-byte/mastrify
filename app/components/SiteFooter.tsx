"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import Link from "next/link"
import PremiumButton from "./PremiumButton"

const EASE = [0.22, 1, 0.36, 1] as const

const product = [
  { href: "/analyze", label: "Analyze" },
  { href: "/master", label: "Master" },
  { href: "/pricing", label: "Pricing" },
] as const

const support = [
  { href: "/how-it-works", label: "Why Mastrify" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
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

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: readonly { href: string; label: string }[]
}) {
  return (
    <motion.div
      initial={false}
      className="min-w-0"
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-label-strong">{title}</p>
      <ul className="mt-3.5 space-y-2.5">
        {links.map(({ href, label }) => (
          <li key={href + label}>
            <Link href={href} className="text-[13px] text-muted-strong transition hover:text-white/90">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

const socialLinks = [
  {
    href: "https://www.instagram.com/mastrify.app?igsh=YzNxNzg1Ynh5cmsx&utm_source=qr",
    label: "Mastrify on Instagram",
  },
  {
    href: "https://www.tiktok.com/@mastrify.app?_r=1&_t=ZN-96NwDmGznjK",
    label: "Mastrify on TikTok",
  },
] as const

function SocialLink({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-muted-soft transition duration-300 hover:border-white/[0.1] hover:bg-white/[0.05] hover:text-white/82 hover:shadow-[0_0_18px_rgba(99,102,241,0.1)]"
    >
      {children}
    </a>
  )
}

export default function SiteFooter() {
  const reduce = useReducedMotion()
  const year = new Date().getFullYear()

  return (
    <footer className="relative mt-auto overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/28 to-transparent"
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-violet-500/[0.06] to-transparent"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_100%,rgba(88,28,135,0.09),transparent_58%),radial-gradient(ellipse_40%_35%_at_85%_30%,rgba(34,211,238,0.035),transparent_50%)]"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.88, 1, 0.88] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative mx-auto w-full max-w-[1180px] px-5 pt-12 pb-8 md:px-10 md:pt-14 md:pb-9"
        initial={reduce ? false : { opacity: 0, y: 14 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-48px" }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-x-10 xl:gap-x-14">
          {/* Brand */}
          <motion.div
            className="lg:col-span-4"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <Link href="/" className="inline-flex items-center gap-2.5">
              <WaveMark className="h-5 w-5 shrink-0 text-violet-400/85" />
              <span className="text-[17px] font-semibold tracking-[-0.02em] text-white/92">Mastrify</span>
            </Link>
            <p className="mt-3.5 max-w-[16.5rem] text-[13px] leading-relaxed text-muted md:max-w-[18rem] md:text-[14px]">
              Intelligent mastering for music that deserves its full emotional weight — release-ready, without the
              noise.
            </p>
          </motion.div>

          {/* Navigation */}
          <motion.div
            className="grid grid-cols-2 gap-x-8 gap-y-7 sm:gap-x-10 lg:col-span-4"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
          >
            <FooterColumn title="Product" links={product} />
            <FooterColumn title="Support" links={support} />
          </motion.div>

          {/* Mastering CTA */}
          <motion.div
            className="lg:col-span-4"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
          >
            <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-black/[0.35] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_48px_rgba(0,0,0,0.35)] backdrop-blur-md md:p-6">
              <motion.div
                className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-600/[0.08] blur-2xl"
                aria-hidden
                animate={reduce ? undefined : { opacity: [0.35, 0.6, 0.35] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-200/58">Release ready</p>
                <h2 className="mt-2 text-[1.15rem] font-semibold tracking-[-0.02em] text-white/90 sm:text-[1.25rem]">
                  Ready to master your track?
                </h2>
                <p className="mt-2 text-[12px] leading-relaxed text-muted sm:text-[13px]">
                  Studio-grade loudness and tone — pay when your export is ready.
                </p>
                <PremiumButton
                  href="/master"
                  className="mt-4 w-full min-h-[46px] px-6 text-[13px] sm:mt-5"
                >
                  Start mastering
                </PremiumButton>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom metadata row */}
        <motion.div
          className="mt-10 flex flex-col gap-5 border-t border-white/[0.07] pt-6 md:mt-11 md:flex-row md:items-center md:justify-between md:gap-6 md:pt-7"
          initial={reduce ? false : { opacity: 0 }}
          whileInView={reduce ? undefined : { opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.1, ease: EASE }}
        >
          <p className="order-1 text-[11px] text-muted-soft md:order-none">© {year} Mastrify</p>

          <p className="order-3 text-center text-[9px] font-normal uppercase tracking-[0.26em] text-muted-faint md:order-none md:flex-1 md:px-4">
            Designed &amp; engineered by{" "}
            <a
              href="https://lunov.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="group/lunov relative inline tracking-[0.2em] text-label transition duration-500 hover:text-violet-200/78"
            >
              <span
                className="pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-md opacity-0 blur-md transition duration-500 group-hover/lunov:bg-violet-500/[0.1] group-hover/lunov:opacity-100"
                aria-hidden
              />
              <span className="relative">Lunov</span>
            </a>
          </p>

          <div className="order-2 flex items-center justify-center gap-1 md:order-none md:justify-end">
            <SocialLink href={socialLinks[0].href} label={socialLinks[0].label}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="3.5" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </SocialLink>
            <SocialLink href={socialLinks[1].href} label={socialLinks[1].label}>
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.69V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 011.14.23V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.14-5.1v-7a8.16 8.16 0 004.45 1.33V7.95a5.7 5.7 0 01-4-.26z" />
              </svg>
            </SocialLink>
          </div>
        </motion.div>
      </motion.div>
    </footer>
  )
}
