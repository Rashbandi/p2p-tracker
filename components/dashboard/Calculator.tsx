'use client'
import { useState } from 'react'
import { calcP2P, fmtVES, fmtUSDT, fmtPct, parseVES } from '@/lib/utils'
import { VES_PAY_METHODS } from '@/lib/constants'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { NumInput } from '@/components/ui/Input'

export function Calculator() {
  const [capital, setCapital]   = useState('')
  const [buy, setBuy]           = useState('')
  const [sell, setSell]         = useState('')
  const [payIdx, setPayIdx]     = useState(0)
  const [exchange, setExchange] = useState<'binance' | 'bybit'>('binance')

  const vesComm = VES_PAY_METHODS[payIdx].rate

  const cap  = parseVES(capital)
  const buyP = parseVES(buy)
  const selP = parseVES(sell)

  const result = cap > 0 && buyP > 0 && selP > 0
    ? calcP2P({ capital: cap, buyPrice: buyP, sellPrice: selP, vesComm, exchange })
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculadora P2P</CardTitle>
      </CardHeader>

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
        <NumInput
          label="Capital (Fiat)"
          placeholder="0,00"
          value={capital}
          onChange={setCapital}
        />
        <NumInput
          label="Precio compra"
          placeholder="0,00"
          value={buy}
          onChange={setBuy}
        />
        <NumInput
          label="Precio venta"
          placeholder="0,00"
          value={sell}
          onChange={setSell}
        />
      </div>

      {/* Results */}
      {result ? (
        <div className="border border-gray-700 rounded-xl overflow-hidden">
          {/* Header */}
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

          {/* Detail rows */}
          <div className="divide-y divide-gray-800">
            {[
              { label: 'Capital invertido', val: fmtVES(result.capital), color: 'text-gray-300' },
              { label: 'Comisión fiat (pago)', val: `+${fmtVES(result.comisFiatCompra)}`, color: 'text-amber-400' },
              { label: 'Total fiat entregado', val: fmtVES(result.totalFiatSale), color: 'text-white', bold: true },
              { label: 'USDT bruto comprado', val: `${fmtUSDT(result.usdtBruto)} USDT`, color: 'text-blue-400' },
              { label: `Comis. compra (${exchange === 'binance' ? '0.25%' : '0%'})`, val: `-${fmtUSDT(result.comisUsdtCompra)} USDT`, color: 'text-red-400' },
              { label: 'USDT neto disponible', val: `${fmtUSDT(result.usdtNeto)} USDT`, color: 'text-blue-300', bold: true },
              { label: `Comis. venta (${exchange === 'binance' ? '0.25%' : '0%'})`, val: `-${fmtUSDT(result.comisUsdtVenta)} USDT`, color: 'text-red-400' },
              { label: 'USDT vendidos', val: `${fmtUSDT(result.usdtNetVenta)} USDT`, color: 'text-gray-300' },
              { label: 'Fiat recibido', val: fmtVES(result.fiatRecibido), color: 'text-green-400', bold: true },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2">
                <span className="text-xs text-gray-500">{row.label}</span>
                <span className={`text-xs font-mono ${row.color} ${row.bold ? 'font-semibold' : ''}`}>
                  {row.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-gray-700 rounded-xl py-6 text-center">
          <p className="text-sm text-gray-600">Ingresa capital, precio de compra y venta</p>
        </div>
      )}
    </Card>
  )
}
