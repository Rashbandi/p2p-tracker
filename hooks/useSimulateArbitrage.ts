'use client'
import { useP2PRates } from '@/hooks/useP2PRates'
import type { Fiat, CalcResult } from '@/types'

export function useSimulateArbitrage(capitalFiat: number, fiat: Fiat = 'VES') {
  // Filtramos por métodos populares usando tu lógica existente
  const { rates, loading, error } = useP2PRates([fiat], { 
    payTypes: ['Banesco', 'PagoMovil'], 
    transAmount: capitalFiat.toString() 
  })
  
  if (loading || !rates[fiat]) return { result: null, loading, error };

  const market = rates[fiat];
  const rateBuy = market.avgBuy; 
  const rateSell = market.avgSell;

  // Cálculos matemáticos basados en tu interfaz CalcResult
  const usdtBruto = capitalFiat / rateBuy;
  const comisUsdtCompra = usdtBruto * 0.0025; // 0.25% Maker Binance
  const usdtNeto = usdtBruto - comisUsdtCompra;
  
  const fiatRecibido = usdtNeto * rateSell;
  const ganancia = fiatRecibido - capitalFiat;
  const roi = (ganancia / capitalFiat) * 100;

  const result: CalcResult = {
    capital: capitalFiat,
    totalFiatSale: fiatRecibido,
    usdtBruto,
    comisUsdtCompra,
    usdtNeto,
    comisUsdtVenta: 0, // Asumiendo Taker Bybit
    usdtNetVenta: usdtNeto,
    fiatRecibido,
    ganancia,
    roi,
    comisFiatCompra: 0
  };

  return { result, rateBuy, rateSell, loading, error };
}
