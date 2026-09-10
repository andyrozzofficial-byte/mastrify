export const ADMIN_PAGE_SIZE = 50

export type AdminPaginationMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function buildAdminPaginationMeta(total: number, page: number, pageSize = ADMIN_PAGE_SIZE): AdminPaginationMeta {
  const safePage = Math.max(1, page)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return {
    page: Math.min(safePage, totalPages),
    pageSize,
    total,
    totalPages,
  }
}

export function parseAdminPage(searchParams: URLSearchParams | { get: (key: string) => string | null }): number {
  const raw = searchParams.get("page")
  const n = raw ? Number.parseInt(raw, 10) : 1
  return Number.isFinite(n) && n > 0 ? n : 1
}

export function adminPageRange(page: number, pageSize = ADMIN_PAGE_SIZE): { from: number; to: number } {
  const safePage = Math.max(1, page)
  const from = (safePage - 1) * pageSize
  return { from, to: from + pageSize - 1 }
}
