export interface VESBank {
  code: string
  name: string
  /** Binance P2P identifier (matches PAY_METHODS in RatesPanel) */
  binanceId?: string
  popular?: boolean
}

export const VES_BANKS: VESBank[] = [
  { code: '0102', name: 'Banco de Venezuela',            binanceId: 'BancoDeVenezuela', popular: true  },
  { code: '0134', name: 'Banesco',                       binanceId: 'Banesco',           popular: true  },
  { code: '0108', name: 'BBVA Provincial',               binanceId: 'Provincial',        popular: true  },
  { code: '0105', name: 'Banco Mercantil',               binanceId: 'Mercantil',         popular: true  },
  { code: '0114', name: 'Bancaribe',                     binanceId: 'Bancaribe',         popular: true  },
  { code: '0174', name: 'Banplus',                       binanceId: 'BNC',               popular: true  },
  { code: '0177', name: 'Banfanb',                       binanceId: undefined,           popular: false },
  { code: '0172', name: 'Bancamiga',                     binanceId: undefined,           popular: false },
  { code: '0191', name: 'Banco Nacional de Crédito',     binanceId: undefined,           popular: false },
  { code: '0104', name: 'Banco Venezolano de Crédito',   binanceId: undefined,           popular: false },
  { code: '0115', name: 'Banco Exterior',                binanceId: undefined,           popular: false },
  { code: '0128', name: 'Banco Caroní',                  binanceId: undefined,           popular: false },
  { code: '0137', name: 'Banco Sofitasa',                binanceId: undefined,           popular: false },
  { code: '0138', name: 'Banco Plaza',                   binanceId: undefined,           popular: false },
  { code: '0146', name: 'Bangente',                      binanceId: undefined,           popular: false },
  { code: '0151', name: 'Banco Fondo Común',             binanceId: undefined,           popular: false },
  { code: '0156', name: '100% Banco',                    binanceId: undefined,           popular: false },
  { code: '0157', name: 'Delsur Banco Universal',        binanceId: undefined,           popular: false },
  { code: '0163', name: 'Banco del Tesoro',              binanceId: undefined,           popular: false },
  { code: '0168', name: 'Bancrecer',                     binanceId: undefined,           popular: false },
  { code: '0169', name: 'R4 Banco Microfinanciero',      binanceId: undefined,           popular: false },
  { code: '0171', name: 'Banco Activo',                  binanceId: undefined,           popular: false },
  { code: '0173', name: 'Banco Intl. de Desarrollo',     binanceId: undefined,           popular: false },
  { code: '0175', name: 'Banco Digital Trabajadores',    binanceId: undefined,           popular: false },
  { code: '0178', name: 'N58 Banco Digital',             binanceId: undefined,           popular: false },
]

// Only banks that map to Binance P2P identifiers (usable as filters)
export const BINANCE_BANKS = VES_BANKS.filter(b => b.binanceId)

// Also include non-bank payment methods
export const EXTRA_PAY_METHODS = [
  { code: 'pm', name: 'Pago Móvil', binanceId: 'PagoMovil', popular: true },
  { code: 'zinli', name: 'Zinli',   binanceId: 'Zinli',     popular: true },
  { code: 'reserve', name: 'Reserve', binanceId: 'Reserve', popular: false },
]
