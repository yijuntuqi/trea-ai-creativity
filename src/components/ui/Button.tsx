import type { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

type Variant = 'primary' | 'ghost' | 'subtle'
type Size = 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-gold text-ink hover:bg-gold/90',
  ghost: 'border border-white/15 text-paper/80 hover:border-gold/60 hover:text-gold',
  subtle: 'bg-white/5 text-paper/80 hover:bg-white/10',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-full font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'lg' ? 'px-7 py-3 text-base' : 'px-5 py-2 text-sm',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}
