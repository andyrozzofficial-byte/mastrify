import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { BetaFeedbackPayload } from "../../../lib/betaFeedbackTypes"

const SUPABASE_URL =
  process.env.SUPABASE_URL?.trim() || "https://wyuxkmrnzqvlqshlqfiw.supabase.co"
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_ANON_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  "sb_publishable_j-if6EVRN-M3q-DS5s4q_w_5K0Tiw3n"

function isValidPayload(body: unknown): body is BetaFeedbackPayload {
  if (!body || typeof body !== "object") return false
  const b = body as Record<string, unknown>
  return (
    typeof b.role === "string" &&
    b.role.length > 0 &&
    typeof b.genre === "string" &&
    typeof b.comparison === "string" &&
    Array.isArray(b.stoodOut) &&
    Array.isArray(b.soundedOff) &&
    typeof b.easeRating === "number" &&
    typeof b.speedPerception === "string" &&
    typeof b.releaseReady === "string" &&
    typeof b.wouldRelease === "string" &&
    typeof b.useAgainScore === "number" &&
    typeof b.recommendScore === "number"
  )
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Missing required feedback fields" }, { status: 400 })
  }

  const contactEmail = typeof body.contactEmail === "string" ? body.contactEmail.trim() : ""
  const contactDiscord = typeof body.contactDiscord === "string" ? body.contactDiscord.trim() : ""

  const row = {
    responses: body,
    contact_email: contactEmail || null,
    contact_discord: contactDiscord || null,
    future_beta_contact:
      typeof body.futureBetaContact === "boolean" ? body.futureBetaContact : null,
    master_object_key:
      typeof body.masterObjectKey === "string" && body.masterObjectKey.trim()
        ? body.masterObjectKey.trim()
        : null,
    track_title:
      typeof body.trackTitle === "string" && body.trackTitle.trim()
        ? body.trackTitle.trim()
        : null,
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { error } = await supabase.from("beta_master_feedback").insert([row])
    if (error) {
      console.error("[beta-feedback] insert failed:", error.message)
      return NextResponse.json({ error: "Could not save feedback" }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[beta-feedback] unexpected error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
