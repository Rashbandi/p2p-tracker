import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'green' | 'red' | 'amber' | 'blue' | 'gray'
  dot?: boolean
}

export function Badge({ variant = 'gray', dot, children, className, ...props }: BadgeProps) {
  const variants = {
    green: 'bg-green-500/15 text-green-400 border-green-500/30',
    red:   'bg-red-500/15 text-red-400 border-red-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    blue:  'bg-blue-500/15 text-blue-400 border-blue-500/30',
    gray:  'bg-gray-500/15 text-gray-400 border-gray-500/30',
  }

  const dotColors = {
    green: 'bg-green-400',
    red:   'bg-red-400',
    amber: 'bg-amber-400',
    blue:  'bg-blue-400',
    gray:  'bg-gray-400',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  )
}
