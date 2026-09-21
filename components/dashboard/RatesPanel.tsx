'use client'
import { useState } from 'react'
import { useP2PRates } from '@/hooks/useP2PRates'
import { fmtVES } from '@/lib/utils'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Fiat } from '@/types'

const FIATS: Fiat[] = ['VES', 'COP', 'ARS', 'BRL']

const FLAG: Record<Fiat, string> = {
  VES: '🇻🇪', COP: '🇨🇴', ARS: '🇦🇷', BRL: '🇧🇷', PEN: '🇵🇪', CLP: '🇨🇱',
}

export function RatesPanel() {
  const { rates, loading, error, lastUpdate, refresh } = useP2PRates(FIATS)
  const [activeFiat, setActiveFiat] = useState<Fiat>('VES')

  const rate = rates[activeFiat]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasas P2P en vivo · Binance</CardTitle>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-gray-600">
              {lastUpdate.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={refresh}
            className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
            title="Actualizar tasas"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </CardHeader>

      {/* Fiat tabs */}
      <div className="flex gap-1.5 mb-4">
        {FIATS.map(fiat => (
          <button
            key={fiat}
            onClick={() => setActiveFiat(fiat)}
            className={[
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
              activeFiat === fiat
                ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50',
            ].join(' ')}
          >
            <span>{FLAG[fiat]}</span>
            {fiat}
          </button>
        ))}
      </div>

      {loading && !rate ? (
        <div className="flex flex-col gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-700/40 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-4 text-sm text-red-400">{error}</div>
      ) : rate ? (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Compra prom.</p>
              <p className="text-sm font-bold text-blue-400 font-mono">
                {fmtVES(rate.avgBuy)}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Venta prom.</p>
              <p className="text-sm font-bold text-green-400 font-mono">
                {fmtVES(rate.avgSell)}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Spread</p>
              <p className={`text-sm font-bold font-mono ${rate.spreadPct > 1 ? 'text-amber-400' : 'text-gray-400'}`}>
                {rate.spreadPct.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Top rates */}
          <div className="grid grid-cols-2 gap-3">
            {/* Buy */}
            <div>
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                Top compradores
              </p>
              <div className="flex flex-col gap-1.5">
                {rate.buyRates.slice(0, 5).map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-2.5 py-1.5 bg-gray-800/40 rounded-lg">
                    <span className="text-xs text-gray-500 truncate max-w-[80px]">{r.merchant}</span>
                    <span className="text-xs font-mono text-blue-400 font-medium">{fmtVES(r.price)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sell */}
            <div>
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                Top vendedores
              </p>
              <div className="flex flex-col gap-1.5">
                {rate.sellRates.slice(0, 5).map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-2.5 py-1.5 bg-gray-800/40 rounded-lg">
                    <span className="text-xs text-gray-500 truncate max-w-[80px]">{r.merchant}</span>
                    <span className="text-xs font-mono text-green-400 font-medium">{fmtVES(r.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </Card>
  )
}
