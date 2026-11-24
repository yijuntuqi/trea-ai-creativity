import { useState } from 'react'
import type { Judge } from '../types'

export default function JudgeCard({ judge }: { judge: Judge }) {
  const [failed, setFailed] = useState(false)

  return (
    <article className="rounded-2xl border border-white/10 bg-ink-soft/60 p-4">
      <div className="flex items-center gap-3">
        {failed ? (
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-semibold"
            style={{ backgroundColor: `${judge.color}33`, color: judge.color }}
          >
            {judge.name.slice(0, 1)}
          </div>
        ) : (
          <img
            src={judge.avatar}
            alt={judge.name}
            onError={() => setFailed(true)}
            className="h-11 w-11 shrink-0 rounded-full object-cover"
          />
        )}
        <div className="min-w-0">
          <h3 className="truncate text-base text-paper">{judge.name}</h3>
          <p className="truncate text-xs text-paper/50">{judge.style}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-paper/70">关注：{judge.focus}</p>
    </article>
  )
}
