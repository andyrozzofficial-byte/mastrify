import { NextResponse } from "next/server"
import {
  BETA_FEEDBACK_TABLE,
  betaFeedbackErrorForClient,
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

const isDev = process.env.NODE_ENV === "development"

function logDev(message: string, detail?: unknown) {
  if (!isDev) return
  if (detail !== undefined) console.log(`[beta-feedback] ${message}`, detail)
  else console.log(`[beta-feedback] ${message}`)
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
  if (typeof b.sessionId !== "string" || !b.sessionId) missing.push("sessionId")
  if (typeof b.masteringStyle !== "string") missing.push("masteringStyle")
  if (typeof b.stereoWidth !== "number") missing.push("stereoWidth")
  if (typeof b.lowEnd !== "number") missing.push("lowEnd")
  return missing.length ? `Missing or invalid: ${missing.join(", ")}` : null
}

function isValidPayload(body: unknown): body is BetaFeedbackPayload {
  return validationFailureDetail(body) === null
}

function devErrorResponse(
  status: number,
  clientMessage: string,
  devMessage?: string,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      error: clientMessage,
      ...(isDev && devMessage ? { devError: devMessage } : {}),
      ...extra,
    },
    { status },
  )
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch (e) {
    logDev("JSON parse failed", e)
    return devErrorResponse(400, "Could not save feedback", isDev ? "Invalid JSON body" : undefined)
  }

  logDev("incoming payload", body)

  if (!isValidPayload(body)) {
    const detail = validationFailureDetail(body)
    logDev("validation failed", { detail, bodyKeys: body && typeof body === "object" ? Object.keys(body) : [] })
    return devErrorResponse(
      400,
      "Could not save feedback",
      detail ?? "Validation failed",
    )
  }

  const envStatus = getSupabaseEnvStatus()
  logDev("Supabase env", envStatus)

  const supabase = createSupabaseServerClient()
  if (!supabase) {
    logDev("Supabase client unavailable — set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY")
    return devErrorResponse(
      503,
      "Could not save feedback",
      isDev
        ? "No Supabase API key configured (SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY)"
        : undefined,
    )
  }

  const row = sanitizeBetaFeedbackInsert(buildBetaFeedbackRow(body))
  const keySource = getSupabaseKeySource()

  logDev("Supabase insert payload", {
    table: `public.${BETA_FEEDBACK_TABLE}`,
    url: getSupabaseUrl(),
    keySource,
    row,
  })

  // Anon RLS allows INSERT only — .select() after insert fails without service_role.
  const insertQuery = supabase.from(BETA_FEEDBACK_TABLE).insert([row])
  const result =
    keySource === "service_role"
      ? await insertQuery.select("id").single()
      : await insertQuery

  logDev("Supabase response", { data: result.data, error: result.error })

  if (result.error) {
    const mapped = betaFeedbackErrorForClient(result.error)
    if (isDev) {
      console.error("[beta-feedback] insert failed", {
        code: result.error.code,
        message: result.error.message,
        details: result.error.details,
        hint: result.error.hint,
      })
    }
    return devErrorResponse(
      mapped.tableMissing ? 503 : 500,
      mapped.message,
      result.error.message,
      isDev
        ? {
            code: result.error.code,
            hint: result.error.hint,
            details: result.error.details,
          }
        : undefined,
    )
  }

  const id =
    result.data && typeof result.data === "object" && "id" in result.data
      ? (result.data as { id: string }).id
      : null

  logDev("insert ok", { id })

  return NextResponse.json({ ok: true, id })
}
