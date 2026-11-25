import type { Message } from '../types'
import { JUDGES, judgeById } from '../lib/judges'
import clsx from 'clsx'

export default function ChatBubble({ message }: { message: Message }) {
  if (message.role === 'system') {
    return (
      <p className="mx-auto max-w-xl text-center text-xs leading-relaxed text-paper/45">
        {message.text}
      </p>
    )
  }

  const isUser = message.role === 'user'
  const judge = message.judgeId ? judgeById(message.judgeId) : JUDGES[0]

  return (
    <div className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-[0_18px_40px_-32px_rgba(0,0,0,0.9)]',
          isUser
            ? 'rounded-br-md border border-gold/25 bg-gold/[0.12] text-paper'
            : 'rounded-bl-md border border-white/[0.07] border-l-2 bg-ink-soft/90 text-paper/85',
        )}
        style={!isUser ? { borderLeftColor: judge.color } : undefined}
      >
        {!isUser && (
          <p className="mb-1 text-xs" style={{ color: judge.color }}>
            {judge.name}
          </p>
        )}
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>
    </div>
  )
}
