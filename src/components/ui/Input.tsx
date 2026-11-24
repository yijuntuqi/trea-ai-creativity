import type { InputHTMLAttributes } from 'react'
import clsx from 'clsx'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'w-full rounded-xl border border-white/15 bg-ink/60 px-4 py-2.5 text-sm text-paper outline-none transition placeholder:text-paper/35 focus:border-gold/60',
        className,
      )}
      {...props}
    />
  )
}
