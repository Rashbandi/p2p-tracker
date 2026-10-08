'use client'
import { useState } from 'react'
import type { ArbitrageStrategy } from '@/types'

export default function StrategyCard({ strategy }: { strategy: ArbitrageStrategy }) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm bg-white dark:bg-gray-800 transition-all hover:shadow-md">
      {/* --- VISTA PRINCIPIANTE (Ruta Feliz) --- */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold uppercase text-yellow-500">{strategy.buyExchange}</span>
            <span className="text-xs text-gray-500">Comprar</span>
          </div>
          <span className="text-gray-400">➔</span>
          <div className="flex flex-col items-center">
            <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{strategy.transferNetwork}</span>
          </div>
          <span className="text-gray-400">➔</span>
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold uppercase text-blue-500">{strategy.sellExchange}</span>
            <span className="text-xs text-gray-500">Vender</span>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-2xl font-black text-green-600">+{strategy.roiPct.toFixed(2)}%</p>
          <p className="text-sm text-gray-500 font-medium">ROI Estimado</p>
        </div>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <p className="text-gray-600 dark:text-gray-300">
            Invierte: <strong>{strategy.suggestedCapital.toLocaleString('es-VE')} {strategy.fiat}</strong>
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            Gana: <strong className="text-green-600">{strategy.netProfitFiat.toLocaleString('es-VE')} {strategy.fiat}</strong> libres.
          </p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm">
          Ejecutar Ciclo
        </button>
      </div>

      {/* --- BOTÓN TOGGLE PROFESIONAL --- */}
      <button 
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-sm text-center text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 flex justify-center items-center"
      >
        {showAdvanced ? '▲ Ocultar Matemáticas' : '▼ Auditar Matemáticas (Profesional)'}
      </button>

      {/* --- VISTA PROFESIONAL (Detalles y Comisiones Reales) --- */}
      {showAdvanced && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs font-mono space-y-2">
          <div className="flex justify-between">
            <span>Tasa Maker {strategy.buyExchange}:</span>
            <span>{strategy.buyRate} {strategy.fiat} (Fee: {strategy.dynamicFees.buyMaker * 100}%)</span>
          </div>
          <div className="flex justify-between text-red-500">
            <span>Peaje de Red ({strategy.transferNetwork}):</span>
            <span>- {strategy.networkFeeUsdt} USDT</span>
          </div>
          <div className="flex justify-between">
            <span>Tasa Maker {strategy.sellExchange}:</span>
            <span>{strategy.sellRate} {strategy.fiat} (Fee: {strategy.dynamicFees.sellMaker * 100}%)</span>
          </div>
          <hr className="border-gray-200 dark:border-gray-700 my-2" />
          <div className="flex justify-between font-bold text-gray-700 dark:text-gray-200">
            <span>Tiempo estimado de ciclo:</span>
            <span>~{strategy.estimatedTimeMins} min</span>
          </div>
        </div>
      )}
    </div>
  )
}
