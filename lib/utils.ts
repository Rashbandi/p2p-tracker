import type { CalcResult } from '@/types'
import { BINANCE_MAKER_FEE, BYBIT_FEE } from './constants'

// ── Number formatting (Venezuelan locale) ──────────────────────────────────
export const fmtVES = (n: number, decimals = 2) =>
  n.toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

export const fmtUSDT = (n: number) =>
  n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtPct = (n: number) =>
  n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'

// ── Parse Venezuelan number string to float ────────────────────────────────
export function parseVES(str: string): number {
  // "1.234.567,89" → 1234567.89
  const clean = str.replace(/\./g, '').replace(',', '.')
  const val = parseFloat(clean)
  return isNaN(val) ? 0 : val
}

// ── P2P Calculator ─────────────────────────────────────────────────────────
export function calcP2P(params: {
  capital: number       // fiat invested
  buyPrice: number      // USDT buy price in fiat
  sellPrice: number     // USDT sell price in fiat
  vesComm: number       // VES payment method commission (0–1)
  exchange: 'binance' | 'bybit'
}): CalcResult {
  const { capital, buyPrice, sellPrice, vesComm, exchange } = params
  const usdtComm = exchange === 'binance' ? BINANCE_MAKER_FEE : BYBIT_FEE

  // Fiat side: payment method adds fee on top
  const comisFiatCompra = capital * vesComm
  const totalFiatSale   = capital + comisFiatCompra

  // USDT received on buy
  const usdtBruto       = capital / buyPrice
  const comisUsdtCompra = usdtBruto * usdtComm
  const usdtNeto        = usdtBruto - comisUsdtCompra

  // USDT sold
  const comisUsdtVenta  = usdtNeto * usdtComm
  const usdtNetVenta    = usdtNeto - comisUsdtVenta
  const fiatRecibido    = usdtNetVenta * sellPrice

  const ganancia = fiatRecibido - totalFiatSale
  const roi      = totalFiatSale > 0 ? (ganancia / totalFiatSale) * 100 : 0

  return {
    capital,
    totalFiatSale,
    usdtBruto,
    comisUsdtCompra,
    usdtNeto,
    comisUsdtVenta,
    usdtNetVenta,
    fiatRecibido,
    ganancia,
    roi,
    comisFiatCompra,
  }
}

// ── Spread calculation ─────────────────────────────────────────────────────
export function calcSpread(buy: number, sell: number) {
  const spread = sell - buy
  const spreadPct = buy > 0 ? (spread / buy) * 100 : 0
  return { spread, spreadPct }
}

// ── SHA-256 password hash ──────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  const salt = 'IC_2026_'
  const data = new TextEncoder().encode(salt + password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Date helpers ──────────────────────────────────────────────────────────
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-VE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-VE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Class name helper ─────────────────────────────────────────────────────
export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
