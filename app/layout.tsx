import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import SiteHeader from "./components/SiteHeader"
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
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-black text-white antialiased`}
      >
        <SiteHeader />
        <MasterSessionRootProvider>
          <main className="min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)]">{children}</main>
        </MasterSessionRootProvider>
      </body>
    </html>
  )
}