import { NextRequest, NextResponse } from 'next/server'
import type { Fiat, P2PRate, P2PRates } from '@/types'

const BINANCE_URL = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search'
const TOP_N = 10

interface BinanceAdv {
  adv: {
    price: string
    minSingleTransAmount: string
    dynamicMaxSingleTransAmount: string
    tradeMethods: { tradeMethodName: string }[]
  }
  advertiser: {
    nickName: string
  }
}

async function fetchBinanceRates(fiat: string, tradeType: 'BUY' | 'SELL'): Promise<P2PRate[]> {
  const body = {
    fiat,
    asset: 'USDT',
    tradeType,
    page: 1,
    rows: TOP_N,
    publisherType: null,
    payTypes: [],
  }

  const res = await fetch(BINANCE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
    },
    body: JSON.stringify(body),
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    throw new Error(`Binance P2P API error: ${res.status}`)
  }

  const data = await res.json()
  const items: BinanceAdv[] = data?.data ?? []

  return items.map(item => ({
    price: parseFloat(item.adv.price),
    merchant: item.advertiser.nickName,
    minAmount: parseFloat(item.adv.minSingleTransAmount),
    maxAmount: parseFloat(item.adv.dynamicMaxSingleTransAmount),
    payMethods: item.adv.tradeMethods?.map(m => m.tradeMethodName) ?? [],
  }))
}

function avg(rates: P2PRate[]): number {
  if (rates.length === 0) return 0
  return rates.reduce((sum, r) => sum + r.price, 0) / rates.length
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const fiat = (searchParams.get('fiat') ?? 'VES').toUpperCase() as Fiat

  try {
    const [buyRates, sellRates] = await Promise.all([
      fetchBinanceRates(fiat, 'BUY'),
      fetchBinanceRates(fiat, 'SELL'),
    ])

    const avgBuy = avg(buyRates)
    const avgSell = avg(sellRates)
    const spread = avgSell - avgBuy
    const spreadPct = avgBuy > 0 ? (spread / avgBuy) * 100 : 0

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
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
