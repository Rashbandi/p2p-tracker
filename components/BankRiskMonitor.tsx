'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js' // O tu instancia configurada
import { BINANCE_BANKS, EXTRA_PAY_METHODS } from '@/lib/ves-banks'

// Inicializa Supabase (Ajusta la importación según tu configuración)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface BankRisk {
  method: string
  total_fiat: number
  limit: number
}

export default function BankRiskMonitor({ userId }: { userId: string }) {
  const [risks, setRisks] = useState<BankRisk[]>([])
  
  // Límite de alerta (Ej. 100,000 Bs diarios por banco)
  const DAILY_LIMIT = 100000 

  useEffect(() => {
    async function fetchTodayVolume() {
      // Obtenemos el inicio del día actual
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      // Consultamos la tabla p2p_trades
      const { data: trades } = await supabase
        .from('p2p_trades')
        .select('fiat_amount, pay_method')
        .eq('user_id', userId)
        .gte('traded_at', startOfDay.toISOString())

      if (!trades) return

      // Agrupamos el volumen por método de pago
      const volumeMap: Record<string, number> = {}
      trades.forEach(trade => {
        const method = trade.pay_method || 'Desconocido'
        volumeMap[method] = (volumeMap[method] || 0) + Number(trade.fiat_amount)
      })

      const mappedRisks = Object.keys(volumeMap).map(method => ({
        method,
        total_fiat: volumeMap[method],
        limit: DAILY_LIMIT
      }))

      setRisks(mappedRisks)
    }

    fetchTodayVolume()
  }, [userId])

  return (
    <div className="p-4 border rounded-lg shadow bg-white dark:bg-gray-800">
      <h2 className="text-xl font-bold mb-4">Monitor de Riesgo Diario (VES)</h2>
      {risks.length === 0 ? <p>No hay operaciones hoy.</p> : null}
      
      <div className="space-y-3">
        {risks.map(risk => {
          const percent = (risk.total_fiat / risk.limit) * 100
          const isDanger = percent > 80 // Alerta roja si supera el 80%

          return (
            <div key={risk.method} className="text-sm">
              <div className="flex justify-between mb-1">
                <span className="font-semibold">{risk.method}</span>
                <span>{risk.total_fiat.toFixed(2)} / {risk.limit} Bs</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${isDanger ? 'bg-red-600' : 'bg-green-600'}`} 
                  style={{ width: `${Math.min(percent, 100)}%` }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
