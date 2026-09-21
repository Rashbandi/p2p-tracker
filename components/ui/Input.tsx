'use client'
import { InputHTMLAttributes, forwardRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, rightIcon, className, style, ...props }, ref) => {
    const [focused, setFocused] = useState(false)

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-3 text-gray-500 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            onFocus={e => { setFocused(true); props.onFocus?.(e) }}
            onBlur={e => { setFocused(false); props.onBlur?.(e) }}
            className={cn(
              'w-full rounded-lg text-sm font-medium transition-colors',
              'bg-[#07080f] text-gray-100 placeholder:text-gray-600',
              'border',
              error
                ? 'border-red-500'
                : focused
                ? 'border-green-500'
                : 'border-gray-600',
              'px-3 py-2',
              icon && 'pl-9',
              rightIcon && 'pr-9',
              className
            )}
            style={style}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 text-gray-500">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

// ── Numeric Input with Venezuelan formatting ──────────────────────────────
interface NumInputProps {
  value: string
  onChange: (raw: string) => void
  placeholder?: string
  label?: string
  decimals?: number
  className?: string
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
}

export function NumInput({ value, onChange, placeholder, label, decimals = 2, className, onKeyDown }: NumInputProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-lg text-sm font-medium font-mono transition-colors',
          'bg-[#07080f] text-gray-100 placeholder:text-gray-600',
          'border px-3 py-2',
          focused ? 'border-green-500' : 'border-gray-600',
          className
        )}
      />
    </div>
  )
}
