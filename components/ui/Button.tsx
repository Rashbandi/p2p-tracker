'use client'
import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary:   'bg-green-500 hover:bg-green-400 text-gray-900',
      secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-100',
      danger:    'bg-red-600 hover:bg-red-500 text-white',
      ghost:     'hover:bg-gray-700 text-gray-300 hover:text-white',
      outline:   'border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white',
    }

    const sizes = {
      sm:  'text-xs px-3 py-1.5 gap-1.5',
      md:  'text-sm px-4 py-2 gap-2',
      lg:  'text-base px-5 py-2.5 gap-2',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
