import type { TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        'w-full rounded-xl border border-white/12 bg-ink/55 px-4 py-3 text-sm leading-relaxed text-paper outline-none transition duration-200',
        'placeholder:text-paper/30 focus:border-gold/55 focus:bg-ink/70 focus:shadow-[0_0_0_3px_rgba(230,181,99,0.12)]',
        className,
      )}
      {...props}
    />
  )
}
