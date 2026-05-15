

"use client"

import { useState } from "react"
import { publicBackendUrl } from "../../lib/publicBackendUrl"
import { AUDIO_UPLOAD_ACCEPT } from "../../lib/audioUploadAccept"

export default function ProPage() {
  const [analysis, setAnalysis] = useState<any>(null)

  async function handleUpload(e: any) {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    const analyzeUrl = publicBackendUrl("/analyze")
    const res = await fetch(analyzeUrl, {
      method: "POST",
      body: formData
    })

    const data = await res.json()
    setAnalysis(data)
  }

  return (
    <div className="min-h-screen bg-black px-6 py-8 text-white md:px-10 md:py-10">
      
      <h1 className="text-3xl font-bold mb-6">
        Mastrify PRO 🔥
      </h1>

      <input type="file" accept={AUDIO_UPLOAD_ACCEPT} onChange={handleUpload} />

      {analysis && (
        <div className="mt-10 space-y-4">
          
          <div>
            <p>Score: {analysis.score}</p>
            <p>LUFS: {analysis.lufs}</p>
            <p>Dynamic Range: {analysis.dynamicRange}</p>
          </div>

        </div>
      )}

    </div>
  )
}