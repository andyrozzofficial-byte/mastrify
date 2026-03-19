"use client"

export default function Pricing() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">

      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center max-w-sm w-full backdrop-blur-xl">

        <h1 className="text-3xl font-bold mb-2">
          Unlock Full Master
        </h1>

        <p className="text-gray-400 mb-6">
          Download your track in full studio quality
        </p>

        <div className="text-5xl font-bold mb-6">
          49 kr
        </div>

        <ul className="text-sm text-gray-300 mb-6 space-y-2">
          <li>✔ Full quality WAV</li>
          <li>✔ No limitations</li>
          <li>✔ Ready for Spotify</li>
        </ul>

        <button
          onClick={() => {
            localStorage.setItem("unlocked", "true")
            window.location.href = "/app"
          }}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 py-3 rounded-xl font-medium hover:opacity-90 transition"
        >
          Pay & Unlock
        </button>

        <p className="text-xs text-gray-500 mt-4">
          Test mode – no real payment yet
        </p>

      </div>

    </main>
  )
}