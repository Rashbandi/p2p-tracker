'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { InactivityWarning } from '@/components/auth/InactivityWarning'
import { APP_NAME } from '@/lib/constants'

const NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/cycles',
    label: 'Ciclos',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { user, loading, warning, countdown, signOut, stayLoggedIn } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Cargando…</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      {/* Inactivity warning overlay */}
      {warning && (
        <InactivityWarning
          countdown={countdown}
          onStay={stayLoggedIn}
          onLogout={signOut}
        />
      )}

      {/* Top bar */}
      <header className="h-14 border-b border-[#374151] bg-[#1f2937] flex items-center px-4 gap-4 sticky top-0 z-40">
        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 6l9-4 9 4v6c0 5.25-4.05 9.15-9 10.5C6.05 21.15 3 17.25 3 12V6z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white hidden sm:block">{APP_NAME}</span>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-0.5 ml-2">
          {NAV.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  active
                    ? 'bg-green-500/10 text-green-400'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50',
                ].join(' ')}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {/* Live dot */}
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="hidden sm:inline">En vivo</span>
          </span>

          {/* User menu */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-700">
            <div className="w-7 h-7 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <span className="text-xs font-semibold text-green-400">
                {(user.user_metadata?.full_name ?? user.email ?? '?')[0].toUpperCase()}
              </span>
            </div>
            <button
              onClick={signOut}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors hidden sm:block"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 p-4 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
