'use client'
import { useState } from 'react'
import { useRates } from '@/context/RatesContext'
import type { RatesFilter } from '@/hooks/useP2PRates'
import { fmtVES } from '@/lib/utils'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { BankDropdown } from '@/components/ui/BankDropdown'
import { VES_BANKS, EXTRA_PAY_METHODS } from '@/lib/ves-banks'
import type { Fiat } from '@/types'

const FLAG: Record<string, string> = {
  VES: '🇻🇪', COP: '🇨🇴', ARS: '🇦🇷', BRL: '🇧🇷', PEN: '🇵🇪', CLP: '🇨🇱',
}

// All known pay method labels for tag display
const ALL_PAY_LABELS: Record<string, string> = {
  ...Object.fromEntries(VES_BANKS.filter(b => b.binanceId).map(b => [b.binanceId!, b.name])),
  ...Object.fromEntries(EXTRA_PAY_METHODS.map(m => [m.binanceId, m.name])),
}

export function RatesPanel() {
  const {
    rates, loading, error, lastUpdate, refresh,
    activeFiat, setActiveFiat,
    appliedFilters, setAppliedFilters,
    fiats,
  } = useRates()

  const [showFilters, setShowFilters] = useState(false)
  const [selectedPay, setSelectedPay] = useState<string[]>([])
  const [transAmount, setTransAmount] = useState('')

  const rate = rates[activeFiat]
  const hasFilters = appliedFilters.payTypes.length > 0 || !!appliedFilters.transAmount

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

          {/* Filter button */}
          <button
            onClick={() => setShowFilters(f => !f)}
            className={[
              'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all',
              hasFilters
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'hover:bg-gray-700 text-gray-500 hover:text-gray-300',
            ].join(' ')}
            title="Filtros"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filtros
            {hasFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </button>

          {/* Refresh */}
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

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-800/60 border border-gray-700 rounded-xl">
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-2">
              Monto en {activeFiat} a operar
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder={
                  activeFiat === 'VES' ? 'ej: 500000'
                  : activeFiat === 'COP' ? 'ej: 2000000'
                  : activeFiat === 'ARS' ? 'ej: 1000000'
                  : 'ej: 5000'
                }
                value={transAmount}
                onChange={e => setTransAmount(e.target.value)}
                className="w-full bg-[#07080f] border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:border-green-500 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{activeFiat}</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Muestra solo anuncios que cubren este monto en {activeFiat}
            </p>
          </div>

          {activeFiat === 'VES' && (
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-2">
                Banco · Método de pago
              </label>
              <BankDropdown selected={selectedPay} onChange={setSelectedPay} />
            </div>
          )}

          <div className="flex gap-2 mt-1">
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

      {/* Active filters summary */}
      {hasFilters && !showFilters && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {appliedFilters.transAmount && (
            <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-full">
              {Number(appliedFilters.transAmount).toLocaleString()} {activeFiat}
            </span>
          )}
          {appliedFilters.payTypes.map(id => (
            <span key={id} className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-full">
              {ALL_PAY_LABELS[id] ?? id}
            </span>
          ))}
          <button onClick={clearFilters} className="text-xs text-gray-600 hover:text-gray-400 ml-1">
            × Limpiar
          </button>
        </div>
      )}

      {/* Fiat tabs */}
      <div className="flex gap-1.5 mb-4">
        {fiats.map(fiat => (
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
          {/* Summary */}
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
              <p className="text-xs text-gray-500 mb-1">Spread bruto</p>
              <p className={`text-sm font-bold font-mono ${rate.spreadPct > 1 ? 'text-amber-400' : 'text-gray-400'}`}>
                {rate.spreadPct.toFixed(2)}%
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">+~0.30% comisión</p>
            </div>
          </div>

          {/* P2P logic info banner */}
          <div className="mb-4 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
            <p className="text-xs text-amber-400 font-semibold mb-1.5 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ¿Cómo fijar tu precio?
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              <div className="flex items-start gap-1.5">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                <span className="text-gray-400">
                  Anuncio de <span className="text-green-400 font-medium">VENTA</span>
                  {' → '}mira la columna de <span className="text-blue-400 font-medium">Compra</span>
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                <span className="text-gray-400">
                  Anuncio de <span className="text-blue-400 font-medium">COMPRA</span>
                  {' → '}mira la columna de <span className="text-green-400 font-medium">Venta</span>
                </span>
              </div>
            </div>
            <div className="border-t border-amber-500/10 pt-2 text-[10px] text-gray-600">
              💰 Comisión Binance P2P: <span className="text-amber-500/80">Maker ~0.30%</span> · Taker 0% · El spread mostrado es bruto (sin incluir comisión)
            </div>
          </div>

          {/* Top merchants */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                Top compradores
              </p>
              <p className="text-[10px] text-green-500/70 mb-2 ml-3">📌 Ref. para tu anuncio de VENTA</p>
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
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                Top vendedores
              </p>
              <p className="text-[10px] text-blue-500/70 mb-2 ml-3">📌 Ref. para tu anuncio de COMPRA</p>
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
