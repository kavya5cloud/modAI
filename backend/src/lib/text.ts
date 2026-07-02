import mammoth from 'mammoth'

type Pdf2JsonTextRun = { T?: string }
type Pdf2JsonTextGroup = { R?: Pdf2JsonTextRun[] }
type Pdf2JsonPage = { Texts?: Pdf2JsonTextGroup[] }
type Pdf2JsonRaw = { Pages?: Pdf2JsonPage[] }

type Pdf2JsonParser = {
  on(event: 'pdfParser_dataError', handler: (err: unknown) => void): void
  on(event: 'pdfParser_dataReady', handler: (raw: Pdf2JsonRaw) => void): void
  parseBuffer(buffer: Buffer): void
}

type Pdf2JsonParserCtor = new () => Pdf2JsonParser

export type ExtractedPage = {
  pageNumber: number
  text: string
}

export type ExtractedDocumentText = {
  text: string
  pages: ExtractedPage[]
}

export type DocumentChunk = {
  chunkText: string
  tokenCount: number
  pageNumber: number | null
}

const minChunkTokens = 500
const maxChunkTokens = 1000
const overlapTokens = 150

function normalizeWhitespace(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function countTokens(text: string) {
  const matches = text.trim().match(/\S+/g)
  return matches?.length ?? 0
}

function splitParagraphs(text: string) {
  return normalizeWhitespace(text)
    .split(/\n{2,}/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function splitLongParagraph(paragraph: string, targetSize = maxChunkTokens) {
  const words = paragraph.split(/\s+/).filter(Boolean)
  const segments: string[] = []
  for (let index = 0; index < words.length; index += targetSize) {
    segments.push(words.slice(index, index + targetSize).join(' '))
  }
  return segments
}

function buildSemanticUnits(text: string, pageNumber: number | null) {
  const units: Array<{ text: string; tokenCount: number; pageNumber: number | null }> = []
  for (const paragraph of splitParagraphs(text)) {
    const paragraphTokens = countTokens(paragraph)
    if (paragraphTokens <= maxChunkTokens) {
      units.push({ text: paragraph, tokenCount: paragraphTokens, pageNumber })
      continue
    }

    for (const segment of splitLongParagraph(paragraph)) {
      units.push({ text: segment, tokenCount: countTokens(segment), pageNumber })
    }
  }
  return units
}

function finalizeChunk(units: Array<{ text: string; tokenCount: number; pageNumber: number | null }>) {
  const chunkText = units.map((unit) => unit.text).join('\n\n').trim()
  const tokenCount = units.reduce((total, unit) => total + unit.tokenCount, 0)
  const pageNumber = units.every((unit) => unit.pageNumber === units[0]?.pageNumber)
    ? units[0]?.pageNumber ?? null
    : units[0]?.pageNumber ?? null

  return { chunkText, tokenCount, pageNumber }
}

function createOverlapUnits(
  units: Array<{ text: string; tokenCount: number; pageNumber: number | null }>,
) {
  const overlap: Array<{ text: string; tokenCount: number; pageNumber: number | null }> = []
  let tokenBudget = overlapTokens
  for (let index = units.length - 1; index >= 0 && tokenBudget > 0; index -= 1) {
    const unit = units[index]
    overlap.unshift(unit)
    tokenBudget -= unit.tokenCount
  }
  return overlap
}

export function chunkDocumentText(input: ExtractedDocumentText): DocumentChunk[] {
  const pageSources =
    input.pages.length > 0
      ? input.pages
      : [{ pageNumber: null as number | null, text: input.text }]

  const chunks: DocumentChunk[] = []
  let activeUnits: Array<{ text: string; tokenCount: number; pageNumber: number | null }> = []
  let activeTokens = 0

  for (const page of pageSources) {
    const pageUnits = buildSemanticUnits(page.text, page.pageNumber)

    for (const unit of pageUnits) {
      activeUnits.push(unit)
      activeTokens += unit.tokenCount

      if (activeTokens < minChunkTokens) continue

      const nextTokenCount = activeTokens
      if (nextTokenCount <= maxChunkTokens) {
        continue
      }

      const finalized = finalizeChunk(activeUnits)
      if (finalized.chunkText) {
        chunks.push(finalized)
      }

      activeUnits = createOverlapUnits(activeUnits)
      activeTokens = activeUnits.reduce((total, current) => total + current.tokenCount, 0)
    }
  }

  if (activeUnits.length > 0) {
    const finalized = finalizeChunk(activeUnits)
    if (finalized.chunkText) {
      chunks.push(finalized)
    }
  }

  return chunks
}

export async function extractTextFromBuffer(filename: string, buffer: Buffer): Promise<ExtractedDocumentText> {
  const lower = filename.toLowerCase()

  if (lower.endsWith('.txt') || lower.endsWith('.md')) {
    const text = buffer.toString('utf8')
    return { text, pages: [] }
  }

  if (lower.endsWith('.pdf')) {
    // pdf2json expects a real PDF buffer. If the uploaded object is not a PDF
    // (or is corrupted/truncated), pdf2json can throw "empty PDF buffer, nothing to parse".

    const len = buffer?.length ?? 0
    const head = buffer.subarray(0, Math.min(32, len))
    const headHex = head.toString('hex')
    const headUtf8 = head.toString('utf8').replace(/^\uFEFF/, '').trimStart()

    if (len <= 0) {
      throw new Error(`Invalid PDF: empty buffer (len=${len})`)
    }

    if (!headUtf8.startsWith('%PDF-')) {
      throw new Error(
        `Invalid PDF: missing %PDF- header. len=${len} headUtf8=${JSON.stringify(headUtf8)} headHex=${headHex}`,
      )
    }

    // Use a safer Node-only extractor (pdf2json) for this environment.
    const pdf2jsonModule = (await import('pdf2json')) as unknown as {
      default?: Pdf2JsonParserCtor
    } & Pdf2JsonParserCtor
    const PDF2JSON = pdf2jsonModule.default ?? pdf2jsonModule

    if (!PDF2JSON) {
      throw new Error('pdf2json: missing export')
    }

    const pdf2json = new PDF2JSON()


    const parsed = await new Promise<{
      text: string
      pages: ExtractedPage[]
    }>((resolve, reject) => {
      pdf2json.on('pdfParser_dataError', (errValue) => {
        reject(errValue instanceof Error ? errValue : new Error(String(errValue)))
      })

      pdf2json.on('pdfParser_dataReady', (raw) => {
        try {
          const pages: ExtractedPage[] = []

          const pageNodes = raw.Pages ?? []

          // Build per-page text from pdf2json's text runs
          for (let i = 0; i < pageNodes.length; i += 1) {
            const pageNode = pageNodes[i]
            const texts: string[] = []

            // Each Page has Texts -> array of { R: [textRun] }
            const textGroups = pageNode.Texts ?? []
            for (const group of textGroups) {
              const runs = group.R ?? []
              for (const run of runs) {
                if (typeof run.T === 'string' && run.T.length > 0) {
                  // pdf2json URI-encodes text runs.
                  let decoded = run.T
                  try {
                    decoded = decodeURIComponent(run.T)
                  } catch {
                    // keep raw value if decoding fails
                  }
                  texts.push(decoded)
                }
              }
            }

            const pageText = texts.join(' ')
            const normalized = normalizeWhitespace(pageText)
              .replace(/\s+/g, ' ')
              .trim()

            if (normalized.length > 0) {
              pages.push({ pageNumber: i + 1, text: normalized })
            }
          }

          const text = pages.map((p) => p.text).join('\n\n').trim()
          resolve({ text, pages })
        } catch (e) {
          reject(e)
        }
      })

      // pdf2json 4.x expects a Buffer (it rejects strings: they lack `.buffer`).
      pdf2json.parseBuffer(buffer)
    })

    // Ensure we always return a pages array with at least 1 element.
    // This prevents downstream chunking from failing on edge PDFs.
    if (!parsed.pages || parsed.pages.length === 0) {
      return { text: parsed.text, pages: [{ pageNumber: 1, text: parsed.text }] }
    }

    return parsed
  }





  if (lower.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value || ''
    return { text, pages: [] }
  }

  const text = buffer.toString('utf8')
  return { text, pages: [] }
}
