"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

export default function Landing() {

  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("waitlist")
        .select("*", { count: "exact", head: true })

      if (count) setCount(count)
    }

    fetchCount()
  }, [])

  const handleSubmit = async () => {
    setErrorMsg("")

    if (!email) {
      setErrorMsg("Enter an email")
      return
    }

    if (!email.includes("@")) {
      setErrorMsg("Enter a valid email")
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from("waitlist")
      .insert([{ email }])

    setLoading(false)

    if (error) {
      console.log(error)

      if (error.message.includes("duplicate")) {
        setErrorMsg("You're already on the list 😉")
      } else {
        setErrorMsg("Something went wrong")
      }

      return
    }

    setSubmitted(true)
    setCount(prev => prev + 1)
    setEmail("")

    // optional: auto-hide success efter 3 sek
    setTimeout(() => {
      setSubmitted(false)
    }, 3000)
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 relative overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.25),transparent_65%)]" />
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-500/25 blur-[220px] rounded-full" />
        <div className="absolute bottom-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500/20 blur-[220px] rounded-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90" />
      </div>

      {/* EXTRA GLOW */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(120,119,198,0.15),transparent_70%)]" />
      <div className="absolute w-[800px] h-[800px] bg-purple-500/25 blur-[200px] rounded-full top-[-300px] left-[-200px]" />
      <div className="absolute w-[700px] h-[700px] bg-blue-500/20 blur-[200px] rounded-full bottom-[-250px] right-[-150px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />

      <div className="relative z-10 text-center max-w-xl w-full">

        {/* TITLE */}
        <h1 className="text-6xl md:text-7xl font-bold mb-4 tracking-tight bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
          Mastrify
        </h1>

        {/* COMING SOON */}
        <p className="text-purple-400 text-xs tracking-widest uppercase mb-4">
          Coming Soon
        </p>

        {/* DESCRIPTION */}
        <p className="text-white/70 text-base md:text-lg mb-10 leading-relaxed max-w-2xl mx-auto">
          AI-powered mix & mastering. <br />
          Release-ready in seconds.
        </p>

        {/* SUCCESS */}
        {submitted && (
          <div className="mb-4">
            <p className="text-purple-300 text-lg font-semibold">
              🚀 You're on the list
            </p>
            <p className="text-white/40 text-xs mt-2">
              🔥 Join {count}+ producers already on the list
            </p>
          </div>
        )}

        {/* INPUT */}
        <div className="flex gap-2 bg-white/5 border border-white/10 p-2 rounded-2xl backdrop-blur-xl shadow-[0_0_40px_rgba(139,92,246,0.15)]">

          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 bg-transparent px-4 py-3 text-sm outline-none text-white placeholder:text-white/40"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-sm font-medium hover:scale-105 transition shadow-lg shadow-purple-500/30 disabled:opacity-50"
          >
            {loading ? "Joining..." : "Join"}
          </button>

        </div>

        {/* ERROR */}
        {errorMsg && (
          <p className="text-red-400 text-sm mt-3">
            {errorMsg}
          </p>
        )}

      </div>

    </main>
  )
}