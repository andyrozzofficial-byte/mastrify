// Kör: npm test   (från server/)
// Den signerade nedladdningslänken till Supabase ska bära filnamnet (?download=<titel>_master.wav),
// så att Supabase svarar med Content-Disposition: attachment; filename="..._master.wav".
// Supabase-anropet fångas i processen (ingen riktig nyckel, inget nätverk).
import test from "node:test"
import assert from "node:assert/strict"

test("createMasterDownloadSignedUrl lägger filnamnet med .wav i länken", async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co"
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key-not-real"
  const realFetch = globalThis.fetch
  const seen = []
  globalThis.fetch = async (url, init) => {
    seen.push({ url: String(url), body: init?.body })
    return new Response(JSON.stringify({ signedURL: "/object/sign/masters/1791305981541-master.wav?token=abc" }), { status: 200, headers: { "content-type": "application/json" } })
  }
  try {
    const { createMasterDownloadSignedUrl } = await import("../supabaseStorage.js")
    const { masterDownloadFileName } = await import("../audioFileIdentity.js")
    const url = new URL(await createMasterDownloadSignedUrl("1791305981541-master.wav", masterDownloadFileName("1")))
    assert.match(seen[0].url, /\/storage\/v1\/object\/sign\/masters\/1791305981541-master\.wav$/)
    assert.equal(url.searchParams.get("download"), "1_master.wav")
    assert.equal(url.searchParams.get("token"), "abc")
    const named = new URL(await createMasterDownloadSignedUrl("k.wav", masterDownloadFileName("Midnight Drive.wav")))
    assert.equal(named.searchParams.get("download"), "Midnight Drive_master.wav")
    const bare = new URL(await createMasterDownloadSignedUrl("k.wav", "no-extension"))
    assert.equal(bare.searchParams.get("download"), "no-extension.wav")
  } finally {
    globalThis.fetch = realFetch
  }
})
