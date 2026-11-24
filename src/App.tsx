import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import Home from './pages/Home'
import Material from './pages/Material'
import Session from './pages/Session'
import Setup from './pages/Setup'

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
          <Route path="/" element={<Home />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/material" element={<Material />} />
          <Route path="/session/:id" element={<Session />} />
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
