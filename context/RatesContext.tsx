'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { useP2PRates, type RatesFilter } from '@/hooks/useP2PRates'
import type { Fiat, P2PRates } from '@/types'

const FIATS: Fiat[] = ['VES', 'COP', 'ARS', 'BRL']

interface RatesContextValue {
  rates: Record<string, P2PRates>
  loading: boolean
  error: string | null
  lastUpdate: Date | null
  refresh: () => void
  activeFiat: Fiat
  setActiveFiat: (f: Fiat) => void
  appliedFilters: RatesFilter
  setAppliedFilters: (f: RatesFilter) => void
  fiats: Fiat[]
}

const RatesContext = createContext<RatesContextValue | null>(null)

export function RatesProvider({ children }: { children: ReactNode }) {
  const [activeFiat, setActiveFiat]       = useState<Fiat>('VES')
  const [appliedFilters, setAppliedFilters] = useState<RatesFilter>({ payTypes: [], transAmount: '' })

  const { rates, loading, error, lastUpdate, refresh } = useP2PRates(FIATS, appliedFilters)

  return (
    <RatesContext.Provider value={{
      rates, loading, error, lastUpdate, refresh,
      activeFiat, setActiveFiat,
      appliedFilters, setAppliedFilters,
      fiats: FIATS,
    }}>
      {children}
    </RatesContext.Provider>
  )
}

export function useRates() {
  const ctx = useContext(RatesContext)
  if (!ctx) throw new Error('useRates must be used within RatesProvider')
  return ctx
}
