import { NextRequest, NextResponse } from 'next/server'
import type { Fiat, P2PRate, P2PRates } from '@/types'

const BINANCE_URL = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search'
const TOP_N = 20

interface BinanceAdv {
  adv: {
    price: string
    minSingleTransAmount: string
    dynamicMaxSingleTransAmount: string
    tradeMethods: { tradeMethodName: string; identifier: string }[]
  }
  advertiser: {
    nickName: string
  }
}

async function fetchBinanceRates(
  fiat: string,
  tradeType: 'BUY' | 'SELL',
  payTypes: string[],
  transAmount: number | null,
): Promise<P2PRate[]> {
  const body: Record<string, unknown> = {
    fiat,
    asset: 'USDT',
    tradeType,
    page: 1,
    rows: TOP_N,
    publisherType: null,
    payTypes: payTypes.length > 0 ? payTypes : [],
  }

  if (transAmount && transAmount > 0) {
    body.transAmount = transAmount
  }

  const res = await fetch(BINANCE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`Binance P2P API error: ${res.status}`)

  const data = await res.json()
  const items: BinanceAdv[] = data?.data ?? []

  return items.map(item => ({
    price: parseFloat(item.adv.price),
    merchant: item.advertiser.nickName,
    minAmount: parseFloat(item.adv.minSingleTransAmount),
    maxAmount: parseFloat(item.adv.dynamicMaxSingleTransAmount),
    payMethods:    item.adv.tradeMethods?.map(m => m.tradeMethodName) ?? [],
    payMethodIds:  item.adv.tradeMethods?.map(m => m.identifier)      ?? [],
  }))
}

function avg(rates: P2PRate[]): number {
  if (rates.length === 0) return 0
  return rates.reduce((sum, r) => sum + r.price, 0) / rates.length
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const fiat = (searchParams.get('fiat') ?? 'VES').toUpperCase() as Fiat
  const payTypesRaw = searchParams.get('payTypes') ?? ''
  const transAmountRaw = searchParams.get('transAmount') ?? ''
  const debug = searchParams.get('debug') === '1'

  const payTypes = payTypesRaw ? payTypesRaw.split(',').filter(Boolean) : []
  const transAmount = transAmountRaw ? parseFloat(transAmountRaw) : null

  try {
    const [buyRates, sellRates] = await Promise.all([
      fetchBinanceRates(fiat, 'BUY', payTypes, transAmount),
      fetchBinanceRates(fiat, 'SELL', payTypes, transAmount),
    ])

    // ?debug=1 → devuelve los identificadores únicos que usa Binance (útil para configurar payTypes)
    if (debug) {
      const allIds = new Set<string>()
      const idToName: Record<string, string> = {}
      ;[...buyRates, ...sellRates].forEach(r => {
        r.payMethodIds.forEach((id, i) => {
          allIds.add(id)
          idToName[id] = r.payMethods[i] ?? id
        })
      })
      return NextResponse.json(
        { fiat, payTypesSent: payTypes, identifiersFound: Array.from(allIds).map(id => ({ id, name: idToName[id] })) },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const avgBuy  = avg(buyRates)   // compradores del mercado → precio de VENTA de IC
    const avgSell = avg(sellRates)  // vendedores del mercado  → precio de COMPRA de IC

    // Spread desde la perspectiva del anunciante (IC):
    //   IC compra de los vendedores (sellRates) y vende a los compradores (buyRates)
    //   spread = buyRates[0] - sellRates[0] → POSITIVO cuando el mercado es normal
    const spread    = avgBuy - avgSell
    const spreadPct = avgSell > 0 ? (spread / avgSell) * 100 : 0

    const result: P2PRates = {
      fiat,
      buyRates,
      sellRates,
      avgBuy,
      avgSell,
      spread,
      spreadPct,
      timestamp: Date.now(),
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
