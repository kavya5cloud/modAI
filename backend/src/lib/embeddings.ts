import path from 'node:path'
import { env as transformersEnv, pipeline } from '@xenova/transformers'
import { env } from './env'

type FeatureExtractor = (text: string, options?: Record<string, unknown>) => Promise<{
  data: Float32Array | number[]
}>

const transformersCacheDir = path.join(process.cwd(), '.cache', 'transformers')

transformersEnv.cacheDir = transformersCacheDir
transformersEnv.allowRemoteModels = false

const originalFetch = globalThis.fetch.bind(globalThis)

if (!(globalThis as typeof globalThis & { __embeddingsFetchLogged?: boolean }).__embeddingsFetchLogged) {
  ;(globalThis as typeof globalThis & { __embeddingsFetchLogged?: boolean }).__embeddingsFetchLogged = true
  globalThis.fetch = async (input, init) => {
    const requestTarget =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : 'url' in input
            ? input.url
            : '[unknown request]'

    console.error('[embeddings] transformers.js fetch attempt:', requestTarget)
    return originalFetch(input, init)
  }
}

let extractorPromise: Promise<FeatureExtractor> | null = null

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      console.error('[embeddings] cache directory:', transformersCacheDir)
      console.error('[embeddings] model path:', env.EMBEDDING_MODEL)
      console.error('[embeddings] allowRemoteModels:', transformersEnv.allowRemoteModels)
      return (await pipeline('feature-extraction', env.EMBEDDING_MODEL, {
        quantized: true,
      })) as FeatureExtractor
    })()
  }
  return extractorPromise
}

export async function embedText(input: string): Promise<number[]> {
  const extractor = await getExtractor()
  const output = await extractor(input, {
    pooling: 'mean',
    normalize: true,
  })
  const vector = Array.from(output.data as Float32Array)
  return vector
}
