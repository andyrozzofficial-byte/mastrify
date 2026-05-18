import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import SiteChrome from "./components/SiteChrome"
import { MasterSessionRootProvider } from "./MasterSessionRootProvider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Mastrify",
  description: "AI-powered mix & mastering. Release-ready in seconds.",

  openGraph: {
    title: "Mastrify",
    description: "AI-powered mix & mastering. Release-ready in seconds.",
    url: "https://mastrify.com",
    siteName: "Mastrify",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },

  icons: {
    icon: "/brand-mark.svg",
    shortcut: "/brand-mark.svg",
    apple: "/brand-mark.svg",
  },
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
        <MasterSessionRootProvider>
          <SiteChrome>{children}</SiteChrome>
        </MasterSessionRootProvider>
      </body>
    </html>
  )
}
