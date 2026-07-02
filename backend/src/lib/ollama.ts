import { env } from './env'
import type { ChatTurn } from '@/types/domain'

type OllamaTag = {
  name: string
  model?: string
  size?: number
}

type OllamaTagsResponse = {
  models: OllamaTag[]
}

let cachedModels: Promise<OllamaTag[]> | null = null

async function fetchAvailableModels(): Promise<OllamaTag[]> {
  if (!cachedModels) {
    cachedModels = fetch(`${env.OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.text()
          throw new Error(`Failed to fetch Ollama tags: ${response.status} ${body}`)
        }
        const data = (await response.json()) as OllamaTagsResponse
        return data.models
      })
      .catch((error) => {
        cachedModels = null
        throw error
      })
  }

  return cachedModels
}

function modelIdentifier(tag: OllamaTag) {
  return tag.model || tag.name
}

function chooseSmallestModel(models: OllamaTag[]): string | undefined {
  return models
    .slice()
    .sort((a, b) => {
      const aSize = a.size ?? Number.POSITIVE_INFINITY
      const bSize = b.size ?? Number.POSITIVE_INFINITY
      return aSize - bSize
    })
    .map(modelIdentifier)
    .find(Boolean)
}

function normalizeRequestedModel(requested: string): string {
  return requested.trim().toLowerCase()
}

async function resolveOllamaModel(): Promise<string> {
  const availableModels = await fetchAvailableModels()
  const requested = env.OLLAMA_CHAT_MODEL.trim()
  const normalizedRequested = normalizeRequestedModel(requested)
  const useAuto = !requested || ['auto', 'smallest', 'default'].includes(normalizedRequested)

  const resolved = availableModels.find((tag) => {
    const identifier = modelIdentifier(tag)
    return identifier.toLowerCase() === normalizedRequested
  })

  if (!useAuto && resolved) {
    return modelIdentifier(resolved)
  }

  const smallest = chooseSmallestModel(availableModels)
  if (!smallest) {
    throw new Error('No available Ollama models were returned from /api/tags')
  }

  if (!useAuto && requested && !resolved) {
    console.warn(
      `Requested Ollama model '${requested}' is not available. Using smallest available model '${smallest}' instead.`,
    )
  }

  return smallest
}

export async function streamOllamaChat(args: {
  messages: ChatTurn[]
  onToken: (token: string) => void
}) {
  const model = await resolveOllamaModel()
  const response = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: true,
      messages: args.messages,
      options: {
        temperature: 0.2,
      },
    }),
  })

  if (!response.ok || !response.body) {
    const body = await response.text()
    throw new Error(`Ollama request failed: ${response.status} ${body}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let done = false
  let pending = ''
  let fullText = ''

  while (!done) {
    const chunk = await reader.read()
    done = chunk.done
    pending += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !done })
    const lines = pending.split('\n')
    pending = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const parsed = JSON.parse(line) as {
          message?: { content?: string }
          done?: boolean
        }
        const token = parsed.message?.content ?? ''
        if (token) {
          fullText += token
          args.onToken(token)
        }
        if (parsed.done) done = true
      } catch {
        // Ignore malformed streaming lines.
      }
    }
  }

  return fullText
}
