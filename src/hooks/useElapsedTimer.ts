import { useCallback, useEffect, useState } from 'react'

export function useElapsedTimer(running: boolean): { seconds: number; reset(): void } {
  const [seconds, setSeconds] = useState(0)
  const reset = useCallback(() => setSeconds(0), [])

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [running])

  return { seconds, reset }
}
