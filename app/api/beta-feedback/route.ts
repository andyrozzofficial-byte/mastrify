import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { BETA_USER_EMAIL_COOKIE } from "../../../lib/betaAccess"
import { isBetaFeedbackEnabled } from "../../../lib/betaFeedbackFeature"
import {
  BETA_FEEDBACK_TABLE,
  buildBetaFeedbackRow,
  sanitizeBetaFeedbackInsert,
} from "../../../lib/betaFeedbackDb"
import type { BetaFeedbackPayload } from "../../../lib/betaFeedbackTypes"
import {
  createSupabaseServerClient,
  getSupabaseEnvStatus,
  getSupabaseKeySource,
  getSupabaseUrl,
} from "../../../lib/supabaseServer"
import { touchBetaProfileFromFeedback } from "../../../lib/betaUserData"

function logBeta(message: string, detail?: unknown) {
  if (detail !== undefined) console.log(`[beta-feedback] ${message}`, detail)
  else console.log(`[beta-feedback] ${message}`)
}

function logBetaError(message: string, detail?: unknown) {
  if (detail !== undefined) console.error(`[beta-feedback] ${message}`, detail)
  else console.error(`[beta-feedback] ${message}`)
}

function parseDawFromWorthPaying(worthPaying: string | undefined): string | null {
  if (!worthPaying?.trim()) return null
  const match = worthPaying.match(/^DAW:\s*(.+)$/i)
  return match?.[1]?.trim() || null
}

function validationFailureDetail(body: unknown): string | null {
  if (!body || typeof body !== "object") return "Body is not an object"
  const b = body as Record<string, unknown>
  const missing: string[] = []
  if (typeof b.role !== "string" || !b.role) missing.push("role")
  if (typeof b.genre !== "string") missing.push("genre")
  if (typeof b.comparison !== "string") missing.push("comparison")
  if (!Array.isArray(b.stoodOut)) missing.push("stoodOut")
  if (!Array.isArray(b.soundedOff)) missing.push("soundedOff")
  if (typeof b.easeRating !== "number") missing.push("easeRating")
  if (typeof b.speedPerception !== "string") missing.push("speedPerception")
  if (typeof b.releaseReady !== "string") missing.push("releaseReady")
  if (typeof b.wouldRelease !== "string") missing.push("wouldRelease")
  if (typeof b.useAgainScore !== "number") missing.push("useAgainScore")
  if (typeof b.recommendScore !== "number") missing.push("recommendScore")
  if (typeof b.stereoWidth !== "number") missing.push("stereoWidth")
  if (typeof b.lowEnd !== "number") missing.push("lowEnd")
  return missing.length ? `Missing or invalid: ${missing.join(", ")}` : null
}

function isValidPayload(body: unknown): body is BetaFeedbackPayload {
  return validationFailureDetail(body) === null
}

function apiError(
  status: number,
  message: string,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

export async function POST(request: Request) {
  console.log("[beta-feedback] POST reached")

  if (!isBetaFeedbackEnabled()) {
    return NextResponse.json({ error: "Beta feedback is disabled" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch (e) {
    logBetaError("JSON parse failed", e)
    return apiError(400, "Invalid JSON body")
  }

  logBeta("incoming payload", body)

  if (!isValidPayload(body)) {
    const detail = validationFailureDetail(body)
    logBetaError("validation failed", { detail, bodyKeys: body && typeof body === "object" ? Object.keys(body) : [] })
    return apiError(400, detail ?? "Validation failed")
  }

  const envStatus = getSupabaseEnvStatus()
  logBeta("Supabase env", envStatus)

  const supabase = createSupabaseServerClient()
  if (!supabase) {
    logBetaError("Supabase client unavailable")
    return apiError(
      503,
      "No Supabase API key configured (SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    )
  }

  const row = sanitizeBetaFeedbackInsert(buildBetaFeedbackRow(body))
  const keySource = getSupabaseKeySource()

  logBeta("Supabase insert payload", {
    table: `public.${BETA_FEEDBACK_TABLE}`,
    url: getSupabaseUrl(),
    keySource,
    row,
  })

  try {
    const insertQuery = supabase.from(BETA_FEEDBACK_TABLE).insert([row])
    const result =
      keySource === "service_role"
        ? await insertQuery.select("id").single()
        : await insertQuery

    logBeta("Supabase insert response", {
      data: result.data,
      error: result.error
        ? {
            message: result.error.message,
            details: result.error.details,
            code: result.error.code,
            hint: result.error.hint,
          }
        : null,
    })

    if (result.error) {
      const error = result.error
      logBetaError("insert failed", {
        message: error.message,
        details: error.details,
        code: error.code,
        hint: error.hint,
      })
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Unknown error",
          details: error.details || null,
          code: error.code || null,
          hint: error.hint || null,
        },
        { status: 500 },
      )
    }

    const id =
      result.data && typeof result.data === "object" && "id" in result.data
        ? (result.data as { id: string }).id
        : null

    logBeta("insert ok", { id })

    const store = await cookies()
    const cookieEmail = store.get(BETA_USER_EMAIL_COOKIE)?.value?.trim() || null
    const profileEmail = body.contactEmail?.trim() || cookieEmail
    const daw = parseDawFromWorthPaying(body.worthPaying)
    await touchBetaProfileFromFeedback(profileEmail, body.genre, daw)

    return NextResponse.json({ ok: true, success: true, id })
  } catch (err) {
    const error = err as { message?: string; details?: string; code?: string; hint?: string }
    logBetaError("insert exception", err)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unknown error",
        details: error?.details || null,
        code: error?.code || null,
        hint: error?.hint || null,
      },
      { status: 500 },
    )
  }
}
