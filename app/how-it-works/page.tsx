export default function HowItWorks() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="max-w-4xl mx-auto space-y-16">
        
        {/* TITLE */}
        <h1 className="text-4xl font-bold text-center">
          How it works
        </h1>

        {/* STEPS */}
        <div className="grid md:grid-cols-3 gap-10 text-center">

          {/* STEP 1 */}
          <div>
            <h2 className="text-xl font-semibold mb-2">
              1. Upload
            </h2>
            <p className="text-gray-400">
              Drop your track in seconds. No setup needed.
            </p>
          </div>

          {/* STEP 2 */}
          <div>
            <h2 className="text-xl font-semibold mb-2">
              2. AI Processing
            </h2>
            <p className="text-gray-400">
              Our AI analyzes dynamics, stereo width and loudness.
            </p>
          </div>

          {/* STEP 3 */}
          <div>
            <h2 className="text-xl font-semibold mb-2">
              3. Master Ready
            </h2>
            <p className="text-gray-400">
              Get a clean, powerful master ready for streaming platforms.
            </p>
          </div>

        </div>

      </div>
    </main>
  )
}