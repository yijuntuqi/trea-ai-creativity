import type { TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        'w-full rounded-xl border border-white/15 bg-ink/60 px-4 py-3 text-sm leading-relaxed text-paper outline-none transition placeholder:text-paper/35 focus:border-gold/60',
        className,
      )}
      {...props}
    />
  )
}
