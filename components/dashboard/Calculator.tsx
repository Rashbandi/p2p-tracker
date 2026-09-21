'use client'
import { useState } from 'react'
import { calcP2P, fmtVES, fmtUSDT, fmtPct, parseVES } from '@/lib/utils'
import { VES_PAY_METHODS, BINANCE_MAKER_FEE } from '@/lib/constants'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { NumInput } from '@/components/ui/Input'
import { useRates } from '@/context/RatesContext'

// Target profit levels to suggest
const TARGET_PCTS = [1, 2, 3, 4, 5]

// Dado precio de compra + comisiones, ¿a qué precio de venta se logra X% de ganancia?
// Anunciante = maker en ambos lados → fee 0.30% en compra Y en venta
function suggestSellPrice(buyPrice: number, vesComm: number, targetPct: number, exchange: 'binance' | 'bybit'): number {
  const makerFee = exchange === 'binance' ? BINANCE_MAKER_FEE : 0
  const usdtNetPerFiat = (1 - makerFee) / buyPrice
  const effectiveBuyCost = (1 + vesComm) / usdtNetPerFiat
  const neededNetRevenue = effectiveBuyCost * (1 + targetPct / 100)
  return makerFee < 1 ? neededNetRevenue / (1 - makerFee) : neededNetRevenue
}

