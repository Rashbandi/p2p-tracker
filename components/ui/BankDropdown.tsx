'use client'
import { useState, useRef, useEffect } from 'react'
import { VES_BANKS, EXTRA_PAY_METHODS } from '@/lib/ves-banks'

interface BankDropdownProps {
  selected: string[]
  onChange: (ids: string[]) => void
}

const ALL_OPTIONS = [
  ...EXTRA_PAY_METHODS,
  ...VES_BANKS.filter(b => b.binanceId).map(b => ({
    code: b.code,
    name: b.name,
    binanceId: b.binanceId!,
    popular: b.popular ?? false,
  })),
]

const POPULAR = ALL_OPTIONS.filter(o => o.popular)
const OTHERS  = ALL_OPTIONS.filter(o => !o.popular)

export function BankDropdown({ selected, onChange }: BankDropdownProps) {
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter(x => x !== id)
        : [...selected, id]
    )
  }

  function clearAll() { onChange([]) }

  const query = search.toLowerCase()
  const filtered = query
    ? ALL_OPTIONS.filter(o => o.name.toLowerCase().includes(query))
    : null

  // Label shown on the button
  const label = selected.length === 0
    ? 'Todos los métodos de pago'
    : selected.length === 1
      ? (ALL_OPTIONS.find(o => o.binanceId === selected[0])?.name ?? selected[0])
      : `${selected.length} métodos`

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className={[
          'flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-xl text-xs font-medium transition-all border min-w-[160px]',
          selected.length > 0
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300',
        ].join(' ')}
      >
        {/* bank icon */}
        <svg className="w-3.5 h-3.5 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M3 6l9-3 9 3v2H3V6zm0 4h18v10H3V10zm4 2v6m4-6v6m4-6v6" />
        </svg>
        <span className="truncate max-w-[120px]">{label}</span>
        <svg
          className={`w-3 h-3 ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-72 bg-[#13151f] border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-700/60">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                autoFocus
                type="text"
                placeholder="Buscar banco..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-800/60 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-green-500/50"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto custom-scroll">
            {/* Clear all */}
            <button
              onClick={clearAll}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-800/60 transition-colors text-left border-b border-gray-700/40"
            >
              <span className={[
                'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
                selected.length === 0
                  ? 'border-green-500 bg-green-500'
                  : 'border-gray-600 bg-transparent',
              ].join(' ')}>
                {selected.length === 0 && (
                  <svg className="w-2.5 h-2.5 text-gray-900" fill="none" viewBox="0 0 12 12" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </span>
              <span className="text-xs text-gray-300">Todos los métodos de pago</span>
            </button>

            {/* Filtered search results */}
            {filtered ? (
              <Section label={`Resultados (${filtered.length})`} options={filtered} selected={selected} onToggle={toggle} />
            ) : (
              <>
                <Section label="Popular" options={POPULAR} selected={selected} onToggle={toggle} />
                <Section label="Todos los bancos" options={OTHERS} selected={selected} onToggle={toggle} />
              </>
            )}
          </div>

          {/* Footer */}
          {selected.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-700/60 flex items-center justify-between">
              <span className="text-[10px] text-gray-600">{selected.length} seleccionado{selected.length > 1 ? 's' : ''}</span>
              <button onClick={clearAll} className="text-[10px] text-gray-500 hover:text-red-400 transition-colors">
                Limpiar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({
  label, options, selected, onToggle,
}: {
  label: string
  options: { name: string; binanceId: string; code: string }[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  if (options.length === 0) return null
  return (
    <div>
      <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
        {label}
      </p>
      {options.map(o => {
        const active = selected.includes(o.binanceId)
        return (
          <button
            key={o.binanceId}
            onClick={() => onToggle(o.binanceId)}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-800/60 transition-colors text-left"
          >
            <span className={[
              'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
              active ? 'border-green-500 bg-green-500' : 'border-gray-600 bg-transparent',
            ].join(' ')}>
              {active && (
                <svg className="w-2.5 h-2.5 text-gray-900" fill="none" viewBox="0 0 12 12" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2 6l3 3 5-5" />
                </svg>
              )}
            </span>
            <span className={`text-xs transition-colors ${active ? 'text-green-300' : 'text-gray-400'}`}>
              {o.name}
            </span>
            {o.code && (
              <span className="ml-auto text-[10px] text-gray-700 font-mono">{o.code}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
