'use client'
import { useState } from 'react'
import { calcP2P, fmtVES, fmtUSDT, fmtPct, parseVES } from '@/lib/utils'
import { VES_PAY_METHODS, BINANCE_MAKER_FEE } from '@/lib/constants'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { NumInput } from '@/components/ui/Input'
import { useRates } from '@/context/RatesContext'

const TARGET_PCTS = [1, 2, 3, 4, 5]

// Precio sugerido para anuncio de VENTA dado que eres maker en ambos lados
function suggestSellPrice(buyPrice: number, vesComm: number, targetPct: number, exchange: 'binance' | 'bybit'): number {
  const makerFee = exchange === 'binance' ? BINANCE_MAKER_FEE : 0
  const usdtNetPerFiat = (1 - makerFee) / buyPrice
  const effectiveBuyCost = (1 + vesComm) / usdtNetPerFiat
  const neededNetRevenue = effectiveBuyCost * (1 + targetPct / 100)
  return makerFee < 1 ? neededNetRevenue / (1 - makerFee) : neededNetRevenue
}

// Para Tab 2: ya tengo los USDT. Solo necesito cubrir el fee de VENTA.
// PSell × (1 - makerFee) = PBuy × (1 + targetPct/100)
// PSell = PBuy × (1 + targetPct/100) / (1 - makerFee)
function suggestSellPriceForHold(buyPrice: number, targetPct: number, exchange: 'binance' | 'bybit'): number {
  const makerFee = exchange === 'binance' ? BINANCE_MAKER_FEE : 0
  return makerFee < 1 ? (buyPrice * (1 + targetPct / 100)) / (1 - makerFee) : buyPrice * (1 + targetPct / 100)
}

// Spread real si vendo al precio PSell (ya tengo USDT, solo fee de venta)
function calcHoldSpread(buyPrice: number, sellPrice: number, exchange: 'binance' | 'bybit'): number {
  const makerFee = exchange === 'binance' ? BINANCE_MAKER_FEE : 0
  return (sellPrice * (1 - makerFee) / buyPrice - 1) * 100
}

