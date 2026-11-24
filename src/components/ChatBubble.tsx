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
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser ? 'bg-gold/15 text-paper' : 'bg-ink-soft text-paper/85',
        )}
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
