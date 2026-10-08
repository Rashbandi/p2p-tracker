'use client'
import { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { fmtVES } from '@/lib/utils' // Asumo que tienes esta utilidad según tu page.tsx

// Esta interfaz vendrá de tu base de datos o API
interface Strategy {
  id: string
  route: { buy: string; network: string; sell: string }
  capital: number
  profit: number
  roiPct: number
  timeEst: number
  proDetails: {
    buyRate: number
    buyFee: number
    networkFee: number
    sellRate: number
    sellFee: number
  }
}

export function SmartStrategies() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // Aquí luego conectarás tu fetch a la nueva API multiexchange
  const mockStrategies: Strategy[] = [
    {
      id: '1',
      route: { buy: 'Binance', network: 'TRC20', sell: 'Bybit' },
      capital: 50000,
      profit: 720.50,
      roiPct: 1.44,
      timeEst: 45,
      proDetails: { buyRate: 1008.70, buyFee: 0.25, networkFee: 1.0, sellRate: 1025.80, sellFee: 0.10 }
    }
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-white flex items-center gap-2">
            ⚡ Oportunidades del Momento
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </CardTitle>
          <p className="text-xs text-gray-500 mt-1">Rutas calculadas en tiempo real con comisiones incluidas.</p>
        </div>
        {/* Filtro rápido simulado */}
        <select className="bg-[#07080f] border border-[#374151] text-xs text-gray-300 rounded-md px-2 py-1 focus-ring">
          <option>🇻🇪 VES (Venezuela)</option>
          <option>🇨🇴 COP (Colombia)</option>
        </select>
      </CardHeader>

      <div className="p-4 space-y-3">
        {mockStrategies.map((strat) => (
          <div key={strat.id} className="border border-[#374151] bg-[#1f2937] rounded-xl overflow-hidden transition-all hover:border-gray-500 fade-in">
            {/* VISTA PRINCIPIANTE (Ruta Feliz) */}
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
                  <span className="text-yellow-500">{strat.route.buy}</span>
                  <span className="text-gray-500 text-xs">➔</span>
                  <Badge variant="outline" className="text-[10px] bg-gray-800">{strat.route.network}</Badge>
                  <span className="text-gray-500 text-xs">➔</span>
                  <span className="text-blue-400">{strat.route.sell}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-green-400">+{strat.roiPct}%</span>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-gray-400">Inversión sugerida: <span className="text-white font-mono">{fmtVES(strat.capital)}</span></p>
                  <p className="text-sm mt-0.5">Ganancia limpia: <strong className="text-green-400 font-mono">+{fmtVES(strat.profit)}</strong></p>
                </div>
                <button className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors">
                  Ejecutar Ciclo
                </button>
              </div>
            </div>

            {/* BOTÓN DIVULGACIÓN PRO */}
            <button 
              onClick={() => setExpandedId(expandedId === strat.id ? null : strat.id)}
              className="w-full py-2 bg-[#111827] border-t border-[#374151] text-[10px] text-gray-500 hover:text-gray-300 flex justify-center items-center gap-1"
            >
              {expandedId === strat.id ? '▲ Ocultar desglose' : '▼ Auditar Matemáticas'}
            </button>

            {/* VISTA PROFESIONAL (Comisiones y Tasas) */}
            {expandedId === strat.id && (
              <div className="p-3 bg-[#07080f] text-xs font-mono space-y-1.5 border-t border-[#374151]">
                <div className="flex justify-between text-gray-400">
                  <span>Tasa Compra ({strat.route.buy})</span>
                  <span className="text-gray-200">{strat.proDetails.buyRate} VES <span className="text-red-400">-{strat.proDetails.buyFee}% (Maker)</span></span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Peaje de Red ({strat.route.network})</span>
                  <span className="text-red-400">-{strat.proDetails.networkFee} USDT</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Tasa Venta ({strat.route.sell})</span>
                  <span className="text-gray-200">{strat.proDetails.sellRate} VES <span className="text-red-400">-{strat.proDetails.sellFee}% (Maker)</span></span>
                </div>
                <div className="pt-2 mt-2 border-t border-[#374151] flex justify-between text-gray-400">
                  <span>Tiempo estimado de liquidación</span>
                  <span className="text-gray-200">~{strat.timeEst} mins</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
