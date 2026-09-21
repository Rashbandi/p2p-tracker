'use client'

interface Slice {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  data: Slice[]
  size?: number
  thickness?: number
}

export function DonutChart({ data, size = 160, thickness = 28 }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const GAP = 3

  let offset = 0
  const slices = data.map(d => {
    const pct   = d.value / total
    const arc   = circumference * pct - GAP
    const start = offset
    offset += circumference * pct
    return { ...d, arc, start, pct }
  })

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {slices.map((s, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={`${s.arc} ${circumference - s.arc}`}
            strokeDashoffset={-s.start}
            strokeLinecap="round"
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-col gap-2">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <div className="min-w-0">
              <p className="text-xs text-gray-400 truncate">{s.label}</p>
              <p className="text-xs font-semibold text-white font-mono">
                {(s.pct * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
