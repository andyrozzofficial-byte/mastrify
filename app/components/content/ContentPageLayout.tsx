"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import CinematicBackground from "../CinematicBackground"

const EASE = [0.22, 1, 0.36, 1] as const

/** Shared prose + section rhythm for static / legal / help pages */
export const contentPageProseClass =
  "text-[16px] leading-[1.8] text-white/[0.85] [&_h1]:text-[48px] [&_h1]:font-bold [&_h1]:leading-[1.08] [&_h1]:tracking-[-0.03em] [&_h1]:text-white/95 [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-snug [&_h2]:tracking-[-0.02em] [&_h2]:text-white/92 [&_h2:first-child]:mt-0 [&_p+_p]:mt-4 [&_ul]:mt-2 [&_ul]:space-y-2.5 [&_li]:flex [&_li]:items-start [&_li]:gap-3 [&_li]:leading-[1.75]"

export const contentPageSectionsClass = "flex flex-col gap-8"

type ContentPageLayoutProps = {
  children: ReactNode
  className?: string
}

/** Full-page shell: cinematic background + centered page stack */
export function ContentPageLayout({ children, className = "" }: ContentPageLayoutProps) {
  return (
    <motion.div
      className={`relative min-h-screen overflow-x-hidden text-white ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <CinematicBackground intensity="strong" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)]"
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

type PageShellProps = {
  children: ReactNode
  /** Outer centered rail — 1200 for help grids, 900 for reading pages */
  maxWidth?: "1200" | "900"
  className?: string
}

/** Centers a page block horizontally (help grid, wide layouts) */
export function ContentPageShell({ children, maxWidth = "1200", className = "" }: PageShellProps) {
  const maxClass = maxWidth === "900" ? "max-w-[900px]" : "max-w-[1200px]"
  return (
    <div className={`mx-auto w-full ${maxClass} px-5 sm:px-8 ${className}`}>{children}</div>
  )
}

type PageHeroProps = {
  label?: string
  title: string
  lead?: ReactNode
  align?: "center" | "left"
  className?: string
}

export function PageHero({ label, title, lead, align = "center", className = "" }: PageHeroProps) {
  const reduce = useReducedMotion()
  const alignClass = align === "center" ? "mx-auto text-center" : "text-left"

  return (
    <motion.header
      className={`${alignClass} max-w-3xl ${className}`}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      {label ? (
        <span className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-200/70">
          {label}
        </span>
      ) : null}
      <h1 className={label ? "mt-4" : ""}>{title}</h1>
      {lead ? <p className={`mt-3 ${align === "center" ? "mx-auto max-w-xl" : "max-w-2xl"}`}>{lead}</p> : null}
    </motion.header>
  )
}

type CenteredContentProps = {
  children: ReactNode
  className?: string
  /** Reading column width; use full width inside a ContentPageShell */
  maxWidth?: "900" | "full"
  as?: "div" | "main"
}

/**
 * Centered reading column — default 900px, auto margins, spec padding.
 * Tablet: full width of parent. Mobile: 20px horizontal padding.
 */
export function CenteredContent({
  children,
  className = "",
  maxWidth = "900",
  as: Tag = "main",
}: CenteredContentProps) {
  const widthClass = maxWidth === "full" ? "max-w-full" : "max-w-[900px]"

  return (
    <Tag
      className={`mx-auto w-full ${widthClass} px-5 pb-[100px] pt-16 sm:px-8 ${className}`}
    >
      {children}
    </Tag>
  )
}