function getOpportunity(roi: number) {
  if (roi >= 2)   return { label: '🟢 Excelente oportunidad',  color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30'  }
  if (roi >= 0.5) return { label: '🟡 Oportunidad marginal',   color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30'  }
  if (roi > 0)    return { label: '🟠 Spread muy ajustado',    color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' }
  return            { label: '🔴 No rentable',                  color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30'    }
}

type Tab = 'calc' | 'hold'

export function Calculator() {
  const [tab, setTab] = useState<Tab>('calc')

  // ── Tab 1 ──────────────────────────────────────────────────────────────
  const [capital, setCapital]   = useState('')
  const [buy, setBuy]           = useState('')
  const [sell, setSell]         = useState('')
  const [payIdx, setPayIdx]     = useState(0)
  const [exchange, setExchange] = useState<'binance' | 'bybit'>('binance')
  const [loadingRates, setLoadingRates] = useState(false)

  // ── Tab 2 ──────────────────────────────────────────────────────────────
  const [holdUsdt, setHoldUsdt]         = useState('')
  const [holdBuyPrice, setHoldBuyPrice] = useState('')
  const [holdExchange, setHoldExchange] = useState<'binance' | 'bybit'>('binance')

  const { rates, activeFiat } = useRates()
  const liveRate    = rates[activeFiat]
  const hasLiveRates = !!liveRate?.buyRates?.length && !!liveRate?.sellRates?.length

  // ── Tab 1 logic ────────────────────────────────────────────────────────
  const vesComm  = VES_PAY_METHODS[payIdx].rate
  const makerFee = exchange === 'binance' ? BINANCE_MAKER_FEE : 0
  const cap      = parseVES(capital)
  const buyP     = parseVES(buy)
  const selP     = parseVES(sell)

  const result = cap > 0 && buyP > 0 && selP > 0
    ? calcP2P({ capital: cap, buyPrice: buyP, sellPrice: selP, vesComm, exchange })
    : null

  const showTargets = buyP > 0
  const actualSellPct = buyP > 0 && selP > 0
    ? ((selP * (1 - makerFee) * (1 - makerFee)) / (buyP * (1 + vesComm)) - 1) * 100
    : null
  const breakEvenPrice = buyP > 0 ? suggestSellPrice(buyP, vesComm, 0, exchange) : 0
  const opportunity    = actualSellPct !== null ? getOpportunity(actualSellPct) : null

  function useLiveRatesCalc() {
    if (!liveRate) return
    setLoadingRates(true)
    if (liveRate.sellRates[0]?.price) setBuy(String(liveRate.sellRates[0].price))
    if (liveRate.buyRates[0]?.price)  setSell(String(liveRate.buyRates[0].price))
    setTimeout(() => setLoadingRates(false), 300)
  }

  // ── Tab 2 logic ─────────────────────────────────────────────────────────
  const holdUsdtAmt = parseVES(holdUsdt)
  const holdBuyP    = parseVES(holdBuyPrice)
  const holdFee     = holdExchange === 'binance' ? BINANCE_MAKER_FEE : 0

  // Spread real si pusieras tu anuncio de venta al precio de cada mercado (sellRates = vendedores actuales = tu competencia)
  const marketSellRates = liveRate?.sellRates?.slice(0, 5) ?? []

  // El mejor precio de venta del mercado (lo más bajo entre los vendedores = tu competencia directa)
  const marketTopSell = marketSellRates[0]?.price ?? 0
  const marketSpread  = holdBuyP > 0 && marketTopSell > 0 ? calcHoldSpread(holdBuyP, marketTopSell, holdExchange) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculadora P2P</CardTitle>
        {tab === 'calc' && hasLiveRates && (
          <button
            onClick={useLiveRatesCalc}
            disabled={loadingRates}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50"
          >
            <svg className={`w-3 h-3 ${loadingRates ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Tasas {activeFiat}
          </button>
        )}
      </CardHeader>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-gray-800/60 rounded-xl">
        <button
          onClick={() => setTab('calc')}
          className={[
            'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all',
            tab === 'calc' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300',
          ].join(' ')}
        >
          ⚡ Simular operación
        </button>
        <button
          onClick={() => setTab('hold')}
          className={[
            'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all',
            tab === 'hold' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300',
          ].join(' ')}
        >
          💼 Fijar precio de venta
        </button>
      </div>

      {/* ══════════════ TAB 1: SIMULAR OPERACIÓN ════════════════════════════ */}
      {tab === 'calc' && (
        <>
          <div className="flex gap-2 mb-4">
            {(['binance', 'bybit'] as const).map(ex => (
              <button key={ex} onClick={() => setExchange(ex)}
                className={['flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  exchange === ex ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-gray-800 text-gray-500 hover:text-gray-300',
                ].join(' ')}>
                {ex === 'binance' ? '⬡ Binance' : '◈ Bybit'}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1.5">Método de pago (VES)</label>
            <div className="flex flex-wrap gap-1.5">
              {VES_PAY_METHODS.map((m, i) => (
                <button key={m.key} onClick={() => setPayIdx(i)}
                  className={['px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                    payIdx === i ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-gray-800 text-gray-500 hover:text-gray-300',
                  ].join(' ')}>
                  {m.label}
                  {m.rate > 0 && <span className="ml-1 text-gray-600">+{(m.rate * 100).toFixed(1)}%</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <NumInput label="Capital (Fiat)" placeholder="0,00" value={capital} onChange={setCapital} />
            <NumInput label="Precio anuncio COMPRA" placeholder="0,00" value={buy} onChange={setBuy} />
            <NumInput label="Precio anuncio VENTA"  placeholder="0,00" value={sell} onChange={setSell} />
          </div>

          {/* Market overview */}
          {hasLiveRates && !buyP && (
            <div className="mb-4 p-3 bg-gray-800/50 border border-gray-700 rounded-xl">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Referencia de mercado · {activeFiat}</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-[10px] text-gray-600 mb-0.5">Top vendedor (ref. compra)</p>
                  <p className="text-xs font-mono font-bold text-green-400">{fmtVES(liveRate.sellRates[0]?.price ?? 0)}</p>
                  <p className="text-[10px] text-green-500/60">tu anuncio COMPRA ↓</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-600 mb-0.5">Spread bruto</p>
                  <p className={`text-xs font-mono font-bold ${liveRate.spreadPct > 0.8 ? 'text-green-400' : 'text-amber-400'}`}>
                    {liveRate.spreadPct.toFixed(2)}%
                  </p>
                  <p className="text-[10px] text-gray-600">−0.60% fees</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-600 mb-0.5">Top comprador (ref. venta)</p>
                  <p className="text-xs font-mono font-bold text-blue-400">{fmtVES(liveRate.buyRates[0]?.price ?? 0)}</p>
                  <p className="text-[10px] text-blue-500/60">tu anuncio VENTA ↑</p>
                </div>
              </div>
              <button onClick={useLiveRatesCalc}
                className="mt-3 w-full py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-semibold rounded-lg transition-colors">
                ↓ Cargar estos precios
              </button>
            </div>
          )}

          {opportunity && (
            <div className={`mb-4 flex items-center justify-between px-3 py-2.5 rounded-xl border ${opportunity.bg} ${opportunity.border}`}>
              <span className={`text-xs font-semibold ${opportunity.color}`}>{opportunity.label}</span>
              <span className={`text-sm font-bold font-mono ${opportunity.color}`}>
                {actualSellPct! >= 0 ? '+' : ''}{actualSellPct!.toFixed(2)}% neto
              </span>
            </div>
          )}

          {showTargets && (
            <div className="mb-4 border border-gray-700 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-800/60 border-b border-gray-700 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Precio sugerido · anuncio VENTA</span>
                <span className="text-[10px] text-gray-600">maker {(makerFee * 100).toFixed(2)}% × 2 lados</span>
              </div>
              <div className="divide-y divide-gray-800/60">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800/20">
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-center text-xs font-bold font-mono rounded-md py-0.5 text-gray-600 bg-gray-700/50">0%</span>
                    <span className="text-xs text-gray-600">punto de equilibrio</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-gray-500">{fmtVES(breakEvenPrice)}</span>
                </div>
                {TARGET_PCTS.map(pct => {
                  const target        = suggestSellPrice(buyP, vesComm, pct, exchange)
                  const isActive      = actualSellPct !== null && Math.abs(actualSellPct - pct) < 0.5
                  const isAbove       = actualSellPct !== null && actualSellPct > pct + 0.5
                  const isRecommended = pct === 1 || pct === 2
                  return (
                    <div key={pct} className={['flex items-center justify-between px-4 py-2.5 transition-colors',
                      isActive ? 'bg-green-500/8' : isRecommended ? 'bg-blue-500/5' : 'hover:bg-gray-800/40',
                    ].join(' ')}>
                      <div className="flex items-center gap-2">
                        <span className={['w-8 text-center text-xs font-bold font-mono rounded-md py-0.5',
                          pct <= 1 ? 'text-gray-400 bg-gray-700/50' : pct <= 2 ? 'text-blue-400 bg-blue-500/10'
                          : pct <= 3 ? 'text-green-400 bg-green-500/10' : pct <= 4 ? 'text-amber-400 bg-amber-500/10' : 'text-orange-400 bg-orange-500/10',
                        ].join(' ')}>{pct}%</span>
                        <span className="text-xs text-gray-500">spread neto</span>
                        {isRecommended && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold">sugerido</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold font-mono ${isRecommended ? 'text-blue-300' : 'text-white'}`}>{fmtVES(target)}</span>
                        {actualSellPct !== null && (
                          <span className={['text-[10px] font-medium w-16 text-right',
                            isActive ? 'text-green-400' : isAbove ? 'text-green-500/50' : 'text-red-500/50',
                          ].join(' ')}>
                            {isActive ? '✓ aquí' : isAbove ? '↑ superado' : '↓ abajo'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {actualSellPct !== null && (
                <div className={['px-4 py-2.5 border-t border-gray-700 flex items-center justify-between',
                  actualSellPct >= 1 ? 'bg-green-500/8' : actualSellPct > 0 ? 'bg-amber-500/8' : 'bg-red-500/8',
                ].join(' ')}>
                  <span className="text-xs text-gray-400">Tu anuncio VENTA ({fmtVES(selP)}) da:</span>
                  <span className={`text-sm font-bold font-mono ${actualSellPct >= 1 ? 'text-green-400' : actualSellPct > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                    {actualSellPct >= 0 ? '+' : ''}{actualSellPct.toFixed(2)}% real
                  </span>
                </div>
              )}
            </div>
          )}

          {result ? (
            <div className="border border-gray-700 rounded-xl overflow-hidden">
              <div className={['flex items-center justify-between px-4 py-3',
                result.ganancia >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'].join(' ')}>
                <span className="text-xs text-gray-400 font-medium">Resultado estimado</span>
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold font-mono ${result.ganancia >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {result.ganancia >= 0 ? '+' : ''}{fmtVES(result.ganancia)}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${result.roi >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {result.roi >= 0 ? '+' : ''}{fmtPct(result.roi)}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-800">
                {[
                  { label: 'Capital invertido',                                               val: fmtVES(result.capital),                color: 'text-gray-300' },
                  { label: 'Comisión método de pago',                                        val: result.comisFiatCompra > 0 ? `+${fmtVES(result.comisFiatCompra)}` : '—', color: 'text-amber-400' },
                  { label: 'Total fiat entregado',                                           val: fmtVES(result.totalFiatSale),          color: 'text-white',    bold: true },
                  { label: 'USDT bruto recibido',                                            val: `${fmtUSDT(result.usdtBruto)} USDT`,  color: 'text-blue-400' },
                  { label: `Fee anuncio COMPRA (maker ${(makerFee*100).toFixed(2)}%)`,      val: `-${fmtUSDT(result.comisUsdtCompra)} USDT`, color: 'text-red-400' },
                  { label: 'USDT neto disponible',                                           val: `${fmtUSDT(result.usdtNeto)} USDT`,   color: 'text-blue-300', bold: true },
                  { label: `Fee anuncio VENTA (maker ${(makerFee*100).toFixed(2)}%)`,       val: `-${fmtUSDT(result.comisUsdtVenta)} USDT`, color: 'text-red-400' },
                  { label: 'USDT vendidos',                                                  val: `${fmtUSDT(result.usdtNetVenta)} USDT`, color: 'text-gray-300' },
                  { label: 'Fiat recibido',                                                  val: fmtVES(result.fiatRecibido),           color: 'text-green-400', bold: true },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2">
                    <span className="text-xs text-gray-500">{row.label}</span>
                    <span className={`text-xs font-mono ${row.color} ${row.bold ? 'font-semibold' : ''}`}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : !showTargets && (
            <div className="border border-dashed border-gray-700 rounded-xl py-6 text-center">
              <p className="text-sm text-gray-600">Ingresa capital y precios de tus anuncios</p>
              {hasLiveRates && (
                <button onClick={useLiveRatesCalc} className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  ↓ O usa las tasas actuales de {activeFiat}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════ TAB 2: FIJAR PRECIO DE VENTA ════════════════════════ */}
      {tab === 'hold' && (
        <>
          {/* Contexto */}
          <div className="mb-4 p-3 bg-blue-500/8 border border-blue-500/20 rounded-xl">
            <p className="text-xs text-blue-400 font-semibold mb-0.5">¿A qué precio pongo mi anuncio de VENTA?</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Ingresa los USDT que tienes y el precio de tu anuncio de COMPRA.
              Te decimos exactamente a qué precio fijar tu anuncio de VENTA para lograr 1%, 2%, 3% de spread.
            </p>
          </div>

          {/* Exchange */}
          <div className="flex gap-2 mb-4">
            {(['binance', 'bybit'] as const).map(ex => (
              <button key={ex} onClick={() => setHoldExchange(ex)}
                className={['flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  holdExchange === ex ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-gray-800 text-gray-500 hover:text-gray-300',
                ].join(' ')}>
                {ex === 'binance' ? '⬡ Binance' : '◈ Bybit'}
              </button>
            ))}
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <NumInput label="USDT que tengo" placeholder="0,00" value={holdUsdt} onChange={setHoldUsdt} />
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1.5">
                Precio anuncio COMPRA
              </label>
              <div className="relative">
                <input
                  type="text" inputMode="decimal" placeholder="0,00"
                  value={holdBuyPrice}
                  onChange={e => setHoldBuyPrice(e.target.value)}
                  className="w-full bg-[#07080f] border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-100 placeholder:text-gray-600 focus:border-blue-500 focus:outline-none"
                />
                {hasLiveRates && liveRate?.sellRates?.[0]?.price && (
                  <button
                    onClick={() => setHoldBuyPrice(String(liveRate.sellRates[0].price))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-500 hover:text-blue-300 font-bold transition-colors"
                    title="Usar precio de mercado actual"
                  >
                    hoy
                  </button>
                )}
              </div>
            </div>
          </div>

          {holdBuyP > 0 && (
            <>
              {/* Tabla de precios para el anuncio de VENTA */}
              <div className="mb-4 border border-gray-700 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-800/60 border-b border-gray-700 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-300">Precio de tu anuncio de VENTA</span>
                  <span className="text-[10px] text-gray-600">fee maker {(holdFee * 100).toFixed(2)}% en venta</span>
                </div>

                <div className="divide-y divide-gray-800/60">
                  {/* Break-even */}
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-800/20">
                    <div className="flex items-center gap-2">
                      <span className="w-8 text-center text-xs font-bold font-mono rounded-md py-0.5 text-gray-600 bg-gray-700/50">0%</span>
                      <span className="text-xs text-gray-600">punto de equilibrio</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold font-mono text-gray-500">
                        {fmtVES(suggestSellPriceForHold(holdBuyP, 0, holdExchange))}
                      </span>
                      {/* Posición vs mercado */}
                      {marketTopSell > 0 && (() => {
                        const p = suggestSellPriceForHold(holdBuyP, 0, holdExchange)
                        const pos = marketSellRates.findIndex(r => p <= r.price)
                        return (
                          <span className="text-[10px] text-gray-600 w-16 text-right">
                            {pos === -1 ? '↑ encima' : pos === 0 ? '#1 mkt' : `#${pos + 1} mkt`}
                          </span>
                        )
                      })()}
                    </div>
                  </div>

                  {[1, 2, 3, 5].map(pct => {
                    const target        = suggestSellPriceForHold(holdBuyP, pct, holdExchange)
                    const isRecommended = pct === 1 || pct === 2
                    // Posición competitiva: cuántos vendedores actuales tienen precio menor que el mío
                    const pos = marketSellRates.findIndex(r => target <= r.price)
                    const posLabel = marketSellRates.length === 0 ? ''
                      : pos === -1 ? '↑ sobre mkt'
                      : pos === 0  ? '🥇 #1 mkt'
                      : `#${pos + 1} de mkt`
                    const posColor = pos === -1 ? 'text-amber-500/70' : pos === 0 ? 'text-green-400' : 'text-blue-400'

                    return (
                      <div key={pct}
                        className={['flex items-center justify-between px-4 py-2.5 transition-colors',
                          isRecommended ? 'bg-blue-500/5' : 'hover:bg-gray-800/40',
                        ].join(' ')}>
                        <div className="flex items-center gap-2">
                          <span className={['w-8 text-center text-xs font-bold font-mono rounded-md py-0.5',
                            pct <= 1 ? 'text-gray-400 bg-gray-700/50' : pct <= 2 ? 'text-blue-400 bg-blue-500/10'
                            : pct <= 3 ? 'text-green-400 bg-green-500/10' : 'text-amber-400 bg-amber-500/10',
                          ].join(' ')}>{pct}%</span>
                          <span className="text-xs text-gray-500">spread neto</span>
                          {isRecommended && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold">sugerido</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-bold font-mono ${isRecommended ? 'text-blue-300' : 'text-white'}`}>
                            {fmtVES(target)}
                          </span>
                          {posLabel && (
                            <span className={`text-[10px] font-semibold w-20 text-right ${posColor}`}>{posLabel}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Resumen si tiene USDT ingresado */}
                {holdUsdtAmt > 0 && (
                  <div className="border-t border-gray-700 px-4 py-2.5 bg-gray-800/30">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">
                      Ganancia estimada si vendes {fmtUSDT(holdUsdtAmt)} USDT al precio sugerido (2%)
                    </p>
                    {(() => {
                      const price2  = suggestSellPriceForHold(holdBuyP, 2, holdExchange)
                      const netFiat = holdUsdtAmt * (1 - holdFee) * price2
                      const cost    = holdUsdtAmt * holdBuyP
                      const profit  = netFiat - cost
                      return (
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[10px] text-gray-600 mb-0.5">Costo</p>
                            <p className="text-xs font-mono font-semibold text-gray-400">{fmtVES(cost)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-600 mb-0.5">Recibes</p>
                            <p className="text-xs font-mono font-semibold text-green-300">{fmtVES(netFiat)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-600 mb-0.5">Ganancia</p>
                            <p className="text-xs font-mono font-bold text-green-400">+{fmtVES(profit)}</p>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

              {/* Referencia del mercado: vendedores actuales (tu competencia directa) */}
              {hasLiveRates && marketSellRates.length > 0 && (
                <div className="border border-gray-700 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-800/60 border-b border-gray-700">
                    <p className="text-xs font-semibold text-gray-300">Vendedores activos en mercado · {activeFiat}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">Tu competencia directa — los anuncios de VENTA actuales</p>
                  </div>
                  <div className="divide-y divide-gray-800/60">
                    {marketSellRates.map((r, i) => {
                      const spreadIfMatch = calcHoldSpread(holdBuyP, r.price, holdExchange)
                      const spreadColor   = spreadIfMatch >= 2 ? 'text-green-400' : spreadIfMatch >= 1 ? 'text-amber-400' : spreadIfMatch > 0 ? 'text-orange-400' : 'text-red-400'
                      return (
                        <div key={i} className="flex items-center justify-between px-4 py-2.5">
                          <div className="min-w-0">
                            <p className="text-xs text-gray-400 font-medium truncate max-w-[120px]">{r.merchant}</p>
                            <p className="text-[10px] text-gray-600">{fmtVES(r.minAmount)} – {fmtVES(r.maxAmount)}</p>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="text-sm font-mono font-bold text-green-300">{fmtVES(r.price)}</p>
                            <p className={`text-[10px] font-semibold ${spreadColor}`}>
                              → {spreadIfMatch >= 0 ? '+' : ''}{spreadIfMatch.toFixed(2)}% si igualo
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {marketSpread !== null && (
                    <div className={['px-4 py-2.5 border-t border-gray-700 flex items-center justify-between',
                      marketSpread >= 2 ? 'bg-green-500/8' : marketSpread >= 1 ? 'bg-amber-500/8' : 'bg-red-500/8',
                    ].join(' ')}>
                      <span className="text-xs text-gray-400">Igualando al mejor precio del mercado:</span>
                      <span className={`text-sm font-bold font-mono ${marketSpread >= 2 ? 'text-green-400' : marketSpread >= 1 ? 'text-amber-400' : 'text-red-400'}`}>
                        {marketSpread >= 0 ? '+' : ''}{marketSpread.toFixed(2)}% spread
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!holdBuyP && (
            <div className="border border-dashed border-gray-700 rounded-xl py-6 text-center">
              <p className="text-sm text-gray-600">Ingresa tu precio de anuncio de COMPRA</p>
              {hasLiveRates && (
                <p className="text-xs text-gray-700 mt-1">
                  Referencia actual del mercado:{' '}
                  <span className="text-green-400 font-mono">{fmtVES(liveRate?.sellRates?.[0]?.price ?? 0)}</span>
                </p>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  )
}
