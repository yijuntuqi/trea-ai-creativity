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
  STRICTNESS_SHORT,
  disciplineLabel,
  judgesOf,
  targetOf,
  typeLabel,
  type SelectOption,
} from '../lib/labels'
import { JUDGES } from '../lib/judges'
import { useSessionStore } from '../store/session'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

const MINUTE_PRESETS = [8, 15, 25]

function Chip({
  pressed,
  onClick,
  children,
  ariaLabel,
}: {
  pressed: boolean
  onClick: () => void
  children: React.ReactNode
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={ariaLabel}
      onClick={onClick}
      className={
        pressed
          ? 'inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-gold/[0.10] px-4 py-1.5 text-sm text-gold'
          : 'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-4 py-1.5 text-sm text-paper/60 transition hover:border-white/25 hover:text-paper'
      }
    >
      {pressed && <span aria-hidden className="h-1 w-1 rounded-full bg-gold" />}
      {children}
    </button>
  )
}

function Field({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <h2 className="text-sm text-paper/65">
        {title}
        {hint && <span className="ml-2 text-[11px] text-paper/30">{hint}</span>}
      </h2>
      {children}
    </div>
  )
}

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
    <Field title={title}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option.value}
            pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    </Field>
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

  const summary = [
    typeLabel(config),
    disciplineLabel(config),
    `${STRICTNESS_SHORT[config.strictness]}模式`,
    `${targetOf(config)} 题`,
    `${config.minutes} 分钟`,
    `${judgesOf(config).length} 位评委`,
  ]

  const inputClass =
    'w-full rounded-xl border border-white/12 bg-ink/60 px-4 py-2 text-sm text-paper outline-none transition placeholder:text-paper/30 focus:border-gold/60'

  return (
    <section className="mx-auto max-w-4xl space-y-6 pb-32">
      <header>
        <p className="eyebrow">第 01 步 · 建场</p>
        <h1 className="mt-3 font-serif text-3xl text-paper">设定这场答辩</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-paper/55">
          场景决定评委的提问角度与节奏。可先按默认值直接开始，进入答辩室后仍能调整题量与评委。
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-2xl border border-gold/20 bg-gold/[0.05] px-4 py-3 text-xs text-paper/70">
        <span className="text-[10px] tracking-[0.2em] text-gold/70">本场摘要</span>
        {summary.map((item, index) => (
          <span key={item} className="flex items-center gap-2.5">
            {index > 0 && <span aria-hidden className="h-3 w-px bg-white/15" />}
            {item}
          </span>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-base text-paper">场景</h2>
            <span className="text-[11px] tracking-[0.18em] text-paper/25">01</span>
          </div>
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
              className={inputClass}
            />
          )}
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
              className={inputClass}
            />
          )}
        </Card>

        <Card className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-base text-paper">节奏</h2>
            <span className="text-[11px] tracking-[0.18em] text-paper/25">02</span>
          </div>
          <OptionGroup
            title="严格度"
            options={STRICTNESS_OPTIONS}
            value={config.strictness}
            onChange={(value) => update('strictness', value)}
          />

          <Field title="目标题量" hint="进入答辩室后仍可调整">
            <div className="flex flex-wrap items-center gap-2">
              {QUESTION_TARGET_PRESETS.map((count) => (
                <Chip
                  key={count}
                  pressed={(config.questionTarget ?? DEFAULT_QUESTION_TARGET) === count}
                  onClick={() => update('questionTarget', count)}
                >
                  {count} 题
                </Chip>
              ))}
              <label className="flex items-center gap-2 text-xs text-paper/45">
                自定义
                <input
                  type="number"
                  aria-label="自定义目标题量"
                  min={MIN_QUESTION_TARGET}
                  max={MAX_QUESTION_TARGET}
                  value={config.questionTarget ?? DEFAULT_QUESTION_TARGET}
                  onChange={(event) => update('questionTarget', Number(event.target.value))}
                  className="w-16 rounded-lg border border-white/12 bg-ink/60 px-2.5 py-1.5 text-sm text-paper outline-none transition focus:border-gold/60"
                />
                题
              </label>
            </div>
          </Field>

          <Field title="限时">
            <div className="flex flex-wrap items-center gap-2">
              {MINUTE_PRESETS.map((minutes) => (
                <Chip
                  key={minutes}
                  pressed={config.minutes === minutes}
                  onClick={() => update('minutes', minutes)}
                >
                  {minutes} 分钟
                </Chip>
              ))}
              <label className="flex items-center gap-2 text-xs text-paper/45">
                自定义
                <input
                  type="number"
                  aria-label="自定义限时分钟数"
                  min={1}
                  max={240}
                  value={config.minutes}
                  onChange={(event) => update('minutes', Number(event.target.value))}
                  className="w-16 rounded-lg border border-white/12 bg-ink/60 px-2.5 py-1.5 text-sm text-paper outline-none transition focus:border-gold/60"
                />
                分钟
              </label>
            </div>
          </Field>
        </Card>

        <Card className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h2 className="font-serif text-base text-paper">评委席</h2>
              <span className="text-[11px] tracking-[0.18em] text-paper/25">03</span>
            </div>
            <span className="text-[11px] text-paper/35">至少 1 位，按顺序轮换提问</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {JUDGE_OPTIONS.map((option) => {
              const active = judgesOf(config).includes(option.value)
              const judge = JUDGES.find((item) => item.id === option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  aria-label={option.label}
                  onClick={() => toggleJudge(option.value)}
                  className={
                    active
                      ? 'rounded-xl border border-gold/50 bg-gold/[0.07] p-4 text-left transition'
                      : 'rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left opacity-70 transition hover:border-white/25 hover:opacity-100'
                  }
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm text-paper/90">{option.label}</span>
                    <span
                      aria-hidden
                      className={
                        active
                          ? 'grid h-4 w-4 place-items-center rounded-full border border-gold/70 bg-gold/20 text-[9px] text-gold'
                          : 'h-4 w-4 rounded-full border border-white/20'
                      }
                    >
                      {active ? '✓' : ''}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-[11px] leading-relaxed text-paper/40">
                    {judge?.focus ?? '现场追问'}
                  </span>
                </button>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-ink/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0">
            {error ? (
              <p role="alert" className="text-xs text-red-300">
                {error}
              </p>
            ) : (
              <p className="truncate text-xs text-paper/45">{summary.join(' · ')}</p>
            )}
          </div>
          <Button size="lg" onClick={submit}>
            下一步：上传材料
          </Button>
        </div>
      </div>
    </section>
  )
}
