import type { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

type Variant = 'primary' | 'ghost' | 'subtle'
type Size = 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-gold-soft to-gold text-ink shadow-[0_14px_34px_-16px_rgba(230,181,99,0.7)] hover:from-gold hover:to-gold/90 hover:shadow-[0_18px_40px_-16px_rgba(230,181,99,0.85)]',
  ghost:
    'border border-white/12 bg-white/[0.02] text-paper/75 hover:border-gold/45 hover:bg-white/[0.045] hover:text-gold',
  subtle: 'bg-white/[0.06] text-paper/80 hover:bg-white/[0.1]',
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
        'inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-[0.01em] transition duration-200 focus-visible:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100',
        size === 'lg' ? 'px-8 py-3 text-[15px]' : 'px-5 py-2 text-sm',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}
