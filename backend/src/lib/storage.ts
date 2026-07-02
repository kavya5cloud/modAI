import type { StorageProvider } from './storageProvider'
import { localStorageProvider } from './storageLocal'
import { r2StorageProvider } from './storageR2'

function getProvider(): StorageProvider {
  // Default to local since R2 is temporarily blocked.
  const mode = (process.env.STORAGE_PROVIDER ?? 'local').toLowerCase()
  if (mode === 'r2') return r2StorageProvider
  return localStorageProvider
}

export const storage: StorageProvider = getProvider()

