import type { SelectHTMLAttributes } from 'react'
import clsx from 'clsx'

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        'w-full rounded-xl border border-white/15 bg-ink/60 px-4 py-2.5 text-sm text-paper outline-none transition focus:border-gold/60',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
