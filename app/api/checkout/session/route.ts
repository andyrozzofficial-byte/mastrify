import { createMasterCheckoutSession } from "../../../../lib/stripe/createMasterCheckoutSession"

export async function POST(request: Request) {
  return createMasterCheckoutSession(request)
}
