'use client'
import { useState, useEffect } from 'react'
import { calcP2P, fmtVES, fmtUSDT, fmtPct, parseVES } from '@/lib/utils'
import { VES_PAY_METHODS, BINANCE_MAKER_FEE } from '@/lib/constants'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { NumInput } from '@/components/ui/Input'
import { useRates } from '@/context/RatesContext'
import type { P2PRates } from '@/types'

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

type Tab = 'calc' | 'hold' | 'meta'

const N = 5  // ladder/matrix size

const PULSO_OPTIONS = [
  { min: 15, icon: '🔥', label: '15min', sublabel: 'Activo'  },
  { min: 30, icon: '🌊', label: '30min', sublabel: 'Normal'  },
  { min: 60, icon: '🐌', label: '60min', sublabel: 'Lento'   },
]

function roiColor(roi: number | null): string {
  if (roi === null) return 'text-gray-700'
  if (roi >= 2)    return 'text-emerald-400'
  if (roi >= 1)    return 'text-green-400'
  if (roi >= 0.5)  return 'text-amber-400'
  if (roi > 0)     return 'text-orange-400'
  return 'text-red-400'
}

function roiBg(roi: number | null): string {
  if (roi === null) return ''
  if (roi >= 2)    return 'bg-emerald-500/15'
  if (roi >= 1)    return 'bg-green-500/10'
  if (roi >= 0.5)  return 'bg-amber-500/10'
  if (roi > 0)     return 'bg-orange-500/8'
  return 'bg-red-500/10'
}

