import { P2PTrade, P2PCycle } from '@/types'

export function calculateCycleROI(cycle: P2PCycle, trades: P2PTrade[]) {
  let totalFiatInvested = 0;
  let totalUsdtBought = 0;
  let totalCommissionsUsdt = 0;
  
  let totalFiatRecovered = 0;
  let totalUsdtSold = 0;

  trades.forEach(trade => {
    if (trade.type === 'buy') {
      totalFiatInvested += trade.fiat_amount;
      totalUsdtBought += trade.usdt_amount;
      totalCommissionsUsdt += trade.commission_usdt;
    } else if (trade.type === 'sell') {
      totalFiatRecovered += trade.fiat_amount;
      totalUsdtSold += trade.usdt_amount;
      totalCommissionsUsdt += trade.commission_usdt;
    }
  });

  const netProfitFiat = totalFiatRecovered - totalFiatInvested;
  // Solo calculamos ROI si ya hay ventas registradas
  const roiPct = totalFiatInvested > 0 && totalFiatRecovered > 0 
    ? (netProfitFiat / totalFiatInvested) * 100 
    : 0;

  return {
    capital_fiat: totalFiatInvested,
    capital_usdt: totalUsdtBought,
    closed_fiat: totalFiatRecovered,
    profit_fiat: netProfitFiat,
    roi_pct: Number(roiPct.toFixed(4)),
    is_balanced: totalUsdtSold >= (totalUsdtBought - totalCommissionsUsdt) // Indica si el ciclo se puede cerrar
  };
}
