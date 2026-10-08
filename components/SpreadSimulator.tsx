'use client'
import { useState } from 'react'
import { useSimulateArbitrage } from '@/hooks/useSimulateArbitrage'

export default function SpreadSimulator() {
  const [capital, setCapital] = useState<number>(50000) // 50,000 Bs por defecto
  const { result, rateBuy, rateSell, loading } = useSimulateArbitrage(capital, 'VES')

  return (
    <div className="p-4 border rounded-lg shadow bg-white dark:bg-gray-800">
      <h2 className="text-xl font-bold mb-4">Simulador de Ciclo</h2>
      
      <div className="mb-4">
        <label className="block text-sm mb-1">Capital a Invertir (VES)</label>
        <input 
          type="number" 
          value={capital}
          onChange={(e) => setCapital(Number(e.target.value))}
          className="w-full p-2 border rounded text-black"
        />
      </div>

      {loading && <p>Calculando tasas del mercado...</p>}
      
      {result && (
        <div className="space-y-2 text-sm">
          <p>Tasa Compra (Promedio): <strong>{rateBuy.toFixed(2)}</strong></p>
          <p>Tasa Venta (Promedio): <strong>{rateSell.toFixed(2)}</strong></p>
          <hr className="my-2" />
          <p>USDT Neto a recibir: <strong>{result.usdtNeto.toFixed(2)} USDT</strong></p>
          <p>Fiat Estimado al Vender: <strong>{result.fiatRecibido.toFixed(2)} VES</strong></p>
          <div className={`p-2 mt-2 rounded ${result.ganancia > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <p className="font-bold">Ganancia: {result.ganancia.toFixed(2)} VES</p>
            <p className="font-bold">ROI Esperado: {result.roi.toFixed(2)}%</p>
          </div>
        </div>
      )}
    </div>
  )
}
