import type { Metadata } from "next"
import { buildPageMetadata } from "../../lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "About Mastrify",
  description:
    "Mastrify is AI-powered online mastering built for modern artists who want professional, streaming-ready sound without complicated workflows.",
  path: "/about",
})

export default function About() {
  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      
      <div className="mx-auto max-w-3xl space-y-8 text-center">
        
        <h1 className="text-4xl font-bold">About Mastrify</h1>

        <p className="text-gray-400">
          Mastrify is an AI-powered mastering tool built for modern artists.
        </p>

        <p className="text-gray-400">
          We believe every creator should be able to get professional sound
          without expensive engineers or complicated workflows.
        </p>

        <p className="text-gray-400">
          Upload your track. Get a master that sounds like Spotify-ready releases.
        </p>

      </div>

    </main>
  )
}