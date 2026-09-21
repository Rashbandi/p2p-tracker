'use client'
import { useState, useEffect, FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { fmtVES, fmtUSDT, formatDate } from '@/lib/utils'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, NumInput } from '@/components/ui/Input'
import { FIATS } from '@/lib/constants'
import type { P2PCycle, Fiat } from '@/types'

type Filter = 'all' | 'active' | 'closed'

export default function CyclesPage() {
  const { user } = useAuth()
  const [cycles, setCycles]       = useState<P2PCycle[]>([])
  const [filter, setFilter]       = useState<Filter>('all')
  const [showNew, setShowNew]     = useState(false)
  const [confirmClose, setConfirmClose] = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)

  // New cycle form
  const [name, setName]           = useState('')
  const [fiat, setFiat]           = useState<Fiat>('VES')
  const [exchange, setExchange]   = useState<'binance' | 'bybit'>('binance')
  const [capital, setCapital]     = useState('')
  const [capitalUsdt, setCapitalUsdt] = useState('')
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!user) return
    setLoading(true)
    supabase
      .from('p2p_cycles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        data && setCycles(data as P2PCycle[])
        setLoading(false)
      })
  }, [user])

  const filtered = cycles.filter(c =>
    filter === 'all' ? true : c.status === filter
  )

  async function createCycle(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!name) { setFormError('Asigna un nombre al ciclo'); return }
    const cap = parseFloat(capital.replace(/\./g, '').replace(',', '.')) || 0
    const capU = parseFloat(capitalUsdt.replace(/\./g, '').replace(',', '.')) || 0
    if (cap <= 0) { setFormError('Ingresa el capital en fiat'); return }

    setSaving(true)
    try {
      const { data, error } = await supabase.from('p2p_cycles').insert({
        user_id: user!.id,
        name: name.trim(),
        fiat,
        exchange,
        status: 'active',
        capital_fiat: cap,
        capital_usdt: capU,
        opened_at: new Date().toISOString(),
      }).select().single()

      if (error) throw error
      setCycles(prev => [data as P2PCycle, ...prev])
      setShowNew(false)
      resetForm()
    } catch (err: any) {
      setFormError(err.message ?? 'Error al crear ciclo')
    } finally {
      setSaving(false)
    }
  }

  async function closeCycle(id: string) {
    const { error } = await supabase
      .from('p2p_cycles')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      setCycles(prev => prev.map(c => c.id === id ? { ...c, status: 'closed' } : c))
    }
    setConfirmClose(null)
  }

  function resetForm() {
    setName(''); setFiat('VES'); setExchange('binance')
    setCapital(''); setCapitalUsdt(''); setFormError('')
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Ciclos P2P</h1>
          <p className="text-sm text-gray-500 mt-0.5">{cycles.length} ciclos registrados</p>
        </div>
        <Button onClick={() => { setShowNew(true); resetForm() }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo ciclo
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'closed'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
              filter === f
                ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                : 'text-gray-500 hover:text-gray-300',
            ].join(' ')}
          >
            {{ all: 'Todos', active: 'Activos', closed: 'Cerrados' }[f]}
            <span className="ml-1.5 text-gray-600">
              {f === 'all' ? cycles.length : cycles.filter(c => c.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Cycles grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 bg-gray-800/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-gray-500 text-sm">No hay ciclos {filter !== 'all' ? filter === 'active' ? 'activos' : 'cerrados' : ''}</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(cycle => (
            <Card key={cycle.id} className="hover:border-gray-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{cycle.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {cycle.exchange} · {FIATS.find(f => f.value === cycle.fiat)?.flag} {cycle.fiat}
                  </p>
                </div>
                <Badge variant={cycle.status === 'active' ? 'green' : 'gray'} dot>
                  {cycle.status === 'active' ? 'Activo' : 'Cerrado'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <p className="text-xs text-gray-500 mb-1">Capital fiat</p>
                  <p className="text-sm font-mono font-semibold text-blue-400">{fmtVES(cycle.capital_fiat)}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <p className="text-xs text-gray-500 mb-1">Capital USDT</p>
                  <p className="text-sm font-mono font-semibold text-amber-400">{fmtUSDT(cycle.capital_usdt)} ₮</p>
                </div>
              </div>

              {cycle.profit_fiat !== null && (
                <div className={`rounded-lg p-2 mb-3 ${cycle.profit_fiat >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <p className="text-xs text-gray-500 mb-0.5">Ganancia</p>
                  <p className={`text-sm font-mono font-bold ${cycle.profit_fiat >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {cycle.profit_fiat >= 0 ? '+' : ''}{fmtVES(cycle.profit_fiat)}
                    {cycle.roi_pct !== null && (
                      <span className="text-xs font-normal ml-1.5 opacity-70">
                        ({cycle.roi_pct >= 0 ? '+' : ''}{cycle.roi_pct.toFixed(2)}%)
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Abierto {formatDate(cycle.opened_at)}</span>
                {cycle.status === 'active' && (
                  confirmClose === cycle.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmClose(null)}
                        className="text-gray-500 hover:text-gray-300"
                      >Cancelar</button>
                      <button
                        onClick={() => closeCycle(cycle.id)}
                        className="text-red-400 hover:text-red-300 font-medium"
                      >Confirmar</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmClose(cycle.id)}
                      className="text-gray-600 hover:text-amber-400 transition-colors"
                    >
                      Cerrar ciclo
                    </button>
                  )
                )}
                {cycle.status === 'closed' && cycle.closed_at && (
                  <span>Cerrado {formatDate(cycle.closed_at)}</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New cycle drawer */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNew(false)} />
          <div className="relative w-full max-w-md bg-[#1f2937] border-l border-[#374151] p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-white">Nuevo ciclo P2P</h2>
              <button onClick={() => setShowNew(false)} className="text-gray-500 hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && (
              <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={createCycle} className="flex flex-col gap-4">
              <Input
                label="Nombre del ciclo"
                placeholder="ej: Ciclo USDT VES Julio"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />

              {/* Exchange */}
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1.5">Exchange</label>
                <div className="flex gap-2">
                  {(['binance', 'bybit'] as const).map(ex => (
                    <button
                      type="button"
                      key={ex}
                      onClick={() => setExchange(ex)}
                      className={[
                        'flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize',
                        exchange === ex
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-gray-800 text-gray-500 hover:text-gray-300',
                      ].join(' ')}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fiat */}
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1.5">Moneda fiat</label>
                <div className="flex flex-wrap gap-1.5">
                  {FIATS.map(f => (
                    <button
                      type="button"
                      key={f.value}
                      onClick={() => setFiat(f.value)}
                      className={[
                        'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                        fiat === f.value
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          : 'bg-gray-800 text-gray-500 hover:text-gray-300',
                      ].join(' ')}
                    >
                      {f.flag} {f.value}
                    </button>
                  ))}
                </div>
              </div>

              <NumInput
                label="Capital en fiat"
                placeholder="0,00"
                value={capital}
                onChange={setCapital}
              />
              <NumInput
                label="Capital en USDT"
                placeholder="0,00"
                value={capitalUsdt}
                onChange={setCapitalUsdt}
              />

              <div className="flex gap-3 mt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowNew(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" loading={saving}>
                  Crear ciclo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
