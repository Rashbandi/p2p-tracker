export type Fiat = 'VES' | 'COP' | 'ARS' | 'BRL' | 'PEN' | 'CLP'

export type Exchange = 'binance' | 'bybit'

export interface P2PRate {
  price: number
  merchant: string
  minAmount: number
  maxAmount: number
  payMethods: string[]
}

export interface P2PRates {
  fiat: Fiat
  buyRates: P2PRate[]
  sellRates: P2PRate[]
  avgBuy: number
  avgSell: number
  spread: number
  spreadPct: number
  timestamp: number
}

export interface VesPayMethod {
  label: string
  rate: number
  key: string
  /** Identifiers used by the Binance P2P API payTypes filter */
  binancePayTypes: string[]
}

export interface CalcResult {
  capital: number
  totalFiatSale: number
  usdtBruto: number
  comisUsdtCompra: number
  usdtNeto: number
  comisUsdtVenta: number
  usdtNetVenta: number
  fiatRecibido: number
  ganancia: number
  roi: number
  comisFiatCompra: number
}

export interface Asset {
  id: string
  name: string
  symbol: string
  amount: number
  fiatValue: number
  fiat: Fiat
}

export interface P2PCycle {
  id: string
  user_id: string
  name: string
  status: 'active' | 'closed'
  fiat: Fiat
  exchange: Exchange
  capital_fiat: number
  capital_usdt: number
  closed_fiat: number | null
  profit_fiat: number | null
  roi_pct: number | null
  opened_at: string
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface P2PTrade {
  id: string
  cycle_id: string
  user_id: string
  type: 'buy' | 'sell'
  fiat: Fiat
  exchange: Exchange
  price: number
  usdt_amount: number
  fiat_amount: number
  commission_usdt: number
  pay_method: string
  notes: string | null
  traded_at: string
  created_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Session {
  user: Profile
  accessToken: string
  expiresAt: number
}
