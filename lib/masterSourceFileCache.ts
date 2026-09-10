const DB_NAME = "mastrify-master-source"
const DB_VERSION = 1
const STORE = "files"

type CachedSourceFile = {
  masterObjectKey: string
  fileName: string
  type: string
  lastModified: number
  blob: Blob
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "masterObjectKey" })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"))
  })
}

/** Persist upload file so original preview survives Stripe redirect / full reload. */
export async function cacheMasterSourceFile(masterObjectKey: string, file: File): Promise<void> {
  const key = masterObjectKey.trim()
  if (!key || !file) return
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      const record: CachedSourceFile = {
        masterObjectKey: key,
        fileName: file.name,
        type: file.type || "audio/wav",
        lastModified: file.lastModified,
        blob: file,
      }
      tx.objectStore(STORE).put(record)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error("indexedDB write failed"))
    })
    db.close()
  } catch {
    /* optional cache — ignore quota / private mode */
  }
}

export async function restoreMasterSourceFile(
  masterObjectKey: string,
  expectedFileName?: string,
): Promise<File | null> {
  const key = masterObjectKey.trim()
  if (!key) return null
  try {
    const db = await openDb()
    const record = await new Promise<CachedSourceFile | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly")
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => resolve((req.result as CachedSourceFile | undefined) ?? null)
      req.onerror = () => reject(req.error ?? new Error("indexedDB read failed"))
    })
    db.close()
    if (!record?.blob) return null
    if (expectedFileName && record.fileName !== expectedFileName) return null
    return new File([record.blob], record.fileName, {
      type: record.type || "audio/wav",
      lastModified: record.lastModified || Date.now(),
    })
  } catch {
    return null
  }
}

export async function clearMasterSourceFile(masterObjectKey: string): Promise<void> {
  const key = masterObjectKey.trim()
  if (!key) return
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error("indexedDB delete failed"))
    })
    db.close()
  } catch {
    /* ignore */
  }
}
