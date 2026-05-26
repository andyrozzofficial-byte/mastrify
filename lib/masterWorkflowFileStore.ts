/** In-memory upload file cache — survives step changes and provider re-mounts within the tab. */
let cachedMasterUploadFile: File | null = null

export function cacheMasterUploadFile(file: File | null) {
  cachedMasterUploadFile = file
}

export function getCachedMasterUploadFile(): File | null {
  return cachedMasterUploadFile
}
