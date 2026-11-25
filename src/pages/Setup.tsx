import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { JudgeId, SessionConfig } from '../types'
import {
  ALL_JUDGES,
  DEFAULT_QUESTION_TARGET,
  DEFENSE_TYPE_OPTIONS,
  DISCIPLINE_OPTIONS,
  JUDGE_OPTIONS,
  MAX_QUESTION_TARGET,
  MIN_QUESTION_TARGET,
  QUESTION_TARGET_PRESETS,
  STRICTNESS_OPTIONS,
  type SelectOption,
} from '../lib/labels'
import { useSessionStore } from '../store/session'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

const MINUTE_PRESETS = [8, 15, 25]

function OptionGroup<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string
  options: SelectOption<T>[]
  value: T
  onChange: (next: T) => void
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm text-paper/60">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const pressed = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={pressed}
              onClick={() => onChange(option.value)}
              className={
                pressed
                  ? 'rounded-full border border-gold/70 bg-gold/[0.14] px-4 py-2 text-sm text-gold shadow-[0_0_0_1px_rgba(230,181,99,0.15),0_14px_30px_-22px_rgba(230,181,99,0.9)]'
                  : 'rounded-full border border-white/12 bg-white/[0.02] px-4 py-2 text-sm text-paper/65 transition hover:border-white/25 hover:bg-white/[0.04] hover:text-paper'
              }
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Setup() {
  const navigate = useNavigate()
  const start = useSessionStore((state) => state.start)
  const [config, setConfig] = useState<SessionConfig>({
    type: 'undergrad',
    discipline: 'stem',
    strictness: 'standard',
    minutes: 15,
    questionTarget: DEFAULT_QUESTION_TARGET,
    judges: [...ALL_JUDGES],
  })
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof SessionConfig>(key: K, value: SessionConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  function toggleJudge(judgeId: JudgeId) {
    const active = config.judges ?? ALL_JUDGES
    if (active.includes(judgeId) && active.length === 1) return
    const next = active.includes(judgeId)
      ? active.filter((id) => id !== judgeId)
      : [...active, judgeId]
    update('judges', ALL_JUDGES.filter((id) => next.includes(id)))
  }

  function submit() {
    if (config.type === 'custom' && !config.customType?.trim()) {
      setError('请填写自定义答辩类型')
      return
    }
    if (config.discipline === 'other' && !config.customDiscipline?.trim()) {
      setError('请填写自定义学科')
      return
    }
    if (!Number.isFinite(config.minutes) || config.minutes < 1 || config.minutes > 240) {
      setError('限时需在 1-240 分钟之间')
      return
    }
    const target = config.questionTarget ?? DEFAULT_QUESTION_TARGET
    if (!Number.isFinite(target) || target < MIN_QUESTION_TARGET || target > MAX_QUESTION_TARGET) {
      setError(`题量需在 ${MIN_QUESTION_TARGET}-${MAX_QUESTION_TARGET} 之间`)
      return
    }
    if (!config.judges || config.judges.length === 0) {
      setError('请至少选择一位评委')
      return
    }
    setError(null)
    start(config)
    navigate('/material')
  }

  return (
    <section className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-paper">建场</h1>
        <p className="mt-2 text-sm text-paper/60">
          确定答辩场景后，评委会按类型、学科、严格度与限时安排提问节奏；「自定义」内容会直接作为 AI 的出题依据。
        </p>
      </header>

      <Card className="space-y-7">
        <div className="space-y-3">
          <OptionGroup
            title="答辩类型"
            options={DEFENSE_TYPE_OPTIONS}
            value={config.type}
            onChange={(value) => update('type', value)}
          />
          {config.type === 'custom' && (
            <input
              aria-label="自定义答辩类型"
              value={config.customType ?? ''}
              onChange={(event) => update('customType', event.target.value)}
              placeholder="例如：开题答辩、求职作品讲演、产品方案评审"
              className="w-full rounded-xl border border-white/15 bg-ink/60 px-4 py-2 text-sm text-paper outline-none transition focus:border-gold/60"
            />
          )}
        </div>

        <div className="space-y-3">
          <OptionGroup
            title="学科"
            options={DISCIPLINE_OPTIONS}
            value={config.discipline}
            onChange={(value) => update('discipline', value)}
          />
          {config.discipline === 'other' && (
            <input
              aria-label="自定义学科"
              value={config.customDiscipline ?? ''}
              onChange={(event) => update('customDiscipline', event.target.value)}
              placeholder="例如：建筑学、新闻传播、环境工程"
              className="w-full rounded-xl border border-white/15 bg-ink/60 px-4 py-2 text-sm text-paper outline-none transition focus:border-gold/60"
            />
          )}
        </div>

        <OptionGroup
          title="严格度"
          options={STRICTNESS_OPTIONS}
          value={config.strictness}
          onChange={(value) => update('strictness', value)}
        />

        <div>
          <h2 className="mb-3 text-sm text-paper/60">目标题量（进入答辩室后仍可调整）</h2>
          <div className="flex flex-wrap items-center gap-2">
            {QUESTION_TARGET_PRESETS.map((count) => {
              const pressed = (config.questionTarget ?? DEFAULT_QUESTION_TARGET) === count
              return (
                <button
                  key={count}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => update('questionTarget', count)}
                  className={
                    pressed
                      ? 'rounded-full border border-gold bg-gold/15 px-4 py-2 text-sm text-gold'
                      : 'rounded-full border border-white/15 px-4 py-2 text-sm text-paper/70 transition hover:border-white/30 hover:text-paper'
                  }
                >
                  {count} 题
                </button>
              )
            })}
            <label className="flex items-center gap-2 text-sm text-paper/60">
              自定义
              <input
                type="number"
                aria-label="自定义目标题量"
                min={MIN_QUESTION_TARGET}
                max={MAX_QUESTION_TARGET}
                value={config.questionTarget ?? DEFAULT_QUESTION_TARGET}
                onChange={(event) => update('questionTarget', Number(event.target.value))}
                className="w-20 rounded-xl border border-white/15 bg-ink/60 px-3 py-2 text-sm text-paper outline-none transition focus:border-gold/60"
              />
              题
            </label>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm text-paper/60">参与评委（至少 1 位，按顺序轮换提问）</h2>
          <div className="flex flex-wrap gap-2">
            {JUDGE_OPTIONS.map((option) => {
              const active = (config.judges ?? ALL_JUDGES).includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleJudge(option.value)}
                  className={
                    active
                      ? 'rounded-full border border-gold/70 bg-gold/[0.14] px-4 py-2 text-sm text-gold'
                      : 'rounded-full border border-white/12 bg-white/[0.02] px-4 py-2 text-sm text-paper/65 transition hover:border-white/25 hover:text-paper'
                  }
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm text-paper/60">限时</h2>
          <div className="flex flex-wrap items-center gap-2">
            {MINUTE_PRESETS.map((minutes) => {
              const pressed = config.minutes === minutes
              return (
                <button
                  key={minutes}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => update('minutes', minutes)}
                  className={
                    pressed
                      ? 'rounded-full border border-gold bg-gold/15 px-4 py-2 text-sm text-gold'
                      : 'rounded-full border border-white/15 px-4 py-2 text-sm text-paper/70 transition hover:border-white/30 hover:text-paper'
                  }
                >
                  {minutes} 分钟
                </button>
              )
            })}
            <label className="flex items-center gap-2 text-sm text-paper/60">
              自定义
              <input
                type="number"
                aria-label="自定义限时分钟数"
                min={1}
                max={240}
                value={config.minutes}
                onChange={(event) => update('minutes', Number(event.target.value))}
                className="w-20 rounded-xl border border-white/15 bg-ink/60 px-3 py-2 text-sm text-paper outline-none transition focus:border-gold/60"
              />
              分钟
            </label>
          </div>
        </div>
      </Card>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="flex justify-end">
        <Button size="lg" onClick={submit}>
          下一步：上传材料
        </Button>
      </div>
    </section>
  )
}
