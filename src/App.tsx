import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'

function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <section className="space-y-3">
      <h1 className="text-3xl text-paper">{title}</h1>
      <p className="text-paper/60">{note}</p>
    </section>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route
            path="/"
            element={<Placeholder title="答辩预演官" note="让评委的问题，先在你面前出现" />}
          />
          <Route
            path="/setup"
            element={<Placeholder title="建场" note="选择答辩类型、学科、严格度与限时" />}
          />
          <Route
            path="/material"
            element={<Placeholder title="材料" note="上传论文或 PPT，或直接粘贴大纲" />}
          />
          <Route
            path="/session/:id"
            element={<Placeholder title="答辩室" note="三位评委轮流提问" />}
          />
          <Route
            path="/report/:id"
            element={<Placeholder title="预演报告" note="四维评分与复盘建议" />}
          />
          <Route
            path="/history"
            element={<Placeholder title="历史记录" note="本机保存的过往场次" />}
          />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
