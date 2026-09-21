'use client'
import { useState } from 'react'
import { useP2PRates, RatesFilter } from '@/hooks/useP2PRates'
import { fmtVES } from '@/lib/utils'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { Fiat } from '@/types'

const FIATS: Fiat[] = ['VES', 'COP', 'ARS', 'BRL']

const FLAG: Record<string, string> = {
  VES: '🇻🇪', COP: '🇨🇴', ARS: '🇦🇷', BRL: '🇧🇷', PEN: '🇵🇪', CLP: '🇨🇱',
}

const PAY_METHODS = [
  { id: 'BancoDeVenezuela', label: 'Banco de Venezuela' },
  { id: 'Banesco',           label: 'Banesco' },
  { id: 'Mercantil',         label: 'Mercantil' },
  { id: 'Provincial',        label: 'Provincial' },
  { id: 'BNC',               label: 'BNC' },
  { id: 'Bancaribe',         label: 'Bancaribe' },
  { id: 'PagoMovil',         label: 'Pago Móvil' },
  { id: 'Zinli',             label: 'Zinli' },
  { id: 'Reserve',           label: 'Reserve' },
]

export function RatesPanel() {
  const [activeFiat, setActiveFiat] = useState<Fiat>('VES')
  const [showFilters, setShowFilters] = useState(false)

  const [selectedPay, setSelectedPay] = useState<string[]>([])
  const [transAmount, setTransAmount] = useState('')
  const [appliedFilters, setAppliedFilters] = useState<RatesFilter>({ payTypes: [], transAmount: '' })

  const { rates, loading, error, lastUpdate, refresh } = useP2PRates(FIATS, appliedFilters)
  const rate = rates[activeFiat]

  const hasFilters = appliedFilters.payTypes.length > 0 || !!appliedFilters.transAmount

  function togglePay(id: string) {
    setSelectedPay(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function applyFilters() {
    setAppliedFilters({ payTypes: selectedPay, transAmount })
    setShowFilters(false)
  }

  function clearFilters() {
    setSelectedPay([])
    setTransAmount('')
    setAppliedFilters({ payTypes: [], transAmount: '' })
  }

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
            onClick={() => setShowFilters(f => !f)}
            className={[
              'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all',
              hasFilters
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'hover:bg-gray-700 text-gray-500 hover:text-gray-300',
            ].join(' ')}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filtros
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
          </button>

          <button
            onClick={refresh}
            className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </CardHeader>

      {showFilters && (
        <div className="mb-4 p-4 bg-gray-800/60 border border-gray-700 rounded-xl">
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-2">
              Monto USDT a operar
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder="ej: 500"
                value={transAmount}
                onChange={e => setTransAmount(e.target.value)}
                className="w-full bg-[#07080f] border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:border-green-500 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">USDT</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">Muestra solo anuncios que cubren este monto</p>
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-2">
              Métodos de pago
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PAY_METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => togglePay(m.id)}
                  className={[
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                    selectedPay.includes(m.id)
                      ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                      : 'bg-gray-700/50 text-gray-500 hover:text-gray-300 border border-transparent',
                  ].join(' ')}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={applyFilters}
              className="flex-1 py-1.5 bg-green-500 hover:bg-green-400 text-gray-900 text-xs font-semibold rounded-lg transition-colors"
            >
              Aplicar filtros
            </button>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {hasFilters && !showFilters && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {appliedFilters.transAmount && (
            <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-full">
              {appliedFilters.transAmount} USDT
            </span>
          )}
          {appliedFilters.payTypes.map(id => {
            const m = PAY_METHODS.find(x => x.id === id)
            return (
              <span key={id} className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-full">
                {m?.label ?? id}
              </span>
            )
          })}
          <button onClick={clearFilters} className="text-xs text-gray-600 hover:text-gray-400 ml-1">
            × Limpiar
          </button>
        </div>
      )}

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
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Compra prom.</p>
              <p className="text-sm font-bold text-blue-400 font-mono">{fmtVES(rate.avgBuy)}</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Venta prom.</p>
              <p className="text-sm font-bold text-green-400 font-mono">{fmtVES(rate.avgSell)}</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Spread</p>
              <p className={`text-sm font-bold font-mono ${rate.spreadPct > 1 ? 'text-amber-400' : 'text-gray-400'}`}>
                {rate.spreadPct.toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                Top compradores
              </p>
              <div className="flex flex-col gap-1">
                {rate.buyRates.slice(0, 5).map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-2.5 py-1.5 bg-gray-800/40 rounded-lg">
                    <div className="min-w-0">
                      <span className="text-xs text-gray-500 truncate block max-w-[90px]">{r.merchant}</span>
                      <span className="text-[10px] text-gray-700">{fmtVES(r.minAmount)}–{fmtVES(r.maxAmount)}</span>
                    </div>
                    <span className="text-xs font-mono text-blue-400 font-medium ml-2 shrink-0">{fmtVES(r.price)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                Top vendedores
              </p>
              <div className="flex flex-col gap-1">
                {rate.sellRates.slice(0, 5).map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-2.5 py-1.5 bg-gray-800/40 rounded-lg">
                    <div className="min-w-0">
                      <span className="text-xs text-gray-500 truncate block max-w-[90px]">{r.merchant}</span>
                      <span className="text-[10px] text-gray-700">{fmtVES(r.minAmount)}–{fmtVES(r.maxAmount)}</span>
                    </div>
                    <span className="text-xs font-mono text-green-400 font-medium ml-2 shrink-0">{fmtVES(r.price)}</span>
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
