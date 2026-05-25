"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import CinematicBackground from "../CinematicBackground"

const EASE = [0.22, 1, 0.36, 1] as const

/** Shared prose + section rhythm for static / legal / help pages */
export const contentPageProseClass =
  "text-[16px] leading-[1.8] text-white/[0.85] [&_h1]:text-[48px] [&_h1]:font-bold [&_h1]:leading-[1.08] [&_h1]:tracking-[-0.03em] [&_h1]:text-white/95 [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-snug [&_h2]:tracking-[-0.02em] [&_h2]:text-white/92 [&_h2:first-child]:mt-0 [&_p+_p]:mt-4 [&_ul]:mt-2 [&_ul]:space-y-2.5 [&_li]:flex [&_li]:items-start [&_li]:gap-3 [&_li]:leading-[1.75]"

export const contentPageSectionsClass = "flex flex-col gap-8"

const pageContainerClass =
  "mx-auto box-border w-full max-w-[1200px] min-w-0 px-8 pb-[100px] pt-16"

type ContentPageLayoutProps = {
  children: ReactNode
  className?: string
}

/** Full-page shell: cinematic background + page stack */
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
      <div className="relative z-10 w-full">{children}</div>
    </motion.div>
  )
}

type PageContainerProps = {
  children: ReactNode
  className?: string
}

/**
 * Global centered page rail — entire page content lives inside this box.
 * max 1200px, horizontal padding 32px (20px on very small screens), pt 64px, pb 100px.
 */
export function PageContainer({ children, className = "" }: PageContainerProps) {
  return <div className={`${pageContainerClass} ${className}`}>{children}</div>
}

/** Help Center — wider documentation rail (1400px) */
export function HelpPageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div
      className={`mx-auto box-border w-full max-w-[1400px] min-w-0 px-8 pb-[100px] pt-16 ${className}`}
    >
      {children}
    </div>
  )
}

/** @deprecated Use PageContainer */
export function ContentPageShell({ children, className = "" }: PageContainerProps) {
  return <PageContainer className={className}>{children}</PageContainer>
}

type ReadingColumnProps = {
  children: ReactNode
  className?: string
}

/** Privacy, Terms, About, Blog — flex-centered reading column (850px) */
export function ReadingColumn({ children, className = "" }: ReadingColumnProps) {
  return (
    <div className={`flex w-full justify-center ${className}`}>
      <div className="w-full min-w-0 max-w-[850px]">{children}</div>
    </div>
  )
}

type HelpCenterGridProps = {
  sidebar: ReactNode
  children: ReactNode
  className?: string
}

/** Help Center FAQ layout — 360px sticky sidebar + fluid answer column */
export function HelpCenterGrid({ sidebar, children, className = "" }: HelpCenterGridProps) {
  return (
    <div
      className={`grid w-full grid-cols-1 items-start gap-8 lg:grid-cols-[360px_minmax(700px,1fr)] lg:gap-12 ${className}`}
    >
      <aside className="w-full min-w-0 shrink-0 lg:sticky lg:top-[120px] lg:w-[360px]">{sidebar}</aside>
      <div className="min-w-0 w-full max-w-none">{children}</div>
    </div>
  )
}

type TicketFormFrameProps = {
  children: ReactNode
  className?: string
}

/** Support ticket body — centered form column (700px) */
export function TicketFormFrame({ children, className = "" }: TicketFormFrameProps) {
  return (
    <div className={`flex w-full justify-center ${className}`}>
      <div className="w-full min-w-0 max-w-[700px]">{children}</div>
    </div>
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
  const textAlign = align === "center" ? "text-center" : "text-left"

  return (
    <motion.header
      className={`w-full min-w-0 ${textAlign} ${className}`}
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
      {lead ? (
        <p className={`mt-3 ${align === "center" ? "mx-auto max-w-xl" : "max-w-2xl"}`}>{lead}</p>
      ) : null}
    </motion.header>
  )
}

/** @deprecated Use PageContainer + ReadingColumn */
export function CenteredContent({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode
  className?: string
  maxWidth?: "900" | "full"
  as?: "div" | "main"
}) {
  return (
    <Tag className={className}>
      <ReadingColumn>{children}</ReadingColumn>
    </Tag>
  )
}
