export async function verifyFreeOrderForObjectKey(freeOrderId, objectKey) {
  if (freeOrderId !== "free_test_order") return { ok: false, status: 402, error: "Free order could not be verified" }
  if (objectKey !== process.env.TEST_OBJECT_KEY) return { ok: false, status: 403, error: "Free order does not match this master" }
  return { ok: true, amountCents: 0 }
}
