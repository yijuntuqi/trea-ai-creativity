import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.055] to-white/[0.012] p-5',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_32px_70px_-48px_rgba(0,0,0,0.95)] backdrop-blur-sm',
        'before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-px',
        'before:bg-gradient-to-r before:from-transparent before:via-gold/35 before:to-transparent',
        className,
      )}
      {...props}
    />
  )
}