export function Calculator() {
  const [tab, setTab] = useState<Tab>('calc')

  // ── Tab 1: Estrategia ──────────────────────────────────────────────────
  const [stratCapital, setStratCapital]   = useState('')
  const [stratBuyPos,  setStratBuyPos]    = useState(2)  // posición en sellRates (COMPRA)
  const [stratSellPos, setStratSellPos]   = useState(2)  // posición en buyRates (VENTA)
  const [stratPayIdx,  setStratPayIdx]    = useState(0)
  const [stratExchange, setStratExchange] = useState<'binance' | 'bybit'>('binance')
  const [stratPulso,   setStratPulso]     = useState(30) // minutos por ciclo

  // ── Tab 2 ──────────────────────────────────────────────────────────────
  const [holdUsdt,     setHoldUsdt]     = useState('')
  const [holdBuyPrice, setHoldBuyPrice] = useState('')
  const [holdExchange, setHoldExchange] = useState<'binance' | 'bybit'>('binance')

  // ── Tab 3: Meta diaria ─────────────────────────────────────────────────
  const [metaCapital,   setMetaCapital]   = useState('')
  const [metaBuy,       setMetaBuy]       = useState('')
  const [metaSell,      setMetaSell]      = useState('')
  const [metaPayIdx,    setMetaPayIdx]    = useState(0)
  const [metaExchange,  setMetaExchange]  = useState<'binance' | 'bybit'>('binance')
  const [metaGoal,      setMetaGoal]      = useState('')
  const [cicloMin,      setCicloMin]      = useState('30')
  const [horasDia,      setHorasDia]      = useState('8')

  const { rates, activeFiat } = useRates()
  const liveRate     = rates[activeFiat]
  const hasLiveRates = !!liveRate?.buyRates?.length && !!liveRate?.sellRates?.length

  // ── Tab 1: tasas filtradas por banco + monto ────────────────────────────
  const [stratRate,     setStratRate]     = useState<P2PRates | null>(null)
  const [stratFetching, setStratFetching] = useState(false)

  useEffect(() => {
    const payMethod       = VES_PAY_METHODS[stratPayIdx]
    const binancePayTypes = payMethod.binancePayTypes ?? []
    const capital         = parseVES(stratCapital)

    const controller = new AbortController()

    const doFetch = () => {
      const params = new URLSearchParams({ fiat: activeFiat })
      if (binancePayTypes.length > 0) params.set('payTypes', binancePayTypes.join(','))
      if (capital > 0)                params.set('transAmount', String(capital))

      setStratFetching(true)
      fetch(`/api/p2p-rates?${params}`, { signal: controller.signal })
        .then(r => r.json())
        .then((data: P2PRates) => {
          if (!controller.signal.aborted && !('error' in data)) setStratRate(data)
        })
        .catch(() => {/* aborted or network error */})
        .finally(() => { if (!controller.signal.aborted) setStratFetching(false) })
    }

    // Debounce capital changes (typing); pay-method changes are fast
    const timer = setTimeout(doFetch, 500)
    return () => { clearTimeout(timer); controller.abort() }
  }, [stratPayIdx, stratCapital, activeFiat])

  // Mercado filtrado > mercado general (mientras carga, mantiene el último resultado)
  const effectiveRate     = stratRate ?? liveRate
  const hasEffectiveRates = !!effectiveRate?.buyRates?.length && !!effectiveRate?.sellRates?.length

  // ── Tab 1: lógica de estrategia ────────────────────────────────────────
  const stratVesComm = VES_PAY_METHODS[stratPayIdx].rate

  // Para posicionarse en COMPRA: superar al vendedor en posición N ofreciendo 1 VES más
  const compraAt = (pos: number): number => {
    const r = effectiveRate?.sellRates[pos - 1]
    return r ? r.price + 1 : 0
  }

  // Para posicionarse en VENTA: superar al comprador en posición N ofreciendo 1 VES menos
  const ventaAt = (pos: number): number => {
    const r = effectiveRate?.buyRates[pos - 1]
    return r ? r.price - 1 : 0
  }

  // Matriz ROI 5×5 (filas = posición COMPRA, columnas = posición VENTA)
  const matrixRoi: (number | null)[][] = hasEffectiveRates
    ? Array.from({ length: N }, (_, i) =>
        Array.from({ length: N }, (_, j) => {
          const bp = compraAt(i + 1)
          const sp = ventaAt(j + 1)
          if (!bp || !sp || sp <= bp) return null
          return calcP2P({ capital: 100_000, buyPrice: bp, sellPrice: sp, vesComm: stratVesComm, exchange: stratExchange }).roi
        })
      )
    : []

  // Celda con mejor ROI
  let bestI = -1, bestJ = -1, bestRoi = -Infinity
  matrixRoi.forEach((row, i) => row.forEach((roi, j) => {
    if (roi !== null && roi > bestRoi) { bestRoi = roi; bestI = i; bestJ = j }
  }))

  const stratCap   = parseVES(stratCapital)
  const stratBuyP  = compraAt(stratBuyPos)
  const stratSellP = ventaAt(stratSellPos)

  const stratResult = hasEffectiveRates && stratCap > 0 && stratBuyP > 0 && stratSellP > stratBuyP
    ? calcP2P({ capital: stratCap, buyPrice: stratBuyP, sellPrice: stratSellP, vesComm: stratVesComm, exchange: stratExchange })
    : null

  const opsPorDiaStrat   = Math.floor((8 * 60) / stratPulso)
  const gananciaDiaStrat = (stratResult?.ganancia ?? 0) * opsPorDiaStrat
  const selectedRoi      = matrixRoi[stratBuyPos - 1]?.[stratSellPos - 1] ?? null

  // ── Tab 2 logic ─────────────────────────────────────────────────────────
  const holdUsdtAmt    = parseVES(holdUsdt)
  const holdBuyP       = parseVES(holdBuyPrice)
  const holdFee        = holdExchange === 'binance' ? BINANCE_MAKER_FEE : 0
  const marketSellRates = liveRate?.sellRates?.slice(0, 5) ?? []
  const marketTopSell  = marketSellRates[0]?.price ?? 0
  const marketSpread   = holdBuyP > 0 && marketTopSell > 0 ? calcHoldSpread(holdBuyP, marketTopSell, holdExchange) : null

  // ── Tab 3: Meta diaria ─────────────────────────────────────────────────
  const metaVesComm = VES_PAY_METHODS[metaPayIdx].rate
  const metaCap     = parseVES(metaCapital)
  const metaBuyP    = parseVES(metaBuy)
  const metaSelP    = parseVES(metaSell)
  const metaGoalN   = parseVES(metaGoal)
  const cicloN      = Math.max(1, parseFloat(cicloMin) || 30)
  const horasN      = Math.max(1, Math.min(24, parseFloat(horasDia) || 8))

  const metaResult = metaCap > 0 && metaBuyP > 0 && metaSelP > 0
    ? calcP2P({ capital: metaCap, buyPrice: metaBuyP, sellPrice: metaSelP, vesComm: metaVesComm, exchange: metaExchange })
    : null

  const gananciaPorOp  = metaResult?.ganancia ?? 0
  const roiPorOp       = metaResult?.roi ?? 0
  const opsPorHora     = 60 / cicloN
  const opsPorDia      = horasN * opsPorHora
  const gananciaDia    = opsPorDia * gananciaPorOp
  const opsParaMeta    = metaGoalN > 0 && gananciaPorOp > 0 ? metaGoalN / gananciaPorOp : null
  const tiempoParaMeta = opsParaMeta !== null ? opsParaMeta * cicloN : null
  const metaFactible   = opsParaMeta !== null && tiempoParaMeta !== null && tiempoParaMeta <= horasN * 60

  function useLiveRatesMeta() {
    if (!liveRate) return
    if (liveRate.avgSell > 0) setMetaBuy(String(Math.round(liveRate.avgSell)))
    if (liveRate.avgBuy  > 0) setMetaSell(String(Math.round(liveRate.avgBuy)))
  }

  function fmtMinutos(min: number) {
    if (min < 60) return `${Math.ceil(min)} min`
    const h = Math.floor(min / 60), m = Math.round(min % 60)
    return m > 0 ? `${h}h ${m}min` : `${h}h`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculadora P2P</CardTitle>
        {tab === 'meta' && hasLiveRates && (
          <button
            onClick={useLiveRatesMeta}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 transition-all"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Tasas {activeFiat}
          </button>
        )}
      </CardHeader>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-gray-800/60 rounded-xl">
        {([
          { key: 'calc', label: '⚡ Estrategia'   },
          { key: 'hold', label: '💼 Precio venta'  },
          { key: 'meta', label: '📈 Meta diaria'   },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={['flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all',
              tab === t.key ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300',
            ].join(' ')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════ TAB 1: ESTRATEGIA ════════════════════════════════════ */}
      {tab === 'calc' && (
        <>
          {/* Exchange */}
          <div className="flex gap-2 mb-3">
            {(['binance', 'bybit'] as const).map(ex => (
              <button key={ex} onClick={() => setStratExchange(ex)}
                className={['flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  stratExchange === ex
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-gray-800 text-gray-500 hover:text-gray-300',
                ].join(' ')}>
                {ex === 'binance' ? '⬡ Binance' : '◈ Bybit'}
              </button>
            ))}
          </div>

          {/* Método de pago */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1.5">Método de pago (VES)</label>
            <div className="flex flex-wrap gap-1.5">
              {VES_PAY_METHODS.map((m, i) => (
                <button key={m.key} onClick={() => setStratPayIdx(i)}
                  className={['px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                    stratPayIdx === i
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      : 'bg-gray-800 text-gray-500 hover:text-gray-300',
                  ].join(' ')}>
                  {m.label}
                  {m.rate > 0 && <span className="ml-1 text-gray-600">+{(m.rate * 100).toFixed(1)}%</span>}
                </button>
              ))}
            </div>
          </div>

          {hasEffectiveRates || hasLiveRates ? (
            <>
              {/* ── Escalera de mercado ─────────────────────────────────── */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Escalera de mercado · {activeFiat}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {stratFetching && (
                      <span className="text-[10px] text-indigo-400 animate-pulse">actualizando…</span>
                    )}
                    {stratRate && !stratFetching && (
                      <span className="flex items-center gap-1 text-[10px] text-indigo-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        {VES_PAY_METHODS[stratPayIdx].label}
                        {stratCap > 0 && <> · {fmtVES(stratCap)}</>}
                      </span>
                    )}
                    {!stratRate && !stratFetching && (
                      <span className="flex items-center gap-1 text-[10px] text-green-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        En vivo
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {/* Columna COMPRA */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 px-2 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-t-xl">
                      <span className="text-[10px] font-bold text-blue-400">📥 TU COMPRA</span>
                    </div>
                    <div className="border border-t-0 border-blue-500/15 rounded-b-xl overflow-hidden divide-y divide-gray-800/60">
                      {Array.from({ length: N }, (_, i) => {
                        const pos   = i + 1
                        const sellR = effectiveRate?.sellRates[i]
                        const compP = sellR ? sellR.price + 1 : 0
                        const isSel = stratBuyPos === pos
                        return (
                          <button key={pos} onClick={() => setStratBuyPos(pos)}
                            className={['w-full flex items-center gap-2 px-2.5 py-2 text-left transition-all',
                              isSel ? 'bg-blue-500/12' : 'hover:bg-gray-800/40',
                            ].join(' ')}>
                            <span className={['w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all',
                              isSel
                                ? 'bg-blue-500 border-blue-400 text-white'
                                : 'border-gray-700 text-gray-600',
                            ].join(' ')}>{pos}</span>
                            <div className="min-w-0 flex-1">
                              <p className={['text-xs font-mono font-bold', isSel ? 'text-blue-300' : 'text-gray-300'].join(' ')}>
                                {compP ? fmtVES(compP) : '—'}
                              </p>
                              <p className="text-[9px] text-gray-700 truncate">{sellR?.merchant ?? '—'}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-[9px] text-gray-700 mt-1 px-1">ref: precio vendedor +1 VES</p>
                  </div>

                  {/* Divisor */}
                  <div className="flex flex-col items-center justify-center pt-8 pb-4 gap-1">
                    <div className="w-px flex-1 bg-gray-700/50" />
                    <span className="text-gray-700 text-[10px] font-bold rotate-90">↔</span>
                    <div className="w-px flex-1 bg-gray-700/50" />
                  </div>

                  {/* Columna VENTA */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-end gap-1 px-2 py-1.5 bg-green-500/10 border border-green-500/20 rounded-t-xl">
                      <span className="text-[10px] font-bold text-green-400">TU VENTA 📤</span>
                    </div>
                    <div className="border border-t-0 border-green-500/15 rounded-b-xl overflow-hidden divide-y divide-gray-800/60">
                      {Array.from({ length: N }, (_, i) => {
                        const pos   = i + 1
                        const buyR  = effectiveRate?.buyRates[i]
                        const ventP = buyR ? buyR.price - 1 : 0
                        const isSel = stratSellPos === pos
                        return (
                          <button key={pos} onClick={() => setStratSellPos(pos)}
                            className={['w-full flex items-center gap-2 px-2.5 py-2 text-right justify-end transition-all',
                              isSel ? 'bg-green-500/8' : 'hover:bg-gray-800/40',
                            ].join(' ')}>
                            <div className="min-w-0 flex-1 text-right">
                              <p className={['text-xs font-mono font-bold', isSel ? 'text-green-300' : 'text-gray-300'].join(' ')}>
                                {ventP ? fmtVES(ventP) : '—'}
                              </p>
                              <p className="text-[9px] text-gray-700 truncate">{buyR?.merchant ?? '—'}</p>
                            </div>
                            <span className={['w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all',
                              isSel
                                ? 'bg-green-600 border-green-400 text-white'
                                : 'border-gray-700 text-gray-600',
                            ].join(' ')}>{pos}</span>
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-[9px] text-gray-700 mt-1 px-1 text-right">ref: precio comprador −1 VES</p>
                  </div>
                </div>
              </div>

              {/* ── Capital + Pulso ─────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <NumInput label="Capital (VES)" placeholder="0,00" value={stratCapital} onChange={setStratCapital} />
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1.5">
                    Pulso del mercado
                  </label>
                  <div className="flex gap-1.5">
                    {PULSO_OPTIONS.map(p => (
                      <button key={p.min} onClick={() => setStratPulso(p.min)}
                        className={['flex-1 rounded-lg py-1 text-center transition-all border',
                          stratPulso === p.min
                            ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                            : 'bg-gray-800 border-gray-700/50 text-gray-600 hover:text-gray-400',
                        ].join(' ')}>
                        <div className="text-base leading-tight">{p.icon}</div>
                        <div className="text-[9px] font-bold leading-tight">{p.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Resultado de la posición seleccionada ───────────────── */}
              <div className={['mb-4 rounded-xl border overflow-hidden',
                selectedRoi !== null ? roiBg(selectedRoi) + ' border-gray-600' : 'bg-gray-800/30 border-gray-700',
              ].join(' ')}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Posición seleccionada</p>
                    <p className="text-sm font-semibold text-gray-200 mt-0.5">
                      COMPRA <span className="text-blue-400">#{stratBuyPos}</span>
                      {' '}×{' '}
                      VENTA <span className="text-green-400">#{stratSellPos}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">ROI/ciclo</p>
                    <p className={`text-2xl font-black font-mono leading-none ${roiColor(selectedRoi)}`}>
                      {selectedRoi !== null
                        ? `${selectedRoi >= 0 ? '+' : ''}${selectedRoi.toFixed(2)}%`
                        : '—'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 divide-x divide-white/5">
                  <div className="px-4 py-2.5 text-center">
                    <p className="text-[10px] text-gray-600 mb-0.5">Anuncio COMPRA</p>
                    <p className="text-sm font-mono font-bold text-blue-300">{stratBuyP ? fmtVES(stratBuyP) : '—'}</p>
                    <p className="text-[9px] text-gray-700">supera #{stratBuyPos} vendedor</p>
                  </div>
                  <div className="px-4 py-2.5 text-center">
                    <p className="text-[10px] text-gray-600 mb-0.5">Anuncio VENTA</p>
                    <p className="text-sm font-mono font-bold text-green-300">{stratSellP ? fmtVES(stratSellP) : '—'}</p>
                    <p className="text-[9px] text-gray-700">supera #{stratSellPos} comprador</p>
                  </div>
                </div>

                {stratResult ? (
                  <div className="grid grid-cols-3 divide-x divide-white/5 border-t border-white/5">
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-[10px] text-gray-600 mb-0.5">Ganancia/ciclo</p>
                      <p className={`text-sm font-bold font-mono ${stratResult.ganancia >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stratResult.ganancia >= 0 ? '+' : ''}{fmtVES(stratResult.ganancia)}
                      </p>
                    </div>
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-[10px] text-gray-600 mb-0.5">Ciclos / 8h</p>
                      <p className="text-sm font-bold font-mono text-gray-300">
                        {opsPorDiaStrat}
                        <span className="text-[9px] text-gray-600 font-normal ml-0.5">× {stratPulso}min</span>
                      </p>
                    </div>
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-[10px] text-gray-600 mb-0.5">Estimado 8h</p>
                      <p className={`text-sm font-bold font-mono ${gananciaDiaStrat >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {gananciaDiaStrat >= 0 ? '+' : ''}{fmtVES(gananciaDiaStrat)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-600 text-center px-4 py-2.5 border-t border-white/5">
                    Ingresa capital para ver la ganancia estimada en VES
                  </p>
                )}
              </div>

              {/* ── Matriz de spreads 5×5 ───────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Matriz de spreads</p>
                  <span className="text-[10px] text-gray-600">ROI % por posición · toca para seleccionar</span>
                </div>

                <div className="border border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-800/60 border-b border-gray-700">
                        <th className="w-10 py-2 px-1">
                          <span className="block text-[9px] text-blue-400/70 font-normal text-left pl-1">↓ COMPRA</span>
                          <span className="block text-[9px] text-green-400/70 font-normal text-left pl-1">VENTA →</span>
                        </th>
                        {Array.from({ length: N }, (_, j) => (
                          <th key={j} className={['py-2 text-[11px] font-bold text-center transition-colors',
                            stratSellPos === j + 1 ? 'text-green-400 bg-green-500/5' : 'text-gray-500',
                          ].join(' ')}>
                            #{j + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {Array.from({ length: N }, (_, i) => (
                        <tr key={i} className="divide-x divide-gray-800/50">
                          <td className={['py-2 px-1 text-[11px] font-bold text-center border-r border-gray-800/50 bg-gray-800/30 transition-colors',
                            stratBuyPos === i + 1 ? 'text-blue-400 bg-blue-500/5' : 'text-gray-500',
                          ].join(' ')}>
                            #{i + 1}
                          </td>
                          {Array.from({ length: N }, (_, j) => {
                            const roi       = matrixRoi[i]?.[j] ?? null
                            const isSelected = stratBuyPos === i + 1 && stratSellPos === j + 1
                            const isBest    = bestI === i && bestJ === j

                            return (
                              <td key={j}
                                onClick={() => { setStratBuyPos(i + 1); setStratSellPos(j + 1) }}
                                title={`COMPRA #${i+1} × VENTA #${j+1}: ${roi !== null ? `${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%` : 'N/D'}`}
                                className={['py-2 text-center cursor-pointer transition-all relative',
                                  isSelected
                                    ? roiBg(roi) + ' ring-2 ring-inset ring-white/40'
                                    : isBest
                                    ? roiBg(roi) + ' ring-2 ring-inset ring-amber-400/50'
                                    : roi !== null && roi > 0
                                    ? roiBg(roi) + ' hover:brightness-125'
                                    : 'hover:bg-gray-800/40',
                                ].join(' ')}>
                                <span className={['text-[11px] font-bold font-mono block leading-none', roiColor(roi)].join(' ')}>
                                  {roi !== null ? `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}` : '—'}
                                </span>
                                {isBest && (
                                  <span className="block text-[8px] text-amber-400 font-black leading-tight">★</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Leyenda */}
                <div className="flex items-center gap-3 mt-2 px-0.5 flex-wrap">
                  <div className="flex items-center gap-1 text-[10px] text-amber-400">
                    <span className="font-black">★</span>
                    <span className="text-gray-600">mejor ahora</span>
                  </div>
                  {[
                    { label: '≥2%',  bg: 'bg-emerald-500/20' },
                    { label: '≥1%',  bg: 'bg-green-500/15'   },
                    { label: '≥0.5%',bg: 'bg-amber-500/15'   },
                    { label: '<0%',  bg: 'bg-red-500/15'      },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1 text-[10px]">
                      <span className={`w-2.5 h-2.5 rounded ${l.bg} inline-block`} />
                      <span className="text-gray-600">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="border border-dashed border-gray-700 rounded-xl py-12 text-center">
              <p className="text-2xl mb-2">{stratFetching ? '🔄' : '📊'}</p>
              <p className="text-sm text-gray-500 font-medium">
                {stratFetching ? 'Filtrando mercado…' : 'Cargando datos del mercado…'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {stratFetching
                  ? `Buscando ${VES_PAY_METHODS[stratPayIdx].label}${stratCap > 0 ? ` · ${fmtVES(stratCap)} VES` : ''}`
                  : `Las tasas de ${activeFiat} se actualizan automáticamente`}
              </p>
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
                    title="Precio del vendedor más barato (tu ref. de compra)"
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
                  Referencia de mercado (prom. vendedores):{' '}
                  <span className="text-green-400 font-mono">{fmtVES(liveRate?.avgSell ?? 0)}</span>
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════ TAB 3: META DIARIA ══════════════════════════════════ */}
      {tab === 'meta' && (
        <>
          {/* Paso 1: tasas en vivo */}
          {hasLiveRates && (
            <button onClick={useLiveRatesMeta}
              className="w-full mb-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/18 border border-blue-500/25 text-blue-400 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Cargar tasas del mercado · {activeFiat}
            </button>
          )}

          {/* Inputs esenciales */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <NumInput label="Capital (VES)" placeholder="0,00" value={metaCapital} onChange={setMetaCapital} />
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1.5">Ciclo (min)</label>
              <input type="number" min="5" max="240" placeholder="30"
                value={cicloMin} onChange={e => setCicloMin(e.target.value)}
                className="w-full bg-[#07080f] border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-100 placeholder:text-gray-600 focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1.5">Jornada (h)</label>
              <input type="number" min="1" max="16" placeholder="8"
                value={horasDia} onChange={e => setHorasDia(e.target.value)}
                className="w-full bg-[#07080f] border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-100 placeholder:text-gray-600 focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          {/* Precios si no se cargaron automáticamente */}
          {!metaBuyP && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <NumInput label="Precio COMPRA" placeholder="0,00" value={metaBuy} onChange={setMetaBuy} />
              <NumInput label="Precio VENTA"  placeholder="0,00" value={metaSell} onChange={setMetaSell} />
            </div>
          )}

          {metaBuyP > 0 && metaSelP > 0 && (
            <div className="flex items-center gap-2 mb-4 text-[11px] text-gray-600">
              <span className="font-mono text-blue-400">{fmtVES(metaBuyP)}</span>
              <span>→ compra ·</span>
              <span className="font-mono text-green-400">{fmtVES(metaSelP)}</span>
              <span>→ venta</span>
              <button onClick={() => { setMetaBuy(''); setMetaSell('') }}
                className="ml-auto text-gray-700 hover:text-gray-400 transition-colors">cambiar</button>
            </div>
          )}

          {/* Resultado principal */}
          {metaResult ? (
            <>
              {/* Hero: ganancia día */}
              <div className={['mb-4 rounded-2xl p-4 text-center border',
                gananciaDia > 0 ? 'bg-green-500/8 border-green-500/20' : 'bg-red-500/8 border-red-500/20'].join(' ')}>
                <p className="text-xs text-gray-500 mb-1">Ganancia potencial · {horasN}h de trabajo</p>
                <p className={`text-3xl font-black font-mono ${gananciaDia > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {gananciaDia > 0 ? '+' : ''}{fmtVES(gananciaDia)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {Math.floor(opsPorDia)} operaciones · {fmtVES(gananciaPorOp)} c/u (+{roiPorOp.toFixed(2)}%)
                </p>
              </div>

              {/* Meta opcional */}
              <div className="mb-4">
                <NumInput label="¿Cuánto quieres ganar? (opcional)" placeholder="ej: 50.000,00" value={metaGoal} onChange={setMetaGoal} />
              </div>

              {metaGoalN > 0 && (
                <div className={['mb-4 flex items-center justify-between px-4 py-3 rounded-xl border',
                  metaFactible ? 'bg-green-500/8 border-green-500/25' : 'bg-amber-500/8 border-amber-500/25'].join(' ')}>
                  <div>
                    <p className={`text-sm font-bold ${metaFactible ? 'text-green-400' : 'text-amber-400'}`}>
                      {metaFactible ? '✅ Meta alcanzable' : '⚠️ Necesitas más tiempo'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {Math.ceil(opsParaMeta!)} operaciones · {fmtMinutos(tiempoParaMeta!)}
                    </p>
                  </div>
                  <p className="text-2xl font-black font-mono text-white">{fmtVES(metaGoalN)}</p>
                </div>
              )}

              {/* Proyección simple: 3 puntos */}
              <div className="grid grid-cols-3 gap-2">
                {[Math.round(horasN / 3), Math.round(horasN * 2 / 3), horasN].map((h, i) => {
                  const ops = Math.floor(h * opsPorHora)
                  const gan = ops * gananciaPorOp
                  const labels = ['1/3 jornada', '2/3 jornada', 'Jornada completa']
                  return (
                    <div key={i} className={['p-3 rounded-xl border text-center',
                      i === 2 ? 'bg-amber-500/8 border-amber-500/20' : 'bg-gray-800/40 border-gray-700'].join(' ')}>
                      <p className="text-[10px] text-gray-500 mb-1">{labels[i]}</p>
                      <p className="text-xs text-gray-400 font-mono mb-1">{h}h · {ops} ops</p>
                      <p className={`text-sm font-bold font-mono ${gan > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {gan > 0 ? '+' : ''}{fmtVES(gan)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="border border-dashed border-gray-700 rounded-xl py-10 text-center">
              <p className="text-3xl mb-2">🎯</p>
              <p className="text-sm text-gray-500 font-medium">Ingresa tu capital para comenzar</p>
              {hasLiveRates && (
                <p className="text-xs text-gray-600 mt-1">Las tasas del mercado ya están cargadas</p>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  )
}
