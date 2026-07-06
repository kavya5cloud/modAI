// Downloads the embedding model into the on-disk cache at build time so the
// first runtime request doesn't have to fetch ~30MB (which is slow and can time
// out on small hosts). Best-effort: if the download fails (e.g. no network in
// the build environment), we warn and exit 0 so the build still succeeds — the
// runtime keeps a remote fallback (see EMBEDDINGS_ALLOW_REMOTE).
import path from 'node:path'
import process from 'node:process'

const MODEL = process.env.EMBEDDING_MODEL || 'Xenova/bge-small-en-v1.5'
const cacheDir = path.join(process.cwd(), '.cache', 'transformers')

async function main() {
  const { env, pipeline } = await import('@xenova/transformers')
  env.cacheDir = cacheDir
  env.allowLocalModels = true
  env.allowRemoteModels = true

  console.log(`[prefetch] downloading embedding model "${MODEL}" into ${cacheDir}`)
  const started = Date.now()
  const extractor = await pipeline('feature-extraction', MODEL, { quantized: true })
  // Run one embedding so every required file (tokenizer + weights) is fetched.
  await extractor('warm up', { pooling: 'mean', normalize: true })
  console.log(`[prefetch] done in ${((Date.now() - started) / 1000).toFixed(1)}s`)
}

main().catch((cause) => {
  console.warn(
    `[prefetch] WARNING: could not prefetch embedding model: ${
      cause instanceof Error ? cause.message : String(cause)
    }`,
  )
  console.warn('[prefetch] continuing build; model will be fetched at runtime on first use.')
  process.exit(0)
})
