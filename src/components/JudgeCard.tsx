import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Judge } from '../types'
import JudgeAvatar from './JudgeAvatar'

export default function JudgeCard({ judge }: { judge: Judge }) {
  const [failed, setFailed] = useState(false)

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-4 transition-colors hover:border-white/15"
    >
      <span
        aria-hidden
        className="absolute inset-x-8 top-0 h-px opacity-70"
        style={{ background: `linear-gradient(90deg, transparent, ${judge.color}, transparent)` }}
      />
      <div className="flex items-center gap-3">
        {failed ? (
          <JudgeAvatar
            judge={judge}
            className="h-11 w-11 shrink-0 rounded-full ring-1 ring-white/15"
          />
        ) : (
          <img
            src={judge.avatar}
            alt={judge.name}
            onError={() => setFailed(true)}
            className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-white/15"
          />
        )}
        <div className="min-w-0">
          <h3 className="truncate text-base text-paper">{judge.name}</h3>
          <p className="truncate text-xs text-paper/45">{judge.style}</p>
        </div>
      </div>
      <p className="mt-3 border-t border-white/[0.06] pt-3 text-sm leading-relaxed text-paper/65">
        关注：{judge.focus}
      </p>
    </motion.article>
  )
}
