export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return
  const { validateIngestSchemaOnStartup } = await import("./lib/ingestSchemaValidation")
  void validateIngestSchemaOnStartup()
}
