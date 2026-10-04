// Samma svar som server/stripeCheckout.js ger, för kända testsessioner.
export async function verifyPaidCheckoutForObjectKey(sessionId, objectKey) {
  if (sessionId === "cs_test_unpaid") return { ok: false, status: 402, error: "Payment is not complete" }
  if (sessionId !== "cs_test_paid") return { ok: false, status: 400, error: "Invalid Stripe checkout session" }
  if (objectKey !== process.env.TEST_OBJECT_KEY) return { ok: false, status: 403, error: "Payment does not match this master" }
  return { ok: true, amountCents: 900, session: { id: sessionId, payment_status: "paid", customer_details: { email: "buyer@example.com" } } }
}
