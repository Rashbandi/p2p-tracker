import type { Fiat, VesPayMethod } from '@/types'

export const APP_NAME = 'P2P Tracker'
export const APP_SUBTITLE = 'by Infinity Changes'

export const TIMEOUT_MS = 30 * 60 * 1000       // 30 min inactivity
export const WARN_BEFORE_MS = 5 * 60 * 1000    // show warning 5 min before

// Commissions
export const BINANCE_MAKER_FEE = 0.0025         // 0.25% both buy and sell
export const BYBIT_FEE = 0                      // 0% P2P

// VES payment methods commissions
export const VES_PAY_METHODS: VesPayMethod[] = [
  { label: 'Pago Móvil',             rate: 0.003, key: 'pago_movil' },
  { label: 'Transf. Interbancaria',  rate: 0.003, key: 'transf_inter' },
  { label: 'Transf. Mismo Banco',    rate: 0,     key: 'transf_mismo' },
  { label: 'Zinli',                  rate: 0,     key: 'zinli' },
  { label: 'Reserve',                rate: 0,     key: 'reserve' },
]

// Available fiats
export const FIATS: { value: Fiat; label: string; flag: string }[] = [
  { value: 'VES', label: 'Bolívar (VES)', flag: '🇻🇪' },
  { value: 'COP', label: 'Peso Colombiano (COP)', flag: '🇨🇴' },
  { value: 'ARS', label: 'Peso Argentino (ARS)', flag: '🇦🇷' },
  { value: 'BRL', label: 'Real Brasileño (BRL)', flag: '🇧🇷' },
  { value: 'PEN', label: 'Sol Peruano (PEN)', flag: '🇵🇪' },
  { value: 'CLP', label: 'Peso Chileno (CLP)', flag: '🇨🇱' },
]

// Colors (design tokens)
export const colors = {
  bg:        '#111827',
  surface:   '#1f2937',
  border:    '#374151',
  borderL:   '#4b5563',
  text:      '#f9fafb',
  muted:     '#9ca3af',
  faint:     '#6b7280',
  green:     '#10b981',
  red:       '#ef4444',
  amber:     '#f59e0b',
  blue:      '#3b82f6',
  input:     '#07080f',
  mono:      "'JetBrains Mono', monospace",
} as const
