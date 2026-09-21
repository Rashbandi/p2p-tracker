'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Fiat, P2PRates } from '@/types'

const REFRESH_INTERVAL = 60_000

export interface RatesFilter {
  payTypes: string[]
  transAmount: string
}

export function useP2PRates(fiats: Fiat[], filters: RatesFilter) {
  const [rates, setRates]           = useState<Record<string, P2PRates>>({})
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const filterKey = `${filters.payTypes.sort().join(',')}|${filters.transAmount}`

  const fetchAll = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filters.payTypes.length > 0) params.set('payTypes', filters.payTypes.join(','))
      if (filters.transAmount) params.set('transAmount', filters.transAmount)
      const qs = params.toString()

      const results = await Promise.all(
        fiats.map(fiat =>
          fetch(`/api/p2p-rates?fiat=${fiat}${qs ? '&' + qs : ''}`)
            .then(r => r.json())
            .then(data => [fiat, data] as [string, P2PRates & { error?: string }])
        )
      )
      const map: Record<string, P2PRates> = {}
      for (const [fiat, data] of results) {
        if (!data.error) map[fiat] = data
      }
      setRates(map)
      setError(null)
      setLastUpdate(new Date())
    } catch {
      setError('No se pudo obtener las tasas.')
    } finally {
      setLoading(false)
    }
  }, [fiats.join(','), filterKey])

  useEffect(() => {
    setLoading(true)
    fetchAll()
    const timer = setInterval(fetchAll, REFRESH_INTERVAL)
    return () => clearInterval(timer)
  }, [fetchAll])

  return { rates, loading, error, lastUpdate, refresh: fetchAll }
}
