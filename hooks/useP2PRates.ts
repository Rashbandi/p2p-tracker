'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Fiat, P2PRates } from '@/types'

const REFRESH_INTERVAL = 60_000  // 60s

export function useP2PRates(fiats: Fiat[]) {
  const [rates, setRates]     = useState<Record<string, P2PRates>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      const results = await Promise.all(
        fiats.map(fiat =>
          fetch(`/api/p2p-rates?fiat=${fiat}`)
            .then(r => r.json())
            .then(data => [fiat, data] as [string, P2PRates])
        )
      )
      const map: Record<string, P2PRates> = {}
      for (const [fiat, data] of results) {
        if (!data.error) map[fiat] = data
      }
      setRates(map)
      setError(null)
      setLastUpdate(new Date())
    } catch (err) {
      setError('No se pudo obtener las tasas. Intenta más tarde.')
    } finally {
      setLoading(false)
    }
  }, [fiats.join(',')])

  useEffect(() => {
    fetchAll()
    const timer = setInterval(fetchAll, REFRESH_INTERVAL)
    return () => clearInterval(timer)
  }, [fetchAll])

  return { rates, loading, error, lastUpdate, refresh: fetchAll }
}
