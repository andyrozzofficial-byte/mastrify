import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import SiteChrome from "./components/SiteChrome"
import { MasterSessionRootProvider } from "./MasterSessionRootProvider"
import JsonLd from "./components/JsonLd"
import {
  buildPageMetadata,
  organizationJsonLd,
  websiteJsonLd,
} from "../lib/seo"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL("https://www.mastrify.com"),
  ...buildPageMetadata({
    title: "Mastrify — AI Mastering Online | Streaming-Ready Masters",
    description:
      "Mastrify delivers AI mastering and online audio mastering for release-ready music. Upload your mix, preview the master, and download a streaming-ready WAV — no subscription.",
    path: "/",
    ogTitle: "Mastrify | AI Mastering & Online Audio Mastering",
    keywords: [
      "Mastrify",
      "AI mastering",
      "online mastering",
      "AI audio mastering",
      "streaming-ready master",
      "mastering online",
    ],
  }),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body
        className={`${geistSans.variable} ${geistMono.variable} site-overflow-guard flex min-h-screen flex-col bg-black text-white antialiased`}
      >
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <MasterSessionRootProvider>
          <SiteChrome>{children}</SiteChrome>
        </MasterSessionRootProvider>
      </body>
    </html>
  )
}
