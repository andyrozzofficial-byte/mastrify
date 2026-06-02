/** Parse PostgREST / Postgres "column does not exist" errors for drift retries. */

export function parseMissingColumn(message: string, table?: string): string | null {
  const qualified = table
    ? new RegExp(`column\\s+${table}\\.(\\w+)\\s+does not exist`, "i").exec(message)
    : null
  if (qualified?.[1]) return qualified[1]

  const cache = /Could not find the '([^']+)' column of '([^']+)'/i.exec(message)
  if (cache?.[1] && (!table || cache[2] === table)) return cache[1]

  const quoted = /column "([^"]+)" (?:of relation "[^"]+" )?does not exist/i.exec(message)
  if (quoted?.[1]) return quoted[1]

  const bare = /column\s+(\w+)\s+does not exist/i.exec(message)
  return bare?.[1] ?? null
}

export function removeSelectColumn(select: string, column: string): string {
  const needle = `, ${column}`
  if (select.includes(needle)) return select.replace(needle, "")
  const prefixNeedle = `${column}, `
  if (select.startsWith(prefixNeedle)) return select.replace(prefixNeedle, "")
  if (select === column) return "id"
  return select
}

export function stripRowColumn(row: Record<string, unknown>, column: string): Record<string, unknown> {
  if (!(column in row)) return row
  const next = { ...row }
  delete next[column]
  return next
}

export const MAX_SCHEMA_DRIFT_ATTEMPTS = 12

export function isTableMissingError(message: string): boolean {
  return /does not exist|42P01|schema cache|PGRST205/i.test(message)
}
