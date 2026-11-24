import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import History from './pages/History'
import Home from './pages/Home'
import Material from './pages/Material'
import ReportPage from './pages/Report'
import Session from './pages/Session'
import Setup from './pages/Setup'

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/material" element={<Material />} />
          <Route path="/session/:id" element={<Session />} />
          <Route path="/report/:id" element={<ReportPage />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
