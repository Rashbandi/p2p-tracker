'use client'
import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email) { setError('Ingresa tu correo'); return }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (err) throw err
      setSent(true)
    } catch (err: any) {
      setError(err.message ?? 'Error al enviar el correo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111827] px-4">
      <div className="w-full max-w-sm">
        <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-6">
          <Link href="/auth/login" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 mb-5 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al login
          </Link>

          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-white mb-2">Correo enviado</h2>
              <p className="text-sm text-gray-400">
                Revisa <span className="text-green-400">{email}</span> para restablecer tu contraseña.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-white mb-1">Recuperar contraseña</h2>
              <p className="text-sm text-gray-500 mb-5">Te enviaremos un enlace para restablecer tu contraseña.</p>

              {error && (
                <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  type="email"
                  label="Correo electrónico"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                />
                <Button type="submit" loading={loading}>
                  Enviar enlace
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
