import path from 'node:path'
import { env as transformersEnv, pipeline } from '@xenova/transformers'

const modelId = process.env.EMBEDDING_MODEL ?? 'BAAI/bge-small-en-v1.5'
const cacheDir = path.join(process.cwd(), '.cache', 'transformers')

transformersEnv.cacheDir = cacheDir
transformersEnv.allowRemoteModels = false

console.log(`Using model: ${modelId}`)
console.log(`Cache dir: ${cacheDir}`)

const extractor = await pipeline('feature-extraction', modelId, {
  quantized: true,
})

const output = await extractor('cache warmup', {
  pooling: 'mean',
  normalize: true,
})

console.log(`Embedding length: ${Array.from(output.data).length}`)