// Semáforo de oportunidad
function getOpportunity(roi: number): { label: string; color: string; bg: string; border: string } {
  if (roi >= 2)   return { label: '🟢 Excelente oportunidad',  color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30'  }
  if (roi >= 0.5) return { label: '🟡 Oportunidad marginal',   color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30'  }
  if (roi > 0)    return { label: '🟠 Spread muy ajustado',    color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' }
  return            { label: '🔴 No rentable',                  color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30'    }
}

// ── Semáforo para análisis USDT guardado ───────────────────────────────────
function getHoldSignal(pnlPct: number): { label: string; advice: string; color: string; bg: string; border: string } {
  if (pnlPct >= 3)   return { label: '🟢 Buen momento para vender', advice: 'El mercado está pagando bien. Considera cerrar posición.', color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30'  }
  if (pnlPct >= 1)   return { label: '🟡 Rentable, pero esperable', advice: 'Estás en positivo. Puedes vender o esperar mejor precio.', color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30'  }
  if (pnlPct >= 0)   return { label: '🟠 Apenas cubriendo costo',   advice: 'Estás en break-even. Mejor esperar subida del mercado.',  color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' }
  return               { label: '🔴 Venderías en pérdida',          advice: 'El mercado bajó. Mantén tus USDT y espera recuperación.',  color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30'    }
}

type Tab = 'calc' | 'hold'

export function Calculator() {
  const [tab, setTab] = useState<Tab>('calc')

  // ── Tab 1: Calculadora clásica ──────────────────────────────────────────
  const [capital, setCapital]   = useState('')
  const [buy, setBuy]           = useState('')
  const [sell, setSell]         = useState('')
  const [payIdx, setPayIdx]     = useState(0)
  const [exchange, setExchange] = useState<'binance' | 'bybit'>('binance')
  const [loadingRates, setLoadingRates] = useState(false)

  // ── Tab 2: Tengo USDT guardado ──────────────────────────────────────────
  const [holdUsdt, setHoldUsdt]       = useState('')   // cuántos USDT tengo
  const [holdBuyPrice, setHoldBuyPrice] = useState('')  // a qué precio los compré
  const [holdExchange, setHoldExchange] = useState<'binance' | 'bybit'>('binance')
  const [holdPayIdx, setHoldPayIdx]   = useState(0)

  // Shared: acceso a tasas en vivo
  const { rates, activeFiat } = useRates()
  const liveRate = rates[activeFiat]
  const hasLiveRates = !!liveRate?.buyRates?.length && !!liveRate?.sellRates?.length

  // ── Calc tab logic ──────────────────────────────────────────────────────
  const vesComm  = VES_PAY_METHODS[payIdx].rate
  const makerFee = exchange === 'binance' ? BINANCE_MAKER_FEE : 0

  const cap  = parseVES(capital)
  const buyP = parseVES(buy)
  const selP = parseVES(sell)

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
    const suggestedBuy  = liveRate.sellRates[0]?.price
    const suggestedSell = liveRate.buyRates[0]?.price
    if (suggestedBuy)  setBuy(String(suggestedBuy))
    if (suggestedSell) setSell(String(suggestedSell))
    setTimeout(() => setLoadingRates(false), 300)
  }

  // ── Hold tab logic ──────────────────────────────────────────────────────
  const holdUsdtAmt  = parseVES(holdUsdt)
  const holdBuyP     = parseVES(holdBuyPrice)
  const holdMakerFee = holdExchange === 'binance' ? BINANCE_MAKER_FEE : 0
  const holdVesComm  = VES_PAY_METHODS[holdPayIdx].rate

  // Costo base: cuánto fiat pagué por estos USDT (incluyendo fee de compra)
  const holdCostFiat = holdBuyP > 0 && holdUsdtAmt > 0
    ? holdUsdtAmt * holdBuyP * (1 + holdVesComm)   // precio × USDT + comisión método
    : 0

  // Si vendo ahora: mejores compradores del mercado (buyRates = lo que pagan por tus USDT)
  const bestSellNow = liveRate?.buyRates?.slice(0, 5) ?? []
  const topBuyRate  = bestSellNow[0]?.price ?? 0

  // Fiat que recibiría vendiendo al mejor precio (maker fee en mi anuncio de venta)
  const holdReceiveFiat = holdUsdtAmt > 0 && topBuyRate > 0
    ? holdUsdtAmt * (1 - holdMakerFee) * topBuyRate
    : 0

  // P&L
  const holdPnlFiat = holdReceiveFiat - holdCostFiat
  const holdPnlPct  = holdCostFiat > 0 ? (holdPnlFiat / holdCostFiat) * 100 : 0

  const holdSignal = holdUsdtAmt > 0 && holdBuyP > 0 && topBuyRate > 0
    ? getHoldSignal(holdPnlPct)
    : null

  // Precio objetivo para distintos % de ganancia sobre mi costo
  function targetSellForHold(targetPct: number): number {
    if (!holdUsdtAmt || !holdCostFiat) return 0
    const neededFiat = holdCostFiat * (1 + targetPct / 100)
    // precio bruto = fiat / (usdt * (1 - fee))
    return holdMakerFee < 1 ? neededFiat / (holdUsdtAmt * (1 - holdMakerFee)) : 0
  }

  function useLiveRatesHold() {
    if (!liveRate?.sellRates?.[0]) return
    setHoldBuyPrice(String(liveRate.sellRates[0].price))
  }

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
            tab === 'calc'
              ? 'bg-gray-700 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-300',
          ].join(' ')}
        >
          ⚡ Calcular operación
        </button>
        <button
          onClick={() => setTab('hold')}
          className={[
            'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all',
            tab === 'hold'
              ? 'bg-gray-700 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-300',
          ].join(' ')}
        >
          💼 Tengo USDT
        </button>
      </div>

      {/* ══════════════════ TAB 1: CALCULADORA ══════════════════════════════ */}
      {tab === 'calc' && (
        <>
          {/* Exchange selector */}
          <div className="flex gap-2 mb-4">
            {(['binance', 'bybit'] as const).map(ex => (
              <button
                key={ex}
                onClick={() => setExchange(ex)}
                className={[
                  'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize',
                  exchange === ex
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-gray-800 text-gray-500 hover:text-gray-300',
                ].join(' ')}
              >
                {ex === 'binance' ? '⬡ Binance' : '◈ Bybit'}
              </button>
            ))}
          </div>

          {/* Payment method */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1.5">
              Método de pago (VES)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {VES_PAY_METHODS.map((m, i) => (
                <button
                  key={m.key}
                  onClick={() => setPayIdx(i)}
                  className={[
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                    payIdx === i
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      : 'bg-gray-800 text-gray-500 hover:text-gray-300',
                  ].join(' ')}
                >
                  {m.label}
                  {m.rate > 0 && <span className="ml-1 text-gray-600">+{(m.rate * 100).toFixed(1)}%</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <NumInput label="Capital (Fiat)" placeholder="0,00" value={capital} onChange={setCapital} />
            <NumInput label="Precio compra"  placeholder="0,00" value={buy}     onChange={setBuy}     />
            <NumInput label="Precio venta"   placeholder="0,00" value={sell}    onChange={setSell}    />
          </div>

          {/* Market overview when no prices entered */}
          {hasLiveRates && !buyP && (
            <div className="mb-4 p-3 bg-gray-800/50 border border-gray-700 rounded-xl">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">
                Mercado actual · {activeFiat}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-[10px] text-gray-600 mb-0.5">Mejor comprador</p>
                  <p className="text-xs font-mono font-bold text-blue-400">{fmtVES(liveRate.buyRates[0]?.price ?? 0)}</p>
                  <p className="text-[10px] text-blue-500/60">ref. anuncio VENTA</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-600 mb-0.5">Spread bruto</p>
                  <p className={`text-xs font-mono font-bold ${liveRate.spreadPct > 0.8 ? 'text-green-400' : 'text-amber-400'}`}>
                    {liveRate.spreadPct.toFixed(2)}%
                  </p>
                  <p className="text-[10px] text-gray-600">−0.60% fees</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-600 mb-0.5">Mejor vendedor</p>
                  <p className="text-xs font-mono font-bold text-green-400">{fmtVES(liveRate.sellRates[0]?.price ?? 0)}</p>
                  <p className="text-[10px] text-green-500/60">ref. anuncio COMPRA</p>
                </div>
              </div>
              <button
                onClick={useLiveRatesCalc}
                className="mt-3 w-full py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-semibold rounded-lg transition-colors"
              >
                ↓ Cargar estos precios en la calculadora
              </button>
            </div>
          )}

          {/* Semáforo */}
          {opportunity && (
            <div className={`mb-4 flex items-center justify-between px-3 py-2.5 rounded-xl border ${opportunity.bg} ${opportunity.border}`}>
              <span className={`text-xs font-semibold ${opportunity.color}`}>{opportunity.label}</span>
              <span className={`text-sm font-bold font-mono ${opportunity.color}`}>
                {actualSellPct! >= 0 ? '+' : ''}{actualSellPct!.toFixed(2)}% neto
              </span>
            </div>
          )}

          {/* Profit target table */}
          {showTargets && (
            <div className="mb-4 border border-gray-700 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-800/60 border-b border-gray-700 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Precios de venta sugeridos</span>
                <span className="text-[10px] text-gray-600">maker {(makerFee * 100).toFixed(2)}% × 2</span>
              </div>

              <div className="divide-y divide-gray-800/60">
                {/* Break-even */}
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800/20">
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-center text-xs font-bold font-mono rounded-md py-0.5 text-gray-600 bg-gray-700/50">0%</span>
                    <span className="text-xs text-gray-600">punto de equilibrio</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-gray-500">{fmtVES(breakEvenPrice)}</span>
                </div>

                {TARGET_PCTS.map(pct => {
                  const target   = suggestSellPrice(buyP, vesComm, pct, exchange)
                  const isActive = actualSellPct !== null && Math.abs(actualSellPct - pct) < 0.5
                  const isAbove  = actualSellPct !== null && actualSellPct > pct + 0.5
                  const isRecommended = pct === 1 || pct === 2

                  return (
                    <div
                      key={pct}
                      className={[
                        'flex items-center justify-between px-4 py-2.5 transition-colors',
                        isActive        ? 'bg-green-500/8'
                        : isRecommended ? 'bg-blue-500/5'
                        : 'hover:bg-gray-800/40',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-2">
                        <span className={[
                          'w-8 text-center text-xs font-bold font-mono rounded-md py-0.5',
                          pct <= 1 ? 'text-gray-400 bg-gray-700/50'
                          : pct <= 2 ? 'text-blue-400 bg-blue-500/10'
                          : pct <= 3 ? 'text-green-400 bg-green-500/10'
                          : pct <= 4 ? 'text-amber-400 bg-amber-500/10'
                          : 'text-orange-400 bg-orange-500/10',
                        ].join(' ')}>
                          {pct}%
                        </span>
                        <span className="text-xs text-gray-500">ganancia neta</span>
                        {isRecommended && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold">
                            sugerido
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold font-mono ${isRecommended ? 'text-blue-300' : 'text-white'}`}>
                          {fmtVES(target)}
                        </span>
                        {actualSellPct !== null && (
                          <span className={[
                            'text-[10px] font-medium w-16 text-right',
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
                <div className={[
                  'px-4 py-2.5 border-t border-gray-700 flex items-center justify-between',
                  actualSellPct >= 1 ? 'bg-green-500/8' : actualSellPct > 0 ? 'bg-amber-500/8' : 'bg-red-500/8',
                ].join(' ')}>
                  <span className="text-xs text-gray-400">Tu precio ({fmtVES(selP)}) da:</span>
                  <span className={`text-sm font-bold font-mono ${actualSellPct >= 1 ? 'text-green-400' : actualSellPct > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                    {actualSellPct >= 0 ? '+' : ''}{actualSellPct.toFixed(2)}% real
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Full breakdown */}
          {result ? (
            <div className="border border-gray-700 rounded-xl overflow-hidden">
              <div className={[
                'flex items-center justify-between px-4 py-3',
                result.ganancia >= 0 ? 'bg-green-500/10' : 'bg-red-500/10',
              ].join(' ')}>
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
                  { label: 'Capital invertido',                                                val: fmtVES(result.capital),               color: 'text-gray-300' },
                  { label: 'Comisión método de pago',                                         val: result.comisFiatCompra > 0 ? `+${fmtVES(result.comisFiatCompra)}` : '0,00', color: 'text-amber-400' },
                  { label: 'Total fiat entregado',                                            val: fmtVES(result.totalFiatSale),          color: 'text-white',   bold: true },
                  { label: 'USDT bruto recibido',                                             val: `${fmtUSDT(result.usdtBruto)} USDT`,  color: 'text-blue-400' },
                  { label: `Comis. anuncio COMPRA (maker ${(makerFee*100).toFixed(2)}%)`,    val: `-${fmtUSDT(result.comisUsdtCompra)} USDT`, color: 'text-red-400' },
                  { label: 'USDT neto disponible',                                            val: `${fmtUSDT(result.usdtNeto)} USDT`,   color: 'text-blue-300', bold: true },
                  { label: `Comis. anuncio VENTA (maker ${(makerFee*100).toFixed(2)}%)`,     val: `-${fmtUSDT(result.comisUsdtVenta)} USDT`, color: 'text-red-400' },
                  { label: 'USDT vendidos neto',                                              val: `${fmtUSDT(result.usdtNetVenta)} USDT`, color: 'text-gray-300' },
                  { label: 'Fiat recibido',                                                   val: fmtVES(result.fiatRecibido),           color: 'text-green-400', bold: true },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2">
                    <span className="text-xs text-gray-500">{row.label}</span>
                    <span className={`text-xs font-mono ${row.color} ${row.bold ? 'font-semibold' : ''}`}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            !showTargets && (
              <div className="border border-dashed border-gray-700 rounded-xl py-6 text-center">
                <p className="text-sm text-gray-600">Ingresa capital, precio de compra y venta</p>
                {hasLiveRates && (
                  <button onClick={useLiveRatesCalc} className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                    ↓ O usa las tasas actuales de {activeFiat}
                  </button>
                )}
              </div>
            )
          )}
        </>
      )}

      {/* ══════════════════ TAB 2: TENGO USDT ═══════════════════════════════ */}
      {tab === 'hold' && (
        <>
          {/* Intro */}
          <div className="mb-4 p-3 bg-blue-500/8 border border-blue-500/20 rounded-xl">
            <p className="text-xs text-blue-400 font-semibold mb-1">¿Cuándo me conviene vender mis USDT?</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Ingresa tus USDT y el precio al que los compraste. La app te mostrará en tiempo real si el mercado actual te da ganancia.
            </p>
          </div>

          {/* Exchange selector */}
          <div className="flex gap-2 mb-4">
            {(['binance', 'bybit'] as const).map(ex => (
              <button
                key={ex}
                onClick={() => setHoldExchange(ex)}
                className={[
                  'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  holdExchange === ex
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-gray-800 text-gray-500 hover:text-gray-300',
                ].join(' ')}
              >
                {ex === 'binance' ? '⬡ Binance' : '◈ Bybit'}
              </button>
            ))}
          </div>

          {/* Payment method */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1.5">
              Método de pago que usarías
            </label>
            <div className="flex flex-wrap gap-1.5">
              {VES_PAY_METHODS.map((m, i) => (
                <button
                  key={m.key}
                  onClick={() => setHoldPayIdx(i)}
                  className={[
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                    holdPayIdx === i
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      : 'bg-gray-800 text-gray-500 hover:text-gray-300',
                  ].join(' ')}
                >
                  {m.label}
                  {m.rate > 0 && <span className="ml-1 text-gray-600">+{(m.rate * 100).toFixed(1)}%</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <NumInput
              label="Mis USDT"
              placeholder="0,00"
              value={holdUsdt}
              onChange={setHoldUsdt}
            />
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1.5">
                Precio de compra
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={holdBuyPrice}
                  onChange={e => setHoldBuyPrice(e.target.value)}
                  className="w-full bg-[#07080f] border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-100 placeholder:text-gray-600 focus:border-blue-500 focus:outline-none"
                />
                {hasLiveRates && (
                  <button
                    onClick={useLiveRatesHold}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-500 hover:text-blue-300 font-semibold transition-colors"
                    title="Usar precio actual del mercado"
                  >
                    hoy
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Semáforo de decisión */}
          {holdSignal && (
            <div className={`mb-4 p-3 rounded-xl border ${holdSignal.bg} ${holdSignal.border}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-bold ${holdSignal.color}`}>{holdSignal.label}</span>
                <span className={`text-base font-bold font-mono ${holdSignal.color}`}>
                  {holdPnlPct >= 0 ? '+' : ''}{holdPnlPct.toFixed(2)}%
                </span>
              </div>
              <p className="text-[11px] text-gray-500">{holdSignal.advice}</p>
            </div>
          )}

          {/* P&L vs mercado actual */}
          {holdUsdtAmt > 0 && holdBuyP > 0 && hasLiveRates && (
            <div className="mb-4 border border-gray-700 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-800/60 border-b border-gray-700">
                <span className="text-xs font-semibold text-gray-300">Análisis vs. mercado actual · {activeFiat}</span>
              </div>

              {/* Top buyers (los que pagarían tus USDT) */}
              <div className="p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">
                  Mejores compradores ahora
                </p>
                <div className="flex flex-col gap-1 mb-3">
                  {bestSellNow.map((r, i) => {
                    const fiatIfSell = holdUsdtAmt * (1 - holdMakerFee) * r.price
                    const pnl = fiatIfSell - holdCostFiat
                    const pnlP = holdCostFiat > 0 ? (pnl / holdCostFiat) * 100 : 0
                    return (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-800/40 rounded-lg">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 truncate max-w-[100px]">{r.merchant}</p>
                          <p className="text-[10px] font-mono text-blue-400">{fmtVES(r.price)} VES/USDT</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-xs font-mono font-bold text-gray-200">{fmtVES(fiatIfSell)}</p>
                          <p className={`text-[10px] font-semibold ${pnlP >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {pnlP >= 0 ? '+' : ''}{pnlP.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Resumen P&L */}
                <div className={[
                  'flex items-center justify-between px-3 py-2.5 rounded-xl border',
                  holdPnlPct >= 1 ? 'bg-green-500/10 border-green-500/30' : holdPnlPct >= 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30',
                ].join(' ')}>
                  <div>
                    <p className="text-[10px] text-gray-500 mb-0.5">Vendiendo al mejor precio</p>
                    <p className={`text-xs font-bold ${holdPnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {holdPnlFiat >= 0 ? '+' : ''}{fmtVES(holdPnlFiat)} {activeFiat}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 mb-0.5">Recibirías</p>
                    <p className="text-xs font-bold font-mono text-white">{fmtVES(holdReceiveFiat)}</p>
                  </div>
                </div>
              </div>

              {/* Tabla de objetivos de precio */}
              <div className="border-t border-gray-700">
                <div className="px-4 py-2.5 bg-gray-800/40">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                    ¿A qué precio debo vender para ganar...?
                  </span>
                </div>
                <div className="divide-y divide-gray-800/60">
                  {[0, 1, 2, 3, 5].map(pct => {
                    const target = targetSellForHold(pct)
                    const isAboveMarket = target > topBuyRate
                    const isRecommended = pct === 1 || pct === 2
                    return (
                      <div
                        key={pct}
                        className={[
                          'flex items-center justify-between px-4 py-2',
                          isRecommended ? 'bg-blue-500/5' : '',
                        ].join(' ')}
                      >
                        <div className="flex items-center gap-2">
                          <span className={[
                            'w-8 text-center text-xs font-bold font-mono rounded-md py-0.5',
                            pct === 0  ? 'text-gray-500 bg-gray-700/50'
                            : pct <= 2 ? 'text-blue-400 bg-blue-500/10'
                            : pct <= 3 ? 'text-green-400 bg-green-500/10'
                            : 'text-amber-400 bg-amber-500/10',
                          ].join(' ')}>
                            {pct}%
                          </span>
                          {isRecommended && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold">
                              sugerido
                            </span>
                          )}
                          {pct === 0 && <span className="text-[10px] text-gray-600">equilibrio</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold font-mono ${isRecommended ? 'text-blue-300' : 'text-white'}`}>
                            {fmtVES(target)}
                          </span>
                          <span className={`text-[10px] font-medium ${isAboveMarket ? 'text-amber-500/70' : 'text-green-500/70'}`}>
                            {isAboveMarket ? '↑ esperar' : '✓ posible'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {(!holdUsdtAmt || !holdBuyP) && (
            <div className="border border-dashed border-gray-700 rounded-xl py-6 text-center">
              <p className="text-sm text-gray-600">Ingresa tus USDT y precio de compra</p>
              {hasLiveRates && (
                <p className="text-xs text-gray-700 mt-1">
                  Mercado ahora: compradores pagan{' '}
                  <span className="text-blue-400 font-mono">{fmtVES(topBuyRate)}</span>
                </p>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  )
}
