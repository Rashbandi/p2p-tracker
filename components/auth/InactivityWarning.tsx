'use client'

interface InactivityWarningProps {
  countdown: number
  onStay: () => void
  onLogout: () => void
}

export function InactivityWarning({ countdown, onStay, onLogout }: InactivityWarningProps) {
  const mins = Math.floor(countdown / 60)
  const secs = countdown % 60
  const label = mins > 0
    ? `${mins}m ${secs.toString().padStart(2, '0')}s`
    : `${secs}s`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Sesión por expirar</h3>
            <p className="text-xs text-gray-500 mt-0.5">Se cerrará por inactividad</p>
          </div>
        </div>

        <div className="text-center py-3 mb-5">
          <span className="text-3xl font-bold font-mono text-amber-400">{label}</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 py-2 rounded-xl border border-gray-600 text-sm text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
          >
            Cerrar sesión
          </button>
          <button
            onClick={onStay}
            className="flex-1 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-gray-900 text-sm font-semibold transition-colors"
          >
            Seguir activo
          </button>
        </div>
      </div>
    </div>
  )
}
