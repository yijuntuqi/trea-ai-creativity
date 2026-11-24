import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('rounded-2xl border border-white/10 bg-ink-soft/70 p-5', className)}
      {...props}
    />
  )
}
