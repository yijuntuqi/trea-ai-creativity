import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DefenseType, Discipline, SessionConfig, Strictness } from '../types'
import { useSessionStore } from '../store/session'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

type Option<T extends string | number> = { value: T; label: string }

const TYPES: Option<DefenseType>[] = [
  { value: 'undergrad', label: '本科毕设' },
  { value: 'master', label: '硕士学位' },
  { value: 'project', label: '项目结题' },
  { value: 'course', label: '课程汇报' },
]

const DISCIPLINES: Option<Discipline>[] = [
  { value: 'stem', label: '理工' },
  { value: 'humanities', label: '人文社科' },
  { value: 'business', label: '经管' },
  { value: 'medicine', label: '医学' },
  { value: 'art', label: '艺术设计' },
  { value: 'other', label: '其他' },
]

const STRICTNESS: Option<Strictness>[] = [
  { value: 'gentle', label: '温和（鼓励为主）' },
  { value: 'standard', label: '标准' },
  { value: 'press', label: '压力（连续追问）' },
]

const MINUTES: Option<8 | 15 | 25>[] = [
  { value: 8, label: '8 分钟' },
  { value: 15, label: '15 分钟' },
  { value: 25, label: '25 分钟' },
]

function OptionGroup<T extends string | number>({
  title,
  options,
  value,
  onChange,
}: {
  title: string
  options: Option<T>[]
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
              key={String(option.value)}
              type="button"
              aria-pressed={pressed}
              onClick={() => onChange(option.value)}
              className={
                pressed
                  ? 'rounded-full border border-gold bg-gold/15 px-4 py-2 text-sm text-gold'
                  : 'rounded-full border border-white/15 px-4 py-2 text-sm text-paper/70 transition hover:border-white/30 hover:text-paper'
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
  })

  function update<K extends keyof SessionConfig>(key: K, value: SessionConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  function submit() {
    start(config)
    navigate('/material')
  }

  return (
    <section className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-paper">建场</h1>
        <p className="mt-2 text-sm text-paper/60">
          先确定答辩场景，评委会据此调整提问方式与追问强度。
        </p>
      </header>

      <Card className="space-y-7">
        <OptionGroup
          title="答辩类型"
          options={TYPES}
          value={config.type}
          onChange={(value) => update('type', value)}
        />
        <OptionGroup
          title="学科"
          options={DISCIPLINES}
          value={config.discipline}
          onChange={(value) => update('discipline', value)}
        />
        <OptionGroup
          title="严格度"
          options={STRICTNESS}
          value={config.strictness}
          onChange={(value) => update('strictness', value)}
        />
        <OptionGroup
          title="限时"
          options={MINUTES}
          value={config.minutes}
          onChange={(value) => update('minutes', value)}
        />
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={submit}>
          下一步：上传材料
        </Button>
      </div>
    </section>
  )
}
