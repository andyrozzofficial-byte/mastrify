"use client"
import { useRouter } from "next/navigation"

import FadeIn from "./components/FadeIn"

export default function Home() {
  const router = useRouter()

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <main className="min-h-screen text-white relative overflow-hidden bg-transparent">

      {/* 🔥 NAVBAR */}
      <nav className="fixed top-0 left-0 w-full z-50 backdrop-blur-xl bg-black/30 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">

          <div className="font-semibold text-lg tracking-tight cursor-pointer" onClick={() => scrollTo("hero")}>
            Mastrify
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-gray-300">
            <span onClick={() => scrollTo("about")} className="cursor-pointer hover:text-white">About</span>
            <span onClick={() => scrollTo("how")} className="cursor-pointer hover:text-white">How it works</span>
            <span onClick={() => scrollTo("pricing")} className="cursor-pointer hover:text-white">Pricing</span>
          </div>

          <button
            onClick={() => router.push("/flow")}
            className="relative px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-purple-500 to-blue-500 hover:scale-105 transition duration-200 hover:shadow-[0_0_20px_rgba(139,92,246,0.6)]"
          >
            <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 blur-md opacity-40"></span>
            <span className="relative">Upload</span>
          </button>

        </div>
      </nav>

      {/* 🔥 BACKGROUND */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.25),transparent_65%)]" />
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-500/25 blur-[220px] rounded-full" />
        <div className="absolute bottom-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500/20 blur-[220px] rounded-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90" />
      </div>

      {/* HERO */}
      <section id="hero" className="flex flex-col items-center justify-center text-center px-6 pt-48 pb-40 animate-fadeIn">

        <h1 className="text-6xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-300 bg-clip-text text-transparent">
  Mastrify
</h1>

        <p className="text-gray-400 max-w-xl mb-4 text-lg leading-relaxed">
          Turn your track into a professional master in seconds
        </p>

        <p className="text-xs text-gray-500 mb-6">
          Hear your track sound like a finished release
        </p>

        <button
          onClick={() => window.location.href = "/flow"}
          className="relative px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-purple-500 to-blue-500 hover:scale-105 active:scale-95 transition duration-200 hover:shadow-[0_0_40px_rgba(139,92,246,0.6)]"
        >
          <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 blur-lg opacity-40"></span>
          <span className="relative">Try it now — free</span>
        </button>

        <p className="text-xs text-gray-500 mt-3">
  Used by producers worldwide
</p>

<p className="text-xs text-white/40 mt-2">
  No signup required
</p>

      </section>

      {/* FEATURES */}
      <section className="px-6 pb-32">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">

          {[
            { title: "⚡ Instant Mastering", text: "Upload and get a pro master instantly." },
            { title: "🎧 Spotify Ready", text: "Perfect loudness & clarity for streaming." },
            { title: "🔒 Free Preview", text: "Listen before you pay. No risk." }
          ].map((item, i) => (
            <FadeIn key={i} delay={i * 100}>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-xl hover:bg-white/10 transition">
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.text}</p>
              </div>
            </FadeIn>
          ))}

        </div>
      </section>

      {/* 🔥 ABOUT */}
      <section id="about" className="px-6 pb-32 text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
  About Mastrify
</h2>
        <p className="text-gray-400 leading-relaxed">
          Mastrify is built for producers who want professional sound fast.
          <br /><br />
          No complex plugins. No expensive engineers.
          <br /><br />
          Just upload your track and get a clean, powerful master ready for release.
        </p>
      </section>

      {/* 🔥 HOW */}
      <section id="how" className="px-6 pb-32 text-center">
        <h2 className="text-3xl font-bold mb-10 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
  How it works
</h2>

        <div className="flex flex-col md:flex-row justify-center gap-16 text-gray-400">

          <div>
            <p className="font-semibold text-white">1. Upload</p>
            <p>Drop your track in seconds</p>
          </div>

          <div>
            <p className="font-semibold text-white">2. AI Processing</p>
            <p>We analyze and master your track</p>
          </div>

          <div>
            <p className="font-semibold text-white">3. Download</p>
            <p>Get your Spotify-ready master</p>
          </div>

        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 pb-32">
        <div className="max-w-4xl mx-auto text-center">

          <h2 className="text-3xl font-bold mb-10 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
  How it works
</h2>
          <p className="text-gray-400 mb-10 text-sm">
            Hear the difference before you pay
          </p>

          <div className="grid md:grid-cols-2 gap-6">

            <div className="bg-white/5 border border-white/10 rounded-xl p-8 backdrop-blur-xl">
              <h3 className="text-xl font-semibold mb-2">Free</h3>
              <p className="text-gray-400 mb-6 text-sm">Try before you buy</p>
              <p className="text-3xl font-bold mb-6">0€</p>
             <button onClick={() => router.push("/flow")}>
              Try it
              </button>
            </div>

            <div className="bg-gradient-to-b from-purple-500/10 to-blue-500/10 border border-purple-400/50 rounded-xl p-8">
              <h3 className="text-xl font-semibold mb-2">Pro</h3>
              <p className="text-gray-300 mb-6 text-sm">Full quality download</p>
              <p className="text-3xl font-bold mb-6">5€</p>

              <button
                onClick={() => router.push("/flow")}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500"
              >
                Download full master
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-40 text-center">

        <h2 className="text-3xl font-bold mb-6">
          Ready to sound professional?
        </h2>

        <button
          onClick={() => window.location.href = "/app"}
          className="relative px-8 py-4 rounded-xl font-medium bg-gradient-to-r from-purple-500 to-blue-500 hover:scale-105 transition duration-200 hover:shadow-[0_0_40px_rgba(139,92,246,0.6)]"
        >
          <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 blur-lg opacity-40"></span>
          <span className="relative">Upload your track</span>
        </button>

        <p className="text-xs text-white/40 mt-3">
  WAV • ~-6 dB headroom • no limiter
</p>

      </section>

    </main>
  )
}