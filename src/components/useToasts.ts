import { useCallback, useEffect, useRef, useState } from 'react'

/* Transient confirmations so dashboard actions never complete silently. */

export type Toast = { id: number; text: string; tone: 'ok' | 'err' }

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const push = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((prev) => [...prev, { id, text, tone }])
    timers.current.push(
      window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3600),
    )
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, push, dismiss }
}

