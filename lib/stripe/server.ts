import Stripe from "stripe"

let stripeClient: Stripe | null = null

export function getStripeServer(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secretKey) return null
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey)
  }
  return stripeClient
}

export function getAppOrigin(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, "")
  const origin = request.headers.get("origin")?.trim()
  if (origin) return origin.replace(/\/$/, "")
  return "https://www.mastrify.com"
}
