import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { JUDGES } from '../lib/judges'
import { loadSessions } from '../lib/storage'
import { DEMO_SESSION } from '../mocks/demo'
import JudgeCard from '../components/JudgeCard'
import { Button } from '../components/ui/Button'

const STEPS = [
  { title: '建场', desc: '选答辩类型与严格度，自定义场景也能直接交给 AI 理解。' },
  { title: '上传材料', desc: '论文、PPT、Word、实验数据一次上传，全文参与分析。' },
  { title: '现场预演', desc: '三位评委轮番追问，逐题点评并给出可直接照读的话术。' },
]

const STATS = [
  { value: '3', label: '位固定评委' },
  { value: '4', label: '维评分雷达' },
  { value: '0', label: '材料上传云端' },
]

export default function Home() {
  const navigate = useNavigate()

  function openSample() {
    if (loadSessions().length === 0) navigate(`/report/${DEMO_SESSION.id}`)
    else navigate('/history')
  }

  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.09] bg-stage-grid px-6 py-12 md:px-10 md:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-gold/12 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-[#3a60a8]/15 blur-3xl"
        />

        <div className="relative grid gap-12 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <p className="eyebrow">AI 答辩预演 · 三位评委现场追问</p>
            <h1 className="mt-5 font-serif text-[2.9rem] leading-[1.04] tracking-tight text-paper md:text-6xl">
              答辩预演官
            </h1>
            <p className="mt-5 max-w-lg font-serif text-xl leading-relaxed text-paper/80">
              让评委的问题，先在你面前出现。
            </p>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-paper/50">
              上传论文或 PPT，方法论派、创新性质疑派、应用价值派轮流追问；结束后给出四维评分、逐题点评与可执行的复盘清单。
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={() => navigate('/setup')}>
                立即预演
              </Button>
              <Button size="lg" variant="ghost" onClick={openSample}>
                查看示例报告
              </Button>
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-6">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <dd className="stat-value">{stat.value}</dd>
                  <dt className="mt-2 text-[11px] leading-snug tracking-[0.08em] text-paper/40">
                    {stat.label}
                  </dt>
                </div>
              ))}
            </dl>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: 'easeOut' }}
            className="relative"
          >
            <div className="relative rounded-2xl border border-white/10 bg-ink-soft/80 p-5 shadow-[0_40px_90px_-50px_rgba(0,0,0,1)] backdrop-blur">
              <div className="flex items-center justify-between text-[11px] tracking-[0.22em] text-paper/35">
                <span>现场 · 第 03 问</span>
                <span className="text-gold/70">建议 90 秒</span>
              </div>
              <p className="mt-4 font-serif text-lg leading-relaxed text-paper">
                「你的长度自适应注意力机制，与已有工作相比差异具体体现在哪里？」
              </p>
              <div className="mt-5 space-y-2" aria-hidden>
                <div className="h-2 w-11/12 rounded-full bg-white/[0.06]" />
                <div className="h-2 w-8/12 rounded-full bg-white/[0.05]" />
                <div className="h-2 w-9/12 rounded-full bg-white/[0.04]" />
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-white/[0.07] pt-4">
                <div className="flex -space-x-2">
                  {JUDGES.map((judge) => (
                    <span
                      key={judge.id}
                      className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-ink text-[11px]"
                      style={{ color: judge.color }}
                    >
                      {judge.id === 'method' ? '方' : judge.id === 'innovation' ? '创' : '用'}
                    </span>
                  ))}
                </div>
                <span className="rounded-full border border-gold/35 bg-gold/10 px-3 py-1 text-[11px] text-gold">
                  逐题点评生成中
                </span>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-4 rounded-xl border border-white/10 bg-ink/90 px-4 py-3 shadow-[0_24px_50px_-30px_rgba(0,0,0,1)] backdrop-blur md:-left-8">
              <p className="text-[10px] tracking-[0.22em] text-paper/35">本场总分</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="font-serif text-3xl text-gold">82</span>
                <span className="text-[11px] text-paper/45">良好</span>
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">评审席</p>
            <h2 className="mt-3 font-serif text-2xl text-paper">三位固定评委</h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-paper/45">
            每位评委有独立的关注点与追问风格，问题不会重复，追问逐层加深。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {JUDGES.map((judge) => (
            <JudgeCard key={judge.id} judge={judge} />
          ))}
        </div>
      </section>

      <section>
        <p className="eyebrow">流程</p>
        <h2 className="mt-3 font-serif text-2xl text-paper">三步进入答辩现场</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition hover:border-gold/25 hover:bg-white/[0.04]"
            >
              <span className="font-serif text-sm text-gold/60">0{index + 1}</span>
              <h3 className="mt-3 text-lg text-paper">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-paper/50">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-r from-gold/[0.08] via-transparent to-transparent px-6 py-8 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <h2 className="font-serif text-2xl text-paper">下一场答辩，先在预演里过一遍</h2>
            <p className="mt-2 text-sm text-paper/50">
              不需要注册，材料只在浏览器内解析，随时中断、随时在同一进度继续。
            </p>
          </div>
          <Button size="lg" onClick={() => navigate('/setup')}>
            开始建场
          </Button>
        </div>
      </section>
    </div>
  )
}
