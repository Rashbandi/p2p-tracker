'use client'
import { useState, useEffect } from 'react'
import type { ArbitrageStrategy, Fiat, PlatformFees } from '@/types'

export function useArbitrageStrategies(fiat: Fiat, capital: number) {
  const [strategies, setStrategies] = useState<ArbitrageStrategy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStrategies() {
      setLoading(true)
      try {
        // 1. Aquí inyectarás tu API que trae las tasas de Binance, Bybit, OKX
        // const rates = await fetch(`/api/rates?fiat=${fiat}`).then(res => res.json())
        
        // 2. Aquí inyectarás tu API que raspea las comisiones oficiales actualizadas
        // const currentFees: PlatformFees[] = await fetch('/api/fees/current').then(res => res.json())

        // SIMULACIÓN DEL CÁLCULO DEL MOTOR (Lo que hará tu backend)
        // Ruta: Comprar Binance (Maker) -> TRC20 -> Vender Bybit (Maker)
        const mockStrategy: ArbitrageStrategy = {
          id: 'binance-bybit-trc20',
          fiat: fiat,
          buyExchange: 'binance',
          sellExchange: 'bybit',
          transferNetwork: 'TRC20',
          networkFeeUsdt: 1.0, 
          suggestedCapital: capital,
          buyRate: 1008.70, // Inyectar dato real
          sellRate: 1025.80, // Inyectar dato real
          estimatedTimeMins: 45,
          dynamicFees: {
            buyMaker: 0.0025, // 0.25% Binance
            sellMaker: 0.0010  // 0.10% Bybit (Ejemplo)
          },
          // Matemáticas
          grossProfitFiat: 0, 
          netProfitFiat: 0,
          roiPct: 0
        }

        // Cálculos exactos
        const usdtComprados = capital / mockStrategy.buyRate
        const comisionCompra = usdtComprados * mockStrategy.dynamicFees.buyMaker
        const usdtDespuesCompra = usdtComprados - comisionCompra
        
        const usdtEnDestino = usdtDespuesCompra - mockStrategy.networkFeeUsdt
        
        const fiatBrutoVenta = usdtEnDestino * mockStrategy.sellRate
        const comisionVentaFiat = fiatBrutoVenta * mockStrategy.dynamicFees.sellMaker
        const fiatNetoFinal = fiatBrutoVenta - comisionVentaFiat
        
        mockStrategy.netProfitFiat = fiatNetoFinal - capital
        mockStrategy.roiPct = (mockStrategy.netProfitFiat / capital) * 100

        // Solo mostrar estrategias rentables (ROI > 0.5%)
        if (mockStrategy.roiPct > 0.5) {
          setStrategies([mockStrategy])
        } else {
          setStrategies([])
        }
      } catch (error) {
        console.error("Error calculando estrategias:", error)
      } finally {
        setLoading(false)
      }
    }

    if (capital > 0) fetchStrategies()
  }, [fiat, capital])

  return { strategies, loading }
}
