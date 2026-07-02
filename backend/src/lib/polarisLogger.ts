import { randomUUID } from 'crypto'
import type { NextRequest } from 'next/server'

type PolarisLogBase = {
  request_id: string
  timestamp: string
  endpoint: string
  method: string
  status_code: number
  latency_ms: number
  user_id: string | null
  company_id: string | null
  event_type: string
}

type PolarisLog = PolarisLogBase & {
  extra?: string
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value)
  } catch {
    return JSON.stringify(String(value))
  }
}

function resolveEndpoint(req: Request | NextRequest, fallback: string) {
  try {
    const url = new URL(req.url)
    const path = url.pathname
    if (path) return path
    return fallback
  } catch {
    return fallback
  }
}

export function getRequestId(req: Request | NextRequest) {
  const headerId = req.headers.get('x-request-id')
  return (headerId && String(headerId)) || randomUUID()
}

export function createRequestLogger(args: {
  request: Request | NextRequest
  userId?: string | null
  companyId?: string | null
  eventType?: string
}) {
  const requestId = getRequestId(args.request)
  const timestamp = new Date().toISOString()
  const method = args.request.method ? String(args.request.method) : 'UNKNOWN'
  const endpoint = resolveEndpoint(args.request, 'UNKNOWN')
  const startedAtMs = Date.now()

  const base: PolarisLog = {
    request_id: requestId,
    timestamp,
    endpoint,
    method,
    status_code: 0,
    latency_ms: 0,
    user_id: args.userId ?? null,
    company_id: args.companyId ?? null,
    event_type: args.eventType ?? 'request_start',
  }


  function emit(next: Partial<PolarisLog> & { event_type: PolarisLogBase['event_type'] }) {
    const log: PolarisLog = {
      ...base,
      event_type: next.event_type,
      status_code: typeof next.status_code === 'number' ? next.status_code : base.status_code,
      latency_ms: typeof next.latency_ms === 'number' ? next.latency_ms : base.latency_ms,
      user_id: next.user_id ?? base.user_id,
      company_id: next.company_id ?? base.company_id,
      endpoint: next.endpoint ?? base.endpoint,
      method: next.method ?? base.method,
      request_id: next.request_id ?? base.request_id,
      timestamp: next.timestamp ?? new Date().toISOString(),
    }

    // JSON logs only. Logging must never block.
    try {
      console.log(JSON.stringify(log))
    } catch {
      // swallow
    }
  }

  return {
    requestId,
    setUserContext(userId: string | null, companyId: string | null) {
      base.user_id = userId
      base.company_id = companyId
    },
    start() {
      emit({
        event_type: 'request_start',
        status_code: 0,
        latency_ms: 0,
      })
    },
    success(statusCode: number) {
      const latency = Date.now() - startedAtMs
      emit({
        event_type: 'request_success',
        status_code: statusCode,
        latency_ms: latency,
      })
    },
    error(statusCode: number) {
      const latency = Date.now() - startedAtMs
      emit({
        event_type: 'request_error',
        status_code: statusCode,
        latency_ms: latency,
      })
    },
    // Domain events that do not alter request completion fields
    event(eventType: PolarisLogBase['event_type'], payload?: Record<string, unknown>) {
      const latency = Date.now() - startedAtMs
      try {
        emit({
          event_type: eventType,
          status_code: base.status_code || 0,
          latency_ms: latency,
          user_id: base.user_id,
          company_id: base.company_id,
          ...(payload ? { endpoint: base.endpoint } : {}),
        })
      } catch {
        void payload
      }
    },
    // generic event (logs required fields + keeps JSON-only)
    domainEvent(eventType: PolarisLogBase['event_type'], extra?: Record<string, unknown>) {
      const latency = Date.now() - startedAtMs
      const log: PolarisLog = {
        ...base,
        event_type: eventType,
        status_code: base.status_code || 0,
        latency_ms: latency,
        timestamp: new Date().toISOString(),
        user_id: base.user_id,
        company_id: base.company_id,
      }

      if (extra && Object.keys(extra).length > 0) {
        log.extra = safeStringify(extra)
      }

      try {
        console.log(JSON.stringify(log))
      } catch {
        // swallow
      }
    },
  }
}


export function logEvent(args: {
  request: Request | NextRequest
  userId?: string | null
  companyId?: string | null
  endpoint?: string
  method?: string
  requestId?: string
  statusCode?: number
  latencyMs?: number
  eventType: PolarisLogBase['event_type']
  extra?: Record<string, unknown>
}) {
  const requestId = args.requestId || getRequestId(args.request)
  const log: PolarisLog = {
    request_id: requestId,
    timestamp: new Date().toISOString(),
    endpoint: args.endpoint ?? resolveEndpoint(args.request, 'UNKNOWN'),
    method: args.method ?? String(args.request.method ?? 'UNKNOWN'),
    status_code: args.statusCode ?? 0,
    latency_ms: args.latencyMs ?? 0,
    user_id: args.userId ?? null,
    company_id: args.companyId ?? null,
    event_type: args.eventType,
  }

  if (args.extra && Object.keys(args.extra).length > 0) {
    log.extra = safeStringify(args.extra)
  }

  try {
    console.log(JSON.stringify(log))
  } catch {
    // swallow
  }
}
