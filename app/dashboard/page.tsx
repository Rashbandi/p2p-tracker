'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { RatesPanel } from '@/components/dashboard/RatesPanel'
import { Calculator } from '@/components/dashboard/Calculator'
import { DonutChart } from '@/components/dashboard/DonutChart'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { fmtVES, fmtUSDT } from '@/lib/utils'
import type { P2PCycle } from '@/types'

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function DashboardPage() {
  const { user } = useAuth()
  const [cycles, setCycles]         = useState<P2PCycle[]>([])
  const [hideZero, setHideZero]     = useState(false)
  const [hideSaldos, setHideSaldos] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('p2p_cycles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => data && setCycles(data as P2PCycle[]))
  }, [user])

  const activeCycles  = cycles.filter(c => c.status === 'active')
  const closedCycles  = cycles.filter(c => c.status === 'closed')
  const totalFiat     = cycles.reduce((s, c) => s + (c.capital_fiat ?? 0), 0)
  const totalUsdt     = cycles.reduce((s, c) => s + (c.capital_usdt ?? 0), 0)
  const totalProfit   = closedCycles.reduce((s, c) => s + (c.profit_fiat ?? 0), 0)

  // Donut chart data per fiat
  const fiatMap: Record<string, number> = {}
  for (const c of cycles) {
    if (!c.capital_fiat) continue
    fiatMap[c.fiat] = (fiatMap[c.fiat] ?? 0) + c.capital_fiat
  }
  const chartData = Object.entries(fiatMap)
    .filter(([, v]) => !hideZero || v > 0)
    .map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }))

  const maskVal = (v: string) => hideSaldos ? '••••••' : v

  return (
    <div className="fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">
            Buen día, {user?.user_metadata?.full_name?.split(' ')[0] ?? 'Trader'} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Resumen de tu actividad P2P</p>
        </div>
        <button
          onClick={() => setHideSaldos(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          {hideSaldos ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
          {hideSaldos ? 'Mostrar' : 'Ocultar'} saldos
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: 'Capital en Fiat',
            val: maskVal(fmtVES(totalFiat)),
            sub: 'Todos los ciclos',
            color: 'text-blue-400',
            icon: '💰',
          },
          {
            label: 'Capital en USDT',
            val: maskVal(fmtUSDT(totalUsdt) + ' USDT'),
            sub: 'Total operado',
            color: 'text-amber-400',
            icon: '₮',
          },
          {
            label: 'Ganancias netas',
            val: maskVal(fmtVES(totalProfit)),
            sub: `${closedCycles.length} ciclos cerrados`,
            color: totalProfit >= 0 ? 'text-green-400' : 'text-red-400',
            icon: '📈',
          },
          {
            label: 'Ciclos activos',
            val: String(activeCycles.length),
            sub: `${cycles.length} ciclos totales`,
            color: 'text-green-400',
            icon: '🔄',
          },
        ].map((kpi, i) => (
          <Card key={i} padding="md">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">{kpi.label}</span>
              <span className="text-lg">{kpi.icon}</span>
            </div>
            <p className={`text-xl font-bold font-mono ${kpi.color} mb-1`}>{kpi.val}</p>
            <p className="text-xs text-gray-600">{kpi.sub}</p>
          </Card>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Rates — takes 2 cols */}
        <div className="lg:col-span-2">
          <RatesPanel />
        </div>

        {/* Portfolio donut */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución</CardTitle>
            <button
              onClick={() => setHideZero(v => !v)}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              {hideZero ? 'Ver todos' : 'Ocultar ceros'}
            </button>
          </CardHeader>
          {chartData.length > 0 ? (
            <DonutChart data={chartData} />
          ) : (
            <div className="py-8 text-center text-sm text-gray-600">
              Sin ciclos registrados
            </div>
          )}
        </Card>
      </div>

      {/* Calculator + Active cycles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Calculator />

        {/* Active cycles */}
        <Card>
          <CardHeader>
            <CardTitle>Ciclos activos</CardTitle>
            <Badge variant="green" dot>{activeCycles.length} activos</Badge>
          </CardHeader>

          {activeCycles.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-600 mb-3">No hay ciclos activos</p>
              <a
                href="/cycles"
                className="text-xs text-green-400 hover:text-green-300 font-medium"
              >
                Crear primer ciclo →
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {activeCycles.map(cycle => (
                <div key={cycle.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-white">{cycle.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {cycle.exchange} · {cycle.fiat}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold text-blue-400">
                      {maskVal(fmtVES(cycle.capital_fiat))}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {maskVal(fmtUSDT(cycle.capital_usdt))} USDT
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
