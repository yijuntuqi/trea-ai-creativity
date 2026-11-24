import { Link } from 'react-router-dom'
import { JUDGES } from '../lib/judges'
import JudgeCard from '../components/JudgeCard'
import { Button } from '../components/ui/Button'

export default function Home() {
  return (
    <div className="space-y-14">
      <section className="pt-8 text-center md:pt-16">
        <p className="text-xs tracking-[0.4em] text-gold/70">AI 答辩预演</p>
        <h1 className="mt-4 font-serif text-4xl text-paper md:text-5xl">答辩预演官</h1>
        <p className="mt-4 text-lg text-paper/70">让评委的问题，先在你面前出现</p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-paper/50">
          上传论文或 PPT，三位不同风格的 AI 评委轮流追问，结束后给出四维评分与可执行的复盘清单。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/setup">
            <Button size="lg">立即预演</Button>
          </Link>
          <Link to="/history">
            <Button size="lg" variant="ghost">
              查看示例报告
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-xs text-paper/35">材料仅在浏览器内解析，不会上传服务器</p>
      </section>

      <section>
        <h2 className="mb-4 font-serif text-xl text-paper">三位固定评委</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {JUDGES.map((judge) => (
            <JudgeCard key={judge.id} judge={judge} />
          ))}
        </div>
      </section>
    </div>
  )
}
