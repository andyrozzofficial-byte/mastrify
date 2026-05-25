"use client"

import type { ReactNode } from "react"
import CinematicDivider from "../CinematicDivider"
import {
  ContentPageLayout,
  contentPageProseClass,
  contentPageSectionsClass,
  PageContainer,
  PageHero,
  ReadingColumn,
} from "../content/ContentPageLayout"

export type LegalSection = {
  title: string
  body: ReactNode
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
  const year = new Date().getFullYear()

  return (
    <ContentPageLayout>
      <PageContainer>
        <ReadingColumn>
          <PageHero label={label} title={title} lead={lead} align="center" />

          <CinematicDivider className="my-10 md:my-12" />

          <div className={contentPageSectionsClass}>
            {sections.map((section) => (
              <section key={section.title} className="min-w-0">
                <h2>{section.title}</h2>
                <div
                  className={`mt-4 ${contentPageProseClass} ${section.narrow ? "max-w-[32rem]" : ""}`}
                >
                  {section.body}
                </div>
              </section>
            ))}
          </div>

          {children ? <div className="mt-12">{children}</div> : null}

          <p className="mt-14 border-t border-white/[0.06] pt-8 text-center text-[11px] leading-relaxed tracking-[0.04em] text-white/40">
            Last updated {year}. Questions?{" "}
            <a
              href="/help"
              className="text-white/55 underline-offset-2 transition hover:text-violet-200/80 hover:underline"
            >
              Contact us
            </a>
            .
          </p>
        </ReadingColumn>
      </PageContainer>
    </ContentPageLayout>
  )
}
